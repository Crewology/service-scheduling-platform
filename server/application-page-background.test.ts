import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

function collectTsxFiles(directory: string): string[] {
  const absolute = resolve(root, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(relative(root, path));
    return extname(entry.name) === ".tsx" ? [relative(root, path)] : [];
  });
}

const pageCanvasSignals = ["min-h-screen", "h-[100dvh]", "min-h-[calc(100vh-4rem)]"];
const oldCanvasTreatments = [
  "bg-background",
  "bg-gray-50",
  "bg-slate-50",
  "bg-[#f7faff]",
  "bg-gradient-to-br from-slate-50 to-blue-50",
  "bg-gradient-to-b from-muted/30 to-background",
  "bg-gradient-to-br from-amber-50 via-white to-orange-50",
  "bg-gradient-to-br from-purple-50 via-white to-orange-50",
  "bg-gradient-to-br from-slate-50 to-slate-100",
];

const applicationSurfaceFiles = [
  ...collectTsxFiles("client/src/pages"),
  ...collectTsxFiles("client/src/components"),
  "client/src/App.tsx",
].filter((path) => path !== "client/src/pages/EmbedBooking.tsx");

describe("application-wide page canvas", () => {
  it("defines the Provider Workspace light blue as a semantic global page token", () => {
    const css = readSource("client/src/index.css");
    expect(css).toContain("--color-page: var(--page);");
    expect(css).toContain("--page: #f7faff;");
    expect(css).toContain("@apply bg-page text-foreground;");
    expect(css).toContain("background-color: var(--page);");

    // Content surfaces remain white rather than inheriting the page canvas.
    expect(css).toContain("--background: oklch(1 0 0);");
    expect(css).toContain("--card: oklch(1 0 0);");
  });

  it("uses the semantic token on every explicit full-page application canvas", () => {
    const violations: string[] = [];

    for (const path of applicationSurfaceFiles) {
      const lines = readSource(path).split("\n");
      lines.forEach((line, index) => {
        if (!pageCanvasSignals.some((signal) => line.includes(signal))) return;
        if (!line.includes("bg-")) return;
        const oldTreatment = oldCanvasTreatments.find((treatment) => line.includes(treatment));
        if (oldTreatment) violations.push(`${path}:${index + 1} uses ${oldTreatment}`);
      });
    }

    expect(violations).toEqual([]);
  });

  it("keeps both workspace shells and global boundary surfaces on the same canvas", () => {
    expect(readSource("client/src/components/provider/ProviderWorkspaceShell.tsx")).toContain("bg-page");
    expect(readSource("client/src/components/customer/CustomerWorkspaceShell.tsx")).toContain("bg-page");
    expect(readSource("client/src/components/ProviderOnlyGuard.tsx")).toContain("bg-page");
    expect(readSource("client/src/components/ErrorBoundary.tsx")).toContain("bg-page");
    expect(readSource("client/src/App.tsx")).toContain("min-h-screen flex items-center justify-center bg-page");
  });

  it("leaves external booking embeds white so host-site integrations do not inherit the app canvas", () => {
    const embed = readSource("client/src/pages/EmbedBooking.tsx");
    expect(embed).toContain('className="min-h-screen bg-white p-4"');
    expect(embed).not.toContain("bg-page");
  });
});
