import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getAdaptiveBookingDecision } from "../../shared/adaptiveBooking";
import { resolveAgentHandoffToken } from "../agentHandoff";

export const agentHandoffRouter = router({
  resolve: publicProcedure
    .input(z.object({
      token: z.string().min(20).max(4096),
      expectedServiceId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      let payload;
      try {
        payload = resolveAgentHandoffToken(input.token);
      } catch (error) {
        const expired = error instanceof Error && error.message.includes("expired");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: expired
            ? "This agent handoff has expired. Ask the agent to prepare a new one."
            : "This agent handoff is invalid.",
        });
      }

      if (payload.serviceId !== input.expectedServiceId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This handoff does not match the selected service." });
      }

      const service = await db.getServiceById(payload.serviceId);
      if (!service || !service.isActive || service.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This service is no longer available." });
      }
      const provider = await db.getProviderById(service.providerId);
      if (!provider?.isActive || provider.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This provider is no longer available." });
      }
      const [user, category] = await Promise.all([
        db.getUserById(provider.userId),
        db.getCategoryById(service.categoryId),
      ]);
      if (!user || user.deletedAt || !category?.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This service is no longer available." });
      }

      const currentDecision = getAdaptiveBookingDecision(service);
      return {
        ...payload,
        mode: currentDecision.mode,
        providerSlug: provider.profileSlug,
        requiresHumanReview: true as const,
        createsBooking: false as const,
        createsQuote: false as const,
        collectsPayment: false as const,
      };
    }),
});
