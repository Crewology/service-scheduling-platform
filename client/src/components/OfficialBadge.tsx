import { TestTube } from "lucide-react";
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
            className={`bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-500/20 gap-1 ${textSize} ${className}`}
          >
            <TestTube className={`${iconSize}`} />
            {showLabel && "DEMO"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">Demo Provider — Free to Book</p>
          <p className="text-xs text-muted-foreground">Practice the booking flow at no charge. This is not a real provider.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
