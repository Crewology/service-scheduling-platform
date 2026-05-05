import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard,
  Crown,
  Star,
  Zap,
  Check,
  ArrowLeft,
  ExternalLink,
  Heart,
  BarChart3,
  Download,
  Shield,
  Sparkles,
} from "lucide-react";

const tierConfig = {
  free: {
    name: "Free",
    icon: Heart,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-200",
    description: "Basic access to browse and book services",
    price: "$0",
    features: [
      "Browse all providers",
      "Book services",
      "Save up to 5 providers",
      "Basic messaging",
    ],
  },
  pro: {
    name: "Pro",
    icon: Star,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    description: "Enhanced features for frequent users",
    price: "$12/mo",
    yearlyPrice: "$10.08/mo",
    features: [
      "Everything in Free",
      "Save up to 25 providers",
      "Priority booking",
      "Advanced search filters",
      "Booking reminders",
    ],
  },
  business: {
    name: "Business",
    icon: Crown,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    description: "Full access with analytics and exports",
    price: "$20/mo",
    yearlyPrice: "$16.00/mo",
    features: [
      "Everything in Pro",
      "Unlimited saved providers",
      "Booking analytics dashboard",
      "Export booking history",
      "Priority support",
      "SMS notifications",
    ],
  },
};

export default function AccountSubscription() {
  const { user } = useAuth();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const { data: subData, isLoading } = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });

  const createCheckout = trpc.customerSubscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
    onSettled: () => {
      setUpgradeLoading(null);
    },
  });

  const createPortal = trpc.customerSubscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const currentTier = subData?.currentTier || "free";
  const currentConfig = tierConfig[currentTier as keyof typeof tierConfig] || tierConfig.free;
  const TierIcon = currentConfig.icon;

  const handleUpgrade = (tier: "pro" | "business") => {
    setUpgradeLoading(tier);
    createCheckout.mutate({ tier, interval: "month" });
  };

  const handleManageBilling = () => {
    createPortal.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/profile" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-1">My Subscription</h1>
        <p className="text-muted-foreground mb-6">Manage your plan and billing</p>

        {/* Current Plan Card */}
        <Card className={`${currentConfig.borderColor} border-2 mb-8`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${currentConfig.bgColor}`}>
                  <TierIcon className={`h-6 w-6 ${currentConfig.color}`} />
                </div>
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {currentConfig.name} Plan
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  </CardTitle>
                  <CardDescription>{currentConfig.description}</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{currentConfig.price}</p>

              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Usage Stats */}
            {subData?.usage && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Saved Providers</span>
                  <span className="font-medium">
                    {subData.usage.savedProviders} / {subData.usage.savedProviderLimit === -1 ? "Unlimited" : subData.usage.savedProviderLimit}
                  </span>
                </div>
                {subData.usage.savedProviderLimit !== -1 && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        subData.usage.isAtLimit ? "bg-red-500" : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(100, (subData.usage.savedProviders / subData.usage.savedProviderLimit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <Separator className="my-4" />

            {/* Current Plan Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentConfig.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {/* Manage Billing Button (for paid plans) */}
            {currentTier !== "free" && (
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={createPortal.isPending}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {createPortal.isPending ? "Opening..." : "Manage Billing"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Options */}
        {currentTier !== "business" && (
          <>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Upgrade Your Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {(["pro", "business"] as const)
                .filter((tier) => tier !== currentTier)
                .map((tier) => {
                  const config = tierConfig[tier];
                  const Icon = config.icon;
                  return (
                    <Card key={tier} className="hover:shadow-md transition-all">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{config.name}</CardTitle>
                            <CardDescription>{config.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4">
                          <span className="text-2xl font-bold">{config.price}</span>
                          {config.yearlyPrice && (
                            <span className="text-sm text-muted-foreground ml-2">
                              or {config.yearlyPrice} (annual)
                            </span>
                          )}
                        </div>
                        <ul className="space-y-2 mb-6">
                          {config.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500 shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full gap-2"
                          onClick={() => handleUpgrade(tier)}
                          disabled={upgradeLoading === tier}
                        >
                          <Zap className="h-4 w-4" />
                          {upgradeLoading === tier ? "Processing..." : `Upgrade to ${config.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </>
        )}

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/saved-providers">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Heart className="h-4 w-4" />
                  Saved Providers
                </Button>
              </Link>
              <Link href="/my-bookings">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BarChart3 className="h-4 w-4" />
                  My Bookings
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CreditCard className="h-4 w-4" />
                  Compare Plans
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
