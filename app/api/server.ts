import express from 'express';
import type { Pool } from 'pg';
import { createPool } from '../db/client';
import { requireAuth } from './auth';
import { errorHandler } from './errors';
import { paymentsRouter } from './payments';

export function createApp(pool: Pool) {
  const app = express();
  app.use(express.json());

  // No auth: used by the Docker Compose healthcheck.
  app.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api', requireAuth(pool), paymentsRouter(pool));
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 3000);
  createApp(createPool()).listen(port, () => {
    console.log(`PayFlow API listening on http://localhost:${port}`);
  });
}
