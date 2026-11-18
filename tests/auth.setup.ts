import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { env } from '../framework/config/env';
import { TOKEN_COOKIE, authStatePath } from '../framework/fixtures/auth-state';

/**
 * Setup project: runs once before the api and ui projects (see playwright.config.ts).
 * For each seeded user it checks the token really works, then saves a Playwright auth state
 * (storageState) holding the pf_token cookie. Tests never log in themselves; they reuse these files.
 */
for (const user of [env.users.a, env.users.b]) {
  setup(`authenticate ${user.name}`, async ({ request }) => {
    const response = await request.get('/api/payments?limit=1', {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    expect(response.status(), `${user.name}'s token was rejected by ${env.baseURL}`).toBe(200);

    const path = authStatePath(user);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify(
        {
          cookies: [
            {
              name: TOKEN_COOKIE,
              value: user.token,
              domain: new URL(env.baseURL).hostname,
              path: '/',
              expires: -1,
              httpOnly: true,
              secure: false,
              sameSite: 'Lax',
            },
          ],
          origins: [],
        },
        null,
        2,
      ),
    );
  });
}
