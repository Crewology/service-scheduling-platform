// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { CalendarDays, Clock3 } from "lucide-react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { CustomerEmptyState } from "../client/src/components/workspace/CustomerEmptyState";

afterEach(cleanup);

describe("CustomerEmptyState", () => {
  it("renders an actionable upcoming-booking recovery state", () => {
    render(createElement(CustomerEmptyState, {
      icon: CalendarDays,
      title: "No upcoming bookings",
      description: "Describe what you need above or browse services to get started.",
      action: { href: "/browse", label: "Browse services" },
    }));

    expect(screen.getByRole("heading", { name: "No upcoming bookings" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Browse services" })).toHaveAttribute("href", "/browse");
  });

  it("renders a quiet relationship-history state without an unnecessary action", () => {
    render(createElement(CustomerEmptyState, {
      icon: Clock3,
      title: "Your trusted providers will appear here",
      description: "Completed services become one-tap rebooking relationships.",
    }));

    expect(screen.getByTestId("customer-empty-state")).toHaveTextContent("Your trusted providers will appear here");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
