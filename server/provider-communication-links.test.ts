import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getTemplate } from "./notifications/templates";
import { EmailProvider } from "./notifications/providers/email";

const root = resolve(process.cwd());
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

const communicationSources = [
  "server/notifications/templates.ts",
  "server/notifications/providers/push.ts",
  "server/scheduledTrialExpiry.ts",
  "server/trialNotifications.ts",
  "server/verificationRouter.ts",
  "server/providerOverviewRouter.ts",
  "server/subscriptionRouter.ts",
  "server/stripeConnectRouter.ts",
  "server/send-winston-welcome.mjs",
  "server/send-welcome-tests.mjs",
  "server/send-test-emails.mjs",
  "client/src/pages/EmailPreview.tsx",
] as const;

describe("canonical provider links in communications", () => {
  it("removes legacy provider dashboard destinations from every active communication generator", () => {
    for (const path of communicationSources) {
      expect(readSource(path), path).not.toContain("/provider/dashboard");
    }
  });

  it("uses canonical destinations in provider email templates", () => {
    const trialStarted = getTemplate("trial_started", {
      providerName: "Provider",
      trialEndDate: "October 14, 2026",
      dashboardUrl: "/",
    });
    const welcomeProvider = getTemplate("welcome_provider", { providerName: "Provider" });
    const bookingConfirmed = getTemplate("booking_confirmed", {
      customerName: "Customer",
      providerName: "Provider",
      serviceName: "Service",
      bookingId: 42,
      bookingNumber: "BK-42",
      date: "October 1, 2026",
      time: "10:00 AM",
      amount: "$100.00",
    });

    expect(trialStarted.body).toContain("[Open Provider Overview](/)");
    expect(welcomeProvider.body).toContain("[Open Provider Overview](/)");
    expect(bookingConfirmed.body).toContain("[View Booking Details](/booking/42/detail)");
  });

  it("renders booking and unsubscribe links on the primary OlogyCrew domain", () => {
    const provider = new EmailProvider();
    const html = (provider as any).formatEmailHTML(
      "[View Booking Details](/booking/42/detail)",
      { unsubscribeToken: "unsubscribe-token" },
    );

    expect(html).toContain('href="https://ologycrew.com/booking/42/detail"');
    expect(html).toContain('href="https://ologycrew.com/unsubscribe/unsubscribe-token"');
    expect(html).toContain("Unsubscribe from emails");
    expect(html).not.toContain("https://www.ologycrew.com");
  });

  it("routes provider notifications and overview actions to the matching canonical workspaces", () => {
    const pushSource = readSource("server/notifications/providers/push.ts");
    const overviewSource = readSource("server/providerOverviewRouter.ts");
    const verificationSource = readSource("server/verificationRouter.ts");
    const trialExpirySource = readSource("server/scheduledTrialExpiry.ts");

    expect(pushSource).toContain('review_received: `/provider/reviews`');
    expect(pushSource).toContain('quote_request_new: `/my-bookings?tab=quotes`');
    expect(pushSource).toContain('quote_accepted: `/my-bookings?tab=quotes`');
    expect(overviewSource.match(/href: "\/my-bookings"/g)).toHaveLength(2);
    expect(overviewSource).toContain('href: "/my-bookings?tab=quotes"');
    expect(verificationSource).toContain('actionUrl: "/provider/tools"');
    expect(trialExpirySource.match(/"\/provider\/subscription"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("uses canonical Subscription and Money pages for Stripe returns", () => {
    const subscriptionSource = readSource("server/subscriptionRouter.ts");
    const connectSource = readSource("server/stripeConnectRouter.ts");

    expect(subscriptionSource).toContain("/provider/subscription?status=success");
    expect(subscriptionSource).toContain("/provider/subscription?status=cancelled");
    expect(subscriptionSource).toContain("/provider/subscription`");
    expect(connectSource.match(/\/provider\/finances\?stripe=refresh/g)).toHaveLength(3);
    expect(connectSource.match(/\/provider\/finances\?stripe=return/g)).toHaveLength(3);
  });
});
