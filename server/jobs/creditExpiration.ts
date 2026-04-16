/**
 * Credit Expiration Job
 * 
 * Runs periodically to:
 * 1. Expire earned credits that have passed their expiresAt date
 * 2. Send warning notifications for credits expiring within 7 days
 */
import { expireOldCredits, getCreditsExpiringSoon } from "../db/referrals";

/**
 * Run the credit expiration job.
 * Should be called periodically (e.g., once per day via cron or on server startup).
 */
export async function runCreditExpirationJob(): Promise<{ expired: number; warnings: number }> {
  console.log("[CreditExpiration] Starting credit expiration job...");

  // 1. Expire old credits
  let expired = 0;
  try {
    expired = await expireOldCredits();
    if (expired > 0) {
      console.log(`[CreditExpiration] Expired ${expired} credit(s)`);
    }
  } catch (err) {
    console.error("[CreditExpiration] Error expiring credits:", err);
  }

  // 2. Get credits expiring within 7 days (for future notification use)
  let warnings = 0;
  try {
    const expiringSoon = await getCreditsExpiringSoon(7);
    warnings = expiringSoon.length;
    if (warnings > 0) {
      console.log(`[CreditExpiration] ${warnings} credit(s) expiring within 7 days`);
      // Future: send notification to users about expiring credits
      // For now, just log it. Notifications can be wired in later.
    }
  } catch (err) {
    console.error("[CreditExpiration] Error checking expiring credits:", err);
  }

  console.log(`[CreditExpiration] Job complete. Expired: ${expired}, Warnings: ${warnings}`);
  return { expired, warnings };
}

/**
 * Schedule the credit expiration job to run every 24 hours.
 * Call this once during server startup.
 */
let expirationInterval: ReturnType<typeof setInterval> | null = null;

export function startCreditExpirationScheduler() {
  // Run immediately on startup
  runCreditExpirationJob().catch(err => {
    console.error("[CreditExpiration] Initial run failed:", err);
  });

  // Then run every 24 hours
  expirationInterval = setInterval(() => {
    runCreditExpirationJob().catch(err => {
      console.error("[CreditExpiration] Scheduled run failed:", err);
    });
  }, 24 * 60 * 60 * 1000);

  console.log("[CreditExpiration] Scheduler started (runs every 24 hours)");
}

export function stopCreditExpirationScheduler() {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
    console.log("[CreditExpiration] Scheduler stopped");
  }
}
