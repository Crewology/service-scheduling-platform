import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Rocket, Star, Crown, Zap, Eye, MousePointerClick, Clock, CheckCircle2, Loader2, ArrowRight, RefreshCw, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const TIER_ICONS: Record<string, React.ReactNode> = {
  quick_boost: <Zap className="h-6 w-6" />,
  category_spotlight: <Star className="h-6 w-6" />,
  homepage_feature: <Crown className="h-6 w-6" />,
  smart_bundle: <Rocket className="h-6 w-6" />,
};

const TIER_COLORS: Record<string, string> = {
  quick_boost: "from-blue-500 to-cyan-500",
  category_spotlight: "from-purple-500 to-pink-500",
  homepage_feature: "from-amber-500 to-orange-500",
  smart_bundle: "from-emerald-500 to-teal-500",
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  quick_boost: "Get priority placement in search results with a \"Promoted\" badge for 24 hours.",
  category_spotlight: "Featured at the top of your category page for 7 days with enhanced visibility.",
  homepage_feature: "Premium placement in the \"Featured Providers\" section on the homepage for 7 days.",
  smart_bundle: "All three promotions combined! Search priority + category spotlight + homepage feature for 7 days.",
};

export default function Promotions() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [step, setStep] = useState<"select" | "customize" | "preview">("select");

  const { data: tiers } = trpc.promotion.getTiers.useQuery();
  const { data: myPromotions } = trpc.promotion.getMyPromotions.useQuery();
  const { data: myProfile } = trpc.provider.getMyProfile.useQuery();
  const { data: myServices } = trpc.service.listByProvider.useQuery(
    { providerId: myProfile?.id ?? 0 },
    { enabled: !!myProfile?.id }
  );
  const [selectedServiceId, setSelectedServiceId] = useState<number | undefined>();

  const generateCopy = trpc.promotion.generateAdCopy.useMutation({
    onSuccess: (data) => {
      setHeadline(data.headline);
      setDescription(data.description);
      setAiGenerated(true);
    },
  });

  const createCheckout = trpc.promotion.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const handleGenerateAI = () => {
    generateCopy.mutate({ serviceId: selectedServiceId });
  };

  const handleCheckout = () => {
    if (!selectedTier || !headline || !description) return;
    createCheckout.mutate({
      tier: selectedTier as any,
      serviceId: selectedServiceId,
      headline,
      description,
      aiGenerated,
      origin: window.location.origin,
    });
  };

  const activePromotions = myPromotions?.filter((p) => p.status === "active") || [];
  const pastPromotions = myPromotions?.filter((p) => p.status !== "active") || [];

  if (!user) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Boost Your Business</h1>
        <p className="text-muted-foreground mb-6">Sign in to promote your services and reach more customers.</p>
        <Button onClick={() => navigate("/login")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="container py-6 sm:py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Boost Your Business</h1>
        </div>
        <p className="text-muted-foreground">Promote your services with AI-generated ad copy and get more visibility.</p>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Promotion</TabsTrigger>
          <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
          <TabsTrigger value="history">History ({pastPromotions.length})</TabsTrigger>
        </TabsList>

        {/* CREATE PROMOTION TAB */}
        <TabsContent value="create" className="space-y-6">
          {step === "select" && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Choose Your Promotion Tier</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tiers?.map((tier) => (
                  <Card
                    key={tier.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedTier === tier.id ? "ring-2 ring-primary shadow-lg" : ""}`}
                    onClick={() => setSelectedTier(tier.id)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${TIER_COLORS[tier.id]} flex items-center justify-center text-white`}>
                          {TIER_ICONS[tier.id]}
                        </div>
                        <span className="text-xl font-bold">{tier.priceFormatted}</span>
                      </div>
                      <h3 className="font-semibold mb-1">{tier.label}</h3>
                      <p className="text-sm text-muted-foreground">{TIER_DESCRIPTIONS[tier.id]}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTier && (
                <div className="flex justify-end">
                  <Button onClick={() => setStep("customize")} className="gap-2">
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "customize" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("select")}>← Back</Button>
                <h2 className="text-lg font-semibold">Customize Your Ad</h2>
              </div>

              {/* Service selector */}
              {myServices && myServices.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Promote a specific service (optional)</label>
                  <select
                    className="w-full border rounded-lg p-2.5 bg-background text-foreground"
                    value={selectedServiceId || ""}
                    onChange={(e) => setSelectedServiceId(e.target.value ? Number(e.target.value) : undefined)}
                  >
                    <option value="">All my services (general promotion)</option>
                    {myServices.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* AI Generation */}
              <Card className="border-dashed border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <h3 className="font-semibold">AI-Powered Ad Copy</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Let AI generate a compelling headline and description based on your service details.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleGenerateAI}
                    disabled={generateCopy.isPending}
                    className="gap-2"
                  >
                    {generateCopy.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Generate with AI</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Manual editing */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Headline</label>
                  <Input
                    placeholder="e.g., Top-Rated DJ Services for Your Next Event"
                    value={headline}
                    onChange={(e) => { setHeadline(e.target.value); setAiGenerated(false); }}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{headline.length}/200 characters</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    placeholder="e.g., Professional DJ with 10+ years experience. Available for weddings, parties, and corporate events."
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setAiGenerated(false); }}
                    maxLength={500}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{description.length}/500 characters</p>
                </div>
              </div>

              {headline && description && (
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={handleGenerateAI} disabled={generateCopy.isPending} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Regenerate
                  </Button>
                  <Button onClick={() => setStep("preview")} className="gap-2">
                    Preview <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setStep("customize")}>← Back</Button>
                <h2 className="text-lg font-semibold">Preview & Pay</h2>
              </div>

              {/* Preview card */}
              <Card className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${TIER_COLORS[selectedTier || "quick_boost"]}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Sparkles className="h-3 w-3" /> Promoted
                    </Badge>
                    {aiGenerated && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Sparkles className="h-3 w-3" /> AI Generated
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{headline}</h3>
                  <p className="text-muted-foreground">{description}</p>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Promotion Tier</span>
                      <span className="font-medium">{tiers?.find((t) => t.id === selectedTier)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{selectedTier === "quick_boost" ? "24 hours" : "7 days"}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-base">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">{tiers?.find((t) => t.id === selectedTier)?.priceFormatted}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full gap-2 h-12 text-base"
                onClick={handleCheckout}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="h-5 w-5" /> Pay & Launch Promotion</>
                )}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ACTIVE PROMOTIONS TAB */}
        <TabsContent value="active" className="space-y-4">
          {activePromotions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Rocket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No Active Promotions</h3>
                <p className="text-sm text-muted-foreground">Create your first promotion to boost visibility.</p>
              </CardContent>
            </Card>
          ) : (
            activePromotions.map((promo) => (
              <Card key={promo.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${TIER_COLORS[promo.tier]} flex items-center justify-center text-white`}>
                        {TIER_ICONS[promo.tier]}
                      </div>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> Ends {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : "—"}</div>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1">{promo.headline}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {promo.impressions} views</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {promo.clicks} clicks</span>
                  </div>
                  {/* Share My Promotion */}
                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 flex-1"
                      onClick={() => {
                        const url = `${window.location.origin}/featured/promo/${promo.id}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Promotion link copied! Share it on social media.");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Share Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const url = encodeURIComponent(`${window.location.origin}/featured/promo/${promo.id}`);
                        const text = encodeURIComponent(`${promo.headline} — Check out my promotion on OlogyCrew!`);
                        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
                      }}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          {pastPromotions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No Past Promotions</h3>
                <p className="text-sm text-muted-foreground">Your completed promotions will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            pastPromotions.map((promo) => (
              <Card key={promo.id} className="opacity-75">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${TIER_COLORS[promo.tier]} flex items-center justify-center text-white opacity-60`}>
                        {TIER_ICONS[promo.tier]}
                      </div>
                      <Badge variant="outline">{promo.status === "expired" ? "Expired" : promo.status === "cancelled" ? "Cancelled" : "Pending"}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">${(promo.amountPaid / 100).toFixed(2)}</span>
                  </div>
                  <h3 className="font-semibold mb-1">{promo.headline}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{promo.description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {promo.impressions} views</span>
                    <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {promo.clicks} clicks</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
