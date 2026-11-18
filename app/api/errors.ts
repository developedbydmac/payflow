import type { ErrorRequestHandler } from 'express';

/** An error the API returns on purpose, in the spec's error shape. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
  }
}

export const notFound = () => new ApiError(404, 'not_found', 'Payment not found');

/** Turns every error into `{ error: { code, message, field? } }`. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.field && { field: err.field }) },
    });
    return;
  }
  // Malformed JSON body, rejected by express.json().
  if (err?.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ error: { code: 'validation_error', message: 'Body is not valid JSON' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong' } });
};
