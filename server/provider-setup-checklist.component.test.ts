// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderSetupChecklist } from "../client/src/components/provider/ProviderSetupChecklist";

afterEach(cleanup);

const incompleteSetup = {
  steps: [
    { id: "photo" as const, label: "Add a profile photo", description: "Help customers recognize you", done: false, actionLabel: "Add photo", href: "profile" },
    { id: "bio" as const, label: "Write your bio / description", description: "Tell customers about your experience", done: true, actionLabel: "Write bio", href: "profile" },
    { id: "categories" as const, label: "Select service categories", description: "Choose the types of services you offer", done: true, actionLabel: "Select categories", href: "/provider/onboarding" },
    { id: "services" as const, label: "Add at least one service", description: "Create a service with pricing so customers can book", done: true, actionLabel: "Add service", href: "/provider/services/new" },
    { id: "availability" as const, label: "Set your availability", description: "Let customers know when you're available", done: true, actionLabel: "Set schedule", href: "/provider/availability" },
    { id: "portfolio" as const, label: "Upload work samples", description: "Showcase your best work to attract customers", done: true, actionLabel: "Upload", href: "/provider/services?portfolio=upload#portfolio-work-samples" },
    { id: "stripe" as const, label: "Connect payment account", description: "Set up Stripe to receive payments", done: false, actionLabel: "Connect Stripe", href: "/provider/onboarding?step=4" },
  ],
  completedCount: 5,
  totalSteps: 7,
  progress: 71,
  nextStep: { id: "photo" as const, label: "Add a profile photo", description: "Help customers recognize you", done: false, actionLabel: "Add photo", href: "profile" },
};

describe("ProviderSetupChecklist", () => {
  it("shows one next action by default and expands all seven steps on request", () => {
    render(createElement(ProviderSetupChecklist, { setup: incompleteSetup, onEditProfile: vi.fn() }));

    expect(screen.getByText("Complete your setup")).toBeVisible();
    expect(screen.getByText("5 of 7 steps complete")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "71");
    expect(screen.getByText("Next: Add a profile photo")).toBeVisible();
    expect(screen.queryByText("Connect payment account")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /view all steps/i }));

    expect(screen.getByText("Connect payment account")).toBeVisible();
    expect(screen.getByRole("button", { name: /hide steps/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("opens Edit Profile for profile steps and supports local dismissal", () => {
    const onEditProfile = vi.fn();
    render(createElement(ProviderSetupChecklist, { setup: incompleteSetup, onEditProfile }));

    fireEvent.click(screen.getByText("Next: Add a profile photo"));
    expect(onEditProfile).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /dismiss setup checklist/i }));
    expect(screen.queryByText("Complete your setup")).not.toBeInTheDocument();
  });

  it("renders nothing after all seven steps are complete", () => {
    const completeSetup = {
      ...incompleteSetup,
      steps: incompleteSetup.steps.map((step) => ({ ...step, done: true })),
      completedCount: 7,
      progress: 100,
      nextStep: null,
    };

    const { container } = render(createElement(ProviderSetupChecklist, { setup: completeSetup, onEditProfile: vi.fn() }));
    expect(container).toBeEmptyDOMElement();
  });
});
