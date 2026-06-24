import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  getEventTemplatesByUser,
  getEventTemplateById,
  createEventTemplate,
  updateEventTemplate,
  incrementTemplateUsage,
  deleteEventTemplate,
} from "./db/eventTemplates";
import { TRPCError } from "@trpc/server";

export const eventTemplateRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getEventTemplatesByUser(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const template = await getEventTemplateById(input.id);
      if (!template || template.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }
      return template;
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1, "Template name is required"),
        eventType: z.string().optional(),
        defaultVenue: z.string().optional(),
        serviceGroups: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const existing = await getEventTemplateById(input.id);
        if (!existing || existing.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }
        await updateEventTemplate(input.id, {
          name: input.name,
          eventType: input.eventType,
          defaultVenue: input.defaultVenue,
          serviceGroups: input.serviceGroups,
        });
        return { id: input.id };
      } else {
        const result = await createEventTemplate({
          userId: ctx.user.id,
          name: input.name,
          eventType: input.eventType,
          defaultVenue: input.defaultVenue,
          serviceGroups: input.serviceGroups,
        });
        return { id: result.id };
      }
    }),

  use: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const template = await getEventTemplateById(input.id);
      if (!template || template.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }
      await incrementTemplateUsage(input.id);
      return template;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getEventTemplateById(input.id);
      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }
      await deleteEventTemplate(input.id);
      return { success: true };
    }),
});
