// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const mocks = vi.hoisted(() => ({
  user: {
    id: 1, name: "Avery Lane", firstName: "Avery", lastName: "Lane",
    email: "avery@example.com", phone: "5555551234", role: "admin",
    createdAt: new Date("2026-06-01T00:00:00Z"), profilePhotoUrl: "https://example.com/avery.jpg",
  } as any,
  navigate: vi.fn(),
  profileUpdate: vi.fn(), photoUpload: vi.fn(), photoRemove: vi.fn(), businessUpdate: vi.fn(),
  passwordChange: vi.fn(), enable2FA: vi.fn(), disable2FA: vi.fn(), accountDelete: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user, loading: false, isAuthenticated: true }),
}));
vi.mock("@/components/shared/NavHeader", () => ({ NavHeader: () => React.createElement("header", null, "Navigation") }));
vi.mock("@/components/ImageCropper", () => ({ ImageCropper: () => null }));
vi.mock("wouter", () => ({ useLocation: () => ["/account", mocks.navigate] }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } }, provider: { getMyProfile: { invalidate: vi.fn() } } }),
    provider: {
      getMyProfile: { useQuery: () => ({ data: { businessName: "Avery Services" } }) },
      update: { useMutation: () => ({ mutate: mocks.businessUpdate, isPending: false }) },
    },
    auth: {
      updateProfile: { useMutation: () => ({ mutate: mocks.profileUpdate, isPending: false }) },
      uploadProfilePhoto: { useMutation: () => ({ mutate: mocks.photoUpload, isPending: false }) },
      removeProfilePhoto: { useMutation: () => ({ mutate: mocks.photoRemove, isPending: false }) },
      get2FAStatus: { useQuery: () => ({ data: { enabled: false }, isLoading: false }) },
      enable2FA: { useMutation: () => ({ mutate: mocks.enable2FA, isPending: false }) },
      disable2FA: { useMutation: () => ({ mutate: mocks.disable2FA, isPending: false }) },
      hasPassword: { useQuery: () => ({ data: { hasPassword: true }, isLoading: false }) },
      changePassword: { useMutation: () => ({ mutate: mocks.passwordChange, isPending: false }) },
      deleteAccount: { useMutation: () => ({ mutate: mocks.accountDelete, isPending: false }) },
    },
  },
}));

import UserProfile from "../client/src/pages/UserProfile";

function expectNoAccountMutations() {
  for (const fn of [
    mocks.profileUpdate, mocks.photoUpload, mocks.photoRemove, mocks.businessUpdate,
    mocks.passwordChange, mocks.enable2FA, mocks.disable2FA, mocks.accountDelete,
  ]) expect(fn).not.toHaveBeenCalled();
}

afterEach(() => {
  cleanup();
  mocks.user = {
    id: 1, name: "Avery Lane", firstName: "Avery", lastName: "Lane",
    email: "avery@example.com", phone: "5555551234", role: "admin",
    createdAt: new Date("2026-06-01T00:00:00Z"), profilePhotoUrl: "https://example.com/avery.jpg",
  };
  for (const fn of [mocks.navigate, mocks.profileUpdate, mocks.photoUpload, mocks.photoRemove, mocks.businessUpdate, mocks.passwordChange, mocks.enable2FA, mocks.disable2FA, mocks.accountDelete]) fn.mockReset();
});

describe("My Account palette preserves existing interactions", () => {
  it("keeps admin identity, edit, photo, password and two-factor controls but no deletion", () => {
    const { container } = render(React.createElement(UserProfile));
    expect(container.querySelector(".ology-account-page .ology-account-content")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "My Account" })).toBeVisible();
    expect(screen.getByText("avery@example.com")).toBeVisible();
    expect(screen.getByRole("img", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Photo" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enable" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Delete My Account" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(screen.getByPlaceholderText("First name")).toHaveValue("Avery");
    expect(screen.getByPlaceholderText("123 Main Street")).toBeInTheDocument();
    expect(screen.getByText(/This information is never shared publicly/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(screen.getByPlaceholderText("Enter current password")).toBeInTheDocument();
    expectNoAccountMutations();
  });

  it("keeps the provider business name editable without saving on open or cancel", () => {
    mocks.user.role = "provider";
    render(React.createElement(UserProfile));
    expect(screen.getByText("Avery Services")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
    expect(screen.getByPlaceholderText("Your business name")).toHaveValue("Avery Services");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expectNoAccountMutations();
  });

  it("keeps customer onboarding and requires DELETE before account deletion", () => {
    mocks.user.role = "customer";
    render(React.createElement(UserProfile));
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/provider/onboarding");
    fireEvent.click(screen.getByRole("button", { name: "Delete My Account" }));
    const warning = screen.getByRole("dialog", { name: "Are you sure?" });
    expect(warning.querySelector("p ul, p p")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "I understand, continue" }));
    expect(screen.getByRole("button", { name: "Permanently Delete My Account" })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Type "DELETE" to confirm'), { target: { value: "NOT DELETE" } });
    expect(screen.getByRole("button", { name: "Permanently Delete My Account" })).toBeDisabled();
    expectNoAccountMutations();
  });
});
