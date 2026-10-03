import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const nav = readFileSync(resolve(root, "client/src/components/shared/NavHeader.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/components/shared/MobileAccountMenu.css"), "utf8");
const switcher = readFileSync(resolve(root, "client/src/components/ViewModeSwitcher.tsx"), "utf8");

describe("scoped mobile account menu theme", () => {
  it("opts in only the opened drawer, keeping the shared header and desktop account dropdown separate", () => {
    expect(nav).toContain('import "./MobileAccountMenu.css"');
    expect(nav).toContain('id="ology-mobile-account-menu" role="navigation" aria-label="Mobile menu"');
    expect(nav).toContain('aria-controls={mobileMenuOpen ? "ology-mobile-account-menu" : undefined}');
    expect(nav).toContain('className="ology-mobile-menu lg:hidden fixed inset-x-0 bottom-0 z-50 overflow-y-auto" style={{ top: mobileMenuTop }}');
    expect(nav).toContain('mobileHeaderRef.current?.getBoundingClientRect().bottom');
    expect(nav).toContain('mobileMenuOpen ? "z-[60]" : "z-50"');
    expect(nav).not.toContain('mobileMenuReview');
    expect(nav).toContain('border-b sticky top-0 public-brand-header');
    expect(nav).toContain('public-brand-account-menu');
    expect(styles).toContain('@import "../../styles/publicBrandTokens.css"');
    expect(styles).toContain('.public-brand-header .ology-mobile-menu');
    expect(styles).not.toContain('.public-brand-header .public-brand-account-menu');
    expect(styles).not.toContain('body {');
  });

  it("keeps the four-column icon grid and exact signed-in destinations with role gates", () => {
    expect(nav).toContain('className="ology-mobile-menu-grid grid grid-cols-4 gap-2"');
    for (const [href, label] of [
      ['/account', 'My Account'], ['/provider/calendar', 'My Calendar'],
      ['/notification-settings', 'Settings'], ['/help', 'Help'],
    ]) {
      expect(nav).toContain(`href="${href}"`);
      expect(nav).toContain(`>${label}</span>`);
    }
    for (const fragment of [
      'myProfile?.profileSlug', 'href={`/${myProfile.profileSlug}`}',
      'isProviderView ? "/provider/subscription" : "/customer/subscription"',
      'isProviderView ? "/provider/billing" : "/customer/billing"',
      'window.location.href = "/api/auth/logout"',
      'className="ology-mobile-menu-footer',
    ]) expect(nav).toContain(fragment);
    expect(styles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
  });

  it("aligns icon tiles, badges, selection and logout with brand colors without masking focus or notification states", () => {
    for (const token of [
      'var(--ology-brand-paper)', 'var(--ology-brand-surface)', 'var(--ology-brand-deep)',
      'var(--ology-brand-coral-hover)', 'var(--ology-brand-leaf)',
    ]) {
      expect(styles + nav).toContain(token);
    }
    expect(styles).toContain('[aria-pressed="true"]');
    expect(switcher).toContain('aria-pressed={viewMode === "provider"}');
    expect(switcher).toContain('aria-pressed={viewMode === "customer"}');
    expect(nav).toContain('aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}');
    expect(nav).toContain('unreadMessages > 0');
    expect(styles).toContain('env(safe-area-inset-bottom, 0px)');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).not.toContain('outline: none');
  });
});
