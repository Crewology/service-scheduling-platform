import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const workspaceSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomers.tsx"), "utf8");
const detailSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
const healthSource = fs.readFileSync(path.join(root, "client/src/pages/admin/CustomersPilotHealthPanel.tsx"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "server/customersRouter.ts"), "utf8");

describe("Customers Phase 12 completion UI states", () => {
  it("provides loading, unavailable, request-error, empty-follow-up, and recovery paths in the workspace", () => {
    expect(workspaceSource).toContain("if (access.isLoading) return <CustomersSkeleton />");
    expect(workspaceSource).toContain("if (workspace.isLoading) return <CustomersSkeleton />");
    expect(workspaceSource).toContain("Customers is not available for this account");
    expect(workspaceSource).toContain("We couldn’t load Customers");
    expect(workspaceSource).toContain("Your booking and customer data were not changed.");
    expect(workspaceSource).toContain("No follow-ups yet");
    expect(workspaceSource).toContain("Return to Overview");
  });

  it("provides relationship loading, provider-safe not-found, empty private-tool, and mutation-error states", () => {
    expect(detailSource).toContain("access.isLoading || detail.isLoading");
    expect(detailSource).toContain("Relationship not found");
    expect(detailSource).toContain("This relationship may not belong to your provider account.");
    for (const text of ["No follow-ups yet", "No private notes yet", "No message drafts yet", "Private note could not be added", "Message could not be sent"]) {
      expect(detailSource).toContain(text);
    }
    expect(detailSource).toContain('href="/provider/customers"');
  });

  it("provides owner-health loading, failure, retry, missing-candidate, and non-enrollment states", () => {
    expect(healthSource).toContain("Checking private pilot health");
    expect(healthSource).toContain("Customers pilot health could not be loaded");
    expect(healthSource).toContain("Try again");
    expect(healthSource).toContain("Candidate readiness could not be assessed");
    expect(healthSource).toContain("Provider not found");
    expect(healthSource).toContain("Enrollment is not available here.");
  });

  it("keeps error states free of private bodies and preserves provider-safe server errors", () => {
    for (const source of [workspaceSource, detailSource, healthSource]) expect(source).not.toMatch(/console\.(log|warn|error)\([^)]*(noteBody|taskDescription|messageText|draftBody|paymentSecret|stripeSecret)/s);
    expect(routerSource).toContain('new TRPCError({ code: "NOT_FOUND", message: "Customer relationship not found" })');
    expect(routerSource).not.toMatch(/throw new TRPCError\([^)]*(note|draft|task)\.body/s);
  });
});
