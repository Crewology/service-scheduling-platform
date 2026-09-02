import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getCustomerRetention } from "./db/analytics";
import { getProviderBookings } from "./db/bookings";
import { getInvoicesByProvider } from "./db/invoices";
import { getProviderSubscription } from "./db/payments";
import { getProviderByUserId, getProviderEarnings } from "./db/providers";
import { getQuotesByProvider } from "./db/quotes";
import { getServicesByProviderId } from "./db/services";
import { getUserById } from "./db/users";
import {
  ACTIVE_PROVIDER_BOOKING_STATUSES,
  hasProviderScheduleConflict,
  providerDateKey,
} from "./providerOverviewLogic";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function amountNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const providerOverviewRouter = router({
  get: protectedProcedure
    .input(z.object({ localDate: localDateSchema }))
    .query(async ({ ctx, input }) => {
      const provider = await getProviderByUserId(ctx.user.id);
      if (!provider) return null;

      const [bookings, services, quotes, subscription, earnings, retention] = await Promise.all([
        getProviderBookings(provider.id),
        getServicesByProviderId(provider.id),
        getQuotesByProvider(provider.id),
        getProviderSubscription(provider.id),
        getProviderEarnings(provider.id),
        getCustomerRetention(provider.id),
      ]);

      const tier = subscription?.tier || "free";
      const canUseInvoices = tier !== "free";
      const invoices = canUseInvoices ? await getInvoicesByProvider(provider.id) : [];
      const serviceNames = new Map(services.map((service) => [service.id, service.name]));
      const activeStatuses = ACTIVE_PROVIDER_BOOKING_STATUSES;

      const today = bookings
        .filter((booking) => providerDateKey(booking.bookingDate) === input.localDate && activeStatuses.has(booking.status))
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
        .map((booking) => ({
          id: booking.id,
          time: booking.startTime,
          endTime: booking.endTime,
          title: serviceNames.get(booking.serviceId) || `Booking ${booking.bookingNumber}`,
          customerName: booking.customerName || "Customer",
          locationType: booking.locationType,
          venueName: booking.venueName,
          city: booking.serviceCity,
          state: booking.serviceState,
          status: booking.status,
          href: "/provider/dashboard?tab=bookings",
        }));

      const pendingBookings = bookings
        .filter((booking) => booking.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4)
        .map((booking) => ({
          id: `booking-${booking.id}`,
          kind: "booking" as const,
          tone: "time" as const,
          title: `Confirm ${serviceNames.get(booking.serviceId) || "booking"}`,
          detail: `${booking.customerName || "A customer"} requested ${providerDateKey(booking.bookingDate)} at ${booking.startTime}.`,
          timestamp: booking.createdAt,
          actionLabel: "Review request",
          href: "/provider/dashboard?tab=bookings",
        }));

      const pendingQuoteRows = quotes
        .filter((quote) => quote.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);
      const pendingQuotes = await Promise.all(pendingQuoteRows.map(async (quote) => {
        const customer = await getUserById(quote.customerId);
        const customerName = customer?.name || [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "a customer";
        return {
          id: `quote-${quote.id}`,
          kind: "quote" as const,
          tone: "time" as const,
          title: `Quote request from ${customerName}`,
          detail: quote.title,
          timestamp: quote.createdAt,
          actionLabel: "Prepare quote",
          href: "/provider/dashboard?tab=bookings",
        };
      }));

      const now = Date.now();
      const overdueInvoices = invoices
        .filter((invoice) => {
          const pastDue = invoice.dueDate ? new Date(invoice.dueDate).getTime() < now : false;
          return invoice.status === "overdue" || (pastDue && ["sent", "viewed"].includes(invoice.status));
        })
        .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
        .slice(0, 3)
        .map((invoice) => ({
          id: `invoice-${invoice.id}`,
          kind: "invoice" as const,
          tone: "operational" as const,
          title: `${invoice.invoiceNumber} is overdue`,
          detail: `${invoice.customerName || "Customer"} · $${(invoice.total / 100).toFixed(2)} was due ${providerDateKey(invoice.dueDate)}.`,
          timestamp: invoice.dueDate || invoice.createdAt,
          actionLabel: "View invoice",
          href: "/provider/invoices",
        }));

      const setupItems = [];
      if (!provider.payoutEnabled) {
        setupItems.push({
          id: "setup-payments",
          kind: "setup" as const,
          tone: "critical" as const,
          title: canUseInvoices ? "Finish payment setup" : "Payment collection is paused on Starter",
          detail: canUseInvoices
            ? "Complete Stripe setup before customers can pay through OlogyCrew."
            : "Upgrade to Pro or Business to connect Stripe and collect payments.",
          timestamp: provider.updatedAt,
          actionLabel: canUseInvoices ? "Finish setup" : "View plans",
          href: canUseInvoices ? "/provider/onboarding?step=5" : "/provider/subscription",
        });
      }
      if (!provider.profileSlug) {
        setupItems.push({
          id: "setup-page",
          kind: "setup" as const,
          tone: "operational" as const,
          title: "Create your public page link",
          detail: "Add a shareable OlogyCrew URL so customers can return to your business.",
          timestamp: provider.updatedAt,
          actionLabel: "Set up link",
          href: "/provider/my-page",
        });
      }

      const attention = [...setupItems, ...pendingBookings, ...pendingQuotes, ...overdueInvoices]
        .slice(0, 8);

      const monthPrefix = input.localDate.slice(0, 7);
      const completedThisMonth = bookings.filter(
        (booking) => booking.status === "completed" && providerDateKey(booking.bookingDate).startsWith(monthPrefix),
      ).length;
      const upcomingCount = bookings.filter(
        (booking) => activeStatuses.has(booking.status) && providerDateKey(booking.bookingDate) >= input.localDate,
      ).length;

      const isPageLive = Boolean(provider.isActive && provider.profileSlug && services.length > 0);
      const todayHasConflict = hasProviderScheduleConflict(today);

      return {
        provider: {
          id: provider.id,
          businessName: provider.businessName,
          profileSlug: provider.profileSlug,
          isPageLive,
          averageRating: amountNumber(provider.averageRating),
          totalReviews: provider.totalReviews,
        },
        tier,
        canUseInvoices,
        attention,
        today,
        todayHasConflict,
        pulse: {
          collectedThisMonth: amountNumber(earnings.thisMonthEarnings),
          completedThisMonth,
          upcomingCount,
          totalCustomers: Number(retention.totalCustomers || 0),
          returningCustomers: Number(retention.returningCustomers || 0),
          averageRating: amountNumber(provider.averageRating),
          totalReviews: provider.totalReviews,
        },
      };
    }),
});
