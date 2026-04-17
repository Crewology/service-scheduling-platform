import { describe, it, expect, vi } from "vitest";

// Mock the ogTags module
vi.mock("./ogTags", () => ({
  getProviderOgTags: vi.fn(async (slug: string, origin: string) => {
    if (slug === "test-provider") {
      return `<meta property="og:title" content="Test Provider on OlogyCrew" />
    <meta property="og:description" content="Test description" />
    <meta property="og:url" content="${origin}/p/test-provider" />
    <meta property="og:type" content="profile" />
    <meta name="twitter:card" content="summary_large_image" />`;
    }
    return "";
  }),
  getServiceOgTags: vi.fn(async (id: number, origin: string) => {
    if (id === 42) {
      return `<meta property="og:title" content="Test Service on OlogyCrew" />
    <meta property="og:description" content="Service description" />
    <meta property="og:url" content="${origin}/service/42" />
    <meta property="og:type" content="product" />
    <meta name="twitter:card" content="summary_large_image" />`;
    }
    return "";
  }),
  getCategoryOgTags: vi.fn(async (slug: string, origin: string) => {
    if (slug === "barber-shop") {
      return `<meta property="og:title" content="Barber Shop Services on OlogyCrew" />
    <meta property="og:description" content="Category description" />
    <meta property="og:url" content="${origin}/category/barber-shop" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />`;
    }
    return "";
  }),
  getHomepageOgTags: vi.fn(async (origin: string) => {
    return `<meta property="og:title" content="OlogyCrew" />
    <meta property="og:description" content="Book trusted service professionals" />
    <meta property="og:url" content="${origin}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />`;
  }),
}));

import { handleOgPage } from "./ogPageRoute";

function createMockReqRes(type: string, id: string) {
  const req = {
    params: { type, id },
    protocol: "https",
    get: vi.fn((header: string) => {
      if (header === "host") return "example.com";
      return "";
    }),
  } as any;

  let responseBody = "";
  let statusCode = 200;
  let headers: Record<string, string> = {};

  const res = {
    status: vi.fn(function (this: any, code: number) {
      statusCode = code;
      return this;
    }),
    set: vi.fn(function (this: any, h: Record<string, string>) {
      headers = { ...headers, ...h };
      return this;
    }),
    end: vi.fn((body: string) => {
      responseBody = body;
    }),
  } as any;

  return {
    req,
    res,
    getBody: () => responseBody,
    getStatus: () => statusCode,
    getHeaders: () => headers,
  };
}

describe("OG Page Route", () => {
  it("should return HTML with provider OG tags for /api/og/provider/:slug", async () => {
    const { req, res, getBody } = createMockReqRes("provider", "test-provider");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain('og:title" content="Test Provider on OlogyCrew"');
    expect(body).toContain('twitter:card" content="summary_large_image"');
    expect(body).toContain('rel="canonical" href="https://example.com/p/test-provider"');
    expect(body).toContain("window.location.replace");
    expect(body).toContain("https://example.com/p/test-provider");
  });

  it("should return HTML with service OG tags for /api/og/service/:id", async () => {
    const { req, res, getBody } = createMockReqRes("service", "42");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain('og:title" content="Test Service on OlogyCrew"');
    expect(body).toContain('rel="canonical" href="https://example.com/service/42"');
  });

  it("should return HTML with category OG tags for /api/og/category/:slug", async () => {
    const { req, res, getBody } = createMockReqRes("category", "barber-shop");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain('og:title" content="Barber Shop Services on OlogyCrew"');
    expect(body).toContain('rel="canonical" href="https://example.com/category/barber-shop"');
  });

  it("should fall back to homepage OG tags for unknown type", async () => {
    const { req, res, getBody } = createMockReqRes("unknown", "anything");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain('og:title" content="OlogyCrew"');
    expect(body).toContain('rel="canonical" href="https://example.com/"');
  });

  it("should fall back to homepage OG tags when provider not found", async () => {
    const { req, res, getBody } = createMockReqRes("provider", "nonexistent");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain("<!DOCTYPE html>");
    expect(body).toContain('og:title" content="OlogyCrew"');
  });

  it("should set correct response headers", async () => {
    const { req, res, getHeaders, getStatus } = createMockReqRes("provider", "test-provider");
    await handleOgPage(req, res);

    expect(getStatus()).toBe(200);
    expect(getHeaders()["Content-Type"]).toBe("text/html; charset=utf-8");
    expect(getHeaders()["Cache-Control"]).toBe("public, max-age=300");
  });

  it("should override og:url to point to canonical SPA page, not /api/og/", async () => {
    const { req, res, getBody } = createMockReqRes("provider", "test-provider");
    await handleOgPage(req, res);
    const body = getBody();

    // The og:url should point to /p/test-provider, not /api/og/provider/test-provider
    expect(body).toContain('og:url" content="https://example.com/p/test-provider"');
    expect(body).not.toContain('og:url" content="https://example.com/api/og/');
  });

  it("should include meta refresh and JS redirect to canonical URL", async () => {
    const { req, res, getBody } = createMockReqRes("provider", "test-provider");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain('http-equiv="refresh" content="0;url=https://example.com/p/test-provider"');
    expect(body).toContain('window.location.replace("https://example.com/p/test-provider")');
  });

  it("should handle /api/og/p/:slug as alias for provider", async () => {
    const { req, res, getBody } = createMockReqRes("p", "test-provider");
    await handleOgPage(req, res);
    const body = getBody();

    expect(body).toContain('og:title" content="Test Provider on OlogyCrew"');
    expect(body).toContain('rel="canonical" href="https://example.com/p/test-provider"');
  });
});
