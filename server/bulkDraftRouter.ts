import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createBulkDraft,
  updateBulkDraft,
  getBulkDraftsByUser,
  getBulkDraftById,
  deleteBulkDraft,
} from "./db/bulkDrafts";

export const bulkDraftRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getBulkDraftsByUser(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const draft = await getBulkDraftById(input.id);
      if (!draft || draft.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      return draft;
    }),

  save: protectedProcedure
    .input(z.object({
      id: z.number().optional(), // If provided, update existing draft
      name: z.string().optional(),
      eventDate: z.string().optional(),
      eventType: z.string().optional(),
      eventVenue: z.string().optional(),
      slots: z.array(z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        // Update existing
        const existing = await getBulkDraftById(input.id);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
        }
        await updateBulkDraft(input.id, ctx.user.id, {
          name: input.name,
          eventDate: input.eventDate,
          eventType: input.eventType,
          eventVenue: input.eventVenue,
          slots: input.slots,
        });
        return { id: input.id };
      } else {
        // Create new
        const id = await createBulkDraft({
          userId: ctx.user.id,
          name: input.name,
          eventDate: input.eventDate,
          eventType: input.eventType,
          eventVenue: input.eventVenue,
          slots: input.slots,
        });
        return { id };
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const draft = await getBulkDraftById(input.id);
      if (!draft || draft.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
      }
      await deleteBulkDraft(input.id);
      return { success: true };
    }),
});
