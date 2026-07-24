import type { Request, Response } from "express";
import { publishSocialPost } from "./socialMedia";

export async function handleScheduledSocialPost(req: Request, res: Response) {
  try {
    const result = await publishSocialPost();
    console.log("[SocialMedia] Weekly post result:", JSON.stringify(result));
    const { success, results } = result;
    res.json({ success, results });
  } catch (err: any) {
    console.error("[SocialMedia] Scheduled post failed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
