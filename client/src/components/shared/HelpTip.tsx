import { HelpCircle, Info, Lightbulb } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTipProps {
  /** The help text to display */
  text: string;
  /** Visual variant: "info" (blue circle-i), "help" (gray question mark), "tip" (amber lightbulb) */
  variant?: "info" | "help" | "tip";
  /** Size of the icon */
  size?: "sm" | "md";
  /** Additional className for the wrapper */
  className?: string;
  /** Side of the tooltip */
  side?: "top" | "bottom" | "left" | "right";
}

const iconMap = {
  info: Info,
  help: HelpCircle,
  tip: Lightbulb,
};

const colorMap = {
  info: "text-blue-500 hover:text-blue-600",
  help: "text-muted-foreground hover:text-foreground",
  tip: "text-amber-500 hover:text-amber-600",
};

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

/**
 * HelpTip — A small inline icon that shows a helpful tooltip on hover.
 * Use next to labels, headings, or form fields to explain functionality.
 */
export function HelpTip({
  text,
  variant = "help",
  size = "sm",
  className,
  side = "top",
}: HelpTipProps) {
  const Icon = iconMap[variant];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center cursor-help transition-colors",
            colorMap[variant],
            className
          )}
          tabIndex={0}
          aria-label={text}
        >
          <Icon className={sizeMap[size]} />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[280px] text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * HelpBanner — A subtle inline help banner for section-level guidance.
 * Use at the top of sections/cards to provide context.
 */
interface HelpBannerProps {
  text: string;
  variant?: "info" | "tip";
  className?: string;
  dismissable?: boolean;
}

export function HelpBanner({
  text,
  variant = "tip",
  className,
}: HelpBannerProps) {
  const Icon = variant === "tip" ? Lightbulb : Info;
  const bgColor = variant === "tip" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed",
        bgColor,
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}
