// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement("a", { href, ...rest }, children),
}));
vi.mock("@/components/shared/NavHeader", () => ({ NavHeader: () => createElement("header", { "data-testid": "shared-header" }, "OlogyCrew") }));

import ProviderBenefits from "../client/src/pages/ProviderBenefits";
import { getProviderBenefitsOgTags } from "./ogTags";

const root = resolve(import.meta.dirname, "..");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const liveHome = readFileSync(resolve(root, "client/src/pages/PublicHomepageConceptThree.tsx"), "utf8");
const footer = readFileSync(resolve(root, "client/src/components/shared/Footer.tsx"), "utf8");
const css = readFileSync(resolve(root, "client/src/pages/ProviderBenefits.css"), "utf8");
const page = readFileSync(resolve(root, "client/src/pages/ProviderBenefits.tsx"), "utf8");
const htmlRouter = readFileSync(resolve(root, "server/_core/vite.ts"), "utf8");

afterEach(() => cleanup());

describe("public provider-benefits page", () => {
  it("is an independently routed marketing page with the existing header and people-first compact footer", () => {
    expect(app).toContain('path="/for-providers" component={ProviderBenefits}');
    expect(app.indexOf('path="/for-providers"')).toBeLessThan(app.indexOf('path="/:slug"'));
    expect(app).toContain('<Footer compactPublicHome={location === "/" || location === "/for-providers" || isPlatformPage} />');
    expect(liveHome).toContain('href="/for-providers">Offer your services');
    expect(footer).toContain('href="/for-providers">For providers');
    expect(footer).toContain('href="/pricing">Provider plans');
    render(createElement(ProviderBenefits));
    expect(screen.getByTestId("shared-header")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: /your business\. your customers\. your money\./i })).toBeVisible();
    expect(document.title).toBe("For Service Providers | OlogyCrew");
  });

  it("reuses the original comparison and six real tools without making unqualified payment or visibility promises", () => {
    render(createElement(ProviderBenefits));
    expect(screen.getByText("Why become an OlogyCrew provider?")).toBeVisible();
    for (const tool of ["Your profile", "Your services", "Your availability", "Your conversations", "Your payments", "Your invoices"]) {
      expect(screen.getByRole("heading", { level: 3, name: tool })).toBeVisible();
    }
    for (const type of ["A directory", "A scheduler", "A payment tool"]) expect(screen.getByText(type)).toBeVisible();
    expect(screen.getAllByText("OlogyCrew").length).toBeGreaterThan(0);
    expect(screen.getByText("No lead fees")).toBeVisible();
    expect(screen.getByText(/Free profiles have standard search placement/)).toBeVisible();
    expect(screen.getByText(/Payment collection, invoicing, enhanced placement, and advanced tools vary by plan/)).toBeVisible();
    expect(page).not.toContain("We don't make you compete for placement");
    expect(page).not.toContain("money goes straight to your bank");
    expect(page).not.toMatch(/trpc\.|fetch\(|\.mutate\(/);
    expect(page).not.toMatch(/4,812|4\.83 \/ 5|guaranteed bookings/i);
  });

  it("explains the getting-started path and sends visitors only to existing non-mutating pages", () => {
    render(createElement(ProviderBenefits));
    expect(screen.getByRole("heading", { name: "Make a home for your work, step by step." })).toBeVisible();
    const steps = screen.getByRole("list");
    expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    for (const title of ["Choose your plan", "Tell your story", "Open your calendar", "Build the relationship"]) expect(within(steps).getByRole("heading", { name: title })).toBeVisible();
    for (const link of screen.getAllByRole("link", { name: "Explore provider plans" })) expect(link).toHaveAttribute("href", "/pricing");
    expect(screen.getByRole("link", { name: "View the sample profile" })).toHaveAttribute("href", "/demo-ologycrew");
    expect(screen.getByRole("link", { name: "See what you can build" })).toHaveAttribute("href", "#provider-tools");
    expect(screen.getByText(/not a customer business/)).toBeVisible();
  });

  it("keeps all page styles scoped and supplies responsive, accessible focus and reduced-motion rules", () => {
    expect(page).toContain('className="provider-benefits-page"');
    expect(css).toContain('.provider-benefits-page :is(a,button):focus-visible');
    expect(css).toContain('@media(max-width:1000px)');
    expect(css).toContain('@media(max-width:700px)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('.provider-benefits-page .provider-marketing-wrap,\n  .provider-benefits-page .provider-marketing-hero');
    expect(css).toContain('width: min(1600px, calc(100% - 64px));');
    expect(css).toContain('@media (min-width: 1001px)');
    expect(css).not.toMatch(/(?:^|\n)\s*(?:body|html|\.or-hero|\.or-provider-card|\.or-demo-footer)\s*\{/);
    expect(page).toContain('alt="Illustrative photograph of an independent designer at work"');
  });

  it("renders a canonical provider-benefits share card rather than a fake provider profile", () => {
    const tags = getProviderBenefitsOgTags("https://internal-container.a.run.app");
    expect(tags).toContain('og:title" content="For Service Providers | OlogyCrew"');
    expect(tags).toContain('og:url" content="https://ologycrew.com/for-providers"');
    expect(tags).toContain('og:image" content="https://ologycrew.com/manus-storage/independent-designer-at-work_08f09cd1.jpg"');
    expect(tags).toContain('og:image:width" content="3000"');
    expect(tags).toContain('og:image:height" content="1688"');
    expect(tags).not.toContain("internal-container.a.run.app");
    expect(htmlRouter).toContain("'for-providers'");
    expect(htmlRouter).toContain('getProviderBenefitsOgTags(origin)');
    expect(htmlRouter).toContain('For Service Providers | OlogyCrew</title>');
  });
});
