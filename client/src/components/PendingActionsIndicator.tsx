import { useOfflineActions } from "@/hooks/useOfflineActions";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small indicator that shows when there are pending offline actions.
 * Displays a cloud icon with count badge.
 */
export function PendingActionsIndicator() {
  const { pendingCount, isSyncing } = useOfflineActions();

  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CloudOff className="h-4 w-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isSyncing
          ? "Syncing queued actions..."
          : `${pendingCount} action${pendingCount > 1 ? "s" : ""} pending sync`}
      </TooltipContent>
    </Tooltip>
  );
}
