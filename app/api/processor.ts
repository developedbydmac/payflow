/**
 * Fake payment processor. No network calls.
 * Spec rule: a capture of exactly 666 cents is declined; every other amount is approved.
 */
export const DECLINED_AMOUNT_CENTS = 666;

export type CaptureDecision = { approved: true } | { approved: false; reason: string };

export function captureWithProcessor(amountCents: number): CaptureDecision {
  return amountCents === DECLINED_AMOUNT_CENTS
    ? { approved: false, reason: 'The card was declined' }
    : { approved: true };
}
