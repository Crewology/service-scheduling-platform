import { z } from "zod";

export const CRM_CONTACT_STAGES = [
  "lead",
  "quoted",
  "booked",
  "customer",
  "repeat_customer",
  "dormant",
  "archived",
] as const;
export type CrmContactStage = (typeof CRM_CONTACT_STAGES)[number];

export const CRM_TASK_STATES = ["open", "snoozed", "completed", "dismissed"] as const;
export type CrmTaskState = (typeof CRM_TASK_STATES)[number];

export const CRM_TASK_TYPES = [
  "respond_to_quote",
  "quote_expiring",
  "confirm_booking",
  "overdue_invoice",
  "rebooking_opportunity",
  "relationship_review",
  "manual_follow_up",
] as const;
export type CrmTaskType = (typeof CRM_TASK_TYPES)[number];

export const CRM_DRAFT_STATES = ["draft", "sent", "discarded"] as const;
export type CrmDraftState = (typeof CRM_DRAFT_STATES)[number];

export const CRM_RULE_KEYS = [
  "quote_follow_up",
  "quote_expiring",
  "booking_confirmation",
  "overdue_invoice",
  "rebooking_opportunity",
  "archived_relationship_review",
] as const;
export type CrmRuleKey = (typeof CRM_RULE_KEYS)[number];

export const CRM_RULE_ACTIONS = ["create_task", "create_draft"] as const;
export type CrmRuleAction = (typeof CRM_RULE_ACTIONS)[number];

export const CRM_ENTITY_TYPES = [
  "quote",
  "booking",
  "payment",
  "invoice",
  "message",
  "review",
  "contact",
  "task",
  "draft",
] as const;
export type CrmEntityType = (typeof CRM_ENTITY_TYPES)[number];

export const CRM_EVENT_TYPES = [
  "quote.requested",
  "quote.sent",
  "quote.accepted",
  "quote.declined",
  "quote.expired",
  "quote.booked",
  "booking.created",
  "booking.confirmed",
  "booking.started",
  "booking.completed",
  "booking.cancelled",
  "booking.no_show",
  "booking.refunded",
  "payment.captured",
  "payment.failed",
  "refund.confirmed",
  "invoice.created",
  "invoice.sent",
  "invoice.viewed",
  "invoice.paid",
  "invoice.overdue",
  "invoice.cancelled",
  "message.sent",
  "message.read",
  "review.received",
  "review.response_added",
  "contact.stage_changed",
  "task.created",
  "task.completed",
  "task.dismissed",
  "draft.created",
  "draft.sent",
] as const;
export type CrmEventType = (typeof CRM_EVENT_TYPES)[number];

export const CRM_EVENT_ENTITY_TYPES: Readonly<Record<CrmEventType, CrmEntityType>> = {
  "quote.requested": "quote",
  "quote.sent": "quote",
  "quote.accepted": "quote",
  "quote.declined": "quote",
  "quote.expired": "quote",
  "quote.booked": "quote",
  "booking.created": "booking",
  "booking.confirmed": "booking",
  "booking.started": "booking",
  "booking.completed": "booking",
  "booking.cancelled": "booking",
  "booking.no_show": "booking",
  "booking.refunded": "booking",
  "payment.captured": "payment",
  "payment.failed": "payment",
  "refund.confirmed": "payment",
  "invoice.created": "invoice",
  "invoice.sent": "invoice",
  "invoice.viewed": "invoice",
  "invoice.paid": "invoice",
  "invoice.overdue": "invoice",
  "invoice.cancelled": "invoice",
  "message.sent": "message",
  "message.read": "message",
  "review.received": "review",
  "review.response_added": "review",
  "contact.stage_changed": "contact",
  "task.created": "task",
  "task.completed": "task",
  "task.dismissed": "task",
  "draft.created": "draft",
  "draft.sent": "draft",
};

export const CRM_PROVIDER_FEATURES = [
  "customerHistory",
  "crmNotes",
  "crmFollowUps",
  "crmDrafts",
  "crmStageOverrides",
  "crmSegments",
  "crmRetentionAnalytics",
  "crmAdvancedAnalytics",
  "crmAutomationControls",
] as const;
export type CrmProviderFeature = (typeof CRM_PROVIDER_FEATURES)[number];

export const CRM_ROLLOUT_FLAGS = {
  projectionWrites: "customersProjectionWrites",
  repairJobs: "customersRepairJobs",
  readUi: "customersReadUi",
  providerWrites: "customersProviderWrites",
  recommendations: "customersRecommendations",
  draftSending: "customersDraftSending",
} as const;
export type CrmRolloutFlag = (typeof CRM_ROLLOUT_FLAGS)[keyof typeof CRM_ROLLOUT_FLAGS];

export const CRM_PRIVATE_SETTING_KEYS = [
  ...Object.values(CRM_ROLLOUT_FLAGS),
  "customersPilotProviderIds",
  "customersProjectionRepairTaskUid",
  "customersTimeRulesTaskUid",
  "customersProjectionCursor",
  "customersProjectionMetrics",
  "customersProjectionLastSuccessAt",
  "customersProjectionLastError",
  "customersBackfillCursor",
  "customersBackfillLastRunId",
] as const;
export type CrmPrivateSettingKey = (typeof CRM_PRIVATE_SETTING_KEYS)[number];

