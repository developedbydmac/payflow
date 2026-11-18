import type { Pool, PoolClient } from 'pg';
import { config, createPool, requestHash, sha256 } from './client';

type Status = 'authorized' | 'captured' | 'partially_refunded' | 'refunded' | 'declined';

interface SeedPayment {
  status: Status;
  amount_cents: number;
  currency: 'USD' | 'EUR' | 'GBP';
  description: string;
  refunds: number[]; // refund ledger entries, in order
}

// One payment per status. Amounts differ per user so the two users' rows are easy to tell apart.
function paymentsFor(offset: number): SeedPayment[] {
  return [
    {
      status: 'authorized',
      amount_cents: 1500 + offset,
      currency: 'USD',
      description: 'Seed: authorized',
      refunds: [],
    },
    {
      status: 'captured',
      amount_cents: 2500 + offset,
      currency: 'USD',
      description: 'Seed: captured',
      refunds: [],
    },
    {
      status: 'partially_refunded',
      amount_cents: 4000 + offset,
      currency: 'EUR',
      description: 'Seed: partially refunded',
      refunds: [1000],
    },
    {
      status: 'refunded',
      amount_cents: 3000 + offset,
      currency: 'GBP',
      description: 'Seed: refunded in two parts',
      refunds: [1000, 2000 + offset],
    },
    {
      status: 'declined',
      amount_cents: 666,
      currency: 'USD',
      description: 'Seed: declined by the fake processor',
      refunds: [],
    },
  ];
}

async function insertPayment(client: PoolClient, userId: string, userName: string, p: SeedPayment) {
  const captured = p.status === 'authorized' || p.status === 'declined' ? 0 : p.amount_cents;
  const refunded = p.refunds.reduce((sum, r) => sum + r, 0);

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO payments
       (user_id, amount_cents, currency, status, description,
        captured_cents, refunded_cents, idempotency_key, request_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      userId,
      p.amount_cents,
      p.currency,
      p.status,
      p.description,
      captured,
      refunded,
      `seed-${userName}-${p.status}`,
      requestHash(p),
    ],
  );
  const paymentId = rows[0]!.id;

  // Ledger entries that match the payment's state (spec rules 1–3).
  const entries: Array<[string, number]> = [['authorize', p.amount_cents]];
  if (captured > 0) entries.push(['capture', captured]);
  for (const r of p.refunds) entries.push(['refund', r]);

  for (const [type, amount] of entries) {
    await client.query(
      'INSERT INTO ledger_entries (payment_id, type, amount_cents) VALUES ($1, $2, $3)',
      [paymentId, type, amount],
    );
  }
}

export async function seed(pool: Pool): Promise<void> {
  const existing = await pool.query('SELECT 1 FROM users LIMIT 1');
  if (existing.rowCount) {
    console.log('already seeded; run `npm run db:reset` for a fresh database');
    return;
  }

  const users = [
    { name: 'user_a', token: config.userAToken, offset: 0 },
    { name: 'user_b', token: config.userBToken, offset: 1 },
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const u of users) {
      const { rows } = await client.query<{ id: string }>(
        'INSERT INTO users (name, token_hash) VALUES ($1, $2) RETURNING id',
        [u.name, sha256(u.token)],
      );
      for (const p of paymentsFor(u.offset)) await insertPayment(client, rows[0]!.id, u.name, p);
    }
    await client.query('COMMIT');
    console.log('seeded 2 users and 10 payments');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const pool = createPool();
  seed(pool)
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
