import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "client/src/components/ui/sonner.tsx"),
  "utf8",
);

function relativeLuminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map(value => Number.parseInt(value, 16) / 255)
    .map(value => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("global toast foreground contrast", () => {
  it("uses explicit readable title and description colors in light and dark themes", () => {
    expect(source).toContain('title: "!text-slate-950 dark:!text-slate-50"');
    expect(source).toContain('description: "!text-slate-700 dark:!text-slate-200"');
    expect(source).not.toContain("description: \"group-[.toast]:text-muted-foreground\"");
  });

  it("keeps close and action controls readable without changing the global toast position", () => {
    expect(source).toContain("closeButton:");
    expect(source).toContain("actionButton:");
    expect(source).toContain("cancelButton:");

    const app = fs.readFileSync(path.resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(app).toContain('<Toaster position="bottom-left" />');
  });

  it("meets the WCAG AA 4.5:1 contrast threshold for the selected body colors", () => {
    expect(contrastRatio("#334155", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#e2e8f0", "#020617")).toBeGreaterThanOrEqual(4.5);
  });
});
