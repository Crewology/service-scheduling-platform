import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getAllPlatformSettings, getPlatformSetting, bulkUpsertPlatformSettings } from "../db/platformSettings";

export const platformSettingsRouter = router({
  /**
   * Get all platform settings (public — used by Contact page, footer, etc.)
   */
  getAll: publicProcedure.query(async () => {
    return await getAllPlatformSettings();
  }),

  /**
   * Get a single setting by key (public)
   */
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const value = await getPlatformSetting(input.key);
      return { key: input.key, value };
    }),

  /**
   * Update platform settings (admin only)
   */
  update: protectedProcedure
    .input(
      z.object({
        settings: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update platform settings" });
      }
      await bulkUpsertPlatformSettings(input.settings);
      return { success: true };
    }),
});
