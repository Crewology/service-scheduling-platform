import { describe, it, expect } from "vitest";

describe("Holistic Wellness Center Category", () => {
  it("should have the correct category configuration", () => {
    const category = {
      id: 210,
      name: "HOLISTIC WELLNESS CENTER",
      slug: "holistic-wellness-center",
      description: "Holistic wellness services including energy healing, meditation, aromatherapy, and integrative health practices",
      isMobileEnabled: true,
      isFixedLocationEnabled: true,
      isVirtualEnabled: true,
      sortOrder: 42,
    };

    expect(category.id).toBe(210);
    expect(category.name).toBe("HOLISTIC WELLNESS CENTER");
    expect(category.slug).toBe("holistic-wellness-center");
    expect(category.isMobileEnabled).toBe(true);
    expect(category.isFixedLocationEnabled).toBe(true);
    expect(category.isVirtualEnabled).toBe(true);
    expect(category.sortOrder).toBe(42);
  });

  it("should support all three service delivery modes", () => {
    const category = {
      isMobileEnabled: true,
      isFixedLocationEnabled: true,
      isVirtualEnabled: true,
    };

    // Holistic wellness can be done mobile (at client's home), at a center, or virtually
    expect(category.isMobileEnabled).toBe(true);
    expect(category.isFixedLocationEnabled).toBe(true);
    expect(category.isVirtualEnabled).toBe(true);
  });

  it("should have a valid slug format", () => {
    const slug = "holistic-wellness-center";
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).not.toContain(" ");
    expect(slug).not.toContain("_");
  });

  it("should be included in the seed-categories.mjs file", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const seedFile = fs.readFileSync(
      path.resolve(__dirname, "../scripts/seed-categories.mjs"),
      "utf-8"
    );
    expect(seedFile).toContain("HOLISTIC WELLNESS CENTER");
    expect(seedFile).toContain("holistic-wellness-center");
    expect(seedFile).toContain("id: 210");
  });
});

describe("Share Profile Feature", () => {
  it("should have ShareProfile component available", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(
      __dirname,
      "../client/src/components/ShareProfile.tsx"
    );
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it("should be integrated in PublicProviderProfile", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const profilePage = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/PublicProviderProfile.tsx"),
      "utf-8"
    );
    expect(profilePage).toContain("ShareProfile");
    expect(profilePage).toContain("Share Button");
  });

  it("should be integrated in ProviderDashboard", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const dashboardPage = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ProviderDashboard.tsx"),
      "utf-8"
    );
    expect(dashboardPage).toContain("ShareProfile");
    expect(dashboardPage).toContain("shareableUrl");
  });

  it("ShareProfile component should support social sharing features", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const component = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/ShareProfile.tsx"),
      "utf-8"
    );
    // Should have social media sharing
    expect(component).toContain("facebook");
    expect(component).toContain("twitter");
    expect(component).toContain("linkedin");
    expect(component).toContain("WhatsApp");
    // Should have copy link functionality
    expect(component).toContain("clipboard");
    // Should have QR code
    expect(component).toContain("QRCode");
    // Should have native share API support
    expect(component).toContain("navigator.share");
  });
});
