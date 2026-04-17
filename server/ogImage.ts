import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// Cache font data in memory
let fontDataCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontDataCache) return fontDataCache;
  // Use Google Fonts API to get Inter (a clean, modern font)
  const response = await fetch(
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
    { headers: { "User-Agent": "Mozilla/5.0" } }
  );
  const css = await response.text();
  // Extract the first font URL (could be .woff2 or .ttf)
  const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!urlMatch) {
    throw new Error("Could not find font URL in CSS: " + css.slice(0, 200));
  }
  const fontResponse = await fetch(urlMatch[1]);
  fontDataCache = await fontResponse.arrayBuffer();
  return fontDataCache;
}

/**
 * Generate a 1200x630 OG image for a provider profile.
 * Returns the public URL of the generated image, or null on failure.
 */
/**
 * Generate a 1200x630 OG image for a service detail page.
 * Returns the public URL of the generated image, or null on failure.
 */
export async function generateServiceOgImage(
  serviceId: number
): Promise<string | null> {
  try {
    const service = await db.getServiceById(serviceId);
    if (!service) return null;

    const provider = await db.getProviderById(service.providerId);
    const category = await db.getCategoryById(service.categoryId);
    const businessName = provider?.businessName || "Provider";
    const serviceName = service.name || "Service";
    const description = service.description
      ? service.description.length > 100
        ? service.description.slice(0, 97) + "..."
        : service.description
      : `Professional service by ${businessName}`;

    // Format price
    let priceText = "";
    if (service.pricingModel === "fixed" && service.basePrice) {
      priceText = `$${parseFloat(service.basePrice).toFixed(0)}`;
    } else if (service.pricingModel === "hourly" && service.hourlyRate) {
      priceText = `$${parseFloat(service.hourlyRate).toFixed(0)}/hr`;
    } else if (service.pricingModel === "custom_quote") {
      priceText = "Custom Quote";
    }

    // Format duration
    const durationText = service.durationMinutes
      ? service.durationMinutes >= 60
        ? `${Math.floor(service.durationMinutes / 60)}h ${service.durationMinutes % 60 ? (service.durationMinutes % 60) + "m" : ""}`
        : `${service.durationMinutes} min`
      : "";

    // Service type label
    const typeLabels: Record<string, string> = {
      mobile: "Mobile",
      fixed_location: "In-Person",
      virtual: "Virtual",
      hybrid: "Hybrid",
    };
    const serviceTypeLabel = typeLabels[service.serviceType] || service.serviceType;
    const categoryName = category?.name || "";

    const fontData = await loadFont();

    const svg = await satori(
      ({
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #0f4c3a 0%, #0a3328 50%, #071f1a 100%)",
            fontFamily: "Inter",
            color: "white",
            position: "relative",
            overflow: "hidden",
          },
          children: [
            // Subtle pattern overlay
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.05,
                  backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                },
              },
            },
            // Top accent bar (green for services)
            {
              type: "div",
              props: {
                style: {
                  width: "1200px",
                  height: "6px",
                  background: "linear-gradient(90deg, #22c55e, #4ade80, #86efac)",
                },
              },
            },
            // Main content area
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flex: 1,
                  padding: "48px 64px 40px",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "20px",
                },
                children: [
                  // Category badge
                  ...(categoryName
                    ? [
                        {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                            },
                            children: [
                              {
                                type: "div",
                                props: {
                                  style: {
                                    background: "rgba(34,197,94,0.2)",
                                    border: "1px solid rgba(34,197,94,0.4)",
                                    borderRadius: "20px",
                                    padding: "6px 16px",
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    color: "#86efac",
                                  },
                                  children: categoryName,
                                },
                              },
                            ],
                          },
                        },
                      ]
                    : []),
                  // Service name
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "48px",
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: "white",
                      },
                      children: serviceName,
                    },
                  },
                  // Description
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "22px",
                        lineHeight: 1.5,
                        color: "rgba(255,255,255,0.75)",
                      },
                      children: description,
                    },
                  },
                  // Price + Duration + Type row
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "24px",
                        marginTop: "12px",
                      },
                      children: [
                        ...(priceText
                          ? [
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "36px",
                                    fontWeight: 700,
                                    color: "#4ade80",
                                  },
                                  children: priceText,
                                },
                              },
                            ]
                          : []),
                        ...(durationText
                          ? [
                              {
                                type: "div",
                                props: {
                                  style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  },
                                  children: [
                                    {
                                      type: "div",
                                      props: {
                                        style: { fontSize: "20px", color: "rgba(255,255,255,0.5)" },
                                        children: "●",
                                      },
                                    },
                                    {
                                      type: "div",
                                      props: {
                                        style: { fontSize: "22px", color: "rgba(255,255,255,0.8)" },
                                        children: durationText,
                                      },
                                    },
                                  ],
                                },
                              },
                            ]
                          : []),
                        {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            },
                            children: [
                              {
                                type: "div",
                                props: {
                                  style: { fontSize: "20px", color: "rgba(255,255,255,0.5)" },
                                  children: "●",
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: { fontSize: "22px", color: "rgba(255,255,255,0.8)" },
                                  children: serviceTypeLabel,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  // Provider name
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "20px",
                        color: "rgba(255,255,255,0.6)",
                        marginTop: "8px",
                      },
                      children: `by ${businessName}`,
                    },
                  },
                ],
              },
            },
            // Bottom bar with OlogyCrew branding
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 64px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.2)",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "#22c55e",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              fontWeight: 700,
                            },
                            children: "O",
                          },
                        },
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "20px",
                              fontWeight: 600,
                              color: "rgba(255,255,255,0.9)",
                            },
                            children: "OlogyCrew",
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "18px",
                        color: "rgba(255,255,255,0.5)",
                      },
                      children: "Book this service now",
                    },
                  },
                ],
              },
            },
          ],
        },
      } as any),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: fontData,
            weight: 400,
            style: "normal" as const,
          },
        ],
      }
    );

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    const fileKey = `og-images/services/${serviceId}-${nanoid(8)}.png`;
    const { url } = await storagePut(fileKey, Buffer.from(pngBuffer), "image/png");

    return url;
  } catch (error) {
    console.error("[OG Image] Error generating service OG image:", error);
    return null;
  }
}

