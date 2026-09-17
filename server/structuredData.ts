import * as db from "./db";
import { getAdaptiveBookingDecision } from "../shared/adaptiveBooking";
import { OLOGYCREW_PUBLIC_ORIGIN, ologyCrewPublicUrl } from "../shared/publicUrls";

function jsonLdScript(schema: unknown): string {
  const json = JSON.stringify(schema).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function compact<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function publicAmount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function serviceOffer(service: any, providerName: string) {
  const decision = getAdaptiveBookingDecision(service);
  const amount = service.pricingModel === "hourly"
    ? publicAmount(service.hourlyRate ?? service.basePrice)
    : service.pricingModel === "consultation"
      ? 0
      : publicAmount(service.basePrice);

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: ologyCrewPublicUrl(`/service/${service.id}`),
    availability: "https://schema.org/InStock",
    itemOffered: {
      "@type": "Service",
      name: service.name,
      description: service.description || undefined,
      serviceType: service.serviceType,
      provider: { "@type": "LocalBusiness", name: providerName },
      estimatedDuration: service.durationMinutes ? `PT${service.durationMinutes}M` : undefined,
    },
  };

  if (decision.mode === "direct" && amount !== undefined) {
    offer.price = amount.toFixed(2);
    offer.priceCurrency = "USD";
    if (service.pricingModel === "hourly") offer.unitText = "HOUR";
  }
  return compact(offer);
}

function getPriceRange(services: any[]): string {
  const prices = services
    .map((service) => service.pricingModel === "hourly"
      ? publicAmount(service.hourlyRate ?? service.basePrice)
      : publicAmount(service.basePrice))
    .filter((price): price is number => price !== undefined && price > 0);
  if (prices.length === 0 || Math.max(...prices) <= 50) return "$";
  if (Math.max(...prices) <= 150) return "$$";
  if (Math.max(...prices) <= 500) return "$$$";
  return "$$$$";
}

export async function getProviderJsonLd(slug: string, _origin?: string): Promise<string> {
  try {
    const provider = await db.getProviderBySlug(slug);
    if (!provider?.isActive || provider.deletedAt) return "";
    const [user, services, categories] = await Promise.all([
      db.getUserById(provider.userId),
      db.getServicesByProviderId(provider.id),
      db.getProviderCategories(provider.id),
    ]);
    if (!user || user.deletedAt) return "";

    const businessName = provider.businessName || "Service Provider";
    const address = compact({
      "@type": "PostalAddress",
      addressLocality: provider.city || undefined,
      addressRegion: provider.state || undefined,
      postalCode: provider.postalCode || undefined,
      addressCountry: "US",
    });
    const publicServices = services.filter((service: any) => !service.deletedAt);
    const schema: Record<string, unknown> = compact({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": ologyCrewPublicUrl(`/${slug}#provider`),
      name: businessName,
      url: ologyCrewPublicUrl(`/${slug}`),
      description: provider.description || `Book services from ${businessName} on OlogyCrew`,
      address,
      image: user?.profilePhotoUrl || provider.businessLogoUrl || undefined,
      priceRange: getPriceRange(publicServices),
      makesOffer: publicServices.map((service: any) => serviceOffer(service, businessName)),
      knowsAbout: categories.map((category: any) => category.categoryName),
      isPartOf: {
        "@type": "WebSite",
        name: "OlogyCrew",
        url: OLOGYCREW_PUBLIC_ORIGIN,
      },
    });

    if (!provider.isOfficial && provider.averageRating && Number(provider.averageRating) > 0 && Number(provider.totalReviews ?? 0) > 0) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(provider.averageRating).toFixed(1),
        reviewCount: Number(provider.totalReviews),
        bestRating: "5",
        worstRating: "1",
      };
    }
    return jsonLdScript(schema);
  } catch (error) {
    console.error("[StructuredData] Error generating provider JSON-LD:", error);
    return "";
  }
}

export async function getServiceJsonLd(serviceId: number, _origin?: string): Promise<string> {
  try {
    const service = await db.getServiceById(serviceId);
    if (!service?.isActive || service.deletedAt) return "";
    const provider = await db.getProviderById(service.providerId);
    if (!provider?.isActive || provider.deletedAt) return "";
    const user = await db.getUserById(provider.userId);
    if (!user || user.deletedAt) return "";
    const category = await db.getCategoryById(service.categoryId);
    const providerName = provider.businessName || "Service Provider";
    const offer = serviceOffer(service, providerName);
    const schema = compact({
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": ologyCrewPublicUrl(`/service/${service.id}#service`),
      name: service.name,
      description: service.description || undefined,
      url: ologyCrewPublicUrl(`/service/${service.id}`),
      serviceType: category?.name || service.serviceType,
      areaServed: compact({
        "@type": "AdministrativeArea",
        name: [provider.city, provider.state].filter(Boolean).join(", ") || undefined,
      }),
      provider: {
        "@type": "LocalBusiness",
        "@id": provider.profileSlug ? ologyCrewPublicUrl(`/${provider.profileSlug}#provider`) : undefined,
        name: providerName,
        url: provider.profileSlug ? ologyCrewPublicUrl(`/${provider.profileSlug}`) : undefined,
      },
      offers: offer,
      isPartOf: { "@type": "WebSite", name: "OlogyCrew", url: OLOGYCREW_PUBLIC_ORIGIN },
    });
    return jsonLdScript(schema);
  } catch (error) {
    console.error("[StructuredData] Error generating service JSON-LD:", error);
    return "";
  }
}

export async function getCategoryJsonLd(slug: string, _origin?: string): Promise<string> {
  try {
    const category = await db.getCategoryBySlug(slug);
    if (!category?.isActive) return "";
    const result = await db.searchPublicServicesForAgents({
      category: category.slug,
      limit: 50,
      offset: 0,
    });
    const services = result.rows;
    const schema = compact({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": ologyCrewPublicUrl(`/category/${slug}#category`),
      name: `${category.name} services on OlogyCrew`,
      description: category.description || `Discover ${category.name.toLowerCase()} services on OlogyCrew.`,
      url: ologyCrewPublicUrl(`/category/${slug}`),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: result.total,
        itemListElement: services.slice(0, 50).map((service: any, index: number) => ({
          "@type": "ListItem",
          position: index + 1,
          name: service.name,
          url: ologyCrewPublicUrl(`/service/${service.id}`),
        })),
      },
      isPartOf: { "@type": "WebSite", name: "OlogyCrew", url: OLOGYCREW_PUBLIC_ORIGIN },
    });
    return jsonLdScript(schema);
  } catch (error) {
    console.error("[StructuredData] Error generating category JSON-LD:", error);
    return "";
  }
}

export function getHomepageJsonLd(_origin?: string): string {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${OLOGYCREW_PUBLIC_ORIGIN}/#website`,
      name: "OlogyCrew",
      url: OLOGYCREW_PUBLIC_ORIGIN,
      description: "Discover service providers, book defined services, or request a provider-reviewed quote.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${OLOGYCREW_PUBLIC_ORIGIN}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${OLOGYCREW_PUBLIC_ORIGIN}/#organization`,
      name: "OlogyCrew",
      url: OLOGYCREW_PUBLIC_ORIGIN,
      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png",
      description: "OlogyCrew provides discovery, booking, quote, and payment infrastructure for independent service providers and their customers.",
      sameAs: ["https://www.facebook.com/OlogyCrew"],
    },
  ];
  return schema.map(jsonLdScript).join("\n    ");
}
