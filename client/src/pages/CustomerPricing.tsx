import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Heart, Crown, Zap, Check, X, ArrowLeft,
  FolderHeart, BarChart3, Headphones, Send,
  Star, Shield, Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const plans = [
  {
    tier: "free" as const,
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Heart,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
    description: "Perfect for casual users who book occasionally",
    features: {
      savedProviders: "5",
      priorityBooking: false,
      providerFolders: false,
      bulkQuotes: false,
      bookingAnalytics: false,
      dedicatedSupport: false,
    },
  },
  {
    tier: "pro" as const,
    name: "Pro",
    monthlyPrice: 19,
    yearlyPrice: 15.20,
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    description: "For frequent bookers and small event planners",
    features: {
      savedProviders: "50",
      priorityBooking: true,
      providerFolders: true,
      bulkQuotes: false,
      bookingAnalytics: false,
      dedicatedSupport: false,
    },
  },
  {
    tier: "business" as const,
    name: "Business",
    monthlyPrice: 49,
    yearlyPrice: 39.20,
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    popular: true,
    description: "For logistics managers, agencies, and production companies",
    features: {
      savedProviders: "Unlimited",
      priorityBooking: true,
      providerFolders: true,
      bulkQuotes: true,
      bookingAnalytics: true,
      dedicatedSupport: true,
    },
  },
];

const featureRows = [
  { key: "savedProviders", label: "Saved Providers", icon: Heart, isText: true },
  { key: "priorityBooking", label: "Priority Booking Requests", icon: Star },
  { key: "providerFolders", label: "Organize Providers into Folders", icon: FolderHeart },
  { key: "bulkQuotes", label: "Bulk Quote Requests", icon: Send },
  { key: "bookingAnalytics", label: "Booking Analytics & Reports", icon: BarChart3 },
  { key: "dedicatedSupport", label: "Dedicated Support", icon: Headphones },
];

export default function CustomerPricing() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [yearly, setYearly] = useState(false);

  const { data: subInfo } = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });

  const createCheckout = trpc.customerSubscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Redirecting to checkout — complete your subscription in the new tab.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const createPortal = trpc.customerSubscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("Opening subscription management portal.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const currentTier = subInfo?.currentTier || "free";

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-12 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2.5 rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Save more providers, get priority bookings, and unlock powerful tools to manage your service needs.
          </p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} />
            <span className={`text-sm font-medium ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {yearly && (
              <Badge variant="secondary" className="text-green-600 bg-green-500/10 border-green-500/20">
                Save up to 20%
              </Badge>
            )}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-16 pt-4">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isDowngrade = (currentTier === "business" && plan.tier !== "business") ||
              (currentTier === "pro" && plan.tier === "free");
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col overflow-visible ${plan.popular ? `${plan.borderColor} border-2 shadow-lg` : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-amber-500 text-white border-0 px-4 py-1 shadow-sm">
                    Most Popular
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-3 right-4 z-10 bg-primary text-primary-foreground border-0 px-3 py-1 shadow-sm">
                    Current Plan
                  </Badge>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                      <plan.icon className={`h-5 w-5 ${plan.color}`} />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  {/* Price */}
                  <div className="mb-6">
                    {price === 0 ? (
                      <div className="text-3xl font-bold">Free</div>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                        <span className="text-muted-foreground">/{yearly ? "mo" : "mo"}</span>
                        {yearly && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Billed ${(price * 12).toFixed(2)}/year
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Saved providers highlight */}
                  <div className={`rounded-lg p-3 mb-4 text-center ${plan.bgColor}`}>
                    <Heart className={`h-5 w-5 mx-auto mb-1 ${plan.color}`} />
                    <div className="font-semibold">{plan.features.savedProviders}</div>
                    <div className="text-xs text-muted-foreground">saved providers</div>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {featureRows.slice(1).map((row) => {
                      const val = plan.features[row.key as keyof typeof plan.features];
                      const enabled = val === true;
                      return (
                        <li key={row.key} className="flex items-center gap-2.5 text-sm">
                          {enabled ? (
                            <Check className={`h-4 w-4 shrink-0 ${plan.color}`} />
                          ) : (
                            <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                          )}
                          <span className={enabled ? "" : "text-muted-foreground/60"}>
                            {row.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* CTA */}
                  {plan.tier === "free" ? (
                    isCurrent ? (
                      <Button variant="outline" disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => createPortal.mutate()}
                        disabled={createPortal.isPending}
                      >
                        {createPortal.isPending ? "Loading..." : "Manage Subscription"}
                      </Button>
                    )
                  ) : isCurrent ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => createPortal.mutate()}
                      disabled={createPortal.isPending}
                    >
                      {createPortal.isPending ? "Loading..." : "Manage Subscription"}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => createPortal.mutate()}
                      disabled={createPortal.isPending}
                    >
                      {createPortal.isPending ? "Loading..." : "Downgrade"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => {
                        if (!user) {
                          toast.info("Please sign in first to subscribe.");
                          return;
                        }
                        createCheckout.mutate({
                          tier: plan.tier as "pro" | "business",
                          interval: yearly ? "year" : "month",
                        });
                      }}
                      disabled={createCheckout.isPending}
                    >
                      {createCheckout.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {createCheckout.isPending ? "Loading..." : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
                    {plans.map((p) => (
                      <th key={p.tier} className="text-center p-4 font-semibold">
                        <div className="flex items-center justify-center gap-1.5">
                          <p.icon className={`h-4 w-4 ${p.color}`} />
                          {p.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureRows.map((row, i) => (
                    <tr key={row.key} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                      <td className="p-4 flex items-center gap-2">
                        <row.icon className="h-4 w-4 text-muted-foreground" />
                        {row.label}
                      </td>
                      {plans.map((p) => {
                        const val = p.features[row.key as keyof typeof p.features];
                        return (
                          <td key={p.tier} className="text-center p-4">
                            {row.isText ? (
                              <span className="font-medium">{val as string}</span>
                            ) : val ? (
                              <Check className={`h-5 w-5 mx-auto ${p.color}`} />
                            ) : (
                              <X className="h-5 w-5 mx-auto text-muted-foreground/30" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes! You can cancel your subscription at any time. Your plan will remain active until the end of your current billing period.",
              },
              {
                q: "What happens to my saved providers if I downgrade?",
                a: "Your saved providers list is preserved, but you won't be able to add new ones until you're under the limit for your new plan.",
              },
              {
                q: "Can I switch between monthly and yearly billing?",
                a: "Yes, you can switch billing intervals through the subscription management portal.",
              },
              {
                q: "Is there a free trial for Pro or Business?",
                a: "We occasionally offer trial periods. Check back or contact support for current promotions.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit and debit cards through Stripe's secure payment processing.",
              },
            ].map((faq, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-10">
          <Button variant="ghost" onClick={() => navigate(-1 as any)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
