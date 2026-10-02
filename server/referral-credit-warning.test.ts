import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifications, referralCredits } from "../drizzle/schema";

const { getDb, pushUnreadCount, getUnreadCount } = vi.hoisted(() => ({
  getDb: vi.fn(), pushUnreadCount: vi.fn(), getUnreadCount: vi.fn().mockResolvedValue(1),
}));
vi.mock("./db/connection", () => ({ getDb }));
vi.mock("./sseManager", () => ({ sseManager: { pushUnreadCount } }));
vi.mock("./db/notifications", () => ({ getUnreadCount }));
import { warnExpiringCredit } from "./db/referrals";

function setup(spent = "0.00") {
  const credit = { id: 55, userId: 9, type: "earned" as const, amount: "10.00", createdAt: new Date(Date.now() - 85 * 86_400_000),
    expiresAt: new Date(Date.now() + 5 * 86_400_000), warningNotifiedAt: null as Date | null };
  const ledger = [{ id: 55, userId: 9, type: "earned" as const, amount: "10.00", createdAt: credit.createdAt, expiresAt: credit.expiresAt },
    ...(spent === "0.00" ? [] : [{ id: 56, userId: 9, type: "spent" as const, amount: spent, createdAt: new Date(Date.now() - 2 * 86_400_000), expiresAt: null }])];
  const notices: any[] = [];
  const database: any = {
    transaction: async (fn: (tx: any) => Promise<any>) => fn(database),
    select: () => ({ from: (table: any) => ({ where: () => {
      if (table !== referralCredits) throw new Error("Unexpected table");
      const query: any = {
        limit: () => query, for: () => query,
        then(resolve: any, reject: any) {
          const selected = query.isLedger ? ledger : [credit];
          return Promise.resolve(selected).then(resolve, reject);
        },
      };
      // The first selection in each transaction selects a single locked credit;
      // the second loads its full ledger for spend attribution.
      query.isLedger = Boolean(database.ledgerNext);
      database.ledgerNext = true;
      return query;
    } }) }),
    insert: (table: any) => ({ values: async (row: any) => {
      if (table !== notifications) throw new Error("Unexpected table");
      notices.push(row);
    } }),
    update: (table: any) => ({ set: (changes: any) => ({ where: async () => {
      if (table !== referralCredits) throw new Error("Unexpected table");
      credit.warningNotifiedAt = changes.warningNotifiedAt;
      database.ledgerNext = false;
    } }) }),
  };
  getDb.mockResolvedValue(database);
  return { credit, notices, database };
}

beforeEach(() => vi.clearAllMocks());

describe("durable expiring-credit alerts", () => {
  it("commits one in-app notification and timestamp, then skips the retry", async () => {
    const { credit, notices } = setup();
    expect(await warnExpiringCredit(55)).toBe(true);
    expect(credit.warningNotifiedAt).toBeInstanceOf(Date);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ userId: 9, notificationType: "referral_credit_expiring", actionUrl: "/referrals" });
    expect(await warnExpiringCredit(55)).toBe(false);
    expect(notices).toHaveLength(1);
  });
  it("does not warn for a credit already spent in full", async () => {
    const { notices } = setup("10.00");
    expect(await warnExpiringCredit(55)).toBe(false);
    expect(notices).toHaveLength(0);
  });
  it("persists the notification even when live SSE delivery is unavailable", async () => {
    const { notices } = setup();
    pushUnreadCount.mockImplementationOnce(() => { throw new Error("SSE unavailable"); });
    expect(await warnExpiringCredit(55)).toBe(true);
    expect(notices).toHaveLength(1);
  });
});
