import { expireOldCredits, getCreditsExpiringSoon, warnExpiringCredit } from "../db/referrals";

/** Run only from the authenticated project Heartbeat handler, never on server startup. */
export async function runCreditExpirationJob(): Promise<{ expired: number; warnings: number }> {
  const expired = await expireOldCredits();
  let warnings = 0;
  for (const credit of await getCreditsExpiringSoon(7)) {
    if (await warnExpiringCredit(credit.id)) warnings++;
  }
  // Failures intentionally propagate: Heartbeat retries and per-credit markers
  // prevent already committed notifications or expiry entries from duplicating.
  console.info(`[CreditExpiration] Expired: ${expired}, warnings persisted: ${warnings}`);
  return { expired, warnings };
}
