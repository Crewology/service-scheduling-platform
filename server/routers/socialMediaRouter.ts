import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { requireDb } from "../db/connection";
import { socialPosts } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { publishSocialPost, previewSocialPost } from "../socialMedia";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const socialMediaRouter = router({
  listPosts: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;
      const posts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(limit).offset(offset);
      return posts;
    }),

  previewPost: adminProcedure.mutation(async () => {
    const result = await previewSocialPost();
    return result;
  }),

  publishPost: adminProcedure
    .input(z.object({ postId: z.number().optional() }).optional())
    .mutation(async ({ input }) => {
      const result = await publishSocialPost(input?.postId);
      return result;
    }),

  createPost: adminProcedure
    .input(z.object({
      content: z.string().min(1).max(2000),
      platforms: z.array(z.enum(["facebook", "instagram", "linkedin"])).min(1),
      scheduledAt: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [inserted] = await db.insert(socialPosts).values({
        content: input.content,
        postType: "manual",
        platforms: input.platforms,
        status: input.scheduledAt ? "scheduled" : "draft",
        scheduledAt: input.scheduledAt || null,
        createdAt: Date.now(),
      }).$returningId();
      return { success: true, id: inserted.id };
    }),

  publishExisting: adminProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await publishSocialPost(input.postId);
      return result;
    }),

  deletePost: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.delete(socialPosts).where(eq(socialPosts.id, input.id));
      return { success: true };
    }),
});
