import { sql } from "drizzle-orm";
import { ENV } from "./_core/env";
import { getDb } from "./db/connection";
import { sseManager } from "./sseManager";

export type HealthState = "healthy" | "degraded";

export function summarizeSystemHealth(checks: Array<{ critical: boolean; ready: boolean }>): HealthState {
  return checks.some((check) => check.critical && !check.ready) ? "degraded" : "healthy";
}

export async function getSystemHealthSnapshot() {
  const databaseStartedAt = performance.now();
  let databaseReady = false;
  let databaseError: string | null = null;

  try {
    const database = await getDb();
    if (!database) throw new Error("Database connection is unavailable");
    await database.execute(sql`SELECT 1`);
    databaseReady = true;
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Database health check failed";
  }

  const databaseLatencyMs = Math.max(0, Math.round(performance.now() - databaseStartedAt));
  const paymentsReady = Boolean(ENV.stripeSecretKey && ENV.stripeWebhookSecret && ENV.partnerStripeAccountId);
  const emailReady = Boolean(ENV.sendgridApiKey);
  const smsReady = Boolean(ENV.twilioAccountSid && ENV.twilioAuthToken && (ENV.twilioPhoneNumber || ENV.twilioMessagingServiceSid));
  const googleReady = Boolean(ENV.googleClientId && ENV.googleClientSecret);
  const facebookReady = Boolean(ENV.facebookPageAccessToken && ENV.facebookPageId);
  const instagramReady = Boolean(ENV.instagramBusinessAccountId && ENV.facebookPageAccessToken);
  const linkedinReady = Boolean(ENV.linkedinAccessToken && ENV.linkedinOrganizationId);
  const memory = process.memoryUsage();

  const checks = [
    { critical: true, ready: databaseReady },
    { critical: true, ready: paymentsReady },
    { critical: true, ready: emailReady },
    { critical: false, ready: smsReady },
    { critical: true, ready: googleReady },
  ];

  return {
    status: summarizeSystemHealth(checks),
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
    database: {
      ready: databaseReady,
      latencyMs: databaseLatencyMs,
      error: databaseError,
    },
    realtime: {
      ready: true,
      connectedClients: sseManager.getTotalClients(),
      transport: "SSE" as const,
    },
    integrations: {
      payments: paymentsReady,
      email: emailReady,
      sms: smsReady,
      googleAuth: googleReady,
      facebook: facebookReady,
      instagram: instagramReady,
      linkedin: linkedinReady,
    },
  };
}
