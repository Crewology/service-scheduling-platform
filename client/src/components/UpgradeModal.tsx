import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Heart, Zap, BarChart3, FolderHeart, Headphones, Check } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: string;
  currentCount?: number;
  limit?: number;
}

const tiers = [
  {
    tier: "pro" as const,
    name: "Pro",
    price: "$19",
    yearlyPrice: "$15.20",
    savedLimit: "50",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    features: [
      "Save up to 50 providers",
      "Priority booking requests",
      "Organize providers into folders",
    ],
  },
  {
    tier: "business" as const,
    name: "Business",
    price: "$49",
    yearlyPrice: "$39.20",
    savedLimit: "Unlimited",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    popular: true,
    features: [
      "Unlimited saved providers",
      "Priority booking requests",
      "Organize providers into folders",
      "Bulk quote requests",
      "Booking analytics & reports",
      "Dedicated support",
    ],
  },
];

export default function UpgradeModal({ open, onOpenChange, currentTier = "free", currentCount, limit }: UpgradeModalProps) {
  const [, navigate] = useLocation();
  const createCheckout = trpc.customerSubscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
        onOpenChange(false);
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Heart className="h-5 w-5 text-amber-500" />
              </div>
              <DialogTitle className="text-xl">Save More Providers</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              {currentCount !== undefined && limit !== undefined ? (
                <>You've saved <strong>{currentCount}</strong> of <strong>{limit}</strong> providers on the {currentTier === "free" ? "Free" : currentTier} plan. Upgrade to save more!</>
              ) : (
                <>Upgrade your plan to save more providers and unlock premium features.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {tiers.map((t) => (
              <div
                key={t.tier}
                className={`relative rounded-xl border ${t.borderColor} bg-card p-4 flex flex-col`}
              >
                {t.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white border-0 px-3">
                    Most Popular
                  </Badge>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${t.bgColor}`}>
                    <t.icon className={`h-4 w-4 ${t.color}`} />
                  </div>
                  <h3 className="font-semibold">{t.name}</h3>
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-bold">{t.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                  <div className="text-xs text-muted-foreground">
                    or {t.yearlyPrice}/mo billed yearly
                  </div>
                </div>

                <div className="mb-3 px-3 py-2 rounded-lg bg-muted/50 text-center">
                  <span className="text-sm font-medium">{t.savedLimit} saved providers</span>
                </div>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${t.color}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={t.popular ? "default" : "outline"}
                  onClick={() => createCheckout.mutate({ tier: t.tier, interval: "month" })}
                  disabled={createCheckout.isPending || currentTier === t.tier}
                >
                  {createCheckout.isPending ? "Loading..." : currentTier === t.tier ? "Current Plan" : `Upgrade to ${t.name}`}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => { onOpenChange(false); navigate("/pricing"); }}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Compare all plans in detail
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
