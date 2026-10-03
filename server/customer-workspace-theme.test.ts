import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const shell = read("client/src/components/customer/CustomerWorkspaceShell.tsx");
const theme = read("client/src/components/customer/CustomerWorkspaceTheme.css");
const home = read("client/src/pages/CustomerWorkspaceHome.tsx");
const planner = read("client/src/pages/MonthlyPlanner.tsx");
const discovery = read("client/src/pages/Search.tsx");

const utilities: Array<[string, number]> = [
  ["client/src/pages/MyQuotes.tsx", 3],
  ["client/src/pages/MyWaitlist.tsx", 3],
  ["client/src/pages/Receipts.tsx", 1],
  ["client/src/pages/AccountSubscription.tsx", 2],
  ["client/src/pages/CustomerBillingHistory.tsx", 2],
];

describe("customer-only people-first workspace palette", () => {
  it("keeps all five shared navigation destinations and current page semantics", () => {
    for (const href of ["/", "/browse", "/my-bookings", "/saved-providers", "/messages"]) {
      expect(shell).toContain(`href: "${href}"`);
    }
    expect(shell).toContain('aria-current={isActive ? "page" : undefined}');
    expect(shell).toContain('data-customer-workspace={active}');
    expect(shell).toContain('ology-customer-workspace-surface min-h-[calc(100vh-4rem)] bg-page');
    expect(shell).toContain('import "./CustomerWorkspaceTheme.css"');
    expect(theme).toContain('nav[aria-label="Customer workspace navigation"] a[aria-current="page"]');
    expect(theme).toContain('nav[aria-label="Customer mobile navigation"] a[aria-current="page"]');
  });

  it("excludes the approved public Explore hero while aligning its signed-in nav", () => {
    expect(discovery).toContain('<CustomerWorkspaceShell active="explore" showNavigation={isAuthenticated}');
    expect(discovery).toContain('variant="discovery"');
    expect(shell).toContain('variant === "workspace" && "ology-customer-workspace-heading"');
    expect(theme).toContain(':not([data-customer-workspace="explore"])');
    expect(theme).not.toContain('.ology-discovery-page');
    expect(read("client/src/styles/publicDiscovery.css")).toContain('.ology-discovery-page .ology-explore-header > header');
  });

  it("keeps the need-first home and real action/booking/rebooking queries and links", () => {
    expect(home).toContain('trpc.customerHome.get.useQuery');
    expect(home).toContain('customerSearchHref({ query: request, location: searchLocation, timing })');
    expect(home).toContain('ology-customer-home-hero');
    expect(home).toContain('ology-customer-home-primary-action');
    expect(home).toContain('ology-customer-upcoming-date');
    for (const text of ["Needs your action", "Upcoming", "Book again", "Explore by need", "View booking", "Rebook"]) {
      expect(home).toContain(text);
    }
    expect(theme).toContain('.ology-customer-home-hero button[type="submit"]');
    expect(theme).toContain('.ology-customer-home-content section h2');
  });

  it("keeps planner date selection accessible without recoloring booked and failed events", () => {
    expect(planner).toContain('data-planner-day');
    expect(planner).toContain('aria-pressed={isSelected}');
    expect(planner).toContain('aria-current={isToday ? "date" : undefined}');
    expect(planner).toContain('trpc.booking.create.useMutation()');
    expect(planner).toContain('"bg-green-100 text-green-700"');
    expect(planner).toContain('"bg-red-100 text-red-700"');
    expect(theme).toContain('button[aria-pressed="true"][data-planner-day]');
    const bulk = read("client/src/pages/BulkBooking.tsx");
    expect(bulk).toContain('aria-label="Bulk booking progress"');
    expect(bulk).toContain('aria-current={!step.complete && index === planningSteps.findIndex((item) => !item.complete) ? "step" : undefined}');
    expect(theme).toContain('.ology-customer-bulk-progress [aria-current="step"]');
    const saved = read("client/src/pages/SavedProviders.tsx");
    expect(saved).toContain('ology-customer-saved-folders');
    expect(saved).toContain('aria-pressed={activeFolder === null}');
    expect(saved).toContain('aria-pressed={activeFolder === -1}');
    expect(saved).toContain('aria-pressed={activeFolder === folder.id}');
    expect(saved).toContain('style={{ color: folder.color }}');
  });

  it("uses scoped warm neutral surfaces on secondary customer tools without touching plan, invoice or quote behavior", () => {
    for (const [path, rootCount] of utilities) {
      const page = read(path);
      expect(page).toContain('import "@/components/customer/CustomerWorkspaceTheme.css"');
      expect(page.match(/ology-customer-utility-surface min-h-screen bg-page/g)).toHaveLength(rootCount);
    }
    expect(theme).toContain('.ology-customer-utility-surface');
    const quotes = read("client/src/pages/MyQuotes.tsx");
    expect(quotes).toContain('trpc.provider.updateQuoteStatus.useMutation');
    expect(quotes).toContain('statusConfig[quote.status]');
    const receipts = read("client/src/pages/Receipts.tsx");
    expect(receipts).toContain('trpc.invoice.getPaymentLink.useMutation');
    expect(receipts).toContain('statusConfig[inv.status]');
    const plans = read("client/src/pages/AccountSubscription.tsx");
    expect(plans).toContain('trpc.customerSubscription.createCheckout.useMutation');
    expect(plans).toContain('CUSTOMER_PLANS.pro.monthlyPrice');
    expect(plans).toContain('trpc.customerSubscription.downgrade.useMutation');
    expect(plans).toContain('aria-pressed={billingInterval === "month"}');
    expect(plans).toContain('aria-pressed={billingInterval === "year"}');
    expect(plans).toContain('data-state={subData.usage.isAtLimit ? "limit" : "available"}');
    expect(plans).toContain('subData.usage.isAtLimit ? "bg-red-500" : "bg-primary"');
    expect(theme).toContain('.ology-customer-plan-usage-bar[data-state="available"]');
    expect(theme).toContain('.ology-customer-plan-popular-badge');
  });

  it("preserves semantic warning and destructive colors, shared workspace boundaries, focus and reduced motion", () => {
    for (const token of ['[class*="bg-amber"]', '[class*="bg-red"]', '[class*="bg-green"]', '[class*="bg-blue"]', '[class*="bg-primary"]']) {
      expect(theme).toContain(token);
    }
    expect(theme).toContain('outline: 3px solid var(--ology-brand-coral-hover)');
    expect(theme).toContain('outline-color: var(--ology-brand-leaf)');
    expect(theme).toContain('@media (prefers-reduced-motion: reduce)');
    expect(read("client/src/components/provider/ProviderWorkspaceShell.tsx")).not.toContain("CustomerWorkspaceTheme.css");
    expect(read("client/src/pages/Conversations.tsx")).toContain('trpc.message.deleteConversation.useMutation');
    expect(read("client/src/pages/Messages.tsx")).toContain('isMe');
    expect(read("client/src/pages/DirectMessage.tsx")).toContain('isMe');
  });
});
