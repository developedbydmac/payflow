# PayFlow app spec

PayFlow is a tiny payments app that exists only to be tested. It has no real money, no real cards, and no outside services. Budget: about 8 hours in total. After Sprint 1, no new app features.

## Stack

- Node + TypeScript + Express, in `app/`
- Postgres 16 through `pg`, with SQL migrations and a seed script
- Server-rendered HTML for the two pages, with no frontend framework
- Every interactive element has a `data-testid`

## Auth

Every `/api/*` request needs `Authorization: Bearer <API_KEY>`, where `API_KEY` comes from the environment. If the header is missing or wrong, the API returns `401`.

## Errors

Every error has the same shape: `{ "error": { "code": "validation_error", "message": "...", "field": "amount_cents" } }`

| Status | When                                                                     |
| ------ | ------------------------------------------------------------------------ |
| 400    | Validation failed                                                        |
| 401    | Auth header missing or invalid                                           |
| 404    | Payment not found                                                        |
| 409    | Invalid state change, or an idempotency key reused with a different body |

## Endpoints

| #   | Method and path                  | Body                                                          | Success                                          |
| --- | -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `POST /api/payments`             | `{ amount_cents, currency, description? }`                    | `201` with the payment, status `authorized`      |
| 2   | `POST /api/payments/:id/capture` | none                                                          | `200`, status `captured`                         |
| 3   | `POST /api/payments/:id/refunds` | `{ amount_cents? }` (omitted means the full remaining amount) | `201`, status `partially_refunded` or `refunded` |
| 4   | `GET /api/payments`              | query `?status=&limit=` (limit defaults to 20, max 100)       | `200` with `{ data: Payment[] }`, newest first   |

### Rules

- `amount_cents` is an integer from 1 to 1,000,000. `currency` is one of `USD`, `EUR` or `GBP`.
- **Idempotency:** a create request with an `Idempotency-Key` header that was already used with the same body returns `200` and the original payment, and no new row is written. If the key was used with a different body, the API returns `409`.
- Only an `authorized` payment can be captured. Capturing any other status returns `409`.
- Only a `captured` or `partially_refunded` payment can be refunded. The total refunded can never exceed the captured amount, and a refund that would exceed it returns `409`.
- Status flow: `authorized` → `captured` → `partially_refunded` → `refunded`.

## Database

**payments**: `id uuid pk`, `amount_cents int`, `currency char(3)`, `status text`, `description text null`, `captured_cents int default 0`, `refunded_cents int default 0`, `idempotency_key text unique null`, `request_hash text null`, `created_at`, `updated_at`

**ledger_entries** (append-only): `id bigserial pk`, `payment_id uuid fk`, `type text` (`authorize`, `capture` or `refund`), `amount_cents int`, `created_at`

These invariants are what the database tests in Sprint 2 assert:

1. Every payment has exactly one `authorize` entry.
2. A captured payment has exactly one `capture` entry, equal to `amount_cents`.
3. The sum of a payment's `refund` entries equals `refunded_cents` and is never more than `captured_cents`.
4. Ledger rows are never updated or deleted.

**Seed data:** five payments, one in each status, plus one large payment for the dashboard.

## Pages

**`/checkout`:** a form with an amount, a currency select and a description. The Pay button creates and captures the payment. On success, a confirmation panel shows the payment ID and its status. Validation errors appear inline next to the field.

**`/dashboard`:** a table of payments (ID, amount, currency, status and created time), a filter by status, and a Refund button on refundable rows.

## Out of scope

Real cards, customers, users and login, webhooks, multiple tenants, and anything to do with AI. The app is a prop.
