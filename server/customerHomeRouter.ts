import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  bookings,
  quoteRequests,
  reviews,
  serviceProviders,
  services,
} from "../drizzle/schema";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db/connection";
import {
  CUSTOMER_UPCOMING_STATUSES,
  customerDateKey,
  customerRebookHref,
} from "../shared/customerHomeLogic";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function numericAmount(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export const customerHomeRouter = router({
  get: protectedProcedure
    .input(z.object({ localDate: localDateSchema }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) {
        return { actions: [], upcoming: [], rebook: [] };
      }

      const [bookingRows, quoteRows] = await Promise.all([
        database
          .select({
            id: bookings.id,
            bookingNumber: bookings.bookingNumber,
            serviceId: bookings.serviceId,
            providerId: bookings.providerId,
            bookingDate: bookings.bookingDate,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            status: bookings.status,
            bookingType: bookings.bookingType,
            endDate: bookings.endDate,
            totalDays: bookings.totalDays,
            locationType: bookings.locationType,
            venueName: bookings.venueName,
            serviceCity: bookings.serviceCity,
            serviceState: bookings.serviceState,
            totalAmount: bookings.totalAmount,
            completedAt: bookings.completedAt,
            createdAt: bookings.createdAt,
            serviceName: services.name,
            serviceActive: services.isActive,
            providerName: serviceProviders.businessName,
            providerSlug: serviceProviders.profileSlug,
            providerActive: serviceProviders.isActive,
            providerRating: serviceProviders.averageRating,
            providerReviewCount: serviceProviders.totalReviews,
            reviewId: reviews.id,
          })
          .from(bookings)
          .leftJoin(services, eq(bookings.serviceId, services.id))
          .leftJoin(serviceProviders, eq(bookings.providerId, serviceProviders.id))
          .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
          .where(eq(bookings.customerId, ctx.user.id))
          .orderBy(desc(bookings.createdAt))
          .limit(100),
        database
          .select({
            id: quoteRequests.id,
            title: quoteRequests.title,
            status: quoteRequests.status,
            quotedAmount: quoteRequests.quotedAmount,
            validUntil: quoteRequests.validUntil,
            createdAt: quoteRequests.createdAt,
            providerName: serviceProviders.businessName,
            serviceName: services.name,
          })
          .from(quoteRequests)
          .leftJoin(serviceProviders, eq(quoteRequests.providerId, serviceProviders.id))
          .leftJoin(services, eq(quoteRequests.serviceId, services.id))
          .where(and(eq(quoteRequests.customerId, ctx.user.id), eq(quoteRequests.status, "quoted")))
          .orderBy(desc(quoteRequests.updatedAt))
          .limit(8),
      ]);

      const upcoming = bookingRows
        .filter((booking) => CUSTOMER_UPCOMING_STATUSES.has(booking.status) && customerDateKey(booking.bookingDate) >= input.localDate)
        .sort((a, b) => `${a.bookingDate} ${a.startTime}`.localeCompare(`${b.bookingDate} ${b.startTime}`))
        .slice(0, 3)
        .map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
          bookingType: booking.bookingType,
          endDate: booking.endDate,
          totalDays: booking.totalDays,
          serviceName: booking.serviceName || "Booked service",
          providerName: booking.providerName || "Service provider",
          locationType: booking.locationType,
          venueName: booking.venueName,
          city: booking.serviceCity,
          state: booking.serviceState,
          totalAmount: numericAmount(booking.totalAmount),
          detailHref: `/booking/${booking.id}/detail`,
          messageHref: `/messages/${booking.id}`,
        }));

      const quoteActions = quoteRows.map((quote) => ({
        id: `quote-${quote.id}`,
        kind: "quote" as const,
        title: `Quote ready from ${quote.providerName || "a provider"}`,
        detail: quote.quotedAmount
          ? `${quote.title} · $${numericAmount(quote.quotedAmount).toFixed(2)}`
          : quote.title,
        deadline: quote.validUntil,
        actionLabel: "Review quote",
        href: "/my-quotes",
      }));

      const reviewActions = bookingRows
        .filter((booking) => booking.status === "completed" && !booking.reviewId)
        .slice(0, 4)
        .map((booking) => ({
          id: `review-${booking.id}`,
          kind: "review" as const,
          title: `How was ${booking.providerName || "your provider"}?`,
          detail: `Leave a verified review for ${booking.serviceName || "your completed service"}.`,
          deadline: booking.completedAt || booking.createdAt,
          actionLabel: "Leave review",
          href: `/booking/${booking.id}/review`,
        }));

      const seenServices = new Set<string>();
      const rebook = bookingRows
        .filter((booking) => booking.status === "completed" && booking.serviceActive && booking.providerActive)
        .filter((booking) => {
          const key = `${booking.providerId}:${booking.serviceId}`;
          if (seenServices.has(key)) return false;
          seenServices.add(key);
          return true;
        })
        .slice(0, 4)
        .map((booking) => ({
          bookingId: booking.id,
          serviceId: booking.serviceId,
          providerId: booking.providerId,
          serviceName: booking.serviceName || "Previous service",
          providerName: booking.providerName || "Service provider",
          providerSlug: booking.providerSlug,
          providerRating: numericAmount(booking.providerRating),
          providerReviewCount: booking.providerReviewCount,
          lastBookedDate: booking.bookingDate,
          href: customerRebookHref(booking.serviceId, booking.providerSlug, booking.serviceName),
        }));

      return {
        actions: [...quoteActions, ...reviewActions].slice(0, 6),
        upcoming,
        rebook,
      };
    }),
});
