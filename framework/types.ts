/** API shapes, written from docs/spec.md. If the spec changes, change these first. */

export type Currency = 'USD' | 'EUR' | 'GBP';

export type PaymentStatus =
  'authorized' | 'captured' | 'partially_refunded' | 'refunded' | 'declined';

export interface CreatePaymentBody {
  amount_cents: number;
  currency: Currency;
  description?: string | null;
}

export interface Payment {
  id: string;
  amount_cents: number;
  currency: Currency;
  status: PaymentStatus;
  description: string | null;
  captured_cents: number;
  refunded_cents: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentList {
  data: Payment[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; field?: string };
}