export const CRM_DEFAULT_ROLLOUT_FLAGS: Readonly<Record<CrmRolloutFlag, false>> = {
  customersProjectionWrites: false,
  customersRepairJobs: false,
  customersReadUi: false,
  customersProviderWrites: false,
  customersRecommendations: false,
  customersDraftSending: false,
};

const idSchema = z.number().int().positive();
const centsSchema = z.number().int().nonnegative();
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const quoteMetadataSchema = z.object({
  quoteId: idSchema,
  status: z.enum(["pending", "quoted", "accepted", "declined", "expired", "booked"]),
  quotedAmountCents: centsSchema.optional(),
  bookingId: idSchema.optional(),
}).strict();

const bookingMetadataSchema = z.object({
  bookingId: idSchema,
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded"]),
  bookingDate: dateOnlySchema.optional(),
  serviceId: idSchema.optional(),
}).strict();

const paymentMetadataSchema = z.object({
  paymentId: idSchema,
  status: z.enum(["pending", "processing", "captured", "failed", "refunded", "partially_refunded"]),
  amountCents: centsSchema,
  refundAmountCents: centsSchema.optional(),
}).strict();

const invoiceMetadataSchema = z.object({
  invoiceId: idSchema,
  status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "cancelled"]),
  totalCents: centsSchema,
  dueAt: z.string().datetime().optional(),
}).strict();

const messageMetadataSchema = z.object({
  messageId: idSchema,
  conversationId: z.string().min(1).max(255),
  bookingId: idSchema.optional(),
  direction: z.enum(["provider_to_customer", "customer_to_provider"]),
}).strict();

const reviewMetadataSchema = z.object({
  reviewId: idSchema,
  bookingId: idSchema,
  rating: z.number().int().min(1).max(5).optional(),
}).strict();

const contactMetadataSchema = z.object({
  previousStage: z.enum(CRM_CONTACT_STAGES).optional(),
  nextStage: z.enum(CRM_CONTACT_STAGES),
  reason: z.string().min(1).max(255),
}).strict();

const taskMetadataSchema = z.object({
  taskId: idSchema,
  taskType: z.enum(CRM_TASK_TYPES),
}).strict();

const draftMetadataSchema = z.object({
  draftId: idSchema,
  state: z.enum(CRM_DRAFT_STATES),
  sentMessageId: idSchema.optional(),
}).strict();

const eventMetadataSchemas: Record<CrmEntityType, z.ZodType<Record<string, unknown>>> = {
  quote: quoteMetadataSchema,
  booking: bookingMetadataSchema,
  payment: paymentMetadataSchema,
  invoice: invoiceMetadataSchema,
  message: messageMetadataSchema,
  review: reviewMetadataSchema,
  contact: contactMetadataSchema,
  task: taskMetadataSchema,
  draft: draftMetadataSchema,
};

export function parseCrmEventMetadata(
  eventType: CrmEventType,
  entityType: CrmEntityType,
  metadata: unknown,
): Record<string, unknown> {
  if (CRM_EVENT_ENTITY_TYPES[eventType] !== entityType) {
    throw new Error(`Customers event ${eventType} cannot use entity type ${entityType}`);
  }
  return eventMetadataSchemas[entityType].parse(metadata);
}

export function isCrmEventType(value: string): value is CrmEventType {
  return (CRM_EVENT_TYPES as readonly string[]).includes(value);
}

export const CRM_DEFAULT_INACTIVITY_DAYS = 90;
export const CRM_MAX_NOTE_LENGTH = 5_000;
export const CRM_MAX_DRAFT_LENGTH = 2_000;
export const CRM_MAX_SEGMENT_NAME_LENGTH = 100;

export const crmSegmentFiltersSchema = z.object({
  stages: z.array(z.enum(CRM_CONTACT_STAGES)).max(CRM_CONTACT_STAGES.length).optional(),
  hasOpenTasks: z.boolean().optional(),
  minCapturedValueCents: centsSchema.optional(),
  maxCapturedValueCents: centsSchema.optional(),
  inactiveDaysAtLeast: z.number().int().min(1).max(3_650).optional(),
}).strict().refine(
  (filters) => filters.minCapturedValueCents === undefined
    || filters.maxCapturedValueCents === undefined
    || filters.minCapturedValueCents <= filters.maxCapturedValueCents,
  "Minimum captured value cannot exceed maximum captured value",
);
export type CrmSegmentFilters = z.infer<typeof crmSegmentFiltersSchema>;

export const crmRuleConfigurationSchema = z.object({
  delayHours: z.number().int().min(0).max(24 * 365).optional(),
  inactivityDays: z.number().int().min(1).max(3_650).optional(),
  createDraft: z.boolean().optional(),
}).strict();
export type CrmRuleConfiguration = z.infer<typeof crmRuleConfigurationSchema>;
