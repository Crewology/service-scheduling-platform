// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("wouter", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => createElement("a", { href, ...rest }, children),
  useLocation: () => ["/preview/public-home-demo", navigate],
}));
vi.mock("@/components/shared/NavHeader", () => ({ NavHeader: ({ forcePublic }: { forcePublic: boolean }) => createElement("header", { "data-testid": "shared-header", "data-public": forcePublic }, "Existing OlogyCrew header") }));

import PublicHomepageDemoPrototype from "../client/src/pages/prototype/PublicHomepageDemoPrototype";

const root = resolve(import.meta.dirname, "..");
const src = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageDemoPrototype.tsx"), "utf8");
const css = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageDemoPrototype.css"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const liveHome = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

afterEach(() => { cleanup(); navigate.mockReset(); });

describe("third isolated public demo homepage comparison", () => {
  it("preserves the live home, both prior concepts, and shared public header", () => {
    expect(app).toContain('path="/preview/public-home-demo" component={PublicHomepageDemoPrototype}');
    expect(app).toContain('path="/preview/public-home-refresh" component={PublicHomepageRefreshPrototype}');
    expect(app).toContain('path="/preview/public-home-original" component={PublicHomepageOriginalMessagePrototype}');
    expect(app.indexOf('path="/preview/public-home-demo"')).toBeLessThan(app.indexOf('path="/" component={Home}'));
    expect(src).toContain("<NavHeader forcePublic />");
    expect(liveHome).not.toContain("Harbor & Hearth Plumbing");
    expect(liveHome).not.toContain("4,812");
    render(createElement(PublicHomepageDemoPrototype));
    expect(screen.getByTestId("shared-header")).toHaveAttribute("data-public", "true");
    expect(screen.getByRole("heading", { level: 1, name: /good work starts with people/i })).toBeVisible();
    expect(document.title).toBe("OlogyCrew — Local work, well done");
  });

  it("reproduces the demo copy and page structure while explicitly disclosing example data", () => {
    render(createElement(PublicHomepageDemoPrototype));
    for (const phrase of [
      "OlogyCrew · Local work, well done", "PEOPLE-POWERED, NEIGHBORHOOD-ROOTED",
      "4,812", "4.83 / 5", "Direct", "3 local specialists", "2 local specialists",
      "People who care about the details.", "Harbor & Hearth Plumbing", "Stillwater Massage Studio",
      "Velvet & Vine Hair", "Licensed plumbers who arrive in the window they promised.",
      "Deep tissue and recovery work for people who actually train.",
      "Color correction and curl-first cuts by appointment.",
      "THE PERSON BEHIND THE CRAFT", "Good work has a name, a face, and a story.",
      "Local expertise. Direct connection. Every time.", "Start with the job", "See the full picture",
      "Book with confidence", "Your work deserves a home of its own.",
      "Prototype experience. No payments are processed and no bookings are sent.",
    ]) expect(screen.getAllByText(phrase).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Homepage prototype notice")).toHaveTextContent("not live OlogyCrew data");
    expect(screen.getByLabelText("Illustrative demo statistics")).toBeVisible();
    expect(document.querySelectorAll(".or-provider-bottom > span")).toHaveLength(3);
    for (const row of document.querySelectorAll(".or-provider-bottom > span")) expect(row).toHaveTextContent("Verified");
  });

  it("sends searches and each example card to real read-only OlogyCrew discovery routes", () => {
    render(createElement(PublicHomepageDemoPrototype));
    const searchInput = screen.getByRole("searchbox", { name: "Search local services and professionals" });
    fireEvent.change(searchInput, { target: { value: "  audio engineer  " } });
    fireEvent.submit(screen.getByRole("search", { name: "Search local services and professionals" }));
    expect(navigate).toHaveBeenCalledWith("/browse?q=audio%20engineer");
    fireEvent.change(searchInput, { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("search", { name: "Search local services and professionals" }));
    expect(navigate).toHaveBeenCalledWith("/browse");

    expect(screen.getByRole("link", { name: "Explore Home services on OlogyCrew" })).toHaveAttribute("href", "/browse?q=Handyman");
    expect(screen.getByRole("link", { name: "Explore Events services on OlogyCrew" })).toHaveAttribute("href", "/browse?q=Event%20Planning");
    const plumber = screen.getByRole("article", { name: "Harbor & Hearth Plumbing — illustrative demo profile" });
    expect(within(plumber).getAllByRole("link", { name: /explore plumbing services on ologycrew/i })).toHaveLength(2);
    expect(within(plumber).getAllByRole("link", { name: /explore plumbing services on ologycrew/i })[1]).toHaveAttribute("href", "/browse?q=Plumbing");
    expect(screen.getByRole("link", { name: "Explore all services" })).toHaveAttribute("href", "/browse");
    expect(screen.getByRole("link", { name: "Explore a sample profile" })).toHaveAttribute("href", "/demo-ologycrew");
    expect(src).not.toMatch(/trpc\.|\.mutate\(|\/provider\/harbor-and-hearth|\/provider\/stillwater|\/provider\/velvet/);
  });

  it("keeps illustrative sample hearts local without changing customer saved-provider records", () => {
    render(createElement(PublicHomepageDemoPrototype));
    const save = screen.getByRole("button", { name: "Save Harbor & Hearth Plumbing in this preview only" });
    expect(save).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(save);
    expect(screen.getByRole("button", { name: "Unsave Harbor & Hearth Plumbing in this preview only" })).toHaveAttribute("aria-pressed", "true");
    expect(src).not.toMatch(/favorite\.add|favorite\.remove|booking\.create|quote\.create|payment\.create/);
  });

  it("keeps demo palette/media isolated and includes mobile and reduced-motion design contracts", () => {
    expect(src).toContain('import "./PublicHomepageDemoPrototype.css"');
    expect(css).toContain(".ology-refined{");
    expect(css).toContain("--or-paper: #f5f2e9");
    expect(css).toContain(".or-hero-frame{height:560px");
    expect(css).toContain("@media(max-width:640px)");
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).not.toContain(".or-site-header{");
    expect(src).toContain("/manus-storage/ology-refined-hero_");
    expect(src).not.toContain("client/public");
  });
});