/**
 * Generate a 1200x630 OG image for a provider profile.
 * Returns the public URL of the generated image, or null on failure.
 */
export async function generateProviderOgImage(
  slug: string
): Promise<string | null> {
  try {
    const provider = await db.getProviderBySlug(slug);
    if (!provider) return null;

    const user = await db.getUserById(provider.userId);
    const profilePhotoUrl = user?.profilePhotoUrl || null;
    const businessName = provider.businessName || "Provider";
    const description = provider.description
      ? provider.description.length > 120
        ? provider.description.slice(0, 117) + "..."
        : provider.description
      : "Book services on OlogyCrew";
    const location = [provider.city, provider.state].filter(Boolean).join(", ");
    const rating = parseFloat(provider.averageRating || "0");
    const reviewCount = provider.totalReviews || 0;
    const isVerified = provider.verificationStatus === "verified";

    const fontData = await loadFont();

    // Build the JSX-like structure for satori
    const svg = await satori(
      ({
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #1e3a5f 0%, #0f2440 50%, #0a1929 100%)",
            fontFamily: "Inter",
            color: "white",
            position: "relative",
            overflow: "hidden",
          },
          children: [
            // Subtle pattern overlay
            {
              type: "div",
              props: {
                style: {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  opacity: 0.05,
                  backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                },
              },
            },
            // Top accent bar
            {
              type: "div",
              props: {
                style: {
                  width: "1200px",
                  height: "6px",
                  background: "linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)",
                },
              },
            },
            // Main content area
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  flex: 1,
                  padding: "48px 64px 40px",
                  gap: "48px",
                  alignItems: "center",
                },
                children: [
                  // Left: Profile photo or initial
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      },
                      children: [
                        profilePhotoUrl
                          ? {
                              type: "img",
                              props: {
                                src: profilePhotoUrl,
                                style: {
                                  width: "180px",
                                  height: "180px",
                                  borderRadius: "24px",
                                  objectFit: "cover",
                                  border: "4px solid rgba(255,255,255,0.2)",
                                },
                              },
                            }
                          : {
                              type: "div",
                              props: {
                                style: {
                                  width: "180px",
                                  height: "180px",
                                  borderRadius: "24px",
                                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "72px",
                                  fontWeight: 700,
                                  color: "white",
                                  border: "4px solid rgba(255,255,255,0.2)",
                                },
                                children: businessName.charAt(0).toUpperCase(),
                              },
                            },
                      ],
                    },
                  },
                  // Right: Business info
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        gap: "16px",
                        justifyContent: "center",
                      },
                      children: [
                        // Business name + verified badge
                        {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              flexWrap: "wrap",
                            },
                            children: [
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "42px",
                                    fontWeight: 700,
                                    lineHeight: 1.2,
                                    color: "white",
                                  },
                                  children: businessName,
                                },
                              },
                              ...(isVerified
                                ? [
                                    {
                                      type: "div",
                                      props: {
                                        style: {
                                          background: "#22c55e",
                                          borderRadius: "8px",
                                          padding: "4px 12px",
                                          fontSize: "16px",
                                          fontWeight: 600,
                                          color: "white",
                                        },
                                        children: "Verified",
                                      },
                                    },
                                  ]
                                : []),
                            ],
                          },
                        },
                        // Description
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "22px",
                              lineHeight: 1.5,
                              color: "rgba(255,255,255,0.8)",
                            },
                            children: description,
                          },
                        },
                        // Rating + Location row
                        {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: "24px",
                              marginTop: "8px",
                            },
                            children: [
                              ...(rating > 0
                                ? [
                                    {
                                      type: "div",
                                      props: {
                                        style: {
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                        },
                                        children: [
                                          {
                                            type: "div",
                                            props: {
                                              style: {
                                                fontSize: "22px",
                                                color: "#fbbf24",
                                              },
                                              children: "★",
                                            },
                                          },
                                          {
                                            type: "div",
                                            props: {
                                              style: {
                                                fontSize: "20px",
                                                fontWeight: 600,
                                                color: "white",
                                              },
                                              children: `${rating.toFixed(1)} (${reviewCount} review${reviewCount !== 1 ? "s" : ""})`,
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ]
                                : []),
                              ...(location
                                ? [
                                    {
                                      type: "div",
                                      props: {
                                        style: {
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                        },
                                        children: [
                                          {
                                            type: "div",
                                            props: {
                                              style: {
                                                fontSize: "20px",
                                                color: "rgba(255,255,255,0.6)",
                                              },
                                              children: "●",
                                            },
                                          },
                                          {
                                            type: "div",
                                            props: {
                                              style: {
                                                fontSize: "20px",
                                                color: "rgba(255,255,255,0.7)",
                                              },
                                              children: location,
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ]
                                : []),
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            // Bottom bar with OlogyCrew branding
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 64px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.2)",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: "#3b82f6",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              fontWeight: 700,
                            },
                            children: "O",
                          },
                        },
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "20px",
                              fontWeight: 600,
                              color: "rgba(255,255,255,0.9)",
                            },
                            children: "OlogyCrew",
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "18px",
                        color: "rgba(255,255,255,0.5)",
                      },
                      children: "Book trusted service professionals",
                    },
                  },
                ],
              },
            },
          ],
        },
      } as any),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: fontData,
            weight: 400,
            style: "normal" as const,
          },
        ],
      }
    );

    // Convert SVG to PNG
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Upload to S3
    const fileKey = `og-images/providers/${slug}-${nanoid(8)}.png`;
    const { url } = await storagePut(fileKey, Buffer.from(pngBuffer), "image/png");

    return url;
  } catch (error) {
    console.error("[OG Image] Error generating provider OG image:", error);
    return null;
  }
}


