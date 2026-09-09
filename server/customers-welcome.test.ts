// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CustomersWelcomePopover } from "../client/src/components/customers/CustomersWelcomePopover";
import { CUSTOMERS_WELCOME_VERSION, customersWelcomeStorageKey } from "../client/src/lib/customersWelcome";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("Customers provider welcome", () => {
  it("opens with accessible Customers guidance for an eligible provider", async () => {
    render(createElement(CustomersWelcomePopover, {
      providerId: 42,
      hasPrivateTools: true,
      draftSendingEnabled: true,
    }));

    const dialog = await screen.findByRole("dialog", { name: "Welcome to Customers" });
    expect(dialog).toHaveTextContent("Built automatically");
    expect(dialog).toHaveTextContent("Your private tools are ready");
    expect(dialog).toHaveTextContent("Messages stay deliberate");
    expect(dialog).not.toHaveTextContent(/\bCRM\b/);
    expect(screen.getByRole("button", { name: "Dismiss Customers welcome" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Got it" })).toBeVisible();
  });

  it("persists dismissal per provider and welcome version", async () => {
    const first = render(createElement(CustomersWelcomePopover, {
      providerId: 42,
      hasPrivateTools: false,
      draftSendingEnabled: false,
    }));

    fireEvent.click(await screen.findByRole("button", { name: "Got it" }));
    expect(window.localStorage.getItem(customersWelcomeStorageKey(42))).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Welcome to Customers" })).toBeNull());

    first.unmount();
    render(createElement(CustomersWelcomePopover, {
      providerId: 42,
      hasPrivateTools: false,
      draftSendingEnabled: false,
    }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Welcome to Customers" })).toBeNull());

    cleanup();
    render(createElement(CustomersWelcomePopover, {
      providerId: 43,
      hasPrivateTools: false,
      draftSendingEnabled: false,
    }));
    expect(await screen.findByRole("dialog", { name: "Welcome to Customers" })).toHaveTextContent("Private tools follow your plan");
    expect(CUSTOMERS_WELCOME_VERSION).toBe("v1");
  });

  it("is mounted only after server-confirmed Customers visibility and uses server capabilities", () => {
    const workspaceSource = readFileSync(resolve(__dirname, "../client/src/pages/ProviderCustomers.tsx"), "utf8");
    const routerSource = readFileSync(resolve(__dirname, "customersRouter.ts"), "utf8");

    expect(workspaceSource.indexOf("if (!access.data?.visible)")).toBeLessThan(workspaceSource.indexOf("<CustomersWelcomePopover"));
    expect(workspaceSource).toContain("providerId={access.data.providerId}");
    expect(workspaceSource).toContain("hasPrivateTools={access.data.providerWritesEnabled}");
    expect(workspaceSource).toContain("draftSendingEnabled={access.data.draftSendingEnabled}");
    expect(routerSource).toContain("providerId: access.provider?.id ?? 0");
    expect(workspaceSource).not.toMatch(/effectiveTier\s*===|effectiveTier\s*!==/);
  });
});
