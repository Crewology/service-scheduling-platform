type BookingPayment = {
  paymentType: "deposit" | "final" | "full" | "refund";
  status: "pending" | "authorized" | "captured" | "failed" | "refunded" | "cancelled";
  amount: string;
  refundAmount: string | null;
  currency: string | null;
  stripePaymentIntentId: string | null;
};

/** Decimal strings from the database are converted to integer cents before arithmetic. */
export function dollarsToCents(value: string): number {
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`Invalid monetary amount: ${value}`);
  }
  const [whole, fractional = ""] = value.split(".");
  return Number(whole) * 100 + Number(fractional.padEnd(2, "0"));
}

export function centsToDollars(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid cents");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/**
 * Count only actually captured booking charges in USD. Stripe uses a unique
 * payment-intent ID per payment row; duplicate/replayed webhooks upsert it.
 * A partially refunded charge can have status "refunded" while retaining net
 * captured funds. Clamp an abnormal over-refund to zero, never invent debt.
 */
export function netCapturedBookingCents(rows: BookingPayment[]): number {
  let total = 0;
  for (const row of rows) {
    if (!row.stripePaymentIntentId || row.currency?.toUpperCase() !== "USD") continue;
    if (row.paymentType === "refund" || (row.status !== "captured" && row.status !== "refunded")) continue;
    const captured = dollarsToCents(row.amount);
    const refunded = dollarsToCents(row.refundAmount || "0.00");
    total += Math.max(0, captured - refunded);
  }
  // Checkout and payment-intent events upsert by their unique Stripe intent ID;
  // different captured intents (deposit + final) are genuine funds received.
  return total;
}

/** Round half-up to the nearest cent, using integer arithmetic only. */
export function rewardCents(netCapturedCents: number, tierPercent: number): number {
  if (!Number.isSafeInteger(netCapturedCents) || netCapturedCents < 0 ||
      !Number.isInteger(tierPercent) || tierPercent < 0 || tierPercent > 100) {
    throw new Error("Invalid reward calculation");
  }
  return Math.floor((netCapturedCents * tierPercent + 50) / 100);
}

/** Allocate spent ledger entries to the earliest still-live earned credits. */
export function remainingCreditById(
  entries: Array<{ id: number; type: "earned" | "spent" | "expired"; amount: string; createdAt: Date; expiresAt: Date | null }>,
  now = new Date(),
): Map<number, number> {
  const earned: Array<{ id: number; remaining: number; expiresAt: number }> = [];
  for (const entry of [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id)) {
    if (entry.type === "earned") {
      earned.push({ id: entry.id, remaining: dollarsToCents(entry.amount), expiresAt: entry.expiresAt?.getTime() ?? Infinity });
    } else if (entry.type === "spent") {
      let spend = dollarsToCents(entry.amount);
      for (const credit of [...earned].sort((a, b) => a.expiresAt - b.expiresAt || a.id - b.id)) {
        if (credit.expiresAt <= entry.createdAt.getTime()) continue;
        const applied = Math.min(spend, credit.remaining);
        credit.remaining -= applied;
        spend -= applied;
        if (!spend) break;
      }
    }
    // 'expired' is a history marker; expiry dates on earnings control value.
  }
  return new Map(earned.map(credit => [credit.id, credit.expiresAt > now.getTime() ? credit.remaining : 0]));
}
