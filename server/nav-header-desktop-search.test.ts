import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const navHeader = readFileSync(resolve(root, "client/src/components/shared/NavHeader.tsx"), "utf8");
const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const conceptSource = readFileSync(resolve(root, "client/src/pages/PublicHomepageConceptThree.tsx"), "utf8");
const conceptStyles = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageDemoPrototype.css"), "utf8");
const publicBrandStyles = readFileSync(resolve(root, "client/src/components/shared/PublicBrandHeader.css"), "utf8");
const footer = readFileSync(resolve(root, "client/src/components/shared/Footer.tsx"), "utf8");

const desktopActions = navHeader.slice(
  navHeader.indexOf("{/* Right side actions */}"),
  navHeader.indexOf("{/* Credit Balance */}"),
);
const desktopRightSide = navHeader.slice(
  navHeader.indexOf("{/* Right side actions */}"),
  navHeader.indexOf("{/* Mobile actions: Search + AI Assistant + Notifications + Hamburger */}"),
);
const mobileActions = navHeader.slice(
  navHeader.indexOf("{/* Mobile actions: Search + AI Assistant + Notifications + Hamburger */}"),
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

  it("shows public Search followed by Pricing on desktop", () => {
    expect(desktopRightSide).toContain('<Link href="/browse" aria-label="Search services and providers">');
    expect(desktopRightSide).toContain('<Link href="/pricing">');
    expect(desktopRightSide).toContain('variant="ghost" size="sm" className="public-brand-nav-link">Pricing</Button>');
    expect(desktopRightSide.indexOf('href="/browse"')).toBeLessThan(
      desktopRightSide.indexOf('variant="ghost" size="sm" className="public-brand-nav-link">Pricing</Button>'),
    );
  });

  it("matches the compact footer's brand mark and wordmark in both public and authenticated headers", () => {
    expect(navHeader).toContain('<header ref={mobileHeaderRef} className={`border-b sticky top-0 public-brand-header ${mobileMenuOpen ? "z-[60]" : "z-50"}`}>');
    expect(navHeader).toContain('<div className="public-brand-inner">');
    const footerMark = '/manus-storage/ologycrew-demo-mark_075b3913.png';
    expect(footer).toContain(footerMark);
    expect(navHeader).toContain(footerMark);
    expect(navHeader).toContain('aria-label="OlogyCrew homepage"');
    expect(navHeader).toContain('public-brand-wordmark-accent">Crew</span>');
    expect(publicBrandStyles).toContain('.public-brand-header .public-brand-wordmark-accent { color: #bd4b35; }');
    expect(desktopRightSide).toContain('className="public-brand-cta">Get Started</Button>');
    expect(desktopRightSide).toContain('<Link href="/login">');
    expect(publicBrandStyles).toContain('.public-brand-header .public-brand-inner');
    expect(publicBrandStyles).toContain('width: min(1600px, calc(100% - 64px))');
    expect(publicBrandStyles).toContain('background: #bd4b35');
    expect(publicBrandStyles).toContain('.public-brand-header .public-brand-account-menu a:hover');
    expect(publicBrandStyles).toContain('.public-brand-header [title^="Switch to"]:not(:disabled):hover');
    expect(publicBrandStyles).toContain('.public-brand-header :is(a, button):focus-visible');
    expect(publicBrandStyles).toContain('prefers-reduced-motion: reduce');
    expect(homeSource).toContain("return <PublicHomepageConceptThree />");
    expect(conceptSource).toContain('className="or-search"');
    expect(conceptStyles).toContain(".or-search button{border:0;background:#c74f38");
  });

  it("keeps Pricing out of the compact mobile header", () => {
    expect(mobileActions).toContain('<Link href="/browse" aria-label="Search services and providers">');
    expect(mobileActions).not.toContain('<Link href="/pricing">');
  });
});
