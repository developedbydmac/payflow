import { Router } from 'express';
import type { Pool, PoolClient } from 'pg';
import { requestHash } from '../db/client';
import type { AuthUser } from './auth';
import { withTransaction } from './db';
import { ApiError, notFound } from './errors';
import { captureWithProcessor } from './processor';

const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
const STATUSES = ['authorized', 'captured', 'partially_refunded', 'refunded', 'declined'] as const;
const REFUNDABLE = ['captured', 'partially_refunded'];
const MAX_AMOUNT_CENTS = 1_000_000;
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PaymentRow {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  captured_cents: number;
  refunded_cents: number;
  idempotency_key: string;
  request_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateBody {
  amount_cents: number;
  currency: (typeof CURRENCIES)[number];
  description?: string | null;
}

/** What the API returns. Internal columns (user_id, request_hash) stay private. */
function toPayment(row: PaymentRow) {
  return {
    id: row.id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    description: row.description,
    captured_cents: row.captured_cents,
    refunded_cents: row.refunded_cents,
    idempotency_key: row.idempotency_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateCreateBody(body: unknown): CreateBody {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'validation_error', 'Body must be a JSON object');
  }
  const { amount_cents, currency, description } = body as Record<string, unknown>;

  // Integer minor units only: rejects 0, negatives, decimals like 10.5, and strings like "1500".
  if (
    typeof amount_cents !== 'number' ||
    !Number.isInteger(amount_cents) ||
    amount_cents < 1 ||
    amount_cents > MAX_AMOUNT_CENTS
  ) {
    throw new ApiError(
      400,
      'validation_error',
      `amount_cents must be an integer from 1 to ${MAX_AMOUNT_CENTS}`,
      'amount_cents',
    );
  }
  if (!CURRENCIES.includes(currency as CreateBody['currency'])) {
    throw new ApiError(
      400,
      'validation_error',
      `currency must be one of ${CURRENCIES.join(', ')}`,
      'currency',
    );
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    throw new ApiError(400, 'validation_error', 'description must be a string', 'description');
  }
  return { amount_cents, currency: currency as CreateBody['currency'], description };
}

function readIdempotencyKey(header: string | undefined): string {
  const key = header?.trim();
  if (!key || key.length > 255) {
    throw new ApiError(
      400,
      'validation_error',
      'Idempotency-Key header is required (1 to 255 characters)',
      'idempotency_key',
    );
  }
  return key;
}

/** Replays an earlier create with the same key: same body → the original payment, different body → 409. */
function replay(existing: PaymentRow, hash: string) {
  if (existing.request_hash !== hash) {
    throw new ApiError(
      409,
      'idempotency_conflict',
      'This Idempotency-Key was already used with a different request body',
    );
  }
  return toPayment(existing);
}

async function findOwnPayment(client: PoolClient | Pool, userId: string, key: string) {
  const { rows } = await client.query<PaymentRow>(
    'SELECT * FROM payments WHERE user_id = $1 AND idempotency_key = $2',
    [userId, key],
  );
  return rows[0];
}

export function paymentsRouter(pool: Pool): Router {
  const router = Router();

  // ── 1. Create ───────────────────────────────────────────────────────────────
  router.post('/payments', async (req, res) => {
    const user: AuthUser = res.locals.user;
    const key = readIdempotencyKey(req.get('idempotency-key'));
    const body = validateCreateBody(req.body);
    const hash = requestHash(body);

    const result = await withTransaction(pool, async (client) => {
      // The unique constraint (user_id, idempotency_key) decides who wins a race.
      // ON CONFLICT DO NOTHING: if this key already exists, insert nothing and return no row.
      // A concurrent request with the same key waits here until the first one commits.
      const inserted = await client.query<PaymentRow>(
        `INSERT INTO payments
           (user_id, amount_cents, currency, status, description, idempotency_key, request_hash)
         VALUES ($1, $2, $3, 'authorized', $4, $5, $6)
         ON CONFLICT (user_id, idempotency_key) DO NOTHING
         RETURNING *`,
        [user.id, body.amount_cents, body.currency, body.description ?? null, key, hash],
      );
      const payment = inserted.rows[0];
      if (!payment) return { created: false as const };

      // Ledger rule 1: every payment gets exactly one authorize entry, in the same transaction.
      await client.query(
        `INSERT INTO ledger_entries (payment_id, type, amount_cents) VALUES ($1, 'authorize', $2)`,
        [payment.id, payment.amount_cents],
      );
      return { created: true as const, payment };
    });

    if (result.created) {
      res.status(201).json(toPayment(result.payment));
      return;
    }
    // The key was used before (or by a request that just won a race): replay it.
    const existing = await findOwnPayment(pool, user.id, key);
    res.status(200).json(replay(existing!, hash));
  });

  // ── 2. Capture ──────────────────────────────────────────────────────────────
  router.post('/payments/:id/capture', async (req, res) => {
    const user: AuthUser = res.locals.user;
    const id = req.params.id;
    if (!UUID.test(id)) throw notFound();

    const outcome = await withTransaction(pool, async (client) => {
      // ROW LOCK: FOR UPDATE locks this payment row until COMMIT or ROLLBACK.
      // A second capture of the same payment waits here, then sees status 'captured' and gets 409.
      // Filtering by user_id is the owner check: another user's payment looks like it doesn't exist.
      const { rows } = await client.query<PaymentRow>(
        'SELECT * FROM payments WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, user.id],
      );
      const payment = rows[0];
      if (!payment) throw notFound();
      if (payment.status !== 'authorized') {
        throw new ApiError(
          409,
          'invalid_state',
          `Only an authorized payment can be captured (status is ${payment.status})`,
        );
      }

      const decision = captureWithProcessor(payment.amount_cents);
      if (!decision.approved) {
        // Declined: record the status, write no capture entry (ledger rule 2).
        await client.query(
          `UPDATE payments SET status = 'declined', updated_at = now() WHERE id = $1`,
          [id],
        );
        return { declined: true as const, reason: decision.reason };
      }

      const updated = await client.query<PaymentRow>(
        `UPDATE payments
            SET status = 'captured', captured_cents = amount_cents, updated_at = now()
          WHERE id = $1
          RETURNING *`,
        [id],
      );
      // Ledger rule 2: exactly one capture entry, equal to the amount, in the same transaction.
      await client.query(
        `INSERT INTO ledger_entries (payment_id, type, amount_cents) VALUES ($1, 'capture', $2)`,
        [id, payment.amount_cents],
      );
      return { declined: false as const, payment: updated.rows[0]! };
    });

    // The decline is committed first, then reported as 402.
    if (outcome.declined) throw new ApiError(402, 'card_declined', outcome.reason);
    res.status(200).json(toPayment(outcome.payment));
  });

  // ── 3. Refund ───────────────────────────────────────────────────────────────
  router.post('/payments/:id/refunds', async (req, res) => {
    const user: AuthUser = res.locals.user;
    const id = req.params.id;
    if (!UUID.test(id)) throw notFound();
    const requested = readRefundAmount(req.body);

    const payment = await withTransaction(pool, async (client) => {
      // ROW LOCK + owner check, same as capture. Two refunds of one payment run one at a time,
      // so they can't both read the same "remaining" amount and over-refund together.
      const { rows } = await client.query<PaymentRow>(
        'SELECT * FROM payments WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, user.id],
      );
      const current = rows[0];
      if (!current) throw notFound();
      if (!REFUNDABLE.includes(current.status)) {
        throw new ApiError(
          409,
          'invalid_state',
          `Only a captured or partially refunded payment can be refunded (status is ${current.status})`,
        );
      }

      const remaining = current.captured_cents - current.refunded_cents;
      const amount = requested ?? remaining; // omitted means "refund the rest"
      if (amount > remaining) {
        throw new ApiError(
          409,
          'refund_exceeds_captured',
          `Refund of ${amount} exceeds the ${remaining} cents still refundable`,
          'amount_cents',
        );
      }

      const refundedTotal = current.refunded_cents + amount;
      const status = refundedTotal === current.captured_cents ? 'refunded' : 'partially_refunded';
      const updated = await client.query<PaymentRow>(
        `UPDATE payments SET refunded_cents = $2, status = $3, updated_at = now()
          WHERE id = $1
          RETURNING *`,
        [id, refundedTotal, status],
      );
      // Ledger rule 3: refund entries add up to refunded_cents, in the same transaction.
      await client.query(
        `INSERT INTO ledger_entries (payment_id, type, amount_cents) VALUES ($1, 'refund', $2)`,
        [id, amount],
      );
      return updated.rows[0]!;
    });

    res.status(201).json(toPayment(payment));
  });

  // ── 4. List ─────────────────────────────────────────────────────────────────
  router.get('/payments', async (req, res) => {
    const user: AuthUser = res.locals.user;
    const { status, limit } = readListQuery(req.query);

    // Owner check: only the caller's payments, ever. Newest first; id breaks ties.
    const { rows } = await pool.query<PaymentRow>(
      `SELECT * FROM payments
        WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC, id DESC
        LIMIT $3`,
      [user.id, status ?? null, limit],
    );
    res.status(200).json({ data: rows.map(toPayment) });
  });

  return router;
}

/** Refund body: `{ amount_cents? }`. Omitted means the full remaining amount. */
function readRefundAmount(body: unknown): number | undefined {
  if (body === undefined) return undefined; // no body at all
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'validation_error', 'Body must be a JSON object');
  }
  const { amount_cents } = body as Record<string, unknown>;
  if (amount_cents === undefined) return undefined;
  if (typeof amount_cents !== 'number' || !Number.isInteger(amount_cents) || amount_cents < 1) {
    throw new ApiError(
      400,
      'validation_error',
      'amount_cents must be a positive integer',
      'amount_cents',
    );
  }
  return amount_cents;
}

function readListQuery(query: Record<string, unknown>) {
  const { status, limit } = query;
  if (status !== undefined && !STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new ApiError(
      400,
      'validation_error',
      `status must be one of ${STATUSES.join(', ')}`,
      'status',
    );
  }
  let parsedLimit = DEFAULT_LIST_LIMIT;
  if (limit !== undefined) {
    parsedLimit = Number(limit);
    if (!/^\d+$/.test(String(limit)) || parsedLimit < 1 || parsedLimit > MAX_LIST_LIMIT) {
      throw new ApiError(
        400,
        'validation_error',
        `limit must be an integer from 1 to ${MAX_LIST_LIMIT}`,
        'limit',
      );
    }
  }
  return { status: status as string | undefined, limit: parsedLimit };
}
