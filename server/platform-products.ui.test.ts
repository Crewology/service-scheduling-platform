// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: any) => React.createElement("a", { href, ...props }, children),
}));
vi.mock("@/components/shared/NavHeader", () => ({ NavHeader: () => React.createElement("header", null, "Shared public header") }));

import PlatformProducts from "../client/src/pages/PlatformProducts";

afterEach(cleanup);

describe("public two-sided platform page", () => {
  it("shows five real product areas without treating the sample page as a real provider", () => {
    const { container } = render(React.createElement(PlatformProducts));
    expect(screen.getByRole("heading", { level: 1, name: /Good work has a whole journey/ })).toBeVisible();
    const cards = container.querySelectorAll(".ology-platform-product");
    expect(cards).toHaveLength(5);
    for (const title of ["Explore", "Bookings & quotes", "Provider workspace", "Customers", "Money"]) {
      expect(screen.getByRole("heading", { name: title, level: 3 })).toBeVisible();
    }
    expect(screen.getByText(/The official sample profile is a demo, not a real provider/)).toBeVisible();
    expect(screen.getByText(/collect payment through the platform when your paid plan allows it/)).toBeVisible();
    expect(screen.getByText(/not a separate platform-wide contact list/)).toBeVisible();
    expect(container.querySelector("a a, a button, button a")).toBeNull();
  });

  it("sends each audience to its real public next step without signing in or starting checkout", () => {
    const { container } = render(React.createElement(PlatformProducts));
    expect(screen.getByRole("link", { name: "Find a service" })).toHaveAttribute("href", "/browse");
    expect(screen.getByRole("link", { name: "Explore the products" })).toHaveAttribute("href", "#products");
    expect(screen.getByRole("link", { name: /See the official sample profile/ })).toHaveAttribute("href", "/demo-ologycrew");
    expect(screen.getByRole("link", { name: /See the provider experience/ })).toHaveAttribute("href", "/for-providers");
    const paths = container.querySelector(".ology-platform-paths");
    expect(paths).not.toBeNull();
    expect(within(paths as HTMLElement).getByRole("link", { name: /Find a service professional/ })).toHaveAttribute("href", "/browse");
    expect(within(paths as HTMLElement).getByRole("link", { name: /Build your business page/ })).toHaveAttribute("href", "/for-providers");
    expect(screen.getAllByRole("link", { name: /plans|tools/i }).some(link => link.getAttribute("href") === "/pricing")).toBe(true);
  });

  it("marks original illustrative photography accurately and keeps each section labelled", () => {
    const { container } = render(React.createElement(PlatformProducts));
    expect(screen.getAllByText("Illustrative photo")).toHaveLength(2);
    expect(screen.getByRole("img", { name: /Illustrative photograph of a service professional and customer/ })).toHaveAttribute("src", "/manus-storage/ology-platform-people-hero_b5c88079.webp");
    expect(screen.getByRole("img", { name: /Illustrative photograph of two service professionals/ })).toHaveAttribute("src", "/manus-storage/ology-platform-people-work_d3cbf768.webp");
    expect(container.querySelectorAll("main")).toHaveLength(1);
    for (const anchor of ["products", "provider-workspace"]) expect(container.querySelector(`#${anchor}`)).not.toBeNull();
  });
});
