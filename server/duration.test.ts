import { describe, it, expect } from "vitest";
import { formatDuration, getDurationPricingLabel, DURATION_PRESETS } from "../shared/duration";

describe("formatDuration", () => {
  it("returns empty string for null/undefined/zero", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(-5)).toBe("");
  });

  it("formats minutes under 60 as 'X min'", () => {
    expect(formatDuration(15)).toBe("15 min");
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(59)).toBe("59 min");
  });

  it("formats exactly 60 minutes as '1 hr'", () => {
    expect(formatDuration(60)).toBe("1 hr");
  });

  it("formats even hours as 'X hrs'", () => {
    expect(formatDuration(120)).toBe("2 hrs");
    expect(formatDuration(180)).toBe("3 hrs");
    expect(formatDuration(300)).toBe("5 hrs");
    expect(formatDuration(420)).toBe("7 hrs");
  });

  it("formats hours with remainder as 'X hrs Y min'", () => {
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(150)).toBe("2 hrs 30 min");
    expect(formatDuration(195)).toBe("3 hrs 15 min");
  });

  it("formats 240 minutes as 'Half Day (4 hrs)'", () => {
    expect(formatDuration(240)).toBe("Half Day (4 hrs)");
  });

  it("formats 480 minutes as 'Full Day (8 hrs)'", () => {
    expect(formatDuration(480)).toBe("Full Day (8 hrs)");
  });

  it("formats 8+ hour even durations as 'Full Day (X hrs)'", () => {
    expect(formatDuration(540)).toBe("Full Day (9 hrs)");
    expect(formatDuration(600)).toBe("Full Day (10 hrs)");
    expect(formatDuration(720)).toBe("Full Day (12 hrs)");
  });

  it("formats 8+ hour durations with remainder", () => {
    expect(formatDuration(510)).toBe("Full Day (8 hrs 30 min)");
    expect(formatDuration(615)).toBe("Full Day (10 hrs 15 min)");
  });
});

describe("getDurationPricingLabel", () => {
  it("returns empty string for null/undefined/zero", () => {
    expect(getDurationPricingLabel(null)).toBe("");
    expect(getDurationPricingLabel(undefined)).toBe("");
    expect(getDurationPricingLabel(0)).toBe("");
  });

  it("returns 'Day Rate' for 8+ hour services", () => {
    expect(getDurationPricingLabel(480)).toBe("Day Rate");
    expect(getDurationPricingLabel(600)).toBe("Day Rate");
    expect(getDurationPricingLabel(720)).toBe("Day Rate");
  });

  it("returns 'Hourly' when pricingModel is hourly", () => {
    expect(getDurationPricingLabel(60, "hourly")).toBe("Hourly");
    expect(getDurationPricingLabel(120, "hourly")).toBe("Hourly");
  });

  it("returns empty string for standard services", () => {
    expect(getDurationPricingLabel(30)).toBe("");
    expect(getDurationPricingLabel(60)).toBe("");
    expect(getDurationPricingLabel(60, "fixed")).toBe("");
  });

  it("returns 'Day Rate' for 8+ hours even if pricingModel is hourly", () => {
    expect(getDurationPricingLabel(480, "hourly")).toBe("Day Rate");
  });
});

describe("DURATION_PRESETS", () => {
  it("has at least 10 options", () => {
    expect(DURATION_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("starts with 15 min and ends with 720 min", () => {
    expect(DURATION_PRESETS[0].value).toBe(15);
    expect(DURATION_PRESETS[DURATION_PRESETS.length - 1].value).toBe(720);
  });

  it("is sorted in ascending order by value", () => {
    for (let i = 1; i < DURATION_PRESETS.length; i++) {
      expect(DURATION_PRESETS[i].value).toBeGreaterThan(DURATION_PRESETS[i - 1].value);
    }
  });

  it("includes common durations: 60, 120, 240, 480, 600", () => {
    const values = DURATION_PRESETS.map((p) => p.value);
    expect(values).toContain(60);
    expect(values).toContain(120);
    expect(values).toContain(240);
    expect(values).toContain(480);
    expect(values).toContain(600);
  });

  it("all presets have non-empty labels", () => {
    for (const preset of DURATION_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
    }
  });
});
