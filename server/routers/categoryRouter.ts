import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

export const categoryRouter = router({
  list: publicProcedure.query(async () => {
    const categories = await db.getAllCategories();
    // If DB returned empty AND we know there should be categories,
    // it's likely a connection failure — throw so frontend can retry
    if (!categories || categories.length === 0) {
      // Double-check: try once more in case of transient failure
      const retry = await db.getAllCategories();
      if (!retry || retry.length === 0) {
        // Check if DB is actually reachable by testing requireDb
        try {
          await db.requireDb();
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to load categories. Please try again.",
          });
        }
      }
      return retry || [];
    }
    return categories;
  }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getCategoryById(input.id);
    }),
    
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return await db.getCategoryBySlug(input.slug);
    }),
});
