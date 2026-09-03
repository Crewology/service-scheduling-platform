/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileRoleViewToggle } from "../client/src/components/shared/MobileRoleViewToggle";

const viewMode = vi.hoisted(() => ({
  canSwitch: true,
  setViewMode: vi.fn(),
}));

vi.mock("@/contexts/ViewModeContext", () => ({
  useViewMode: () => viewMode,
}));

const projectRoot = resolve(import.meta.dirname, "..");
const providerHomeSource = readFileSync(resolve(projectRoot, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
const customerHomeSource = readFileSync(resolve(projectRoot, "client/src/pages/CustomerWorkspaceHome.tsx"), "utf8");

describe("mobile provider/customer role toggle", () => {
  afterEach(cleanup);

  beforeEach(() => {
    viewMode.canSwitch = true;
    viewMode.setViewMode.mockClear();
  });

  it("is mounted on both approved mobile home experiences with the correct active role", () => {
    expect(providerHomeSource).toContain('<MobileRoleViewToggle active="provider" />');
    expect(customerHomeSource).toContain('<MobileRoleViewToggle active="customer" />');
  });

  it("shows the active provider view and switches to the customer view", () => {
    render(createElement(MobileRoleViewToggle, { active: "provider" }));

    const providerButton = screen.getByRole("button", { name: "Provider" });
    const customerButton = screen.getByRole("button", { name: "Customer" });
    expect(providerButton.getAttribute("aria-pressed")).toBe("true");
    expect(customerButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(customerButton);
    expect(viewMode.setViewMode).toHaveBeenCalledWith("customer");
  });

  it("shows the active customer view and switches to the provider view", () => {
    render(createElement(MobileRoleViewToggle, { active: "customer" }));

    const providerButton = screen.getByRole("button", { name: "Provider" });
    expect(screen.getByRole("button", { name: "Customer" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(providerButton);
    expect(viewMode.setViewMode).toHaveBeenCalledWith("provider");
  });

  it("does not display for accounts that cannot switch roles", () => {
    viewMode.canSwitch = false;
    render(createElement(MobileRoleViewToggle, { active: "customer" }));
    expect(screen.queryByRole("group", { name: "Choose provider or customer view" })).toBeNull();
  });
});
