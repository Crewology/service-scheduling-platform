import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OfficialBadgeProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function OfficialBadge({ size = "md", showLabel = true, className = "" }: OfficialBadgeProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-500/20 gap-1 ${textSize} ${className}`}
          >
            <Shield className={`${iconSize} fill-blue-500/20`} />
            {showLabel && "Official"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">OlogyCrew Official — Platform demo account</p>
          <p className="text-xs text-muted-foreground">Browse sample services and practice booking</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
