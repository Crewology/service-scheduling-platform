import { trpc } from "@/lib/trpc";

/**
 * Custom hook to fetch all booking-related data in one place
 * Eliminates duplication across ServiceDetail, BookingConfirmation, Messages pages
 */
export function useBookingDetails(bookingId: number | undefined) {
  const { data: booking, isLoading: bookingLoading, error: bookingError } = trpc.booking.getById.useQuery(
    { id: bookingId! },
    { enabled: !!bookingId }
  );

  const { data: service, isLoading: serviceLoading } = trpc.service.getById.useQuery(
    { id: booking?.serviceId || 0 },
    { enabled: !!booking?.serviceId }
  );

  const { data: provider, isLoading: providerLoading } = trpc.provider.getById.useQuery(
    { id: booking?.providerId || 0 },
    { enabled: !!booking?.providerId }
  );

  const { data: customer } = trpc.auth.me.useQuery(undefined, {
    enabled: false, // We already have user from useAuth
  });

  const isLoading = bookingLoading || serviceLoading || providerLoading;

  return {
    booking,
    service,
    provider,
    customer,
    isLoading,
    error: bookingError,
  };
}
