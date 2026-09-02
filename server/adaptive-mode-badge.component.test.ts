// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AdaptiveModeBadge } from "../client/src/components/booking/AdaptiveModeBadge";
import type { AdaptiveBookingDecision } from "../shared/adaptiveBooking";

afterEach(cleanup);

const directDecision: AdaptiveBookingDecision = {
  mode: "direct",
  label: "Direct booking",
  heading: "Choose a date and time",
  explanation: "The provider has supplied everything needed to book.",
  bookingTypes: ["single"],
};

const quoteDecision: AdaptiveBookingDecision = {
  mode: "quote",
  label: "Personalized quote",
  heading: "Tell the provider about your project",
  explanation: "The provider needs the project scope first.",
  bookingTypes: [],
};

describe("AdaptiveModeBadge", () => {
  it("renders the direct-booking state with accessible visible copy", () => {
    render(createElement(AdaptiveModeBadge, { decision: directDecision }));
    const badge = screen.getByTestId("adaptive-mode-badge");
    expect(badge).toHaveTextContent("Direct booking");
    expect(badge).toHaveAttribute("data-mode", "direct");
    expect(badge).toHaveClass("bg-emerald-50");
  });

  it("renders quote action copy for compact provider service cards", () => {
    render(createElement(AdaptiveModeBadge, {
      decision: quoteDecision,
      copy: "action",
      className: "mt-2",
    }));
    const badge = screen.getByTestId("adaptive-mode-badge");
    expect(badge).toHaveTextContent("Request quote");
    expect(badge).toHaveAttribute("data-mode", "quote");
    expect(badge).toHaveClass("bg-amber-50", "mt-2");
  });
});
