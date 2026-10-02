import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const { authenticateRequest, getDb, runCreditExpirationJob } = vi.hoisted(() => ({
  authenticateRequest: vi.fn(), getDb: vi.fn(), runCreditExpirationJob: vi.fn(),
}));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest } }));
vi.mock("./db/connection", () => ({ getDb }));
vi.mock("./jobs/creditExpiration", () => ({ runCreditExpirationJob }));
import { handleScheduledReferralCreditExpiry, REFERRAL_EXPIRY_TASK_SETTING } from "./scheduledReferralCreditExpiry";

function response() {
  const res: { statusCode: number; payload: any; status: any; json: any } = {
    statusCode: 200, payload: null,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.payload = payload; return this; },
  };
  return res;
}
const request = { url: "/api/scheduled/referral-credit-expiry", body: { taskUid: "untrusted-body" } } as Request;
function database(taskUid?: string) {
  return { select: () => ({ from: () => ({ where: () => ({ limit: async () => taskUid ? [{ settingValue: taskUid }] : [] }) }) }) };
}

beforeEach(() => {
  vi.resetAllMocks();
  authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "cron_authorized" });
  getDb.mockResolvedValue(database("cron_authorized"));
  runCreditExpirationJob.mockResolvedValue({ expired: 1, warnings: 2 });
});

describe("project referral credit expiry Heartbeat", () => {
  it("persists a named task-UID setting and never trusts the request body", () => {
    expect(REFERRAL_EXPIRY_TASK_SETTING).toBe("referral_credit_expiry_task_uid");
  });
  it("rejects ordinary users and missing credentials before querying DB", async () => {
    for (const caller of [{ isCron: false, taskUid: "cron_authorized" }, { isCron: true, taskUid: null }]) {
      authenticateRequest.mockResolvedValueOnce(caller);
      const res = response();
      await handleScheduledReferralCreditExpiry(request, res as unknown as Response);
      expect(res.statusCode).toBe(403);
    }
    authenticateRequest.mockRejectedValueOnce(new Error("No session"));
    const res = response();
    await handleScheduledReferralCreditExpiry(request, res as unknown as Response);
    expect(res.statusCode).toBe(403);
    expect(getDb).not.toHaveBeenCalled();
    expect(runCreditExpirationJob).not.toHaveBeenCalled();
  });
  it("skips missing or mismatched retired task UIDs with success response", async () => {
    for (const stored of [undefined, "cron_old"]) {
      getDb.mockResolvedValueOnce(database(stored));
      const res = response();
      await handleScheduledReferralCreditExpiry(request, res as unknown as Response);
      expect(res.payload).toEqual({ ok: true, skipped: "orphan" });
    }
    expect(runCreditExpirationJob).not.toHaveBeenCalled();
  });
  it("executes once for matching authenticated task", async () => {
    const res = response();
    await handleScheduledReferralCreditExpiry(request, res as unknown as Response);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ ok: true, expired: 1, warnings: 2 });
    expect(runCreditExpirationJob).toHaveBeenCalledTimes(1);
  });
  it("returns structured 500 for database/job failure so Heartbeat retries", async () => {
    runCreditExpirationJob.mockRejectedValueOnce(new Error("temporarily unavailable"));
    const res = response();
    await handleScheduledReferralCreditExpiry(request, res as unknown as Response);
    expect(res.statusCode).toBe(500);
    expect(res.payload).toMatchObject({ error: "temporarily unavailable", context: { url: request.url, taskUid: "cron_authorized" } });
  });
});
