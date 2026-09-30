import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const navHeader = readFileSync(resolve(root, "client/src/components/shared/NavHeader.tsx"), "utf8");

const desktopActions = navHeader.slice(
  navHeader.indexOf("{/* Right side actions */}"),
  navHeader.indexOf("{/* Credit Balance */}"),
);
const desktopRightSide = navHeader.slice(
  navHeader.indexOf("{/* Right side actions */}"),
  navHeader.indexOf("{/* Mobile actions: Search + public Pricing + AI Assistant + Notifications + Hamburger */}"),
);
const mobileActions = navHeader.slice(
  navHeader.indexOf("{/* Mobile actions: Search + public Pricing + AI Assistant + Notifications + Hamburger */}"),
  navHeader.indexOf("{/* Mobile Full-Screen App Menu */}"),
);

describe("header discovery shortcut", () => {
  it("shows one Search icon linked to canonical Explore", () => {
    expect(desktopActions).toContain('<Link href="/browse" aria-label="Search services and providers">');
    expect(desktopActions).toContain('title="Search"');
    expect(desktopActions).toContain('<Search className="h-4 w-4" />');
  });

  it("removes the five former desktop shortcut icons", () => {
    for (const title of ["Home", "Browse Services", "My Bookings", "Saved", "Messages"]) {
      expect(desktopActions).not.toContain(`title="${title}"`);
    }
  });

  it("replaces the mobile Home and Explore icons with one Search shortcut", () => {
    expect(mobileActions).toContain('<Link href="/browse" aria-label="Search services and providers">');
    expect(mobileActions).toContain('title="Search"');
    expect(mobileActions).toContain('<Search className="h-5 w-5" />');
    expect(mobileActions).not.toContain('<Link href="/">');
    expect(mobileActions).not.toContain('title="Home"');
    expect(mobileActions).not.toContain('title="Browse Services"');
    expect(mobileActions).not.toContain("<LayoutGrid");
    expect(mobileActions).not.toContain("<Compass");
  });

  it("shows public Search followed by Pricing on desktop and mobile", () => {
    expect(desktopRightSide).toContain('<Link href="/browse" aria-label="Search services and providers">');
    expect(desktopRightSide).toContain('<Link href="/pricing">');
    expect(desktopRightSide).toContain('variant="ghost" size="sm">Pricing</Button>');
    expect(desktopRightSide.indexOf('href="/browse"')).toBeLessThan(
      desktopRightSide.indexOf('variant="ghost" size="sm">Pricing</Button>'),
    );

    expect(mobileActions).toContain('<Link href="/browse" aria-label="Search services and providers">');
    expect(mobileActions).toContain("{!isAuthenticated && (");
    expect(mobileActions).toContain('<Link href="/pricing">');
    expect(mobileActions.indexOf('href="/browse"')).toBeLessThan(
      mobileActions.indexOf('href="/pricing"'),
    );
  });
});
