import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { summarizeSystemHealth } from "./systemHealth";

const projectRoot = resolve(import.meta.dirname, "..");
const adminSource = readFileSync(resolve(projectRoot, "client/src/pages/AdminDashboard.tsx"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/adminRouter.ts"), "utf8");

describe("admin system health", () => {
  it("reports healthy when every critical service is ready", () => {
    expect(summarizeSystemHealth([
      { critical: true, ready: true },
      { critical: true, ready: true },
      { critical: false, ready: false },
    ])).toBe("healthy");
  });

  it("reports degraded when any critical service is unavailable", () => {
    expect(summarizeSystemHealth([
      { critical: true, ready: true },
      { critical: true, ready: false },
    ])).toBe("degraded");
  });

  it("keeps health access admin-only and avoids exposing secret values", () => {
    expect(routerSource).toContain("getSystemHealth: adminProcedure.query");
    expect(adminSource).toContain("trpc.admin.getSystemHealth.useQuery");
    expect(adminSource).toContain("System Health");
    expect(adminSource).not.toContain("stripeSecretKey");
    expect(adminSource).not.toContain("sendgridApiKey");
  });
});
