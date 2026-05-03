import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Custom hook for payment processing
 * Standardizes Stripe checkout flow across the platform
 */
export function usePayment() {
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to process payment");
    },
  });

  const initiatePayment = (bookingId: number) => {
    createCheckout.mutate({ bookingId });
  };

  return {
    initiatePayment,
    isProcessing: createCheckout.isPending,
  };
}
