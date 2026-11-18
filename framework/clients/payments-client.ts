import { randomUUID } from 'node:crypto';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CreatePaymentBody, Payment, PaymentList, PaymentStatus } from '../types';

export interface CreateOptions {
  /** Defaults to a fresh unique key. Pass a fixed key to test replays; pass null to omit the header. */
  idempotencyKey?: string | null;
}

export interface ListQuery {
  status?: PaymentStatus | string;
  limit?: number | string;
}

/**
 * Typed client for the payments API, bound to one user's authenticated request context.
 *
 * Two layers:
 *  - `client.createPayment(...)` etc. expect success and return typed data. Use them for setup
 *    and happy paths, so a test reads like the scenario it describes.
 *  - `client.raw.createPayment(...)` etc. return the raw APIResponse and never throw. Use them when
 *    the status code or error body is what the test is checking (400s, 404s, 409s...).
 */
export class PaymentsClient {
  readonly raw: RawPaymentsApi;

  constructor(request: APIRequestContext) {
    this.raw = new RawPaymentsApi(request);
  }

  async createPayment(body: CreatePaymentBody, options?: CreateOptions): Promise<Payment> {
    return expectOk<Payment>(await this.raw.createPayment(body, options), 'create payment');
  }

  async capture(id: string): Promise<Payment> {
    return expectOk<Payment>(await this.raw.capture(id), `capture ${id}`);
  }

  async refund(id: string, amountCents?: number): Promise<Payment> {
    const body = amountCents === undefined ? undefined : { amount_cents: amountCents };
    return expectOk<Payment>(await this.raw.refund(id, body), `refund ${id}`);
  }

  async list(query?: ListQuery): Promise<Payment[]> {
    return (await expectOk<PaymentList>(await this.raw.list(query), 'list payments')).data;
  }
}

/** Raw calls: any body, any status. Bodies are `unknown` on purpose, so tests can send invalid input. */
export class RawPaymentsApi {
  constructor(private readonly request: APIRequestContext) {}

  createPayment(body: unknown, options: CreateOptions = {}): Promise<APIResponse> {
    const key =
      options.idempotencyKey === undefined ? `test-${randomUUID()}` : options.idempotencyKey;
    return this.request.post('/api/payments', {
      data: body,
      headers: key === null ? {} : { 'Idempotency-Key': key },
    });
  }

  capture(id: string): Promise<APIResponse> {
    return this.request.post(`/api/payments/${id}/capture`);
  }

  refund(id: string, body?: unknown): Promise<APIResponse> {
    return this.request.post(
      `/api/payments/${id}/refunds`,
      body === undefined ? {} : { data: body },
    );
  }

  list(query: ListQuery = {}): Promise<APIResponse> {
    const params: Record<string, string> = {};
    if (query.status !== undefined) params.status = String(query.status);
    if (query.limit !== undefined) params.limit = String(query.limit);
    return this.request.get('/api/payments', { params });
  }
}

/** Fails with the status and body in the message, so a broken setup step is obvious in the report. */
async function expectOk<T>(response: APIResponse, action: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${action} failed: HTTP ${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as T;
}
