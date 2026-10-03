// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const mocks = vi.hoisted(() => ({
  slug: "audio-visual-crew",
  category: { id: 15, slug: "audio-visual-crew", name: "AUDIO VISUAL CREW", description: "Professional AV technicians and crew for events", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false } as any,
  services: [] as any[],
  providers: [] as any[],
  promotions: [] as any[],
  categoryLoading: false,
  servicesLoading: false,
  providersLoading: false,
  servicesError: false,
  providersError: false,
}));

vi.mock("wouter", () => ({
  useParams: () => ({ slug: mocks.slug }),
  Link: ({ href, children, ...rest }: any) => React.createElement("a", { href, ...rest }, children),
}));
vi.mock("@/components/shared/NavHeader", () => ({ NavHeader: () => React.createElement("header", null, "Shared header") }));
vi.mock("@/components/OfficialBadge", () => ({ OfficialBadge: () => React.createElement("span", null, "DEMO") }));
vi.mock("@/components/SaveProviderButton", () => ({ SaveProviderButton: () => React.createElement("button", { type: "button", "aria-label": "Save provider" }, "Save") }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    category: { getBySlug: { useQuery: () => ({ data: mocks.category, isLoading: mocks.categoryLoading, isError: false }) } },
    service: { listByCategory: { useQuery: () => ({ data: mocks.services, isLoading: mocks.servicesLoading, isError: mocks.servicesError }) } },
    provider: {
      listByCategory: { useQuery: () => ({ data: mocks.providers, isLoading: mocks.providersLoading, isError: mocks.providersError }) },
      getResponseTime: { useQuery: () => ({ data: { avgMinutes: null } }) },
      getNextAvailable: { useQuery: () => ({ data: { hasAvailability: false } }) },
    },
    promotion: { getActiveForDisplay: { useQuery: () => ({ data: mocks.promotions }) } },
  },
}));

import CategoryDetail from "../client/src/pages/CategoryDetail";

const baseProviders = [
  { id: 101, businessName: "Chisolm Audio", profileSlug: "chisolm-audio", profilePhotoUrl: "/chisolm.jpg", city: "Houston", state: "TX", averageRating: "5.0", isOfficial: false },
  { id: 102, businessName: "Demo - OlogyCrew", profileSlug: "demo-ologycrew", profilePhotoUrl: "/demo.jpg", city: "Atlanta", state: "GA", averageRating: "0", isOfficial: true },
  { id: 103, businessName: "Event Vision", profileSlug: "event-vision", profilePhotoUrl: null, city: "Miami", state: "FL", averageRating: "3.5", isOfficial: false },
];
const baseServices = [
  { id: 501, providerId: 101, name: "A1 Sound Support", description: "Live sound support", pricingModel: "fixed", basePrice: "550.00", serviceType: "mobile", durationMinutes: 600, categoryId: 15 },
  { id: 502, providerId: 102, name: "Demo AV Consultation", description: "Try the demo", pricingModel: "consultation", serviceType: "virtual", durationMinutes: 30, categoryId: 15 },
  { id: 503, providerId: 103, name: "Event Staging", description: "Full event staging", pricingModel: "custom_quote", serviceType: "flexible", durationMinutes: 60, categoryId: 15 },
];

beforeEach(() => {
  mocks.slug = "audio-visual-crew";
  mocks.category = { id: 15, slug: "audio-visual-crew", name: "AUDIO VISUAL CREW", description: "Professional AV technicians and crew for events", isMobileEnabled: true, isFixedLocationEnabled: true, isVirtualEnabled: false };
  mocks.providers = baseProviders.map((provider) => ({ ...provider }));
  mocks.services = baseServices.map((service) => ({ ...service }));
  mocks.promotions = [];
  mocks.categoryLoading = mocks.servicesLoading = mocks.providersLoading = false;
  mocks.servicesError = mocks.providersError = false;
});
afterEach(cleanup);

