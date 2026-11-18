import { createPool } from './client';
import { migrate } from './migrate';
import { seed } from './seed';

/** Drops everything, then migrates and seeds. Local development and CI only. */
async function reset(): Promise<void> {
  const pool = createPool();
  try {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await migrate(pool);
    await seed(pool);
  } finally {
    await pool.end();
  }
}

reset().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
