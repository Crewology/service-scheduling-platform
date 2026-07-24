import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { requireDb } from "./db/connection";
import { socialPosts, serviceCategories } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const POST_TYPES = ["provider_recruitment", "customer_attraction", "category_spotlight"] as const;

export async function generateSocialPost(): Promise<{ content: string; postType: string; categoryId?: number; categoryName?: string }> {
  const db = await requireDb();
  const categories = await db.select().from(serviceCategories).where(eq(serviceCategories.isActive, true));
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const postType = POST_TYPES[Math.floor(Math.random() * POST_TYPES.length)];

  let prompt = "";
  switch (postType) {
    case "provider_recruitment":
      prompt = `Write a compelling social media post for OlogyCrew (a service scheduling platform at ologycrew.com) to recruit service providers in the "${randomCategory.name}" category. Be 2-3 sentences max, highlight benefits (free listing, easy scheduling, payment processing, grow client base), include a CTA to sign up at ologycrew.com, use 2-3 hashtags. Professional but engaging. Max 1-2 emojis. Return ONLY the post text.`;
      break;
    case "customer_attraction":
      prompt = `Write a compelling social media post for OlogyCrew (a service scheduling platform at ologycrew.com) to attract customers looking for "${randomCategory.name}" services. Be 2-3 sentences max, highlight benefits (verified providers, easy booking, transparent pricing, trusted reviews), include a CTA to book at ologycrew.com, use 2-3 hashtags. Professional but engaging. Max 1-2 emojis. Return ONLY the post text.`;
      break;
    case "category_spotlight":
      prompt = `Write a compelling social media post for OlogyCrew (a service scheduling platform at ologycrew.com) spotlighting the "${randomCategory.name}" category. Be 2-3 sentences max, mention available services, encourage providers to list and customers to book, include a CTA to visit ologycrew.com, use 2-3 hashtags. Professional but engaging. Max 1-2 emojis. Return ONLY the post text.`;
      break;
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a social media marketing expert for OlogyCrew, a professional service scheduling platform. Write concise, engaging posts." },
      { role: "user", content: prompt }
    ]
  });

  const content = (response.choices?.[0]?.message?.content as string || "").trim();
  return { content, postType, categoryId: randomCategory.id, categoryName: randomCategory.name };
}

async function postToFacebook(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!ENV.facebookPageAccessToken || !ENV.facebookPageId) {
    return { success: false, error: "Facebook credentials not configured" };
  }
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${ENV.facebookPageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, access_token: ENV.facebookPageAccessToken }),
    });
    const data = await response.json() as any;
    if (data.id) return { success: true, postId: data.id };
    return { success: false, error: data.error?.message || "Unknown Facebook error" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function postToInstagram(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!ENV.facebookPageAccessToken || !ENV.instagramBusinessAccountId) {
    return { success: false, error: "Instagram credentials not configured" };
  }
  try {
    const brandImageUrl = "https://ologycrew.com/og-image.png";
    const containerResponse = await fetch(`https://graph.facebook.com/v19.0/${ENV.instagramBusinessAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: brandImageUrl, caption: content, access_token: ENV.facebookPageAccessToken }),
    });
    const containerData = await containerResponse.json() as any;
    if (!containerData.id) return { success: false, error: containerData.error?.message || "Failed to create media container" };

    const publishResponse = await fetch(`https://graph.facebook.com/v19.0/${ENV.instagramBusinessAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token: ENV.facebookPageAccessToken }),
    });
    const publishData = await publishResponse.json() as any;
    if (publishData.id) return { success: true, postId: publishData.id };
    return { success: false, error: publishData.error?.message || "Failed to publish" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function postToLinkedIn(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!ENV.linkedinAccessToken || !ENV.linkedinOrganizationId) {
    return { success: false, error: "LinkedIn credentials not configured" };
  }
  try {
    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.linkedinAccessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:organization:${ENV.linkedinOrganizationId}`,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: content }, shareMediaCategory: "NONE" } },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    if (response.status === 201) {
      const postId = response.headers.get("x-restli-id") || "published";
      return { success: true, postId };
    }
    const data = await response.json() as any;
    return { success: false, error: data.message || `LinkedIn API error: ${response.status}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishSocialPost(postId?: number): Promise<{ success: boolean; results: { platform: string; success: boolean; postId?: string; error?: string }[] }> {
  const db = await requireDb();
  let content: string;
  let socialPostId: number;

  if (postId) {
    const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
    if (!post) throw new Error("Post not found");
    content = post.content;
    socialPostId = post.id;
  } else {
    const generated = await generateSocialPost();
    const [inserted] = await db.insert(socialPosts).values({
      content: generated.content,
      postType: generated.postType,
      categoryId: generated.categoryId,
      categoryName: generated.categoryName,
      platforms: ["facebook", "instagram", "linkedin"],
      status: "pending",
    }).$returningId();
    content = generated.content;
    socialPostId = inserted.id;
  }

  const results = await Promise.all([
    postToFacebook(content).then(r => ({ platform: "facebook", ...r })),
    postToInstagram(content).then(r => ({ platform: "instagram", ...r })),
    postToLinkedIn(content).then(r => ({ platform: "linkedin", ...r })),
  ]);

  const anySuccess = results.some(r => r.success);
  await db.update(socialPosts)
    .set({ results, status: anySuccess ? "posted" : "failed", postedAt: Date.now() })
    .where(eq(socialPosts.id, socialPostId));

  return { success: anySuccess, results };
}

export async function previewSocialPost(): Promise<{ content: string; postType: string; categoryName?: string }> {
  const generated = await generateSocialPost();
  return { content: generated.content, postType: generated.postType, categoryName: generated.categoryName };
}
