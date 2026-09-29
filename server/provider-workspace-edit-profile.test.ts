// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { createElement } = React;

const mocks = vi.hoisted(() => ({
  query: {
    data: {
      id: 42,
      businessName: "DJ Legacy",
      description: "Tour DJ and event professional.",
      city: "Atlanta",
      state: "GA",
      addressLine1: "",
      postalCode: "30316",
      serviceRadiusMiles: 100,
      acceptsMobile: true,
      acceptsFixedLocation: true,
      acceptsVirtual: true,
      profilePhotoUrl: "https://example.com/profile.jpg",
      businessLogoUrl: null,
    } as any,
    isLoading: false,
    error: null as Error | null,
  },
  updateMutate: vi.fn(),
  uploadPhotoMutate: vi.fn(),
  removePhotoMutate: vi.fn(),
  uploadLogoMutate: vi.fn(),
  removeLogoMutate: vi.fn(),
  updateOptions: null as any,
  profileInvalidate: vi.fn().mockResolvedValue(undefined),
  overviewInvalidate: vi.fn().mockResolvedValue(undefined),
  authInvalidate: vi.fn().mockResolvedValue(undefined),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/components/ImageCropper", () => ({
  ImageCropper: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      provider: { getMyProfile: { invalidate: mocks.profileInvalidate } },
      providerOverview: { get: { invalidate: mocks.overviewInvalidate } },
      auth: { me: { invalidate: mocks.authInvalidate } },
    }),
    provider: {
      getMyProfile: { useQuery: () => mocks.query },
      update: {
        useMutation: (options: any) => {
          mocks.updateOptions = options;
          return { mutate: mocks.updateMutate, isPending: false };
        },
      },
      uploadProfilePhoto: { useMutation: () => ({ mutate: mocks.uploadPhotoMutate, isPending: false }) },
      removeProfilePhoto: { useMutation: () => ({ mutate: mocks.removePhotoMutate, isPending: false }) },
      uploadBusinessLogo: { useMutation: () => ({ mutate: mocks.uploadLogoMutate, isPending: false }) },
      removeBusinessLogo: { useMutation: () => ({ mutate: mocks.removeLogoMutate, isPending: false }) },
    },
  },
}));

import { ProviderBusinessProfileDialog } from "../client/src/components/provider/ProviderBusinessProfileDialog";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.data = {
    id: 42,
    businessName: "DJ Legacy",
    description: "Tour DJ and event professional.",
    city: "Atlanta",
    state: "GA",
    addressLine1: "",
    postalCode: "30316",
    serviceRadiusMiles: 100,
    acceptsMobile: true,
    acceptsFixedLocation: true,
    acceptsVirtual: true,
    profilePhotoUrl: "https://example.com/profile.jpg",
    businessLogoUrl: null,
  };
  mocks.query.isLoading = false;
  mocks.query.error = null;
});

afterEach(cleanup);

describe("Provider Workspace profile editor", () => {
  it("opens the shared Edit Business Profile dialog with current provider values", async () => {
    render(createElement(ProviderBusinessProfileDialog, { open: true, onOpenChange: vi.fn() }));

    expect(await screen.findByRole("dialog", { name: "Edit Business Profile" })).toBeVisible();
    expect(screen.getByLabelText("Business Name")).toHaveValue("DJ Legacy");
    expect(screen.getByLabelText("Bio / Description")).toHaveValue("Tour DJ and event professional.");
    expect(screen.getByLabelText("City")).toHaveValue("Atlanta");
    expect(screen.getByLabelText("Postal Code")).toHaveValue("30316");
    expect(screen.getByLabelText("Service Radius (miles)")).toHaveValue(100);
    expect(screen.getByRole("button", { name: "Change Photo" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Upload Logo" })).toBeVisible();
  });

  it("submits only provider profile fields, refreshes the workspace, and closes after success", async () => {
    const onOpenChange = vi.fn();
    render(createElement(ProviderBusinessProfileDialog, { open: true, onOpenChange }));

    fireEvent.change(await screen.findByLabelText("Business Name"), { target: { value: "Legacy Fresh Entertainment" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Decatur" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(mocks.updateMutate).toHaveBeenCalledWith({
      businessName: "Legacy Fresh Entertainment",
      description: "Tour DJ and event professional.",
      city: "Decatur",
      state: "GA",
      addressLine1: "",
      postalCode: "30316",
      serviceRadiusMiles: 100,
      acceptsMobile: true,
      acceptsFixedLocation: true,
      acceptsVirtual: true,
    });

    await act(async () => {
      await mocks.updateOptions.onSuccess();
    });

    expect(mocks.profileInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.overviewInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Profile updated");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows bounded loading and error states without exposing a blank form", async () => {
    mocks.query.data = null;
    mocks.query.isLoading = true;
    const loading = render(createElement(ProviderBusinessProfileDialog, { open: true, onOpenChange: vi.fn() }));
    expect(await screen.findByRole("status", { name: "Loading business profile" })).toBeVisible();
    expect(screen.queryByLabelText("Business Name")).toBeNull();

    loading.unmount();
    mocks.query.isLoading = false;
    mocks.query.error = new Error("Profile unavailable");
    render(createElement(ProviderBusinessProfileDialog, { open: true, onOpenChange: vi.fn() }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t load your business profile");
    expect(screen.queryByLabelText("Business Name")).toBeNull();
  });

  it("replaces View public page with Edit Profile and keeps one shared editor implementation", () => {
    const root = resolve(__dirname, "..");
    const workspace = readFileSync(resolve(root, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
    const legacyDashboard = readFileSync(resolve(root, "client/src/pages/ProviderDashboard.tsx"), "utf8");
    const editor = readFileSync(resolve(root, "client/src/components/provider/ProviderBusinessProfileDialog.tsx"), "utf8");

    expect(workspace).toContain("<Pencil");
    expect(workspace).toContain("Edit Profile");
    expect(workspace).toContain("setProfileEditorOpen(true)");
    expect(workspace).toContain("<ProviderBusinessProfileDialog open={profileEditorOpen}");
    expect(workspace).not.toContain("View public page");
    expect(legacyDashboard).toContain("<ProviderBusinessProfileDialog open={profileEditorOpen}");
    expect(legacyDashboard).not.toContain("<DialogTitle>Edit Business Profile</DialogTitle>");
    expect(editor).toContain("<DialogTitle>Edit Business Profile</DialogTitle>");
    expect(editor).toContain("max-h-[92vh]");
    expect(editor).toContain("trpc.provider.update.useMutation");
  });
});
