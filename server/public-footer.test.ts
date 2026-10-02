import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const footerSource = readFileSync(
  resolve(root, "client/src/components/shared/Footer.tsx"),
  "utf8",
);
const brandStyles = readFileSync(
  resolve(root, "client/src/components/shared/BrandFooter.css"),
  "utf8",
);
const shareSource = readFileSync(
  resolve(root, "client/src/components/shared/FooterSocialShare.tsx"),
  "utf8",
);
const helpSource = readFileSync(
  resolve(root, "client/src/pages/HelpCenter.tsx"),
  "utf8",
);

describe("public footer", () => {
  it("opens with clear customer and provider acquisition paths", () => {
    expect(footerSource).toContain("forcePublic = false");
    expect(footerSource).toContain("const { isAuthenticated: accountAuthenticated } = useAuth();");
    expect(footerSource).toContain("const isAuthenticated = accountAuthenticated && !forcePublic;");
    expect(footerSource).toContain("{!isAuthenticated ? (");
    expect(footerSource).toContain("One platform, two clear paths");
    expect(footerSource).toContain("Looking for a service?");
    expect(footerSource).toContain("Explore trusted providers.");
    expect(footerSource).toContain("Growing a service business?");
    expect(footerSource).toContain("Get started as a provider.");
    expect(footerSource).toContain('href="/browse"');
    expect(footerSource).toContain('href="/pricing"');
  });

  it("uses public Explore, Provider, and Company & Support navigation groups", () => {
    for (const label of [
      "Explore Services",
      "Pricing",
      "Build Your Business Page",
      "Provider Plans",
      "Sign In",
      "Referral Program",
      "Help Center",
      "Contact Support",
    ]) {
      expect(footerSource).toContain(label);
    }

    expect(footerSource).toContain('aria-label="Explore footer navigation"');
    expect(footerSource).toContain('aria-label="Provider footer navigation"');
    expect(footerSource).toContain('aria-label="Company and support footer navigation"');
  });

  it("replaces acquisition content with role-aware workspace utilities after sign-in", () => {
    expect(footerSource).toContain("const { isProviderView } = useViewMode();");
    expect(footerSource).toContain("{isAuthenticated ? (");
    expect(footerSource).toContain('aria-label="Signed-in workspace footer navigation"');
    expect(footerSource).toContain('aria-label="Signed-in account and support footer navigation"');

    for (const label of [
      "Provider Overview",
      "Bookings",
      "Customers",
      "Services",
      "My Calendar",
      "Money",
      "Business Tools",
      "Customer Home",
      "Explore Services",
      "My Bookings",
      "Saved Providers",
      "Messages",
      "Monthly Planner",
      "Bulk Booking",
      "My Account",
      "Manage Plan",
    ]) {
      expect(footerSource).toContain(label);
    }

    expect(footerSource).toContain(
      'const subscriptionHref = isProviderView ? "/provider/subscription" : "/customer/subscription";',
    );
    expect(footerSource).toContain(
      "Your workspace for managing services, bookings, payments, and customer relationships.",
    );
    expect(footerSource).toContain(
      "Your workspace for finding services, managing bookings, and returning to providers you trust.",
    );
  });

  it("keeps legal, install, and secure-payment information in the lower strip", () => {
    expect(footerSource).toContain('aria-label="Legal footer navigation"');
    expect(footerSource).toContain('href="/terms"');
    expect(footerSource).toContain('href="/privacy"');
    expect(footerSource).toContain("Install App");
    expect(footerSource).toContain("Secure checkout");
    expect(footerSource).toContain("<PaymentMethods");
  });

  it("uses the people-first palette only on the full public and signed-in footer", () => {
    expect(footerSource).toContain('import "./BrandFooter.css";');
    expect(footerSource).toContain('<footer className="ology-brand-footer">');
    expect(footerSource).toContain('<footer className="or-demo-footer"');
    expect(footerSource).toContain('className="ology-brand-footer-cta');
    expect(footerSource).toContain('className="ology-brand-footer-path ology-brand-footer-path-customer');
    expect(footerSource).toContain('className="ology-brand-footer-path ology-brand-footer-path-provider');
    expect(brandStyles).toContain('@import "../../styles/publicBrandTokens.css"');
    expect(brandStyles).toContain("background: var(--ology-brand-deep)");
    expect(brandStyles).toContain("background: #e8ece0");
    expect(brandStyles).toContain("background: var(--ology-brand-surface)");
    expect(brandStyles).toContain("background: var(--ology-brand-ink)");
    expect(brandStyles).toContain("var(--ology-brand-leaf)");
    expect(brandStyles).toContain("var(--ology-brand-coral)");
    expect(brandStyles).toContain(".ology-brand-footer .ology-brand-footer-path:focus-visible");
    expect(brandStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(footerSource).not.toContain('bg-[#0d2438]');
  });

  it("shares only the canonical public homepage in compact, full public and signed-in footers", () => {
    expect(footerSource.match(/<FooterSocialShare \/>/g)).toHaveLength(3);
    expect(shareSource).toContain('const siteUrl = ologyCrewPublicUrl("/")');
    expect(shareSource).toContain("const encodedSiteUrl = encodeURIComponent(siteUrl)");
    expect(shareSource).toContain("https://www.facebook.com/sharer/sharer.php?u=${encodedSiteUrl}");
    expect(shareSource).toContain("https://www.linkedin.com/sharing/share-offsite/?url=${encodedSiteUrl}");
    expect(shareSource).not.toContain("window.location");
    expect(shareSource).toContain('rel="noopener noreferrer"');
    expect(shareSource).toContain('target="_blank"');
    expect(shareSource).toContain("await navigator.clipboard.writeText(siteUrl)");
    expect(shareSource).toContain('toast.error("Copy unavailable.');
    expect(shareSource).toContain('aria-label="Copy OlogyCrew homepage link"');
  });

  it("makes footer sharing keyboard-accessible and documents it for visitors", () => {
    expect(shareSource).toContain('role="group" aria-label="Share OlogyCrew"');
    expect(brandStyles).toContain(".ology-footer-social-actions :is(a, button)");
    expect(brandStyles).toContain("width: 40px;");
    expect(brandStyles).toContain(":focus-visible");
    expect(brandStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(brandStyles).toContain(".ology-brand-footer .ology-footer-social-actions :is(a, button):hover,");
    expect(brandStyles).toContain(".or-demo-footer .ology-footer-social-actions :is(a, button):hover { transform: none; }");
    expect(helpSource).toContain('title: "Sharing OlogyCrew"');
    expect(helpSource).toContain("never your account or private workspace");
  });
});
