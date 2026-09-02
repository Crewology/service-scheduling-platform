// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Banknote } from "lucide-react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ProviderPulseStat } from "../client/src/components/workspace/ProviderPulseStat";

afterEach(cleanup);

describe("ProviderPulseStat", () => {
  it("renders a real provider metric with its context", () => {
    render(createElement(ProviderPulseStat, {
      icon: Banknote,
      label: "Collected",
      value: "$720",
      detail: "Completed services this month",
    }));

    expect(screen.getByTestId("provider-pulse-stat")).toHaveTextContent("Collected");
    expect(screen.getByText("$720")).toBeVisible();
    expect(screen.getByText("Completed services this month")).toBeVisible();
  });
});
