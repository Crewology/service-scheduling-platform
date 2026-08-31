import { useAuth } from "@/_core/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";
import { trpc } from "@/lib/trpc";
import { NavHeader } from "@/components/shared/NavHeader";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Search, Calendar, MessageSquare, Heart, FileText, Users,
  BarChart3, CreditCard, Image, Tag, Settings, Bell,
  Grid3X3, Gift, Clock, Briefcase, Star, ShieldCheck,
  LayoutDashboard, UserCircle, Compass, BookOpen, Rocket,
  Award, HelpCircle, UserCog
} from "lucide-react";

// Launchpad tile definition
interface LaunchpadTile {
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string; // bg color for icon container
  iconColor: string; // icon stroke/fill color
}

// Provider tiles
const PROVIDER_TILES: LaunchpadTile[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="h-7 w-7" />, href: "/provider/dashboard", color: "bg-gray-100", iconColor: "text-gray-700" },
  { label: "Profile", icon: <UserCog className="h-7 w-7" />, href: "/provider/onboarding", color: "bg-violet-100", iconColor: "text-violet-600" },
  { label: "Bookings", icon: <Calendar className="h-7 w-7" />, href: "/my-bookings", color: "bg-blue-100", iconColor: "text-blue-600" },
  { label: "Services", icon: <Briefcase className="h-7 w-7" />, href: "/provider/services", color: "bg-purple-100", iconColor: "text-purple-600" },
  { label: "Schedule", icon: <Clock className="h-7 w-7" />, href: "/provider/availability", color: "bg-green-100", iconColor: "text-green-600" },
  { label: "Messages", icon: <MessageSquare className="h-7 w-7" />, href: "/messages", color: "bg-sky-100", iconColor: "text-sky-600" },
  { label: "Analytics", icon: <BarChart3 className="h-7 w-7" />, href: "/provider/analytics", color: "bg-amber-100", iconColor: "text-amber-700" },
  { label: "Payouts", icon: <CreditCard className="h-7 w-7" />, href: "/provider/payouts", color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { label: "Boost", icon: <Rocket className="h-7 w-7" />, href: "/provider/promotions", color: "bg-gradient-to-br from-purple-100 to-pink-100", iconColor: "text-purple-600" },
  { label: "My Page", icon: <UserCircle className="h-7 w-7" />, href: "/provider/my-page", color: "bg-teal-100", iconColor: "text-teal-600" },
  { label: "Invoices", icon: <FileText className="h-7 w-7" />, href: "/provider/invoices", color: "bg-orange-100", iconColor: "text-orange-600" },
  { label: "Widgets", icon: <Grid3X3 className="h-7 w-7" />, href: "/provider/widgets", color: "bg-rose-100", iconColor: "text-rose-600" },
  { label: "Reviews", icon: <Star className="h-7 w-7" />, href: "/provider/reviews", color: "bg-teal-100", iconColor: "text-teal-600" },
  { label: "Featured", icon: <Award className="h-7 w-7" />, href: "/featured", color: "bg-yellow-100", iconColor: "text-yellow-600" },
  { label: "Plans", icon: <ShieldCheck className="h-7 w-7" />, href: "/provider/subscription", color: "bg-rose-100", iconColor: "text-rose-600" },
];

