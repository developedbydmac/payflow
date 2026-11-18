# PayFlow app spec

PayFlow is a tiny payments app that exists only to be tested. It has no real money, no real cards, and no outside services. Budget: about 6 hours in total. **App features freeze on Sat Nov 21, 2026.**

## Stack

- Node + TypeScript + Express, in `app/` (`app/api`, `app/web`, `app/db`)
- Postgres 16 through `pg`, with SQL migrations and a seed script
- A fake payment processor inside the app (`app/api/processor.ts`), with no network calls
- Server-rendered HTML for the two pages, with no frontend framework
- Every interactive element has a `data-testid`

## Users and auth

There are two seeded users, **user A** and **user B**. Each has a bearer token, read from the environment (`USER_A_TOKEN` and `USER_B_TOKEN`). The database stores only a SHA-256 hash of each token.

- **API:** every `/api/*` request needs `Authorization: Bearer <token>`. If the header is missing or the token is unknown, the API returns `401`.
- **Pages:** the pages read the same token from a `pf_token` cookie. There is no login page. Tests set the cookie through Playwright's saved auth state. For manual use, `GET /dev/login/:user` sets the cookie, and that route is turned off when `NODE_ENV=production`.

**Ownership:** every payment belongs to the user who created it. A user acting on another user's payment gets `404`, not `403`, so the API never confirms that someone else's payment exists.

## Errors

Every error has the same shape: `{ "error": { "code": "validation_error", "message": "...", "field": "amount_cents" } }`

| Status | When                                                                     |
| ------ | ------------------------------------------------------------------------ |
| 400    | Validation failed, or the `Idempotency-Key` header is missing            |
| 401    | Token missing or invalid                                                 |
| 402    | The fake processor declined the capture                                  |
| 404    | Payment not found, or it belongs to another user                         |
| 409    | Invalid state change, or an idempotency key reused with a different body |

## Endpoints

| #   | Method and path                  | Body                                                                         | Success                                                                    |
| --- | -------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `POST /api/payments`             | `{ amount_cents, currency, description? }`, plus an `Idempotency-Key` header | `201` with the payment, status `authorized`                                |
| 2   | `POST /api/payments/:id/capture` | none                                                                         | `200`, status `captured`                                                   |
| 3   | `POST /api/payments/:id/refunds` | `{ amount_cents? }` (omitted means the full remaining amount)                | `201`, status `partially_refunded` or `refunded`                           |
| 4   | `GET /api/payments`              | query `?status=&limit=` (limit defaults to 20, max 100)                      | `200` with `{ data: Payment[] }`: only the caller's payments, newest first |

### Rules

- **Money:** `amount_cents` is an integer from 1 to 1,000,000, in minor units. Zero, negative, decimal (`10.5`) and string amounts are rejected with `400`. `currency` is one of `USD`, `EUR` or `GBP`.
- **Idempotency:** every create needs an `Idempotency-Key` header. Keys are scoped per user, so user A and user B can use the same key without a clash.
  - The same key with the same body returns `200` and the original payment. No new row is written.
  - The same key with a different body returns `409`.
  - Two requests with the same key **at the same time** still create one payment. A unique constraint on `(user_id, idempotency_key)` enforces this in the database, not only in code.
- **Capture:** only an `authorized` payment can be captured. A second capture returns `409`.
- **Fake processor:** a capture with `amount_cents = 666` is declined. The API returns `402`, the payment's status becomes `declined`, and no `capture` ledger entry is written. Every other amount is approved.
- **Refunds:** only a `captured` or `partially_refunded` payment can be refunded. The total refunded can never exceed the captured amount, so a refund after a full refund returns `409`. A refund of zero or less returns `400`.
- **Status flow:** `authorized` → `captured` → `partially_refunded` → `refunded`, or `authorized` → `declined`.
- **Transactions:** each state change updates the payment row and writes its ledger entry in one database transaction, holding a row lock (`SELECT ... FOR UPDATE`) on the payment.

## Database

**users**: `id uuid pk`, `name text`, `token_hash text unique`

**payments**: `id uuid pk`, `user_id uuid fk`, `amount_cents int`, `currency char(3)`, `status text`, `description text null`, `captured_cents int default 0`, `refunded_cents int default 0`, `idempotency_key text`, `request_hash text`, `created_at`, `updated_at`, with `unique (user_id, idempotency_key)`

**ledger_entries** (append-only): `id bigserial pk`, `payment_id uuid fk`, `type text` (`authorize`, `capture` or `refund`), `amount_cents int`, `created_at`

These ledger rules are what the database tests assert:

1. Every payment has exactly one `authorize` entry.
2. A captured payment has exactly one `capture` entry, equal to `amount_cents`. A declined payment has none.
3. The sum of a payment's `refund` entries equals `refunded_cents` and never exceeds `captured_cents`.
4. One idempotency key produces one payment and one `authorize` entry, even under concurrent requests.
5. Ledger rows are never updated or deleted.

**Seed data:** user A and user B, each with one payment in each status.

## Pages

Both pages show only the signed-in user's payments.

- **`/checkout`:** a form with an amount, a currency select and a description. The Pay button creates and captures the payment. On success, a confirmation panel shows the payment ID and its status. Validation and decline errors appear inline next to the relevant field.
- **`/dashboard`:** a table of payments (ID, amount, currency, status and created time), a filter by status, and a Refund button on refundable rows.

## Out of scope

Real cards, signup and login flows, webhooks, multiple tenants, and anything to do with AI. The app is a prop.
