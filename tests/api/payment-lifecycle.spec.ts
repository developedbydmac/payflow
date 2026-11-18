import { test, expect } from '../../framework/fixtures';
import { paymentFactory } from '../../framework/factories/payment-factory';
import type { Payment } from '../../framework/types';

test('user can create and capture a payment', { tag: '@smoke' }, async ({ userA }) => {
  const body = paymentFactory();

  // Create. The raw layer is used because the status code is part of what we check.
  const createResponse = await userA.raw.createPayment(body);
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as Payment;
  expect(created.status).toBe('authorized');
  expect(created.amount_cents).toBe(body.amount_cents);

  // Capture
  const captureResponse = await userA.raw.capture(created.id);
  expect(captureResponse.status()).toBe(200);
  const captured = (await captureResponse.json()) as Payment;
  expect(captured.status).toBe('captured');
  expect(captured.captured_cents).toBe(body.amount_cents);
});
