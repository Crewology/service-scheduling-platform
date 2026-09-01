import { describe, expect, it } from "vitest";
import { normalizePrototypeReviewUrl } from "./previewRouteNormalization";

describe("prototype review URL normalization", () => {
  it("redirects an encoded trailing backtick on the provider route", () => {
    expect(normalizePrototypeReviewUrl("/preview/provider-overview%60"))
      .toBe("/preview/provider-overview");
  });

  it("redirects a literal trailing backtick on the customer route", () => {
    expect(normalizePrototypeReviewUrl("/preview/customer-home`"))
      .toBe("/preview/customer-home");
  });

  it("preserves adaptive-booking query parameters", () => {
    expect(normalizePrototypeReviewUrl("/preview/adaptive-booking%60?mode=quote&query=Church%20sound%20event"))
      .toBe("/preview/adaptive-booking?mode=quote&query=Church%20sound%20event");
  });

  it("does not alter a clean prototype route", () => {
    expect(normalizePrototypeReviewUrl("/preview/provider-overview")).toBeNull();
  });

  it("does not alter normal application routes", () => {
    expect(normalizePrototypeReviewUrl("/provider/dashboard%60")).toBeNull();
  });
});
