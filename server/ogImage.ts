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
