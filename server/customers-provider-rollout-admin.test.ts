import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_ADMIN_EMAILS,
  hasAdminClearance,
  isApprovedAdminEmail,
  normalizeNamedAdminClearance,
} from "./adminPolicy";

function user(email: string, role: "admin" | "provider" | "customer" = "admin") {
  return { role, email } as never;
}

describe("Named administrator clearance", () => {
  it("contains exactly the two owner-approved production administrator identities", () => {
    expect(APPROVED_ADMIN_EMAILS).toEqual([
      "garychisolm30@gmail.com",
      "wwilliams@visionkwest.com",
    ]);
    expect(isApprovedAdminEmail("GARYCHISOLM30@GMAIL.COM")).toBe(true);
    expect(isApprovedAdminEmail("wwilliams@visionkwest.com")).toBe(true);
    expect(isApprovedAdminEmail("ologycrew5@gmail.com")).toBe(false);
    expect(isApprovedAdminEmail("rlstephens42@comcast.net")).toBe(false);
  });

  it("requires both an admin role and an approved identity", () => {
    expect(hasAdminClearance(user("garychisolm30@gmail.com"))).toBe(true);
    expect(hasAdminClearance(user("wwilliams@visionkwest.com"))).toBe(true);
    expect(hasAdminClearance(user("ologycrew5@gmail.com"))).toBe(false);
    expect(hasAdminClearance(user("garychisolm30@gmail.com", "provider"))).toBe(false);
  });

  it("normalizes any unapproved legacy admin before route checks", () => {
    const normalized = normalizeNamedAdminClearance({ role: "admin", email: "ologycrew5@gmail.com", adminRole: "super_admin" } as never);
    expect(normalized).toMatchObject({ role: "customer", adminRole: null });
    expect(normalizeNamedAdminClearance({ role: "admin", email: "wwilliams@visionkwest.com", adminRole: "super_admin" } as never)).toMatchObject({ role: "admin", adminRole: "super_admin" });
  });
});

describe("Named administrator source contracts", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const context = fs.readFileSync(path.join(root, "server/_core/context.ts"), "utf8");
  const trpc = fs.readFileSync(path.join(root, "server/_core/trpc.ts"), "utf8");
  const users = fs.readFileSync(path.join(root, "server/db/users.ts"), "utf8");
  const admin = fs.readFileSync(path.join(root, "server/adminRouter.ts"), "utf8");
  const crmOperations = fs.readFileSync(path.join(root, "server/crmOperationsRouter.ts"), "utf8");
  const terms = fs.readFileSync(path.join(root, "server/termsRouter.ts"), "utf8");
  const social = fs.readFileSync(path.join(root, "server/routers/socialMediaRouter.ts"), "utf8");
  const verification = fs.readFileSync(path.join(root, "server/verificationRouter.ts"), "utf8");

  it("normalizes authentication centrally and applies the policy to shared and owner guards", () => {
    expect(context).toContain("normalizeNamedAdminClearance(await sdk.authenticateRequest(opts.req))");
    expect(trpc).toContain("hasAdminClearance(ctx.user)");
    expect(admin).toContain("hasAdminClearance(ctx.user)");
    expect(crmOperations).toContain("hasAdminClearance(ctx.user)");
    expect(terms).toContain("hasAdminClearance(ctx.user)");
    expect(social).toContain("hasAdminClearance(ctx.user)");
    expect(verification).toContain("hasAdminClearance(ctx.user)");
  });

  it("removes the stale auto-promotion identity and restricts future promotions", () => {
    expect(users).toContain("isApprovedAdminEmail(user.email)");
    expect(users).not.toContain("rlstephens42@comcast.net");
    expect(admin).toContain("Administrative clearance is restricted to the approved administrator identities");
    expect(admin.match(/isApprovedAdminEmail\(user\.email\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(admin).toContain("members.filter(member => isApprovedAdminEmail(member.email))");
    expect(admin).toContain("matches.filter(user => isApprovedAdminEmail(user.email))");
  });
});
