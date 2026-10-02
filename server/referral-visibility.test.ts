import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const source = (file: string) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");

describe("Referral Program Visibility Features", () => {
  describe("Public homepage referral path", () => {
    const homeContent = source("../client/src/pages/Home.tsx");
    const conceptContent = source("../client/src/pages/PublicHomepageConceptThree.tsx");
    const footerContent = source("../client/src/components/shared/Footer.tsx");

    it("keeps the dedicated referral program reachable through the compact public footer", () => {
      expect(homeContent).toContain("<PublicHomepageConceptThree />");
      expect(footerContent).toContain('href="/referral-program"');
      expect(footerContent).toContain("Referral program");
    });
    it("preserves referral-code capture from shared homepage links", () => {
      expect(homeContent).toContain('localStorage.setItem("customer_referral_code"');
      expect(homeContent).toContain('url.searchParams.delete("ref")');
    });
    it("keeps Concept 3's end section focused while referral discovery stays in the footer", () => {
      expect(conceptContent).toContain("Your work deserves a home of its own.");
      expect(conceptContent).not.toContain("Refer & Earn Rewards");
      expect(footerContent).toContain("compactPublicHome && !isAuthenticated");
    });
  });

  describe("Navigation Credit Badge", () => {
    const navContent = source("../client/src/components/shared/NavHeader.tsx");
    it("shows live credits and a link only for authenticated users with a balance", () => {
      expect(navContent).toContain("function CreditBadge()");
      expect(navContent).toContain("trpc.referral.getCreditBalance.useQuery");
      expect(navContent).toContain("!isAuthenticated || creditAmount <= 0");
      expect(navContent).toContain('href="/referrals"');
      expect(navContent).toContain("Referral Credits");
      expect(navContent).toContain('typeof balance === "object"');
    });
  });

  describe("Public referral landing", () => {
    const content = source("../client/src/pages/ReferralProgram.tsx");
    const css = source("../client/src/pages/ReferralProgram.css");
    it("keeps live account/referral actions with safe clipboard feedback", () => {
      expect(content).toContain("export default function ReferralProgram()");
      expect(content).toContain("trpc.referral.getMyCode.useQuery");
      expect(content).toContain("trpc.referral.getStats.useQuery");
      expect(content).toContain("trpc.referral.getMyTier.useQuery");
      expect(content).toContain("trpc.referral.getCreditBalance.useQuery");
      expect(content).toContain("navigator.clipboard.writeText(referralLink)");
      expect(content).toContain("Referral link copied!");
      expect(content).toContain('/login?returnTo=%2Freferral-program');
      expect(content).toContain('href="/referrals"');
    });
    it("presents four true tier thresholds and net-captured first reward", () => {
      for (const tier of ["Bronze", "Silver", "Gold", "Platinum"]) expect(content).toContain(tier);
      for (const rate of [10, 15, 20, 25]) expect(content).toContain(`percent: ${rate}`);
      expect(content).toContain("net amount actually captured");
      expect(content).toContain("official demo bookings don't earn credits");
      expect(content).toContain("provider account alone does not earn credits");
      expect(content).toContain("90 days");
      expect(content).not.toContain("We'll notify you before they expire");
    });
    it("uses accessible page structure and existing shared footer", () => {
      expect(content).toContain("<NavHeader />");
      expect(content).toContain("<main");
      expect(content).toContain("<details");
      expect(content).not.toContain("<footer");
      expect(css).toContain("@import \"../styles/publicBrandTokens.css\"");
      expect(css).toContain(".ology-referral");
      expect(css).toContain("prefers-reduced-motion");
      expect(css).toContain(":focus-visible");
    });
  });

  describe("Route registration", () => {
    const app = source("../client/src/App.tsx");
    it("keeps /referral-program available and the application footer visible", () => {
      expect(app).toContain('import ReferralProgram from "./pages/ReferralProgram"');
      expect(app).toContain('path="/referral-program" component={ReferralProgram}');
      expect(app).toContain("!hideFooter && <Footer");
    });
  });
});
