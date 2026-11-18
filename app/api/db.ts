import type { Pool, PoolClient } from 'pg';

/**
 * Runs `work` inside one database transaction.
 * Everything `work` does is saved together on COMMIT, or undone together on ROLLBACK.
 */
export async function withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // ── transaction starts ──
    const result = await work(client);
    await client.query('COMMIT'); // ── transaction ends: all changes saved, row locks released ──
    return result;
  } catch (err) {
    await client.query('ROLLBACK'); // ── transaction ends: all changes undone, row locks released ──
    throw err;
  } finally {
    client.release();
  }
}
