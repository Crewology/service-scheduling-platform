import {
  projectCrmBookingById,
  projectCrmConversation,
  projectCrmInvoiceById,
  projectCrmMessageById,
  projectCrmQuoteById,
  projectCrmReviewById,
} from "./projection";

type ProjectionSource = "booking" | "invoice" | "message" | "quote" | "review";

function queueProjection(source: ProjectionSource, entityId: number, run: () => Promise<unknown>): void {
  void Promise.resolve()
    .then(run)
    .catch((error) => {
      console.error("[CustomersProjection] Source hook failed", {
        source,
        entityId,
        errorCode: error instanceof Error ? error.name : "projection_hook_failed",
      });
    });
}

export function queueCrmBookingProjection(bookingId: number): void {
  queueProjection("booking", bookingId, () => projectCrmBookingById(bookingId));
}

export function queueCrmQuoteProjection(quoteId: number): void {
  queueProjection("quote", quoteId, () => projectCrmQuoteById(quoteId));
}

export function queueCrmInvoiceProjection(invoiceId: number): void {
  queueProjection("invoice", invoiceId, () => projectCrmInvoiceById(invoiceId));
}

export function queueCrmMessageProjection(messageId: number): void {
  queueProjection("message", messageId, () => projectCrmMessageById(messageId));
}

export function queueCrmConversationProjection(conversationId: string): void {
  void Promise.resolve()
    .then(() => projectCrmConversation(conversationId))
    .catch((error) => {
      console.error("[CustomersProjection] Conversation hook failed", {
        source: "message",
        errorCode: error instanceof Error ? error.name : "projection_hook_failed",
      });
    });
}

export function queueCrmReviewProjection(reviewId: number): void {
  queueProjection("review", reviewId, () => projectCrmReviewById(reviewId));
}