// Customer tiles
const CUSTOMER_TILES: LaunchpadTile[] = [
  { label: "Browse", icon: <Compass className="h-7 w-7" />, href: "/browse", color: "bg-blue-100", iconColor: "text-blue-600" },
  { label: "Search", icon: <Search className="h-7 w-7" />, href: "/search", color: "bg-purple-100", iconColor: "text-purple-600" },
  { label: "Featured", icon: <Award className="h-7 w-7" />, href: "/featured", color: "bg-yellow-100", iconColor: "text-yellow-600" },
  { label: "My Bookings", icon: <BookOpen className="h-7 w-7" />, href: "/my-bookings", color: "bg-green-100", iconColor: "text-green-600" },
  { label: "Messages", icon: <MessageSquare className="h-7 w-7" />, href: "/messages", color: "bg-sky-100", iconColor: "text-sky-600" },
  { label: "Saved", icon: <Heart className="h-7 w-7" />, href: "/saved-providers", color: "bg-pink-100", iconColor: "text-pink-600" },
  { label: "Waitlist", icon: <Clock className="h-7 w-7" />, href: "/my-waitlist", color: "bg-amber-100", iconColor: "text-amber-700" },
  { label: "Referrals", icon: <Gift className="h-7 w-7" />, href: "/referral-program", color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { label: "Alerts", icon: <Bell className="h-7 w-7" />, href: "/notifications", color: "bg-orange-100", iconColor: "text-orange-600" },
  { label: "Reviews", icon: <Star className="h-7 w-7" />, href: "/my-reviews", color: "bg-teal-100", iconColor: "text-teal-600" },
  { label: "Receipts & Invoices", icon: <CreditCard className="h-7 w-7" />, href: "/receipts", color: "bg-orange-100", iconColor: "text-orange-600" },
  { label: "Plans", icon: <ShieldCheck className="h-7 w-7" />, href: "/customer/subscription", color: "bg-rose-100", iconColor: "text-rose-600" },
];

// Admin tiles (only admin-specific tiles that don't already exist in provider/customer arrays)
const ADMIN_TILES: LaunchpadTile[] = [
  { label: "Admin", icon: <LayoutDashboard className="h-7 w-7" />, href: "/admin", color: "bg-red-100", iconColor: "text-red-600" },
  { label: "Users", icon: <Users className="h-7 w-7" />, href: "/admin?tab=users", color: "bg-violet-100", iconColor: "text-violet-600" },
];

function StatBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shadow-sm">
      <span className="text-lg font-bold text-primary">{count}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default function LoggedInHome() {
  const { user } = useAuth();
  const { isProviderView, isAdmin, setViewMode } = useViewMode();
  const [, setLocation] = useLocation();

  // Fetch quick stats
  // The shared header owns background refresh; these observers reuse its query cache.
  const { data: unreadMessages } = trpc.message.unreadCount.useQuery();
  const { data: unreadNotifications } = trpc.notification.unreadCount.useQuery();

  // Fetch provider profile to check onboarding completion (only for providers)
  const { data: onboardingStatus, isLoading: onboardingLoading } = trpc.provider.getOnboardingStatus.useQuery(undefined, {
    enabled: isProviderView && user?.role === "provider" && !isAdmin,
  });

  // Gate: redirect providers to onboarding if steps 1-4 are not complete
  useEffect(() => {
    if (isProviderView && user?.role === "provider" && !isAdmin && onboardingStatus && !onboardingStatus.steps1to4Complete) {
      setLocation("/provider/onboarding");
    }
  }, [isProviderView, user?.role, isAdmin, onboardingStatus, setLocation]);

  // Auto-activate customer plan from pendingPlanTier or localStorage after signup
  const customerStartTrial = trpc.customerSubscription.startTrial.useMutation({
    onSuccess: () => {
      localStorage.removeItem("ologycrew_selected_plan");
      // Clear pending plan from DB
      try { clearPendingPlan.mutate(); } catch {}
    },
  });
  const clearPendingPlan = trpc.auth.clearPendingPlan.useMutation();
  useEffect(() => {
    if (!user || user.role === "provider" || isAdmin) return;
    // Check pendingPlanTier from DB or localStorage
    const pendingTier = (user as any).pendingPlanTier;
    const pendingAudience = (user as any).pendingPlanAudience;
    if (pendingTier && pendingAudience === "customer") {
      if (pendingTier === "pro" || pendingTier === "business") {
        customerStartTrial.mutate({ tier: pendingTier });
      } else {
        // Free tier is default, just clear the pending
        clearPendingPlan.mutate();
        localStorage.removeItem("ologycrew_selected_plan");
      }
      return;
    }
    // Also check localStorage as fallback
    const stored = localStorage.getItem("ologycrew_selected_plan");
    if (stored) {
      try {
        const plan = JSON.parse(stored);
        if (plan.audience === "customer" && (plan.tier === "pro" || plan.tier === "business")) {
          customerStartTrial.mutate({ tier: plan.tier });
        } else {
          localStorage.removeItem("ologycrew_selected_plan");
        }
      } catch {
        localStorage.removeItem("ologycrew_selected_plan");
      }
    }
  }, [user]);

  // Show loading while checking onboarding status for providers
  if (isProviderView && user?.role === "provider" && !isAdmin && onboardingLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NavHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  const tiles = isProviderView ? PROVIDER_TILES : CUSTOMER_TILES;
  // Prepend admin tiles, then deduplicate by href to avoid key collisions
  const allTiles = isAdmin
    ? [...ADMIN_TILES, ...tiles].filter((tile, idx, arr) => arr.findIndex(t => t.href === tile.href) === idx)
    : tiles;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.firstName || user?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavHeader />

      <div className="flex-1 container py-6 sm:py-10 max-w-3xl">
        {/* Greeting */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            {greeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isProviderView ? "Manage your business" : "What would you like to do today?"}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 sm:mb-10">
          <StatBadge count={typeof unreadMessages === 'number' ? unreadMessages : 0} label="unread messages" />
          <StatBadge count={unreadNotifications?.count || 0} label="notifications" />
        </div>

        {/* Provider/Customer Toggle (mobile) */}
        {user?.role === "provider" && (
          <div className="flex justify-center mb-6 sm:hidden">
            <div className="inline-flex rounded-full border bg-muted p-1">
              <button
                onClick={() => setViewMode("provider")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${isProviderView ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Provider
              </button>
              <button
                onClick={() => setViewMode("customer")}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${!isProviderView ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Customer
              </button>
            </div>
          </div>
        )}

        {/* Launchpad Grid */}
        {/* Payment setup reminder for providers who skipped step 5 */}
        {isProviderView && onboardingStatus?.steps1to4Complete && !onboardingStatus?.hasStripe && (
          <Link href="/provider/onboarding?step=5">
            <div className="w-full p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-4 hover:bg-amber-100 transition-colors cursor-pointer mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Set up payments to get paid</p>
                <p className="text-xs text-amber-700">Connect Stripe to receive payments from bookings. Only takes a few minutes.</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-4 gap-3 sm:gap-6">
          {allTiles.map((tile, index) => (
            <Link key={`${tile.label}-${tile.href}`} href={tile.href}>
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${tile.color} flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 shadow-sm`}>
                  <span className={tile.iconColor}>{tile.icon}</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-center text-foreground leading-tight">
                  {tile.label}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Role indicator */}
        <div className="text-center mt-10 sm:mt-12">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Viewing as <span className="font-medium capitalize">{isProviderView ? "Provider" : "Customer"}</span>
            {isProviderView && " · Switch to Customer view from the top menu"}
          </p>
        </div>
      </div>
    </div>
  );
}
