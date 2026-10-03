import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const overview = source("client/src/pages/ProviderWorkspaceOverview.tsx");
const css = source("client/src/pages/ProviderWorkspaceOverview.css");
const shell = source("client/src/components/provider/ProviderWorkspaceShell.tsx");
const home = source("client/src/pages/LoggedInHome.tsx");

describe("provider home people-first visual pilot", () => {
  it("opts in only the provider Overview, leaving customer home and other provider pages on their existing workspace background", () => {
    expect(home).toContain("<ProviderWorkspaceOverview />");
    expect(home).toContain("<CustomerWorkspaceHome />");
    expect(shell).toContain('"min-h-[calc(100vh-4rem)] bg-page"');
    expect(shell).toContain('active === "overview" ? "ology-provider-overview-surface" : undefined');
    expect(overview).toContain('contentClassName="ology-provider-overview-content"');
    expect(overview).toContain('import "./ProviderWorkspaceOverview.css"');
    expect(css).toContain('@import "../styles/publicBrandTokens.css"');
    expect(css).toContain("background: var(--ology-brand-paper)");
    expect(css).toContain('[data-provider-workspace="overview"]');
    expect(css).not.toContain(":root {");
  });

  it("preserves true status urgency, real empty states, all destination links and gated financial action", () => {
    expect(overview).toContain('critical: { wrap: "border-red-200 bg-red-50/70"');
    expect(overview).toContain('time: { wrap: "border-amber-200 bg-amber-50/60"');
    expect(overview).toContain('data-tone={item.tone}');
    expect(overview).toContain("You are caught up");
    expect(overview).toContain("No services scheduled today");
    for (const destination of ["/my-bookings", "/provider/calendar", "/provider/services/new", "/provider/availability", "/provider/analytics"]) {
      expect(overview).toContain(destination);
    }
    expect(overview).toContain('data.canUseInvoices ? "/provider/invoices" : "/provider/subscription"');
    expect(overview).toContain('customersAccess?.visible ? <Link href="/provider/customers"');
    expect(overview).toContain('setProfileEditorOpen(true)');
    expect(overview).toContain('onClick={sharePage}');
    expect(overview).toContain('trpc.providerOverview.get.useQuery');
  });

  it("uses visible focus and reduced motion without recoloring other workspace pages or success feedback", () => {
    expect(css).toContain('a[aria-current="page"]');
    expect(css).toContain('nav[aria-label="Provider mobile navigation"] a[aria-current="page"]');
    expect(css).toContain('button[aria-pressed="true"]');
    expect(css).toContain(':is(a, button):focus-visible');
    expect(css).toContain('outline: 3px solid var(--ology-brand-coral-hover)');
    expect(css).toContain('outline-color: var(--ology-brand-leaf)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.ology-provider-action-icon:not(.bg-emerald-100)');
    expect(css).not.toContain(".dark {");
  });
});
