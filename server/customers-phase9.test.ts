import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const workspaceSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomers.tsx"), "utf8");
const detailSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
const helpSource = fs.readFileSync(path.join(root, "client/src/pages/HelpCenter.tsx"), "utf8");

describe("Customers Phase 9 stabilization contracts", () => {
  it("describes confirmed in-app sending accurately without implying automation or booking changes", () => {
    expect(workspaceSource).toContain("In-app messages send only from a reviewed draft after confirmation and current customer permission.");
    expect(workspaceSource).toContain("Nothing runs automatically or changes a booking.");
    expect(workspaceSource).not.toContain("Nothing here sends a message");
  });

  it("explains lifecycle read-only behavior and retained private data on both Customers screens", () => {
    for (const text of [
      "Customer history is available, but private tools are paused",
      "Starter keeps relationship history visible.",
      "Existing private records are retained.",
      'href="/provider/subscription"',
    ]) expect(workspaceSource).toContain(text);

    for (const text of [
      "Private tools are paused on your current plan",
      "Pro or Business is required to view or add private notes",
      "Existing private records are retained and return when qualifying access is restored.",
      'href="/provider/subscription"',
    ]) expect(detailSource).toContain(text);
  });

  it("publishes customer-controlled consent and provider private-tool support guidance", () => {
    for (const text of [
      "Provider Relationship Messages",
      "Permission is off by default.",
      "does not enable marketing email, SMS, push notifications, bulk messages, or automatic follow-ups",
      'link: "/notification-settings"',
      "Using Customers During the Private Pilot",
      "Existing source records remain authoritative.",
      "Nothing runs automatically.",
      "existing private records are retained but hidden until qualifying access returns",
      'link: "/provider/customers"',
    ]) expect(helpSource).toContain(text);
  });

  it("does not add AI, recommendations, automation, bulk actions, schedules, exports, segments, or public rollout controls", () => {
    expect(workspaceSource).not.toMatch(/Generate draft|Recommended follow-up|Export CSV|Save segment|Bulk message|Schedule message/);
    expect(detailSource).not.toMatch(/Generate draft|Recommended follow-up|Export CSV|Save segment|Bulk message|Schedule message/);
  });
});
