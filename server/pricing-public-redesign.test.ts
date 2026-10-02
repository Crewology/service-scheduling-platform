import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");
const pricing = read("client/src/pages/CustomerPricing.tsx");
const styles = read("client/src/pages/CustomerPricing.css");
const tokens = read("client/src/styles/publicBrandTokens.css");
const app = read("client/src/App.tsx");

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16) / 255);
  const linear = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function brandHex(name: string) {
  return tokens.match(new RegExp(`--ology-brand-${name}: (#[0-9a-fA-F]{6});`))?.[1] ?? "";
}

describe("public pricing people-first design pilot", () => {
  it("opts only pricing into the brand palette with one main landmark and audience-specific headline/intro", () => {
    expect(pricing).toContain('import "./CustomerPricing.css"');
    expect(pricing).toContain('className="min-h-screen ology-pricing-page"');
    expect(pricing).toContain('<main className="ology-pricing-content');
    expect(pricing).toContain('</main>');
    expect(pricing).toContain('audience === "provider" ? "Your business. Your profile. Your customers. Your money." : "Find good people for the work you need."');
    expect(pricing).toContain('audience === "provider" ? "No Gatekeeping" : "Local work, well done"');
    expect(styles).toContain('.ology-pricing-page');
    expect(styles).toContain('background: var(--ology-brand-paper)');
    expect(styles).not.toMatch(/(^|\n)\s*(body|html)\s*\{/);
  });

  it("marks both audience and billing selectors with accurate state for assistive technology", () => {
    expect(pricing).toContain('role="group" aria-label="Choose your pricing plans"');
    expect(pricing).toContain('role="group" aria-label="Choose billing interval"');
    for (const value of ['audience === "provider"', 'audience === "customer"', '!yearly', 'yearly']) {
      expect(pricing).toContain(`aria-pressed={${value}}`);
    }
    expect(styles).toContain(':focus-visible');
    expect(styles).toContain('prefers-reduced-motion: reduce');
  });

  it("positions each original signup/trial/downgrade/portal action immediately after its own price", () => {
    const provider = pricing.split('{/* ─── PROVIDER PLANS')[1]?.split('{/* ─── CUSTOMER PLANS')[0] ?? "";
    const customer = pricing.split('{/* ─── CUSTOMER PLANS')[1]?.split('{/* ─── FAQ')[0] ?? "";
    for (const section of [provider, customer]) {
      expect(section.indexOf('className="ology-pricing-plan-price')).toBeGreaterThan(-1);
      expect(section.indexOf('className="ology-pricing-plan-action')).toBeGreaterThan(section.indexOf('className="ology-pricing-plan-price'));
      expect(section.indexOf('className="ology-pricing-highlights')).toBeGreaterThan(section.indexOf('className="ology-pricing-plan-action'));
      expect(section.indexOf('className="ology-pricing-plan-features')).toBeGreaterThan(section.indexOf('className="ology-pricing-highlights'));
      expect(section).toContain('data-acquisition={!isCurrent && !isDowngrade}');
      expect(section).toContain('setShowDowngradeDialog(true)');
      expect(section).toContain('localStorage.setItem("ologycrew_selected_plan"');
    }
    expect(provider).toContain('providerCreatePortal.mutate()');
    expect(provider).toContain('providerCreateCheckout.mutate({');
    expect(customer).toContain('customerCreatePortal.mutate()');
    expect(customer).toContain('customerStartTrial.mutate({');
    expect(pricing).toContain('PROVIDER_PLANS');
    expect(pricing).toContain('CUSTOMER_PLANS');
  });

  it("gives unavailable features AA-readable text and preserves CTA/trial wording", () => {
    expect(pricing.match(/ology-pricing-excluded text-muted-foreground\/60/g)).toHaveLength(2);
    expect(styles).toContain('color: var(--ology-brand-muted)');
    expect(styles).toContain('.ology-pricing-excluded-icon');
    const ratio = (Math.max(luminance(brandHex("muted")), luminance(brandHex("surface"))) + 0.05)
      / (Math.min(luminance(brandHex("muted")), luminance(brandHex("surface"))) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(pricing).toContain('Start 14-Day Free Trial');
    expect(pricing).toContain('Manage Subscription');
    expect(styles).toContain('.ology-pricing-plan-action[data-acquisition="true"] button:not(:disabled)');
  });

  it("keeps the install-app banner off pricing cards but unchanged on other non-prototype pages", () => {
    expect(app).toContain('const isPricingPage = location === "/pricing"');
    expect(app).toContain('!isPrototype && !isDemoProfile && !isPricingPage && <PWAInstallBanner />');
    expect(app).toContain('<Footer compactPublicHome={location === "/" || location === "/for-providers"} />');
  });
});
