import { randomUUID } from 'node:crypto';
import type { CreatePaymentBody } from '../types';

/**
 * A fixed, approved default amount. Fixed (not random) so a failing test reproduces exactly and
 * reads clearly in the report. It is not 666, which the fake processor declines.
 * Tests that care about the amount pass it explicitly, so the important value is visible in the test.
 */
export const DEFAULT_AMOUNT_CENTS = 2500;

/** Returns a valid create-payment body. Pass overrides for anything the test cares about. */
export function paymentFactory(overrides: Partial<CreatePaymentBody> = {}): CreatePaymentBody {
  const defaults: CreatePaymentBody = {
    amount_cents: DEFAULT_AMOUNT_CENTS,
    currency: 'USD',
    // Unique per call, so you can tell in the database which test created which row.
    description: `test payment ${randomUUID()}`,
  };
  // Defaults first, overrides second: later keys replace earlier ones, so overrides always win.
  return { ...defaults, ...overrides };
}
