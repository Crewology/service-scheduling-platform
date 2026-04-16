import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Gift,
  Copy,
  Share2,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Settings,
  TrendingUp,
  Loader2,
  Briefcase,
  UserPlus,
} from "lucide-react";
import { Link } from "wouter";

export default function Referrals() {
  const { user, isAuthenticated } = useAuth();
  const authLoading = !isAuthenticated && !user;
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("customer");

  const { data: myCode, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: stats, isLoading: statsLoading } = trpc.referral.getStats.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: history, isLoading: historyLoading } = trpc.referral.getHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Check if user is a provider
  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: !!user,
  });

  // Credit balance
  const { data: creditBalance } = trpc.referral.getCreditBalance.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: creditHistory } = trpc.referral.getCreditHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  const utils = trpc.useUtils();
  const updateSettings = trpc.referral.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Referral settings updated");
      utils.referral.getMyCode.invalidate();
      utils.referral.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50">
        <div className="container max-w-2xl py-20 text-center">
          <Gift className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Referral Program</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Sign in to get your unique referral code and start earning rewards when friends book services.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg">Sign In to Get Started</Button>
          </a>
        </div>
      </div>
    );
  }

  // Customer referral link (for booking discounts)
  const customerReferralLink = myCode
    ? `${window.location.origin}?ref=${myCode.code}`
    : "";

  // Provider referral link (for provider onboarding)
  const providerReferralLink = myCode
    ? `${window.location.origin}/provider/onboarding?ref=${myCode.code}`
    : "";

  const copyCode = () => {
    if (myCode) {
      navigator.clipboard.writeText(myCode.code);
      toast.success("Referral code copied!");
    }
  };

  const copyLink = (link: string, label: string) => {
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success(`${label} link copied!`);
    }
  };

  const shareReferral = async (type: "customer" | "provider") => {
    if (!myCode) return;
    const link = type === "provider" ? providerReferralLink : customerReferralLink;
    const text = type === "provider"
      ? `I've been using OlogyCrew to manage my service bookings and it's great! Sign up as a provider with my referral link and we both earn credits.`
      : `Use my referral code ${myCode.code} to get ${myCode.refereeDiscountPercent}% off your first booking on OlogyCrew!`;
    const title = type === "provider" ? "Join OlogyCrew as a Provider" : "Join OlogyCrew";

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: link });
      } catch {
        copyLink(link, type === "provider" ? "Provider referral" : "Referral");
      }
    } else {
      copyLink(link, type === "provider" ? "Provider referral" : "Referral");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-orange-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container max-w-5xl py-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 text-white">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Referral Program</h1>
              <p className="text-muted-foreground">
                Share your code, earn rewards when friends book or join as providers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8 space-y-6">
        {/* Tabs: Customer vs Provider Referrals */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Customer Referrals
            </TabsTrigger>
            <TabsTrigger value="provider" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Provider Referrals
            </TabsTrigger>
          </TabsList>

          {/* ================================================================ */}
          {/* CUSTOMER REFERRALS TAB */}
          {/* ================================================================ */}
          <TabsContent value="customer" className="space-y-6 mt-6">
            {/* Referral Code Card */}
            <Card className="border-2 border-primary/20 bg-gradient-to-r from-purple-50 to-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Your Customer Referral Code
                </CardTitle>
                <CardDescription>
                  Share this code with friends. They get{" "}
                  <strong>{myCode?.refereeDiscountPercent || 10}% off</strong> their first booking,
                  and you earn <strong>{myCode?.referrerDiscountPercent || 10}% credit</strong> when they complete it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {codeLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Generating your code...</span>
                  </div>
                ) : myCode ? (
                  <div className="space-y-4">
                    {/* Code Display */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white border-2 border-dashed border-primary/30 rounded-lg px-6 py-4 text-center">
                        <span className="text-xl sm:text-3xl font-mono font-bold tracking-wider text-primary">
                          {myCode.code}
                        </span>
                      </div>
                      <Button variant="outline" size="icon" onClick={copyCode} title="Copy code">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Share Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => copyLink(customerReferralLink, "Referral")} variant="outline" className="flex-1">
                        <Copy className="h-4 w-4 mr-2" /> Copy Link
                      </Button>
                      <Button onClick={() => shareReferral("customer")} className="flex-1 bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600">
                        <Share2 className="h-4 w-4 mr-2" /> Share
                      </Button>
                    </div>

                    {/* Referral Link */}
                    <div className="bg-white rounded-lg p-3 border">
                      <Label className="text-xs text-muted-foreground mb-1 block">Your customer referral link</Label>
                      <p className="text-sm font-mono text-muted-foreground break-all">{customerReferralLink}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unable to generate referral code. Please try again later.</p>
                )}
              </CardContent>
            </Card>

            {/* Credit Balance Banner */}
            {creditBalance && parseFloat(creditBalance.balance) > 0 && (
              <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-emerald-100">
                        <DollarSign className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-700">Available Credit Balance</p>
                        <p className="text-2xl font-bold text-emerald-600">${parseFloat(creditBalance.balance).toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600/70">Auto-applied at checkout</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats?.completedReferrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats?.pendingReferrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">${parseFloat(creditBalance?.balance || "0").toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Credit Balance</p>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold flex items-center justify-center mx-auto">1</div>
                    <h3 className="font-semibold">Share Your Code</h3>
                    <p className="text-sm text-muted-foreground">
                      Send your unique referral code or link to friends and family.
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center mx-auto">2</div>
                    <h3 className="font-semibold">They Book a Service</h3>
                    <p className="text-sm text-muted-foreground">
                      Your friend enters your code at checkout and gets {myCode?.refereeDiscountPercent || 10}% off.
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold flex items-center justify-center mx-auto">3</div>
                    <h3 className="font-semibold">You Earn Rewards</h3>
                    <p className="text-sm text-muted-foreground">
                      Once their booking completes, you earn {myCode?.referrerDiscountPercent || 10}% credit on your next booking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Referral History */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Referral History</CardTitle>
                  <CardDescription>Track who you've referred and your rewards</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </Button>
              </CardHeader>
              <CardContent>
                {/* Settings Panel */}
                {showSettings && myCode && (
                  <>
                    <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-4">
                      <h4 className="font-semibold text-sm">Referral Settings</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Referrer Discount (%)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={myCode.referrerDiscountPercent}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (val >= 1 && val <= 50 && val !== myCode.referrerDiscountPercent) {
                                updateSettings.mutate({ referrerDiscountPercent: val });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Referee Discount (%)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            defaultValue={myCode.refereeDiscountPercent}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (val >= 1 && val <= 50 && val !== myCode.refereeDiscountPercent) {
                                updateSettings.mutate({ refereeDiscountPercent: val });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Active</Label>
                        <Switch
                          checked={myCode.isActive}
                          onCheckedChange={(checked) => {
                            updateSettings.mutate({ isActive: checked });
                          }}
                        />
                      </div>
                    </div>
                    <Separator className="mb-4" />
                  </>
                )}

                {/* History Table */}
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !history || history.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No Referrals Yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Share your referral code to start earning rewards!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {ref.refereeName || ref.refereeEmail || `User #${ref.refereeId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ref.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {ref.referrerDiscountAmount && (
                            <span className="text-sm font-semibold text-emerald-600">
                              +${ref.referrerDiscountAmount}
                            </span>
                          )}
                          <Badge
                            variant={ref.status === "completed" ? "default" : "secondary"}
                            className={ref.status === "completed" ? "bg-green-100 text-green-700" : ""}
                          >
                            {ref.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================ */}
          {/* PROVIDER REFERRALS TAB */}
          {/* ================================================================ */}
          <TabsContent value="provider" className="space-y-6 mt-6">
            {/* Provider Referral Link Card */}
            <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                  Refer a Provider
                </CardTitle>
                <CardDescription>
                  Know a talented service professional? Share your provider referral link.
                  When they sign up and complete their first booking, you both earn credits!
                </CardDescription>
              </CardHeader>
              <CardContent>
                {codeLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading your referral link...</span>
                  </div>
                ) : myCode ? (
                  <div className="space-y-4">
                    {/* Provider Referral Link */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Input
                          readOnly
                          value={providerReferralLink}
                          className="bg-white text-sm font-mono"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyLink(providerReferralLink, "Provider referral")}
                        title="Copy provider referral link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Share Actions */}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => copyLink(providerReferralLink, "Provider referral")}
                        variant="outline"
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy Link
                      </Button>
                      <Button
                        onClick={() => shareReferral("provider")}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600"
                      >
                        <Share2 className="h-4 w-4 mr-2" /> Share with a Pro
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Referral code: <span className="font-mono font-semibold">{myCode.code}</span>
                      {" "}&middot;{" "}
                      You earn {myCode.referrerDiscountPercent}% credit &middot; They get {myCode.refereeDiscountPercent}% off their first booking
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unable to generate referral link. Please try again later.</p>
                )}
              </CardContent>
            </Card>

            {/* Same stats (shared referral system) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats?.totalReferrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats?.completedReferrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats?.pendingReferrals || 0}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">${stats?.totalEarnings || "0.00"}</p>
                  <p className="text-sm text-muted-foreground">Credits Earned</p>
                </CardContent>
              </Card>
            </div>

            {/* How Provider Referrals Work */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  How Provider Referrals Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 font-bold flex items-center justify-center mx-auto">1</div>
                    <h3 className="font-semibold">Share Your Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Send your unique provider referral link to fellow service professionals.
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 font-bold flex items-center justify-center mx-auto">2</div>
                    <h3 className="font-semibold">They Sign Up as a Provider</h3>
                    <p className="text-sm text-muted-foreground">
                      Your referral creates their provider profile and sets up their services on OlogyCrew.
                    </p>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold flex items-center justify-center mx-auto">3</div>
                    <h3 className="font-semibold">You Both Earn Credits</h3>
                    <p className="text-sm text-muted-foreground">
                      When they complete their first booking, you earn {myCode?.referrerDiscountPercent || 10}% credit and they get {myCode?.refereeDiscountPercent || 10}% off.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Referral History (same data) */}
            <Card>
              <CardHeader>
                <CardTitle>Referral History</CardTitle>
                <CardDescription>Track all your referrals — both customers and providers</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !history || history.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No Provider Referrals Yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Share your provider referral link to start growing the OlogyCrew community!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((ref) => (
                      <div
                        key={ref.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {ref.refereeName || ref.refereeEmail || `User #${ref.refereeId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ref.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {ref.referrerDiscountAmount && (
                            <span className="text-sm font-semibold text-emerald-600">
                              +${ref.referrerDiscountAmount}
                            </span>
                          )}
                          <Badge
                            variant={ref.status === "completed" ? "default" : "secondary"}
                            className={ref.status === "completed" ? "bg-green-100 text-green-700" : ""}
                          >
                            {ref.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Not a provider yet? CTA */}
            {!provider && (
              <Card className="border-dashed border-2 border-emerald-300 bg-emerald-50/50">
                <CardContent className="py-8 text-center">
                  <Briefcase className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Not a Provider Yet?</h3>
                  <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                    Join OlogyCrew as a service provider to unlock your full referral potential.
                    Manage bookings, set your own prices, and grow your business.
                  </p>
                  <Link href="/provider/onboarding">
                    <Button className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600">
                      Become a Provider
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
