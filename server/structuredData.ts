/**
 * Schema.org JSON-LD structured data for AI agent discoverability.
 * Generates LocalBusiness, Service, and Offer schema for provider profiles and services.
 */
import * as db from "./db";

function escapeJsonString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

/**
 * Generate JSON-LD for a provider profile page.
 * Outputs LocalBusiness + hasOfferCatalog with services.
 */
export async function getProviderJsonLd(slug: string, origin: string): Promise<string> {
  try {
    const provider = await db.getProviderBySlug(slug);
    if (!provider) return "";

    const user = await db.getUserById(provider.userId);
    const services = await db.getServicesByProviderId(provider.id);
    const categories = await db.getProviderCategories(provider.id);

    const businessName = provider.businessName || "Service Provider";
    const url = `${origin}/${slug}`;

    // Build address
    const address: any = {
      "@type": "PostalAddress",
    };
    if (provider.city) address.addressLocality = provider.city;
    if (provider.state) address.addressRegion = provider.state;
    if (provider.postalCode) address.postalCode = provider.postalCode;
    address.addressCountry = "US";

    // Build service offers
    const serviceOffers = services.map((svc: any) => {
      const offer: any = {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: svc.title,
          description: svc.description || undefined,
          provider: { "@type": "LocalBusiness", name: businessName },
        },
      };
      if (svc.price && Number(svc.price) > 0) {
        offer.price = Number(svc.price).toFixed(2);
        offer.priceCurrency = "USD";
      }
      if (svc.duration) {
        offer.itemOffered.estimatedDuration = `PT${svc.duration}M`;
      }
      return offer;
    });

    // Build the main LocalBusiness schema
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: businessName,
      url,
      description: provider.description || `Book services from ${businessName} on OlogyCrew`,
      address,
      image: user?.profilePhotoUrl || undefined,
      telephone: user?.phone || undefined,
      priceRange: getPriceRange(services),
      makesOffer: serviceOffers.length > 0 ? serviceOffers : undefined,
      additionalType: categories.map((c: any) => c.name).join(", ") || undefined,
      isPartOf: {
        "@type": "WebSite",
        name: "OlogyCrew",
        url: origin,
      },
    };

    // Add aggregate rating if available
    if (provider.averageRating && Number(provider.averageRating) > 0) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(provider.averageRating).toFixed(1),
        reviewCount: provider.totalReviews || 1,
        bestRating: "5",
        worstRating: "1",
      };
    }

    // Clean undefined values
    const cleaned = JSON.parse(JSON.stringify(schema));
    return `<script type="application/ld+json">${JSON.stringify(cleaned)}</script>`;
  } catch (error) {
    console.error("[StructuredData] Error generating provider JSON-LD:", error);
    return "";
  }
}

/**
 * Generate JSON-LD for the homepage.
 * Outputs WebSite + Organization schema.
 */
export function getHomepageJsonLd(origin: string): string {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "OlogyCrew",
      url: origin,
      description: "The digital home for your business. Get discovered, get booked, get paid. 48+ service categories, no gatekeeping.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${origin}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "OlogyCrew",
      url: origin,
      logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png",
      description: "Your business. Your profile. Your customers. Your money. OlogyCrew provides the infrastructure — you own the relationship.",
      sameAs: [
        "https://www.facebook.com/OlogyCrew",
      ],
    },
  ];

  return schema.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n    ");
}

function getPriceRange(services: any[]): string {
  const prices = services
    .map((s: any) => Number(s.price))
    .filter((p: number) => p > 0);
  if (prices.length === 0) return "$";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max <= 50) return "$";
  if (max <= 150) return "$$";
  if (max <= 500) return "$$$";
  return "$$$$";
}
