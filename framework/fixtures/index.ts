import { test as base, type PlaywrightWorkerArgs } from '@playwright/test';
import { PaymentsClient } from '../clients/payments-client';
import { env, type TestEnvironment, type TestUser } from '../config/env';
import { tokenFromAuthState } from './auth-state';

interface PayflowFixtures {
  /** The selected test environment (framework/config/env.ts). */
  env: TestEnvironment;
  /** API client signed in as user A. */
  userA: PaymentsClient;
  /** API client signed in as user B, for authorization tests. */
  userB: PaymentsClient;
  /** API client with no token, for 401 tests. */
  anonymous: PaymentsClient;
}

/**
 * The project's `test`. Specs import `test` and `expect` from here, never from '@playwright/test',
 * so every test gets these fixtures by naming them: `async ({ userA }) => { ... }`.
 */
export const test = base.extend<PayflowFixtures>({
  // Playwright reads fixture dependencies from the destructured first argument, so it must be `{}`.
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    await use(env);
  },

  userA: async ({ playwright, env }, use) => {
    await withClient(playwright, env, env.users.a, use);
  },

  userB: async ({ playwright, env }, use) => {
    await withClient(playwright, env, env.users.b, use);
  },

  anonymous: async ({ playwright, env }, use) => {
    const request = await playwright.request.newContext({ baseURL: env.baseURL });
    await use(new PaymentsClient(request));
    await request.dispose();
  },
});

export { expect } from '@playwright/test';

/** Setup → hand the client to the test → teardown. Everything after `use` runs when the test ends. */
async function withClient(
  playwright: PlaywrightWorkerArgs['playwright'],
  env: TestEnvironment,
  user: TestUser,
  use: (client: PaymentsClient) => Promise<void>,
) {
  const request = await playwright.request.newContext({
    baseURL: env.baseURL,
    extraHTTPHeaders: { Authorization: `Bearer ${tokenFromAuthState(user)}` },
  });
  await use(new PaymentsClient(request));
  await request.dispose();
}
