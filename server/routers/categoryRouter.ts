import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const categoryRouter = router({
  list: publicProcedure.query(async () => {
    return await db.getAllCategories();
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
