import type { Request, RequestHandler, Response } from "express";
import { and, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import {
  promotions,
  serviceCategories,
  serviceProviders,
  services,
  users,
} from "../drizzle/schema";
import { getDb } from "./db/connection";

export const SITEMAP_CANONICAL_ORIGIN = "https://ologycrew.com";

export type SitemapChangeFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type SitemapRecord = {
  id?: number;
  slug?: string | null;
  updatedAt?: Date | string | null;
};

export type PublicSitemapData = {
  categories: SitemapRecord[];
  providers: SitemapRecord[];
  services: SitemapRecord[];
  promotions: SitemapRecord[];
};

type SitemapEntry = {
  path: string;
  changefreq: SitemapChangeFrequency;
  priority: string;
  lastmod?: Date | string | null;
};

export const SITEMAP_STATIC_PAGES: readonly SitemapEntry[] = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/browse", priority: "0.9", changefreq: "daily" },
  { path: "/search", priority: "0.8", changefreq: "daily" },
  { path: "/experiences", priority: "0.8", changefreq: "weekly" },
  { path: "/featured", priority: "0.8", changefreq: "daily" },
  { path: "/pricing", priority: "0.7", changefreq: "weekly" },
  { path: "/help", priority: "0.6", changefreq: "weekly" },
  { path: "/referral-program", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
] as const;

export const ROBOTS_DISALLOWED_PATHS = [
  "/admin$",
  "/admin/",
  "/provider/",
  "/provider-dashboard$",
  "/customer/",
  "/analytics$",
  "/messages$",
  "/messages/",
  "/dm/",
  "/booking/",
  "/my-bookings$",
  "/my-reviews$",
  "/my-quotes$",
  "/my-waitlist$",
  "/saved-providers$",
  "/account$",
  "/profile$",
  "/notifications$",
  "/notification-settings$",
  "/receipts$",
  "/referrals$",
  "/bulk-booking$",
  "/monthly-planner$",
  "/embed/",
  "/preview/",
  "/login$",
  "/signup$",
  "/forgot-password$",
  "/reset-password$",
  "/verify-email$",
  "/verify-2fa$",
  "/select-role$",
  "/unsubscribe/",
  "/404$",
  "/api/",
] as const;

const RESERVED_PROVIDER_SLUGS = new Set([
  "404",
  "account",
  "admin",
  "analytics",
  "api",
  "booking",
  "browse",
  "bulk-booking",
  "category",
  "customer",
  "dm",
  "embed",
  "experiences",
  "featured",
  "forgot-password",
  "help",
  "login",
  "messages",
  "monthly-planner",
  "my-bookings",
  "my-quotes",
  "my-reviews",
  "my-waitlist",
  "notification-settings",
  "notifications",
  "pricing",
  "profile",
  "provider",
  "provider-dashboard",
  "receipts",
  "referral-program",
  "referrals",
  "reset-password",
  "robots.txt",
  "saved-providers",
  "search",
  "service",
  "signup",
  "sitemap.xml",
  "terms",
  "unsubscribe",
  "verify-2fa",
  "verify-email",
]);

const EMPTY_SITEMAP_DATA: PublicSitemapData = {
  categories: [],
  providers: [],
  services: [],
  promotions: [],
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatLastModified(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function encodePathSegment(value: string | number): string {
  return encodeURIComponent(String(value).trim());
}

function toEntries(data: PublicSitemapData): SitemapEntry[] {
  const categoryEntries = data.categories
    .filter((category): category is SitemapRecord & { slug: string } => Boolean(category.slug?.trim()))
    .map((category) => ({
      path: `/category/${encodePathSegment(category.slug)}`,
      changefreq: "weekly" as const,
      priority: "0.8",
      lastmod: category.updatedAt,
    }));

  const providerEntries = data.providers
    .filter((provider): provider is SitemapRecord & { slug: string } => {
      const slug = provider.slug?.trim().toLowerCase();
      return Boolean(slug && !RESERVED_PROVIDER_SLUGS.has(slug));
    })
    .map((provider) => ({
      path: `/${encodePathSegment(provider.slug)}`,
      changefreq: "weekly" as const,
      priority: "0.7",
      lastmod: provider.updatedAt,
    }));

  const serviceEntries = data.services
    .filter((service): service is SitemapRecord & { id: number } => Number.isInteger(service.id) && Number(service.id) > 0)
    .map((service) => ({
      path: `/service/${service.id}`,
      changefreq: "weekly" as const,
      priority: "0.7",
      lastmod: service.updatedAt,
    }));

  const promotionEntries = data.promotions
    .filter((promotion): promotion is SitemapRecord & { id: number } => Number.isInteger(promotion.id) && Number(promotion.id) > 0)
    .map((promotion) => ({
      path: `/featured/promo/${promotion.id}`,
      changefreq: "daily" as const,
      priority: "0.6",
      lastmod: promotion.updatedAt,
    }));

  return [
    ...SITEMAP_STATIC_PAGES,
    ...categoryEntries,
    ...providerEntries,
    ...serviceEntries,
    ...promotionEntries,
  ];
}

export function buildSitemapXml(
  data: PublicSitemapData,
  origin = SITEMAP_CANONICAL_ORIGIN,
): string {
  const canonicalOrigin = origin.replace(/\/+$/, "");
  const uniqueEntries = new Map<string, SitemapEntry>();

  for (const entry of toEntries(data)) {
    if (!uniqueEntries.has(entry.path)) uniqueEntries.set(entry.path, entry);
  }

  const urls = Array.from(uniqueEntries.values())
    .map((entry) => {
      const lastmod = formatLastModified(entry.lastmod);
      return `  <url>\n    <loc>${escapeXml(`${canonicalOrigin}${entry.path}`)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

export function buildRobotsTxt(origin = SITEMAP_CANONICAL_ORIGIN): string {
  const canonicalOrigin = origin.replace(/\/+$/, "");
  const disallowRules = ROBOTS_DISALLOWED_PATHS.map((path) => `Disallow: ${path}`).join("\n");
  return `User-agent: *\nAllow: /\n${disallowRules}\n\nSitemap: ${canonicalOrigin}/sitemap.xml`;
}

export async function loadPublicSitemapData(now = new Date()): Promise<PublicSitemapData> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable while generating sitemap");

  const [categoryRows, providerRows, serviceRows, promotionRows] = await Promise.all([
    db
      .select({ slug: serviceCategories.slug })
      .from(serviceCategories)
      .where(eq(serviceCategories.isActive, true)),
    db
      .select({ slug: serviceProviders.profileSlug, updatedAt: serviceProviders.updatedAt })
      .from(serviceProviders)
      .innerJoin(users, eq(serviceProviders.userId, users.id))
      .where(and(
        eq(serviceProviders.isActive, true),
        isNotNull(serviceProviders.profileSlug),
        isNull(serviceProviders.deletedAt),
        isNull(users.deletedAt),
      )),
    db
      .select({ id: services.id, updatedAt: services.updatedAt })
      .from(services)
      .innerJoin(serviceProviders, eq(services.providerId, serviceProviders.id))
      .innerJoin(users, eq(serviceProviders.userId, users.id))
      .where(and(
        eq(services.isActive, true),
        isNull(services.deletedAt),
        eq(serviceProviders.isActive, true),
        isNull(serviceProviders.deletedAt),
        isNull(users.deletedAt),
      )),
    db
      .select({ id: promotions.id, updatedAt: promotions.updatedAt })
      .from(promotions)
      .innerJoin(serviceProviders, eq(promotions.providerId, serviceProviders.id))
      .innerJoin(users, eq(serviceProviders.userId, users.id))
      .where(and(
        eq(promotions.status, "active"),
        lte(promotions.startDate, now),
        gte(promotions.endDate, now),
        eq(serviceProviders.isActive, true),
        isNull(serviceProviders.deletedAt),
        isNull(users.deletedAt),
      )),
  ]);

  return {
    categories: categoryRows,
    providers: providerRows,
    services: serviceRows,
    promotions: promotionRows,
  };
}

export function createSitemapHandler(
  loadData: (now?: Date) => Promise<PublicSitemapData> = loadPublicSitemapData,
): RequestHandler {
  return async (_req: Request, res: Response) => {
    try {
      const data = await loadData(new Date());
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
      res.send(buildSitemapXml(data));
    } catch (error) {
      console.error("[Sitemap] Failed to load public records:", error);
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "no-store");
      res.set("Retry-After", "300");
      res.status(503).send(buildSitemapXml(EMPTY_SITEMAP_DATA));
    }
  };
}

export const handleSitemap = createSitemapHandler();

export function handleRobotsTxt(_req: Request, res: Response): void {
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.send(buildRobotsTxt());
}
