import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_ICONS } from "../client/src/lib/categoryIcons";

const projectRoot = resolve(import.meta.dirname, "..");

const categorySurfaces = [
  "client/src/pages/Home.tsx",
  "client/src/pages/Browse.tsx",
  "client/src/pages/CategoryDetail.tsx",
  "client/src/pages/ProviderOnboarding.tsx",
  "client/src/pages/ProviderDashboard.tsx",
  "client/src/pages/PublicProviderProfile.tsx",
];

describe("Studio Space Rentals category icon consistency", () => {
  it("uses one purpose-specific icon for category 217", () => {
    expect(CATEGORY_ICONS[217]).toBe("🎙️");
  });

  it("imports the authoritative category icon map on every category surface", () => {
    for (const relativePath of categorySurfaces) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8");
      expect(source, `${relativePath} should import the shared category icon map`).toContain(
        'import { CATEGORY_ICONS } from "@/lib/categoryIcons";',
      );
      expect(source, `${relativePath} should not define a local category icon map`).not.toMatch(
        /const\s+CATEGORY_ICONS\s*:/,
      );
    }
  });

  it("keeps Studio Space Rentals bound to the expected category id and slug", () => {
    const seedSource = readFileSync(resolve(projectRoot, "scripts/seed-categories.ts"), "utf8");
    expect(seedSource).toContain(
      '{ id: 217, name: "STUDIO SPACE RENTALS", slug: "studio-space-rentals"',
    );
  });
});
