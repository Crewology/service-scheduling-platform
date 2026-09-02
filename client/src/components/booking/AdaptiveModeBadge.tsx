import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import React from "react";
import type { AdaptiveBookingDecision } from "../../../../shared/adaptiveBooking";

type AdaptiveModeBadgeProps = {
  decision: AdaptiveBookingDecision;
  copy?: "label" | "action";
  className?: string;
};

export function AdaptiveModeBadge({
  decision,
  copy = "label",
  className,
}: AdaptiveModeBadgeProps) {
  const text = copy === "action"
    ? decision.mode === "direct" ? "Check availability" : "Request quote"
    : decision.label;

  return (
    <Badge
      data-testid="adaptive-mode-badge"
      data-mode={decision.mode}
      className={cn(
        decision.mode === "direct"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
          : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50",
        className,
      )}
    >
      {text}
    </Badge>
  );
}
