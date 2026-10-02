import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { platformSettings } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { getDb } from "./db/connection";
import { runCreditExpirationJob } from "./jobs/creditExpiration";

export const REFERRAL_EXPIRY_TASK_SETTING = "referral_credit_expiry_task_uid";

/** Dedicated project-owned Heartbeat, never callable as a logged-in user. */
export async function handleScheduledReferralCreditExpiry(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    let caller;
    try {
      caller = await sdk.authenticateRequest(req);
    } catch {
      return res.status(403).json({ error: "cron-only" });
    }
    if (!caller.isCron || !caller.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = caller.taskUid;
    const database = await getDb();
    if (!database) throw new Error("Database not available");
    const [configured] = await database.select({ settingValue: platformSettings.settingValue })
      .from(platformSettings)
      .where(eq(platformSettings.settingKey, REFERRAL_EXPIRY_TASK_SETTING)).limit(1);
    // A retired/unknown task is an orphan: 2xx prevents repeated retries.
    if (!configured || configured.settingValue !== taskUid) {
      return res.json({ ok: true, skipped: "orphan" });
    }
    const result = await runCreditExpirationJob();
    return res.json({ ok: true, ...result, processedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[CreditExpiration] Heartbeat failed", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url, taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
