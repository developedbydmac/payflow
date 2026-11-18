import type { RequestHandler } from 'express';
import type { Pool } from 'pg';
import { sha256 } from '../db/client';
import { ApiError } from './errors';

export interface AuthUser {
  id: string;
  name: string;
}

/**
 * Requires `Authorization: Bearer <token>`. The token is hashed and matched against
 * users.token_hash, so the raw token is never stored or compared in the database.
 */
export function requireAuth(pool: Pool): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '');
    if (!match) throw new ApiError(401, 'unauthorized', 'Missing or malformed bearer token');

    const { rows } = await pool.query<AuthUser>(
      'SELECT id, name FROM users WHERE token_hash = $1',
      [sha256(match[1]!)],
    );
    if (!rows[0]) throw new ApiError(401, 'unauthorized', 'Invalid token');

    res.locals.user = rows[0];
    next();
  };
}
