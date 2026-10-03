// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const mocks = vi.hoisted(() => ({
  authenticated: true,
  user: { name: "Winston Williams", email: "wwilliams@visionkwest.com", role: "admin", profilePhotoUrl: "" } as { name: string; email: string; role: string; profilePhotoUrl: string } | null,
  profile: { profileSlug: "visionkwest-studio" } as { profileSlug: string } | null,
  viewMode: "provider" as "provider" | "customer",
  location: "/",
  navigate: vi.fn(),
  setViewMode: vi.fn(),
  install: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, isAuthenticated: mocks.authenticated, logout: vi.fn() }),
}));
vi.mock("@/contexts/ViewModeContext", () => ({
  useViewMode: () => ({
    viewMode: mocks.viewMode,
    isProviderView: mocks.viewMode === "provider",
    isCustomerView: mocks.viewMode === "customer",
    canSwitch: mocks.authenticated && !!mocks.profile,
    setViewMode: mocks.setViewMode,
  }),
}));
vi.mock("@/contexts/PWAInstallContext", () => ({
  usePWAInstallContext: () => ({ isInstalled: true, triggerInstall: mocks.install }),
}));
vi.mock("@/hooks/useSSE", () => ({ useSSE: vi.fn() }));
vi.mock("wouter", () => ({
  useLocation: () => [mocks.location, mocks.navigate],
  Link: ({ href, children, onClick, ...props }: any) => React.createElement("a", {
    href,
    ...props,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onClick?.(event);
    },
  }, children),
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      notification: { list: { invalidate: vi.fn() }, unreadCount: { invalidate: vi.fn() } },
      message: { unreadCount: { invalidate: vi.fn() } },
    }),
    notification: {
      list: { useQuery: () => ({ data: [] }) },
      unreadCount: { useQuery: () => ({ data: { count: 0 } }) },
      markAsRead: { useMutation: () => ({ mutate: vi.fn() }) },
      markAllRead: { useMutation: () => ({ mutate: vi.fn() }) },
      clearAll: { useMutation: () => ({ mutate: vi.fn() }) },
    },
    referral: { getCreditBalance: { useQuery: () => ({ data: { balance: "0" } }) } },
    message: { unreadCount: { useQuery: () => ({ data: 2 }) } },
    provider: { getMyProfile: { useQuery: () => ({ data: mocks.profile }) } },
  },
}));

import { NavHeader } from "../client/src/components/shared/NavHeader";

afterEach(() => {
  cleanup();
  mocks.authenticated = true;
  mocks.user = { name: "Winston Williams", email: "wwilliams@visionkwest.com", role: "admin", profilePhotoUrl: "" };
  mocks.profile = { profileSlug: "visionkwest-studio" };
  mocks.viewMode = "provider";
  mocks.location = "/";
  mocks.navigate.mockReset();
  mocks.setViewMode.mockReset();
  mocks.install.mockReset();
});

function openDrawer() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  const menu = screen.getByRole("navigation", { name: "Mobile menu" });
  expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
  return menu;
}

describe("people-first mobile account menu", () => {
  it("keeps the provider/admin shortcuts, four-column app layout and role selection, then closes on navigation", () => {
    const { container, rerender } = render(React.createElement(NavHeader));
    const header = container.querySelector(".public-brand-header") as HTMLElement;
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue({ bottom: 128 } as DOMRect);
    expect(screen.getByRole("button", { name: "Open menu" })).not.toHaveAttribute("aria-controls");
    let menu = openDrawer();
    expect(menu).toHaveClass("ology-mobile-menu");
    expect(menu).toHaveStyle({ top: "128px" });
    expect(header).toHaveClass("z-[60]");
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-controls", "ology-mobile-account-menu");
    expect(within(menu).getByText("Winston Williams")).toBeVisible();
    expect(within(menu).getByText("wwilliams@visionkwest.com")).toBeVisible();
    expect(within(menu).getByText("Admin")).toHaveClass("ology-mobile-menu-admin-badge");
    expect(within(menu).getByRole("button", { name: "Provider" })).toHaveAttribute("aria-pressed", "true");
    expect(within(menu).getByRole("button", { name: "Customer" })).toHaveAttribute("aria-pressed", "false");
    expect(menu.querySelector(".ology-mobile-menu-grid")).toHaveClass("grid-cols-4");
    for (const [label, href] of [
      ["My Account", "/account"], ["My Page", "/visionkwest-studio"],
      ["My Calendar", "/provider/calendar"], ["My Subscription", "/provider/subscription"],
      ["Billing History", "/provider/billing"], ["Settings", "/notification-settings"], ["Help", "/help"],
    ]) {
      expect(within(menu).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(container.querySelector(".ology-mobile-menu-grid a button, .ology-mobile-menu-grid button a")).toBeNull();
    fireEvent.click(within(menu).getByRole("link", { name: "My Subscription" }));
    expect(screen.queryByRole("navigation", { name: "Mobile menu" })).not.toBeInTheDocument();
    expect(header).toHaveClass("z-50");
    mocks.location = "/provider/subscription";
    rerender(React.createElement(NavHeader));
    menu = openDrawer();
    expect(within(menu).getByRole("link", { name: "My Subscription" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "My Calendar" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Log Out" })).toBeVisible();
  });

  it("keeps customer-view billing routes and changes the selected role without initiating checkout", () => {
    const { rerender } = render(React.createElement(NavHeader));
    let menu = openDrawer();
    fireEvent.click(within(menu).getByRole("button", { name: "Customer" }));
    expect(mocks.setViewMode).toHaveBeenCalledWith("customer");
    expect(mocks.navigate).not.toHaveBeenCalled();
    mocks.viewMode = "customer";
    rerender(React.createElement(NavHeader));
    menu = screen.getByRole("navigation", { name: "Mobile menu" });
    expect(within(menu).getByRole("button", { name: "Customer" })).toHaveAttribute("aria-pressed", "true");
    expect(within(menu).getByRole("link", { name: "My Subscription" })).toHaveAttribute("href", "/customer/subscription");
    expect(within(menu).getByRole("link", { name: "Billing History" })).toHaveAttribute("href", "/customer/billing");
    expect(within(menu).getByRole("link", { name: "My Account" })).toBeVisible();
    expect(within(menu).getByRole("link", { name: "My Calendar" })).toBeVisible();
  });

  it("keeps guest sign-in and the four public destinations without exposing account controls", () => {
    mocks.authenticated = false;
    mocks.user = null;
    mocks.profile = null;
    render(React.createElement(NavHeader, { forcePublic: true }));
    const menu = openDrawer();
    expect(within(menu).getByRole("link", { name: "Sign In to Get Started" })).toHaveAttribute("href", "/login");
    for (const [label, href] of [["Browse", "/browse"], ["Platform", "/platform"], ["Pricing", "/pricing"], ["Help", "/help"]]) {
      expect(within(menu).getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
    expect(within(menu).queryByRole("button", { name: "Log Out" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("button", { name: "Provider" })).not.toBeInTheDocument();
  });
});