/**
 * Generate a branded 1200x630 OG image for the OlogyCrew homepage.
 * Shows the tagline, popular category icons, and branding.
 * Returns the public URL of the generated image, or null on failure.
 */
export async function generateHomepageOgImage(): Promise<string | null> {
  try {
    const fontData = await loadFont();

    // Popular category labels to show as "chips"
    const categoryChips = [
      "Barber", "Massage", "Photography", "Handyman",
      "DJ & Music", "Fitness", "Home Cleaning", "Auto Detailing",
      "Event Planning", "Pet Care", "Tech Support", "Salon",
    ];

    const element = {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "Inter",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          // Decorative background circles
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-80px",
                right: "-80px",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.08)",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "-100px",
                left: "-60px",
                width: "350px",
                height: "350px",
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.06)",
              },
            },
          },
          // Logo area
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "28px",
                      fontWeight: "700",
                    },
                    children: "O",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "36px",
                      fontWeight: "700",
                      color: "white",
                      letterSpacing: "-0.5px",
                    },
                    children: "OlogyCrew",
                  },
                },
              ],
            },
          },
          // Tagline
          {
            type: "div",
            props: {
              style: {
                fontSize: "48px",
                fontWeight: "700",
                color: "white",
                textAlign: "center",
                lineHeight: "1.2",
                maxWidth: "900px",
                marginBottom: "12px",
              },
              children: "Find Trusted Service Professionals",
            },
          },
          // Subtitle
          {
            type: "div",
            props: {
              style: {
                fontSize: "22px",
                color: "rgba(148, 163, 184, 1)",
                textAlign: "center",
                maxWidth: "700px",
                marginBottom: "36px",
                lineHeight: "1.4",
              },
              children: "Book instantly. Pay securely. Get the job done right.",
            },
          },
          // Category chips - Row 1
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "10px",
                maxWidth: "900px",
                marginBottom: "10px",
              },
              children: categoryChips.slice(0, 6).map((cat) => ({
                type: "div",
                props: {
                  style: {
                    padding: "8px 20px",
                    borderRadius: "20px",
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    color: "rgba(147, 197, 253, 1)",
                    fontSize: "16px",
                    fontWeight: "600",
                  },
                  children: cat,
                },
              })),
            },
          },
          // Category chips - Row 2
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "10px",
                maxWidth: "900px",
              },
              children: categoryChips.slice(6).map((cat) => ({
                type: "div",
                props: {
                  style: {
                    padding: "8px 20px",
                    borderRadius: "20px",
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.15)",
                    color: "rgba(148, 163, 184, 1)",
                    fontSize: "16px",
                    fontWeight: "600",
                  },
                  children: cat,
                },
              })),
            },
          },
          // Bottom bar with URL
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "0",
                left: "0",
                right: "0",
                height: "48px",
                background: "rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "14px",
                      color: "rgba(148, 163, 184, 0.8)",
                      letterSpacing: "1px",
                    },
                    children: "42+ SERVICE CATEGORIES  •  VERIFIED PROVIDERS  •  SECURE PAYMENTS",
                  },
                },
              ],
            },
          },
        ],
      },
    };

    const svg = await satori(element as any, {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal" as const,
        },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width" as const, value: 1200 },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    const fileKey = `og-images/homepage-${nanoid(8)}.png`;
    const { url } = await storagePut(fileKey, Buffer.from(pngBuffer), "image/png");

    return url;
  } catch (error) {
    console.error("[OG Image] Error generating homepage OG image:", error);
    return null;
  }
}
