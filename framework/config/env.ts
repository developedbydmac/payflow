/**
 * Test environment config. Select one with TEST_ENV=<name> (default: local).
 * Individual values can be overridden with BASE_URL, DATABASE_URL, USER_A_TOKEN and USER_B_TOKEN,
 * so CI can point the same suite somewhere else without code changes.
 */
export interface TestUser {
  key: 'a' | 'b';
  name: string;
  token: string;
}

export interface TestEnvironment {
  name: string;
  baseURL: string;
  databaseUrl: string;
  users: { a: TestUser; b: TestUser };
}

const environments: Record<string, Omit<TestEnvironment, 'name'>> = {
  local: {
    baseURL: 'http://localhost:3000',
    databaseUrl: 'postgres://payflow:payflow@localhost:5432/payflow',
    users: {
      a: { key: 'a', name: 'user_a', token: 'dev-token-user-a' },
      b: { key: 'b', name: 'user_b', token: 'dev-token-user-b' },
    },
  },
};

export function loadEnvironment(): TestEnvironment {
  const name = process.env.TEST_ENV ?? 'local';
  const base = environments[name];
  if (!base) {
    throw new Error(
      `Unknown TEST_ENV "${name}". Valid options: ${Object.keys(environments).join(', ')}`,
    );
  }
  return {
    name,
    baseURL: process.env.BASE_URL ?? base.baseURL,
    databaseUrl: process.env.DATABASE_URL ?? base.databaseUrl,
    users: {
      a: { ...base.users.a, token: process.env.USER_A_TOKEN ?? base.users.a.token },
      b: { ...base.users.b, token: process.env.USER_B_TOKEN ?? base.users.b.token },
    },
  };
}

export const env = loadEnvironment();
