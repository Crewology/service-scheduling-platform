export const ACTIVE_PROVIDER_BOOKING_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

export type ProviderSetupStepId =
  | "photo"
  | "bio"
  | "categories"
  | "services"
  | "availability"
  | "portfolio"
  | "stripe";

export type ProviderSetupStep = {
  id: ProviderSetupStepId;
  label: string;
  description: string;
  done: boolean;
  actionLabel: string;
  href: string;
};

export function buildProviderSetupProgress(status: {
  hasPhoto: boolean;
  hasBio: boolean;
  hasCategories: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  hasPortfolio: boolean;
  hasStripe: boolean;
}) {
  const steps: ProviderSetupStep[] = [
    {
      id: "photo",
      label: "Add a profile photo",
      description: "Help customers recognize you",
      done: status.hasPhoto,
      actionLabel: "Add photo",
      href: "profile",
    },
    {
      id: "bio",
      label: "Write your bio / description",
      description: "Tell customers about your experience",
      done: status.hasBio,
      actionLabel: "Write bio",
      href: "profile",
    },
    {
      id: "categories",
      label: "Select service categories",
      description: "Choose the types of services you offer",
      done: status.hasCategories,
      actionLabel: "Select categories",
      href: "/provider/onboarding",
    },
    {
      id: "services",
      label: "Add at least one service",
      description: "Create a service with pricing so customers can book",
      done: status.hasServices,
      actionLabel: "Add service",
      href: "/provider/services/new",
    },
    {
      id: "availability",
      label: "Set your availability",
      description: "Let customers know when you're available",
      done: status.hasAvailability,
      actionLabel: "Set schedule",
      href: "/provider/availability",
    },
    {
      id: "portfolio",
      label: "Upload work samples",
      description: "Showcase your best work to attract customers",
      done: status.hasPortfolio,
      actionLabel: "Upload",
      href: "/provider/services?portfolio=upload#portfolio-work-samples",
    },
    {
      id: "stripe",
      label: "Connect payment account",
      description: "Set up Stripe to receive payments",
      done: status.hasStripe,
      actionLabel: "Connect Stripe",
      href: "/provider/onboarding?step=4",
    },
  ];
  const completedCount = steps.filter((step) => step.done).length;

  return {
    steps,
    completedCount,
    totalSteps: steps.length,
    progress: Math.round((completedCount / steps.length) * 100),
    nextStep: steps.find((step) => !step.done) ?? null,
  };
}

export function providerDateKey(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export function providerTimeMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export function formatProviderDate(value: string | Date | null | undefined): string {
  const key = providerDateKey(value);
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return "the requested date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatProviderTime(value: string | null | undefined): string {
  if (!value) return "the requested time";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function hasProviderScheduleConflict(
  bookings: Array<{ time: string; endTime: string | null }>,
): boolean {
  return bookings.some((booking, index) => {
    const next = bookings[index + 1];
    return next ? providerTimeMinutes(booking.endTime) > providerTimeMinutes(next.time) : false;
  });
}
