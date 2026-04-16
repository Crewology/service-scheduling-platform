import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  Gift,
  Trophy,
  Users,
  CheckCircle2,
  ArrowRight,
  Coins,
  Share2,
  TrendingUp,
  Copy,
  Sparkles,
  Clock,
  CreditCard,
} from "lucide-react";
import { Link } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";
import { toast } from "sonner";

const OG_IMAGE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/ologycrew-referral-og-TyhsS9wgk3tRcpBxQ9VQM9.png";

const META_TAGS = {
  title: "OlogyCrew Referral Program — Share & Earn Rewards",
  description: "Refer friends to OlogyCrew and earn credits toward your next booking. Unlock Bronze, Silver, Gold, and Platinum tiers with escalating rewards up to 25%.",
  url: "/referral-program",
  image: OG_IMAGE_URL,
};

function useMetaTags() {
  useEffect(() => {
    const origin = window.location.origin;
    const tags: Record<string, string> = {
      "og:title": META_TAGS.title,
      "og:description": META_TAGS.description,
      "og:url": `${origin}${META_TAGS.url}`,
      "og:type": "website",
      "og:site_name": "OlogyCrew",
      "twitter:card": "summary_large_image",
      "og:image": META_TAGS.image,
      "og:image:width": "1200",
      "og:image:height": "630",
      "twitter:title": META_TAGS.title,
      "twitter:description": META_TAGS.description,
      "twitter:image": META_TAGS.image,
    };

    // Set document title
    const prevTitle = document.title;
    document.title = META_TAGS.title;

    // Set/update meta tags
    const createdElements: HTMLMetaElement[] = [];
    Object.entries(tags).forEach(([property, content]) => {
      const attr = property.startsWith("twitter:") ? "name" : "property";
      let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, property);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute("content", content);
    });

    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${origin}${META_TAGS.url}`);

    return () => {
      document.title = prevTitle;
      createdElements.forEach((el) => el.remove());
      if (createdCanonical && canonical) canonical.remove();
    };
  }, []);
}

export default function ReferralProgram() {
  useMetaTags();
  const { user, isAuthenticated } = useAuth();

  const { data: myCode } = trpc.referral.getMyCode.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: stats } = trpc.referral.getStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: tierInfo } = trpc.referral.getMyTier.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: balance } = trpc.referral.getCreditBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const balanceStr = typeof balance === "object" && balance ? balance.balance : "0";
  const creditAmount = parseFloat(balanceStr || "0");
  const referralLink = myCode ? `${window.location.origin}/?ref=${myCode.code}` : "";

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied!");
    }
  };

  const tiers = [
    {
      name: "Bronze",
      percent: 10,
      range: "0–5 referrals",
      color: "from-orange-400 to-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      text: "text-orange-700",
      icon: "🥉",
    },
    {
      name: "Silver",
      percent: 15,
      range: "6–10 referrals",
      color: "from-slate-400 to-slate-600",
      bg: "bg-slate-50",
      border: "border-slate-300",
      text: "text-slate-600",
      icon: "🥈",
    },
    {
      name: "Gold",
      percent: 20,
      range: "11–25 referrals",
      color: "from-yellow-400 to-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-300",
      text: "text-yellow-700",
      icon: "🥇",
    },
    {
      name: "Platinum",
      percent: 25,
      range: "26+ referrals",
      color: "from-violet-400 to-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-300",
      text: "text-violet-700",
      icon: "💎",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader />

      {/* Hero */}
      <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-amber-300 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-orange-300 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-200 rounded-full blur-3xl" />
        </div>
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-5 py-2 text-sm font-semibold mb-6">
              <Gift className="h-4 w-4" />
              OlogyCrew Referral Program
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 text-balance">
              Share the Love,{" "}
              <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Earn Rewards
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance">
              Refer friends, family, or fellow professionals to OlogyCrew. Every successful referral earns you credits toward your next booking — and the more you refer, the more you earn.
            </p>

            {isAuthenticated ? (
              <div className="max-w-lg mx-auto">
                {myCode ? (
                  <div className="bg-white rounded-xl p-4 shadow-medium flex items-center gap-3">
                    <div className="flex-1 bg-muted rounded-lg px-4 py-3 text-sm font-mono truncate">
                      {referralLink}
                    </div>
                    <Button onClick={copyLink} className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                ) : (
                  <Link href="/referrals">
                    <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                      Get Your Referral Link
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                  Sign In to Start Earning
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Your Stats (if logged in) */}
      {isAuthenticated && stats && (
        <section className="py-10 bg-white border-b">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-blue-50">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-700">{stats.totalReferrals}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total Referrals</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-green-50">
                  <div className="text-2xl sm:text-3xl font-bold text-green-700">{stats.completedReferrals}</div>
                  <div className="text-sm text-muted-foreground mt-1">Completed</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-50">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-700">${creditAmount.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-1">Credits Earned</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-violet-50">
                  <div className="text-2xl sm:text-3xl font-bold text-violet-700">
                    {tierInfo?.currentTier?.name || "Bronze"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Current Tier</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Three simple steps to start earning rewards
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-5 text-white text-2xl font-bold shadow-lg">
                  1
                </div>
                <h3 className="font-bold text-xl mb-3">Share Your Link</h3>
                <p className="text-muted-foreground">
                  Copy your unique referral link and share it via text, email, or social media. You can refer both customers and service providers.
                </p>
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-muted-foreground/20" />
              </div>

              <div className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-5 text-white text-2xl font-bold shadow-lg">
                  2
                </div>
                <h3 className="font-bold text-xl mb-3">They Join & Book</h3>
                <p className="text-muted-foreground">
                  Your referral signs up using your link and completes their first booking. Both customers and providers count toward your rewards.
                </p>
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-muted-foreground/20" />
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-5 text-white text-2xl font-bold shadow-lg">
                  3
                </div>
                <h3 className="font-bold text-xl mb-3">You Earn Credits</h3>
                <p className="text-muted-foreground">
                  When their first booking is completed, you automatically receive credits based on your current tier. Use credits on your next booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier System */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <Trophy className="h-4 w-4" />
                Reward Tiers
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">The More You Refer, The More You Earn</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Level up through four reward tiers with increasing credit percentages
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tiers.map((tier, i) => {
                const isCurrentTier = isAuthenticated && tierInfo?.currentTier?.name === tier.name;
                return (
                  <Card
                    key={tier.name}
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      isCurrentTier ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""
                    }`}
                  >
                    {isCurrentTier && (
                      <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-1 font-semibold">
                        Your Current Tier
                      </div>
                    )}
                    <CardContent className={`p-6 text-center ${isCurrentTier ? "pt-10" : ""}`}>
                      <div className="text-4xl mb-3">{tier.icon}</div>
                      <h3 className={`text-xl font-bold mb-1 ${tier.text}`}>{tier.name}</h3>
                      <div className="text-sm text-muted-foreground mb-4">{tier.range}</div>
                      <div className={`text-4xl font-bold bg-gradient-to-r ${tier.color} bg-clip-text text-transparent mb-2`}>
                        {tier.percent}%
                      </div>
                      <div className="text-sm text-muted-foreground">credit per referral</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {isAuthenticated && tierInfo?.nextTier && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2.5 shadow-soft text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{tierInfo.referralsToNextTier}</strong> more referral{tierInfo.referralsToNextTier !== 1 ? "s" : ""} to reach{" "}
                    <strong>{tierInfo.nextTier.name}</strong> tier ({tierInfo.nextTier.rewardPercent}% rewards)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Program Benefits</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex gap-4 p-5 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Share2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Refer Anyone</h4>
                  <p className="text-sm text-muted-foreground">Refer both customers and service providers. All referrals count toward your tier.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Credits at Checkout</h4>
                  <p className="text-sm text-muted-foreground">Apply your earned credits directly at checkout to reduce your booking cost.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Escalating Rewards</h4>
                  <p className="text-sm text-muted-foreground">The more you refer, the higher your tier and reward percentage — up to 25%.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Automatic Rewards</h4>
                  <p className="text-sm text-muted-foreground">Credits are automatically added to your account when a referral completes their first booking.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">90-Day Validity</h4>
                  <p className="text-sm text-muted-foreground">Credits are valid for 90 days from the date earned. We'll notify you before they expire.</p>
                </div>
              </div>

              <div className="flex gap-4 p-5 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                  <Coins className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">No Limit</h4>
                  <p className="text-sm text-muted-foreground">There's no cap on how many people you can refer or how many credits you can earn.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "How do I get my referral link?",
                  a: "Sign in to your account and visit the Referrals page from your profile menu. Your unique referral link will be generated automatically.",
                },
                {
                  q: "When do I receive my credits?",
                  a: "Credits are automatically added to your account when your referral completes their first booking on the platform.",
                },
                {
                  q: "Can I refer service providers?",
                  a: "Yes! You can refer both customers and service providers. When a referred provider joins and their first booking is completed, you earn credits.",
                },
                {
                  q: "How do I use my credits?",
                  a: "During checkout, you'll see an option to apply your referral credits. Toggle it on to reduce your booking total. If your credits cover the full amount, no payment is needed.",
                },
                {
                  q: "Do credits expire?",
                  a: "Yes, credits are valid for 90 days from the date they're earned. You'll receive a notification before they expire so you can use them in time.",
                },
                {
                  q: "How do tiers work?",
                  a: "Your tier is based on your total number of completed referrals. As you refer more people, you unlock higher tiers with better reward percentages — from 10% (Bronze) up to 25% (Platinum).",
                },
              ].map((faq, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-2">{faq.q}</h4>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Gift className="h-12 w-12 mx-auto mb-6 opacity-90" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join the OlogyCrew referral program today and earn credits toward your next booking.
            </p>
            {isAuthenticated ? (
              <Link href="/referrals">
                <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-white/90">
                  Go to My Referrals
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-white/90">
                  Sign Up & Get Your Link
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8">
        <div className="container">
          <div className="text-center text-sm opacity-80">
            <p>&copy; 2026 OlogyCrew. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
