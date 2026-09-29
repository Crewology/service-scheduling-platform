// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { createElement } = React;

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  customerMutate: vi.fn(),
  providerMutate: vi.fn(),
  customerGetSubscriptionInvalidate: vi.fn().mockResolvedValue(undefined),
  customerTrialStatusInvalidate: vi.fn().mockResolvedValue(undefined),
  providerSubscriptionInvalidate: vi.fn().mockResolvedValue(undefined),
  providerTrialStatusInvalidate: vi.fn().mockResolvedValue(undefined),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  customerOptions: null as any,
  providerOptions: null as any,
  customerPending: false,
  providerPending: false,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", mocks.navigate],
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
      customerSubscription: {
        getSubscription: { invalidate: mocks.customerGetSubscriptionInvalidate },
        checkTrialStatus: { invalidate: mocks.customerTrialStatusInvalidate },
      },
      subscription: {
        mySubscription: { invalidate: mocks.providerSubscriptionInvalidate },
        checkTrialStatus: { invalidate: mocks.providerTrialStatusInvalidate },
      },
    }),
    customerSubscription: {
      downgrade: {
        useMutation: (options: any) => {
          mocks.customerOptions = options;
          return { mutate: mocks.customerMutate, isPending: mocks.customerPending };
        },
      },
    },
    subscription: {
      downgrade: {
        useMutation: (options: any) => {
          mocks.providerOptions = options;
          return { mutate: mocks.providerMutate, isPending: mocks.providerPending };
        },
      },
    },
  },
}));

import { CustomerTrialExpiredGate } from "../client/src/components/CustomerTrialBanner";
import { TrialExpiredGate } from "../client/src/components/TrialBanner";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.customerPending = false;
  mocks.providerPending = false;
  mocks.customerOptions = null;
  mocks.providerOptions = null;
});

afterEach(cleanup);

describe("trial-ended customer actions", () => {
  it("opens the customer subscription plans from Subscribe", () => {
    render(createElement(CustomerTrialExpiredGate));

    fireEvent.click(screen.getByRole("button", { name: "View customer subscription plans" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/customer/subscription");
  });

  it("continues with Individual, refreshes lifecycle state, and reports success", async () => {
    const onDowngrade = vi.fn();
    render(createElement(CustomerTrialExpiredGate, { onDowngrade }));

    fireEvent.click(screen.getByRole("button", { name: "Continue with Individual plan" }));
    expect(mocks.customerMutate).toHaveBeenCalledWith({ targetTier: "free" });

    await act(async () => {
      await mocks.customerOptions.onSuccess({ message: "You're continuing with the Individual plan." });
    });

    expect(mocks.customerGetSubscriptionInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.customerTrialStatusInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("You're continuing with the Individual plan.");
    expect(onDowngrade).toHaveBeenCalledTimes(1);
  });

  it("shows a useful customer error and disables duplicate clicks while pending", () => {
    mocks.customerPending = true;
    render(createElement(CustomerTrialExpiredGate));

    expect(screen.getByRole("button", { name: "Continue with Individual plan" })).toBeDisabled();
    expect(screen.getByText("Downgrading...")).toBeVisible();
    mocks.customerOptions.onError(new Error("Customer continuation failed"));
    expect(mocks.toastError).toHaveBeenCalledWith("Customer continuation failed");
  });
});

describe("trial-ended provider actions", () => {
  it("opens the provider subscription plans from Subscribe", () => {
    render(createElement(TrialExpiredGate));

    fireEvent.click(screen.getByRole("button", { name: "View provider subscription plans" }));

    expect(mocks.navigate).toHaveBeenCalledWith("/provider/subscription");
  });

  it("continues with Starter, refreshes lifecycle state, and reports success", async () => {
    const onDowngrade = vi.fn();
    render(createElement(TrialExpiredGate, { onDowngrade }));

    fireEvent.click(screen.getByRole("button", { name: "Continue with Starter plan" }));
    expect(mocks.providerMutate).toHaveBeenCalledWith({ targetTier: "free" });

    await act(async () => {
      await mocks.providerOptions.onSuccess({ message: "You're continuing with Starter (Free)." });
    });

    expect(mocks.providerSubscriptionInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.providerTrialStatusInvalidate).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("You're continuing with Starter (Free).");
    expect(onDowngrade).toHaveBeenCalledTimes(1);
  });

  it("shows a useful provider error and disables duplicate clicks while pending", () => {
    mocks.providerPending = true;
    render(createElement(TrialExpiredGate));

    expect(screen.getByRole("button", { name: "Continue with Starter plan" })).toBeDisabled();
    expect(screen.getByText("Downgrading...")).toBeVisible();
    mocks.providerOptions.onError(new Error("Provider continuation failed"));
    expect(mocks.toastError).toHaveBeenCalledWith("Provider continuation failed");
  });
});
