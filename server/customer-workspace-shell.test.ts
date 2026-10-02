import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getCanonicalExploreDestination } from "../client/src/lib/customerExplore";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

const shellSource = source("client/src/components/customer/CustomerWorkspaceShell.tsx");
const appSource = source("client/src/App.tsx");
const publicHomeSource = source("client/src/pages/Home.tsx");
const navHeaderSource = source("client/src/components/shared/NavHeader.tsx");
const footerSource = source("client/src/components/shared/Footer.tsx");
const customerHomeLogicSource = source("shared/customerHomeLogic.ts");
const structuredDataSource = source("server/structuredData.ts");
const homeSource = source("client/src/pages/CustomerWorkspaceHome.tsx");
const browseSource = source("client/src/pages/Browse.tsx");
const searchSource = source("client/src/pages/Search.tsx");
const bookingsSource = source("client/src/pages/MyBookings.tsx");
const bulkSource = source("client/src/pages/BulkBooking.tsx");
const plannerSource = source("client/src/pages/MonthlyPlanner.tsx");
const savedSource = source("client/src/pages/SavedProviders.tsx");
const messagesSource = source("client/src/pages/Conversations.tsx");

describe("shared Customer Workspace visual system", () => {
  it("owns one canonical desktop and mobile customer navigation model", () => {
    for (const route of ["/", "/browse", "/my-bookings", "/saved-providers", "/messages"]) {
      expect(shellSource).toContain(`href: "${route}"`);
    }
    expect(shellSource).toContain('aria-label="Customer workspace navigation"');
    expect(shellSource).toContain('aria-label="Customer mobile navigation"');
    expect(shellSource).toContain('aria-current={isActive ? "page" : undefined}');
    expect(shellSource).toContain('bg-page');
    expect(shellSource).toContain('<MobileRoleViewToggle active="customer"');
  });

  it("uses the shared shell and correct active destination on every approved customer page", () => {
    expect(homeSource).toContain('<CustomerWorkspaceShell active="home"');
    expect(browseSource).toContain('export { default } from "./Search";');
    expect(searchSource).toContain('<CustomerWorkspaceShell active="explore"');
    expect(bookingsSource).toContain('active="bookings"');
    expect(bulkSource).toContain('active="bookings"');
    expect(plannerSource).toContain('active="bookings"');
    expect(savedSource).toContain('active="saved"');
    expect(messagesSource).toContain('active="messages"');
  });

  it("keeps the primary customer management pages as wide as Customer Home", () => {
    expect(shellSource).toContain('maxWidth = "max-w-7xl"');
    expect(homeSource).not.toContain("maxWidth=");
    for (const page of [bookingsSource, savedSource, messagesSource]) {
      expect(page).not.toMatch(/maxWidth="max-w-(?:3xl|4xl|5xl|6xl)"/);
    }
    expect(bookingsSource).toContain('className="container max-w-7xl py-8"');
    expect(messagesSource).toContain('className="container max-w-7xl py-8"');
  });

  it("keeps discovery visually distinct from customer management pages", () => {
    expect(searchSource).toContain('variant="discovery"');
    for (const page of [bookingsSource, bulkSource, plannerSource, savedSource, messagesSource]) {
      expect(page).toContain("<CustomerWorkspacePageHeader");
    }
    expect(homeSource).not.toContain('aria-label="Customer mobile navigation"');
  });

  it("hides Explore workspace navigation for public visitors and retains it after sign-in", () => {
    expect(searchSource).toContain("const { isAuthenticated } = useAuth();");
    expect(searchSource).toContain(
      '<CustomerWorkspaceShell active="explore" showNavigation={isAuthenticated} maxWidth="max-w-[1600px]">',
    );
    expect(shellSource).toContain("showNavigation = true");
    expect(shellSource).toContain("{showNavigation ? (");
    expect(shellSource.match(/\{showNavigation \? \(/g)).toHaveLength(2);
  });

  it("applies the customer shell only to customer-mode My Bookings and preserves the provider shell", () => {
    expect(bookingsSource).toContain("if (!providerMode)");
    expect(bookingsSource).toContain("<CustomerWorkspaceShell");
    expect(bookingsSource).toContain("<ProviderWorkspaceShell");
    expect(bookingsSource).toContain('bookingView === "provider" && canSwitch');
  });

  it("combines categories and results in one adaptive Explore page", () => {
    expect(searchSource).toContain("trpc.category.list.useQuery");
    expect(searchSource).toContain("CATEGORY_ICONS[category.id]");
    expect(searchSource).toContain("trpc.service.search.useQuery");
    expect(searchSource).toContain("trpc.provider.search.useQuery");
    expect(searchSource).toContain("getAdaptiveBookingDecision(service)");
    expect(searchSource).toContain("getAdaptiveServiceCtaLabel");
    expect(searchSource).toContain("<SaveProviderButton");
    expect(searchSource).toContain("!hasSearchIntent ? (");
    expect(appSource).toContain('<Route path="/search" component={LegacySearchRoute} />');
  });

  it("redirects old Search URLs to Explore without losing query context", () => {
    expect(getCanonicalExploreDestination("")).toBe("/browse");
    expect(getCanonicalExploreDestination("?q=barber&location=Atlanta%2C+GA&timing=Tomorrow")).toBe(
      "/browse?q=barber&location=Atlanta%2C+GA&timing=Tomorrow",
    );
  });

  it("uses Explore as the only generated customer discovery destination", () => {
    for (const navigationSource of [publicHomeSource, navHeaderSource, footerSource, customerHomeLogicSource]) {
      expect(navigationSource).not.toMatch(/["'`]\/search(?:\?|["'`])/);
    }
    expect(structuredDataSource).toContain("/browse?q={search_term_string}");
    expect(structuredDataSource).not.toContain("/search?q={search_term_string}");
  });

  it("keeps booking, planning, saved-provider, and messaging behavior intact", () => {
    for (const token of ["booking.listMine", "booking.listForProvider", "booking.cancel.useMutation", "provider.myQuotes"]) {
      expect(bookingsSource).toContain(token);
    }
    for (const token of ["bulkDraft.list", "bulkDraft.save", "eventTemplate.list", "eventTemplate.save", "booking.create.useMutation"]) {
      expect(bulkSource).toContain(token);
    }
    expect(bulkSource).toContain('aria-label="Bulk booking progress"');
    for (const step of ["Services", "Providers", "Schedule", "Review"]) expect(bulkSource).toContain(`label: "${step}"`);
    expect(plannerSource).toContain("trpc.booking.create.useMutation");
    expect(plannerSource).toContain("trpc.provider.search.useQuery");
    expect(savedSource).toContain("trpc.provider.toggleFavorite.useMutation");
    expect(savedSource).toContain("trpc.folders.moveProvider.useMutation");
    expect(savedSource).toContain("<BulkQuoteModal");
    expect(messagesSource).toContain("trpc.message.myConversations.useQuery");
    expect(messagesSource).toContain("trpc.message.searchMessages.useQuery");
    expect(messagesSource).toContain("trpc.message.deleteConversation.useMutation");
    expect(messagesSource).toContain("useSSE({");
  });
});
