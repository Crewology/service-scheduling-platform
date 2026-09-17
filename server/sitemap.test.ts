import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
  buildRobotsTxt,
  buildSitemapXml,
  createSitemapHandler,
  ROBOTS_DISALLOWED_PATHS,
  SITEMAP_CANONICAL_ORIGIN,
  type PublicSitemapData,
} from "./sitemap";

const sampleData: PublicSitemapData = {
  categories: [
    { slug: "audio-visual-crew" },
    { slug: "barber shop" },
    { slug: "" },
  ],
  providers: [
    { slug: "chisolm-audio", updatedAt: new Date("2026-08-19T15:30:00.000Z") },
    { slug: "gary & studios", updatedAt: "2026-09-01T02:00:00.000Z" },
    { slug: "admin", updatedAt: "2026-09-01T02:00:00.000Z" },
    { slug: null },
  ],
  services: [
    { id: 42, updatedAt: new Date("2026-09-02T20:00:00.000Z") },
    { id: 0, updatedAt: new Date("2026-09-03T20:00:00.000Z") },
  ],
  promotions: [
    { id: 7, updatedAt: new Date("2026-09-04T20:00:00.000Z") },
    { id: -1, updatedAt: new Date("2026-09-05T20:00:00.000Z") },
  ],
};

function createMockResponse() {
  const response = {
    set: vi.fn(),
    send: vi.fn(),
    status: vi.fn(),
  } as unknown as Response;
  vi.mocked(response.set).mockReturnValue(response);
  vi.mocked(response.send).mockReturnValue(response);
  vi.mocked(response.status).mockReturnValue(response);
  return response;
}

describe("dynamic public sitemap", () => {
  it("includes current public landing pages and canonical dynamic routes", () => {
    const xml = buildSitemapXml(sampleData);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/experiences</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/featured</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/category/audio-visual-crew</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/category/barber%20shop</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/chisolm-audio</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/gary%20%26%20studios</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/service/42</loc>`);
    expect(xml).toContain(`<loc>${SITEMAP_CANONICAL_ORIGIN}/featured/promo/7</loc>`);
  });

  it("uses record modification dates and does not invent lastmod dates for static pages", () => {
    const xml = buildSitemapXml(sampleData);
    const homeEntry = xml.match(/<url>\s*<loc>https:\/\/ologycrew\.com\/<\/loc>[\s\S]*?<\/url>/)?.[0];

    expect(homeEntry).toBeDefined();
    expect(homeEntry).not.toContain("<lastmod>");
    expect(xml).toContain("<lastmod>2026-08-19</lastmod>");
    expect(xml).toContain("<lastmod>2026-09-01</lastmod>");
    expect(xml).toContain("<lastmod>2026-09-02</lastmod>");
    expect(xml).toContain("<lastmod>2026-09-04</lastmod>");
  });

  it("omits invalid records, duplicate legacy profile paths, and all private routes", () => {
    const xml = buildSitemapXml(sampleData);

    expect(xml).not.toContain("/p/chisolm-audio");
    expect(xml).not.toContain("/service/0");
    expect(xml).not.toContain("/featured/promo/-1");
    expect(xml).not.toContain("/provider/dashboard");
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/analytics</loc>");
    expect(xml).not.toContain("/messages");
    expect(xml).not.toContain("/preview/");
  });

  it("deduplicates canonical URLs", () => {
    const xml = buildSitemapXml({
      categories: [{ slug: "barber-shop" }, { slug: "barber-shop" }],
      providers: [],
      services: [],
      promotions: [],
    });

    expect(xml.match(/<loc>https:\/\/ologycrew\.com\/category\/barber-shop<\/loc>/g)).toHaveLength(1);
  });

  it("serves database-backed XML with crawler cache headers", async () => {
    const loadData = vi.fn().mockResolvedValue(sampleData);
    const handler = createSitemapHandler(loadData);
    const response = createMockResponse();

    await handler({} as never, response, vi.fn());

    expect(loadData).toHaveBeenCalledOnce();
    expect(response.set).toHaveBeenCalledWith("Content-Type", "application/xml; charset=utf-8");
    expect(response.set).toHaveBeenCalledWith(
      "Cache-Control",
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    );
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining("/service/42"));
    expect(response.status).not.toHaveBeenCalled();
  });

  it("returns a retryable non-cached response instead of publishing stale dynamic URLs when the database fails", async () => {
    const handler = createSitemapHandler(vi.fn().mockRejectedValue(new Error("database offline")));
    const response = createMockResponse();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await handler({} as never, response, vi.fn());

    expect(response.set).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(response.set).toHaveBeenCalledWith("Retry-After", "300");
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining(`${SITEMAP_CANONICAL_ORIGIN}/browse`));
    expect(response.send).toHaveBeenCalledWith(expect.not.stringContaining("/service/42"));
    consoleError.mockRestore();
  });
});

describe("robots.txt", () => {
  it("points crawlers to the canonical sitemap and excludes private application areas", () => {
    const robots = buildRobotsTxt();

    expect(robots).toContain(`Sitemap: ${SITEMAP_CANONICAL_ORIGIN}/sitemap.xml`);
    for (const path of ROBOTS_DISALLOWED_PATHS) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain("Allow: /");
    expect(robots).not.toContain("Disallow: /category/");
    expect(robots).not.toContain("Disallow: /service/");
  });
});
