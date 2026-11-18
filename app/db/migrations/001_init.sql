-- 001_init: users, payments and the append-only ledger.
-- Source of truth: docs/spec.md. The database enforces what it can; the API enforces the rest.

CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  token_hash  text NOT NULL UNIQUE   -- SHA-256 of the bearer token; the token itself is never stored
);

CREATE TABLE payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  amount_cents     integer NOT NULL CHECK (amount_cents BETWEEN 1 AND 1000000),
  currency         char(3) NOT NULL CHECK (currency IN ('USD', 'EUR', 'GBP')),
  status           text NOT NULL CHECK (
                     status IN ('authorized', 'captured', 'partially_refunded', 'refunded', 'declined')
                   ),
  description      text,
  captured_cents   integer NOT NULL DEFAULT 0 CHECK (captured_cents >= 0),
  refunded_cents   integer NOT NULL DEFAULT 0 CHECK (refunded_cents >= 0),
  idempotency_key  text NOT NULL,
  request_hash     text NOT NULL,    -- SHA-256 of the create body, to detect "same key, different body"
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- One key makes one payment per user, even when requests race. Keys are scoped per user.
  CONSTRAINT payments_user_idempotency_key_unique UNIQUE (user_id, idempotency_key),
  -- Backstops for the money rules. The API checks first and returns 409; these catch API bugs.
  CONSTRAINT payments_captured_not_over_amount CHECK (captured_cents <= amount_cents),
  CONSTRAINT payments_refunded_not_over_captured CHECK (refunded_cents <= captured_cents)
);

CREATE INDEX payments_user_created_idx ON payments (user_id, created_at DESC);

CREATE TABLE ledger_entries (
  id            bigserial PRIMARY KEY,
  payment_id    uuid NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  type          text NOT NULL CHECK (type IN ('authorize', 'capture', 'refund')),
  amount_cents  integer NOT NULL CHECK (amount_cents > 0),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ledger_entries_payment_idx ON ledger_entries (payment_id);

-- Ledger rules 1 and 2: at most one authorize and one capture per payment.
-- ("Exactly one" is the API's job, and the tests check it.)
CREATE UNIQUE INDEX ledger_one_authorize_per_payment ON ledger_entries (payment_id) WHERE type = 'authorize';
CREATE UNIQUE INDEX ledger_one_capture_per_payment ON ledger_entries (payment_id) WHERE type = 'capture';

-- Ledger rule 5: append-only. Updates, deletes and truncates are rejected.
CREATE FUNCTION ledger_entries_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only: % is not allowed', TG_OP;
END;
$$;

CREATE TRIGGER ledger_entries_no_update_delete
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_entries_append_only();

CREATE TRIGGER ledger_entries_no_truncate
  BEFORE TRUNCATE ON ledger_entries
  FOR EACH STATEMENT EXECUTE FUNCTION ledger_entries_append_only();
