import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TestUser } from '../config/env';

/** The cookie the pages read the token from (docs/spec.md, "Users and auth"). */
export const TOKEN_COOKIE = 'pf_token';

/** Where the setup project saves each user's auth state. Git-ignored. */
export function authStatePath(user: TestUser): string {
  return join(process.cwd(), '.auth', `user-${user.key}.json`);
}

/**
 * Reads a user's token back out of their saved auth state.
 * API fixtures and (from Dec 4) UI tests both use the same saved file, so there's one source of truth.
 */
export function tokenFromAuthState(user: TestUser): string {
  const state = JSON.parse(readFileSync(authStatePath(user), 'utf8')) as {
    cookies: Array<{ name: string; value: string }>;
  };
  const cookie = state.cookies.find((c) => c.name === TOKEN_COOKIE);
  if (!cookie) {
    throw new Error(
      `No ${TOKEN_COOKIE} cookie in ${authStatePath(user)}. Did the setup project run?`,
    );
  }
  return cookie.value;
}
