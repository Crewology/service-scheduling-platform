import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const navHeader = readFileSync(resolve(root, "client/src/components/shared/NavHeader.tsx"), "utf8");

const desktopActions = navHeader.slice(
  navHeader.indexOf("{/* Right side actions */}"),
  navHeader.indexOf("{/* Credit Balance */}"),
);
const mobileActions = navHeader.slice(
  navHeader.indexOf("{/* Mobile actions: Explore + AI Assistant + Notifications + Hamburger */}"),
  navHeader.indexOf("{/* Mobile Full-Screen App Menu */}"),
);

describe("desktop header discovery shortcut", () => {
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

  it("leaves mobile Home and Explore shortcuts unchanged", () => {
    expect(mobileActions).toContain('<Link href="/">');
    expect(mobileActions).toContain('title="Home"');
    expect(mobileActions).toContain('<Link href="/browse">');
    expect(mobileActions).toContain('title="Browse Services"');
  });
});