describe("people-first public category pages", () => {
  it("shows real category facts, provider identities and exact service destinations without nested links or buttons", () => {
    const { container } = render(React.createElement(CategoryDetail));
    expect(screen.getByRole("heading", { name: "AUDIO VISUAL CREW" })).toBeVisible();
    expect(screen.getByText("Professional AV technicians and crew for events")).toBeVisible();
    expect(screen.getByText("3 services")).toBeVisible();
    expect(screen.getByText("2 providers")).toBeVisible();
    expect(screen.getByText("Official demo available")).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Chisolm Audio/ }).some((link) => link.getAttribute("href") === "/chisolm-audio")).toBe(true);
    expect(screen.getByRole("link", { name: /A1 Sound Support/ })).toHaveAttribute("href", "/service/501");
    expect(screen.getByRole("link", { name: /Event Staging/ })).toHaveAttribute("href", "/service/503");
    expect(within(screen.getByRole("link", { name: /Event Staging/ })).getByText("View Service & Request Quote")).toBeVisible();
    expect(screen.getByText("$550")).toBeVisible();
    expect(screen.getByText("Request quote")).toBeVisible();
    expect(screen.getByText("FREE DEMO")).toBeVisible();
    expect(screen.getAllByText("DEMO")).toHaveLength(1);
    expect(container.querySelector("a a, a button, button a")).toBeNull();
  });

  it("filters by real location and never falls back to unrelated services when there is no match", () => {
    render(React.createElement(CategoryDetail));
    const location = screen.getByRole("searchbox", { name: "Filter by city, state, or ZIP code" });
    fireEvent.change(location, { target: { value: "Houston" } });
    expect(screen.getByRole("heading", { name: "Services from Chisolm Audio" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Services from Event Vision" })).toBeNull();
    fireEvent.change(location, { target: { value: "No Such City" } });
    expect(screen.getByRole("heading", { name: "No providers match these filters" })).toBeVisible();
    expect(screen.queryByText("Event Staging")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(screen.getByRole("heading", { name: "Services from Event Vision" })).toBeVisible();
  });

  it("keeps rating chips and expanded service-type/price filters functional", () => {
    render(React.createElement(CategoryDetail));
    fireEvent.click(screen.getByRole("button", { name: "4+" }));
    expect(screen.getByRole("button", { name: "4+" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("heading", { name: "Services from Event Vision" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "4+" }));
    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    expect(screen.getByRole("button", { name: /Filters/ })).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(screen.getByLabelText("Service type"), { target: { value: "flexible" } });
    expect(screen.getByRole("heading", { name: "Services from Event Vision" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Services from Chisolm Audio" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    fireEvent.change(screen.getByLabelText("Maximum listed price"), { target: { value: "100" } });
    expect(screen.queryByRole("heading", { name: "Services from Chisolm Audio" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Services from Event Vision" })).toBeVisible();
  });

  it("keeps the promoted order and official demo separate from real profiles", () => {
    mocks.promotions = [{ promotion: { providerId: 103 } }];
    const { container } = render(React.createElement(CategoryDetail));
    const cards = container.querySelectorAll(".ology-category-provider");
    expect(cards).toHaveLength(3);
    expect(within(cards[0] as HTMLElement).getByText("Event Vision")).toBeVisible();
    expect(within(cards[1] as HTMLElement).getByText("Chisolm Audio")).toBeVisible();
    expect(within(cards[2] as HTMLElement).getByText("Demo - OlogyCrew")).toBeVisible();
    expect(within(cards[2] as HTMLElement).getByText("FREE DEMO")).toBeVisible();
  });

  it("does not call a demo-only category a live provider directory", () => {
    mocks.providers = baseProviders.filter((provider) => provider.isOfficial);
    mocks.services = baseServices.filter((service) => service.providerId === 102);
    render(React.createElement(CategoryDetail));
    expect(screen.getByText("No live providers yet")).toBeVisible();
    expect(screen.getByText("Official demo available")).toBeVisible();
    expect(screen.getByText("Official demo only")).toBeVisible();
    expect(screen.getByText("Try a sample booking flow here. The official demo is not a live service provider.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore the demo" })).toHaveAttribute("href", "#category-results");
    expect(screen.getByRole("link", { name: /Demo AV Consultation/ })).toHaveAttribute("href", "/service/502");
  });

  it("keeps navigable empty and missing-category states", () => {
    mocks.services = [];
    const { rerender } = render(React.createElement(CategoryDetail));
    expect(screen.getByRole("heading", { name: "No services here yet" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: /Explore all services/ }).every((link) => link.getAttribute("href") === "/browse")).toBe(true);
    mocks.category = undefined;
    rerender(React.createElement(CategoryDetail));
    expect(screen.getByRole("heading", { name: "Category not found" })).toBeVisible();
  });

  it("distinguishes a network failure from an empty category", () => {
    mocks.servicesError = true;
    mocks.services = [];
    render(React.createElement(CategoryDetail));
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn’t load these listings");
    expect(screen.queryByRole("heading", { name: "No services here yet" })).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  it("shows twelve providers first and exposes the rest with load more", () => {
    mocks.providers = Array.from({ length: 14 }, (_, index) => ({ ...baseProviders[0], id: 200 + index, businessName: `Provider ${index + 1}`, profileSlug: `provider-${index + 1}` }));
    mocks.services = mocks.providers.map((provider, index) => ({ ...baseServices[0], id: 600 + index, providerId: provider.id }));
    const { container } = render(React.createElement(CategoryDetail));
    expect(container.querySelectorAll(".ology-category-provider")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Load more providers (2 remaining)" }));
    expect(container.querySelectorAll(".ology-category-provider")).toHaveLength(14);
    expect(screen.queryByRole("button", { name: /Load more providers/ })).toBeNull();
  });
});
