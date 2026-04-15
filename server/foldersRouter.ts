import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const foldersRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Check subscription tier - folders are Pro/Business only
      const tier = await db.getCustomerTier(ctx.user.id);
      if (tier === "free") {
        return { folders: [], tier: "free" as const, canUseFolders: false };
      }
      const folders = await db.getUserFolders(ctx.user.id);
      return { folders, tier, canUseFolders: true };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      color: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tier = await db.getCustomerTier(ctx.user.id);
      if (tier === "free") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Folders are available for Pro and Business subscribers. Upgrade to organize your saved providers.",
        });
      }
      
      // Pro: max 10 folders, Business: max 50
      const existing = await db.getUserFolders(ctx.user.id);
      const maxFolders = tier === "pro" ? 10 : 50;
      if (existing.length >= maxFolders) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can create up to ${maxFolders} folders on the ${tier} plan.`,
        });
      }
      
      return db.createFolder(ctx.user.id, input.name, input.color, input.icon);
    }),

  update: protectedProcedure
    .input(z.object({
      folderId: z.number(),
      name: z.string().min(1).max(100).optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { folderId, ...data } = input;
      return db.updateFolder(folderId, ctx.user.id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.deleteFolder(input.folderId, ctx.user.id);
    }),

  moveProvider: protectedProcedure
    .input(z.object({
      favoriteId: z.number(),
      folderId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.moveToFolder(input.favoriteId, ctx.user.id, input.folderId);
    }),

  bulkMove: protectedProcedure
    .input(z.object({
      providerIds: z.array(z.number()),
      folderId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.bulkMoveToFolder(ctx.user.id, input.providerIds, input.folderId);
    }),
});
