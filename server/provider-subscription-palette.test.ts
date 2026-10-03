import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const page = source("client/src/pages/SubscriptionManagement.tsx");
const css = source("client/src/pages/SubscriptionManagement.css");
const customer = source("client/src/pages/AccountSubscription.tsx");
const nav = source("client/src/components/shared/NavHeader.tsx");

describe("provider My Subscription people-first palette", () => {
  it("styles only the provider subscription route while the account toggle retains the distinct customer plan route", () => {
    expect(page).toContain('import "./SubscriptionManagement.css"');
    expect(page.match(/min-h-screen bg-page ology-provider-plan-page/g)).toHaveLength(2);
    expect(css).toContain('.ology-provider-plan-page');
    expect(css).toContain('@import "../styles/publicBrandTokens.css"');
    expect(css).not.toContain(":root {");
    expect(css).not.toContain(".dark {");
    expect(customer).toContain('ology-customer-utility-surface');
    expect(nav).toContain('isProviderView ? "/provider/subscription" : "/customer/subscription"');
  });

  it("makes billing selection, trial urgency and plan identity distinct without changing financial choices", () => {
    expect(page).toContain('role="group" aria-label="Provider billing interval"');
    expect(page).toContain('aria-pressed={billingInterval === "month"}');
    expect(page).toContain('aria-pressed={billingInterval === "year"}');
    expect(page).toContain('trialStatus.showUrgentNudge ? "ology-provider-plan-trial--urgent" : "ology-provider-plan-trial--active"');
    expect(page).toContain('trialStatus?.trialExpired && currentTier === "free"');
    expect(page).toContain('data-current-plan={isCurrent && (currentTier === "free" || billingInterval === (currentSub?.currentInterval || "month")) ? "true" : "false"}');
    expect(page).toContain('isDowngrade ? "outline" : plan.tier === "basic" ? "default" : "outline"');
    expect(page).toContain('currentSub.usage.servicesUsed >= currentSub.usage.servicesLimit');
    expect(page).toContain('? "bg-red-500"');
    expect(css).toContain('.ology-provider-plan-trial--urgent');
    expect(css).toContain('.ology-provider-plan-card[data-current-plan="true"]');
    expect(css).toContain('.ology-provider-plan-usage-bar.bg-primary');
    expect(css).toContain('var(--ology-brand-coral)');
    expect(css).toContain('var(--ology-brand-deep)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain(':focus-visible');
  });

  it("preserves plan prices and lifecycle handlers while keeping the billing-history link valid", () => {
    expect(page).toContain('monthlyPrice: PROVIDER_PLANS.basic.monthlyPrice');
    expect(page).toContain('yearlyPrice: PROVIDER_PLANS.premium.yearlyPrice');
    expect(page).toContain('trpc.subscription.mySubscription.useQuery');
    expect(page).toContain('trpc.subscription.createCheckout.useMutation');
    expect(page).toContain('trpc.subscription.downgrade.useMutation');
    expect(page).toContain('trpc.subscription.createPortalSession.useMutation');
    expect(page).toContain('trpc.subscription.pause.useMutation');
    expect(page).toContain('trpc.subscription.resume.useMutation');
    expect(page).toContain('returnTo,');
    expect(page).toContain('<Link href="/provider/billing">Billing History</Link>');
    expect(page).toContain('variant="destructive"');
    expect(page).toContain('aria-pressed={pauseDuration === days}');
    expect(page).toContain('className="sm:max-w-md ology-provider-plan-dialog"');
  });
});
