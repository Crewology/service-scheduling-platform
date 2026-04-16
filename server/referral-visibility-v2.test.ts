import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Post-Booking Share & Earn Card", () => {
  const filePath = path.resolve(
    __dirname,
    "../client/src/pages/BookingConfirmation.tsx"
  );
  const content = fs.readFileSync(filePath, "utf-8");

  it("should contain the ShareReferralLink component", () => {
    expect(content).toContain("function ShareReferralLink()");
  });

  it("should render the Share & Earn card section", () => {
    expect(content).toContain("Share & Earn Rewards");
  });

  it("should show 3-step visual flow (Share, Book, Earn)", () => {
    expect(content).toContain("Share Link");
    expect(content).toContain("They Book");
    expect(content).toContain("You Earn");
  });

  it("should include copy-to-clipboard functionality", () => {
    expect(content).toContain("navigator.clipboard.writeText");
    expect(content).toContain("Referral link copied!");
  });

  it("should include Web Share API with fallback", () => {
    expect(content).toContain("navigator.share");
    expect(content).toContain("Join OlogyCrew");
  });

  it("should link to the referral program page", () => {
    expect(content).toContain("/referral-program");
    expect(content).toContain("Learn more about our Referral Program");
  });

  it("should only show ShareReferralLink when user is authenticated", () => {
    expect(content).toContain("{user && (");
    expect(content).toContain("<ShareReferralLink />");
  });

  it("should use the referral code from the API", () => {
    expect(content).toContain("trpc.referral.getMyCode.useQuery()");
    expect(content).toContain("myCode.code");
  });

  it("should use amber color scheme for the card", () => {
    expect(content).toContain("border-amber-200");
    expect(content).toContain("from-amber-50");
    expect(content).toContain("to-orange-50");
  });
});

describe("OG and Twitter Card Meta Tags", () => {
  describe("Client-side meta tags (ReferralProgram.tsx)", () => {
    const filePath = path.resolve(
      __dirname,
      "../client/src/pages/ReferralProgram.tsx"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    it("should define META_TAGS constant with OG data", () => {
      expect(content).toContain("const META_TAGS = {");
      expect(content).toContain("OlogyCrew Referral Program");
      expect(content).toContain("/referral-program");
    });

    it("should implement useMetaTags hook", () => {
      expect(content).toContain("function useMetaTags()");
      expect(content).toContain("useMetaTags();");
    });

    it("should set og:title meta tag", () => {
      expect(content).toContain('"og:title"');
    });

    it("should set og:description meta tag", () => {
      expect(content).toContain('"og:description"');
    });

    it("should set og:url meta tag", () => {
      expect(content).toContain('"og:url"');
    });

    it("should set og:type meta tag", () => {
      expect(content).toContain('"og:type"');
    });

    it("should set og:site_name meta tag", () => {
      expect(content).toContain('"og:site_name"');
    });

    it("should set twitter:card meta tag", () => {
      expect(content).toContain('"twitter:card"');
      expect(content).toContain("summary_large_image");
    });

    it("should set twitter:title meta tag", () => {
      expect(content).toContain('"twitter:title"');
    });

    it("should set twitter:description meta tag", () => {
      expect(content).toContain('"twitter:description"');
    });

    it("should set canonical link", () => {
      expect(content).toContain('link[rel="canonical"]');
    });

    it("should clean up meta tags on unmount", () => {
      expect(content).toContain("createdElements.forEach((el) => el.remove())");
      expect(content).toContain("document.title = prevTitle");
    });

    it("should update document title", () => {
      expect(content).toContain("document.title = META_TAGS.title");
    });
  });

  describe("Server-side meta tag injection (vite.ts)", () => {
    const filePath = path.resolve(
      __dirname,
      "_core/vite.ts"
    );
    const content = fs.readFileSync(filePath, "utf-8");

    it("should inject OG tags for /referral-program route in dev mode", () => {
      expect(content).toContain('url.startsWith("/referral-program")');
    });

    it("should inject og:title in HTML template", () => {
      expect(content).toContain('og:title');
      expect(content).toContain("OlogyCrew Referral Program");
    });

    it("should inject og:description in HTML template", () => {
      expect(content).toContain('og:description');
      expect(content).toContain("Refer friends to OlogyCrew");
    });

    it("should inject twitter:card in HTML template", () => {
      expect(content).toContain('twitter:card');
      expect(content).toContain("summary_large_image");
    });

    it("should inject tags before closing head tag", () => {
      expect(content).toContain('template.replace("</head>"');
    });

    it("should handle both dev and production modes", () => {
      // Dev mode uses vite.transformIndexHtml
      expect(content).toContain("vite.transformIndexHtml");
      // Production mode uses fs.readFileSync
      const prodSection = content.split("serveStatic")[1];
      expect(prodSection).toContain('url.startsWith("/referral-program")');
    });
  });
});

describe("Referral Program Link in Footer", () => {
  const filePath = path.resolve(
    __dirname,
    "../client/src/pages/Home.tsx"
  );
  const content = fs.readFileSync(filePath, "utf-8");

  it("should have a Referral Program link in the Company footer column", () => {
    expect(content).toContain('href="/referral-program"');
    // Check it's in the Company section (near Help Center, Terms, Privacy)
    const companySection = content.split("Company")[1]?.split("</div>")[0];
    expect(companySection).toBeTruthy();
    expect(companySection).toContain("/referral-program");
    expect(companySection).toContain("Referral Program");
  });

  it("should place Referral Program link before Help Center", () => {
    const refIndex = content.indexOf("/referral-program");
    const helpIndex = content.indexOf("/help");
    // The referral link should appear before the help link in the footer
    expect(refIndex).toBeLessThan(helpIndex);
  });

  it("should have consistent hover styling with other footer links", () => {
    // All footer links use hover:opacity-100
    const footerSection = content.split("footer")[1];
    expect(footerSection).toContain('href="/referral-program" className="hover:opacity-100"');
  });

  it("should be in the footer element", () => {
    // Verify the footer contains the referral link
    const footerMatch = content.match(/<footer[\s\S]*?<\/footer>/);
    expect(footerMatch).toBeTruthy();
    expect(footerMatch![0]).toContain("/referral-program");
  });
});
