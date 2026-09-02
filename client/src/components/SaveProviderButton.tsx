import { useAuth } from "@/_core/hooks/useAuth";
import UpgradeModal from "@/components/UpgradeModal";
import { trpc } from "@/lib/trpc";
import { isPlanGateError } from "@/lib/upgradeGate";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type SaveProviderButtonProps = {
  providerId: number;
  className?: string;
  iconClassName?: string;
  stopPropagation?: boolean;
};

export function SaveProviderButton({
  providerId,
  className,
  iconClassName,
  stopPropagation = true,
}: SaveProviderButtonProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { data: favorite } = trpc.provider.checkFavorite.useQuery(
    { providerId },
    { enabled: Boolean(user) },
  );
  const { data: subscription } = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const toggle = trpc.provider.toggleFavorite.useMutation({
    onSuccess: (result) => {
      utils.provider.checkFavorite.invalidate({ providerId });
      utils.provider.myFavorites.invalidate();
      utils.customerSubscription.getSubscription.invalidate();
      toast.success(result.favorited ? "Saved to providers" : "Removed from saved providers");
    },
    onError: (error) => {
      if (isPlanGateError(error)) {
        setUpgradeOpen(true);
        return;
      }
      toast.error(error.message || "Could not update saved providers");
    },
  });

  if (!user) return null;
  const isSaved = favorite?.favorited ?? false;

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1.5 transition-colors",
          isSaved ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500",
          className,
        )}
        onClick={(event) => {
          if (stopPropagation) {
            event.preventDefault();
            event.stopPropagation();
          }
          toggle.mutate({ providerId });
        }}
        disabled={toggle.isPending}
        title={isSaved ? "Remove from saved providers" : "Save provider"}
        aria-label={isSaved ? "Remove from saved providers" : "Save provider"}
      >
        <Heart className={cn("h-4 w-4", isSaved && "fill-current", iconClassName)} />
      </button>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={subscription?.currentTier || "free"}
      />
    </>
  );
}
