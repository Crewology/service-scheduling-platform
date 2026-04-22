import { UserPlus, TrendingUp, ShieldCheck, Award } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type TrustLevel = "new" | "rising" | "trusted" | "top_pro";

const TRUST_CONFIG: Record<TrustLevel, {
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
  icon: typeof UserPlus;
}> = {
  new: {
    label: "New",
    description: "Recently joined the platform",
    colorClass: "text-slate-500",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    icon: UserPlus,
  },
  rising: {
    label: "Rising",
    description: "Building their reputation",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-50 dark:bg-blue-900/30",
    icon: TrendingUp,
  },
  trusted: {
    label: "Trusted",
    description: "Proven track record with great reviews",
    colorClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-50 dark:bg-green-900/30",
    icon: ShieldCheck,
  },
  top_pro: {
    label: "Top Pro",
    description: "Elite provider with exceptional service",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    icon: Award,
  },
};

interface TrustBadgeProps {
  level: TrustLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Displays a trust level badge with icon and optional label.
 * Shows a tooltip with the trust level description on hover.
 */
export function TrustBadge({ level, size = "md", showLabel = true, showTooltip = true, className }: TrustBadgeProps) {
  const config = TRUST_CONFIG[level];
  if (!config) return null;

  // Don't show badge for "new" level to keep things clean
  if (level === "new") return null;

  const Icon = config.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";
  const padding = size === "sm" ? "px-1.5 py-0.5" : size === "lg" ? "px-3 py-1.5" : "px-2 py-1";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bgClass,
        config.colorClass,
        padding,
        textSize,
        className
      )}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{config.label} Provider</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Trust score progress bar for provider dashboard.
 * Shows current score, level, and progress toward next level.
 */
interface TrustScoreProgressProps {
  score: number;
  level: TrustLevel;
  breakdown?: {
    profileCompleteness: number;
    paymentSetup: number;
    bookingHistory: number;
    customerReviews: number;
    accountAge: number;
  };
  tips?: { category: string; tip: string; points: number }[];
}

export function TrustScoreProgress({ score, level, breakdown, tips }: TrustScoreProgressProps) {
  const config = TRUST_CONFIG[level];
  const Icon = config.icon;

  // Level thresholds
  const thresholds = [
    { level: "new" as TrustLevel, min: 0, label: "New" },
    { level: "rising" as TrustLevel, min: 20, label: "Rising" },
    { level: "trusted" as TrustLevel, min: 50, label: "Trusted" },
    { level: "top_pro" as TrustLevel, min: 80, label: "Top Pro" },
  ];

  const currentIdx = thresholds.findIndex(t => t.level === level);
  const nextThreshold = thresholds[currentIdx + 1];
  const prevThreshold = thresholds[currentIdx];
  const progressInLevel = nextThreshold
    ? ((score - prevThreshold.min) / (nextThreshold.min - prevThreshold.min)) * 100
    : 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("p-2 rounded-full", config.bgClass, config.colorClass)}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">{config.label} Provider</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <span className="text-2xl font-bold">{score}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{prevThreshold.label}</span>
          {nextThreshold && <span>{nextThreshold.label} ({nextThreshold.min} pts)</span>}
          {!nextThreshold && <span>Maximum reached!</span>}
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", {
              "bg-slate-400": level === "new",
              "bg-blue-500": level === "rising",
              "bg-green-500": level === "trusted",
              "bg-amber-500": level === "top_pro",
            })}
            style={{ width: `${Math.min(100, progressInLevel)}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: "Profile", value: breakdown.profileCompleteness, max: 25 },
            { label: "Payments", value: breakdown.paymentSetup, max: 20 },
            { label: "Bookings", value: breakdown.bookingHistory, max: 25 },
            { label: "Reviews", value: breakdown.customerReviews, max: 20 },
            { label: "Activity", value: breakdown.accountAge, max: 10 },
          ].map(item => (
            <div key={item.label} className="space-y-1">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-sm font-medium">{item.value}/{item.max}</div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(item.value / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Improvement tips */}
      {tips && tips.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">How to improve your score:</p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  +{tip.points}
                </span>
                {tip.tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
