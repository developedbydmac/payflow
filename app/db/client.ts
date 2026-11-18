import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { Pool } from 'pg';

// Load .env if present; otherwise fall back to the local defaults in .env.example.
if (existsSync('.env')) process.loadEnvFile('.env');

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://payflow:payflow@localhost:5432/payflow',
  userAToken: process.env.USER_A_TOKEN ?? 'dev-token-user-a',
  userBToken: process.env.USER_B_TOKEN ?? 'dev-token-user-b',
};

export function createPool(): Pool {
  return new Pool({ connectionString: config.databaseUrl });
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Hash of a create-payment body, used to spot "same idempotency key, different body". */
export function requestHash(body: {
  amount_cents: number;
  currency: string;
  description?: string | null;
}): string {
  return sha256(
    JSON.stringify({
      amount_cents: body.amount_cents,
      currency: body.currency,
      description: body.description ?? null,
    }),
  );
}
