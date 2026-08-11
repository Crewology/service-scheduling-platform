import { useAuth } from "@/_core/hooks/useAuth";
import { useViewMode } from "@/contexts/ViewModeContext";
import { trpc } from "@/lib/trpc";
import { NavHeader } from "@/components/shared/NavHeader";
import { Link } from "wouter";
import { useLocation } from "wouter";
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
  { label: "Help", icon: <HelpCircle className="h-7 w-7" />, href: "/help", color: "bg-cyan-100", iconColor: "text-cyan-600" },
  { label: "Profile", icon: <UserCog className="h-7 w-7" />, href: "/provider/onboarding", color: "bg-violet-100", iconColor: "text-violet-600" },
  { label: "Account", icon: <Settings className="h-7 w-7" />, href: "/profile", color: "bg-slate-100", iconColor: "text-slate-600" },
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
  { label: "Help", icon: <HelpCircle className="h-7 w-7" />, href: "/help", color: "bg-cyan-100", iconColor: "text-cyan-600" },
  { label: "Account", icon: <Settings className="h-7 w-7" />, href: "/profile", color: "bg-slate-100", iconColor: "text-slate-600" },
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
  const { data: unreadMessages } = trpc.message.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: unreadNotifications } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // Fetch provider profile to check onboarding completion (only for providers)
  const { data: providerProfile } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isProviderView && user?.role === "provider",
  });

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

        {/* Onboarding Progress Bar (for providers who haven't completed setup) */}
        {isProviderView && user?.role === "provider" && !providerProfile && (
          <Link href="/provider/onboarding">
            <div className="mb-6 p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">Complete Your Profile</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">0%</span>
              </div>
              <div className="w-full h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "0%" }} />
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">Tap here to finish setting up your provider profile</p>
            </div>
          </Link>
        )}
        {isProviderView && providerProfile && !providerProfile.stripeOnboardingComplete && (
          <Link href="/provider/onboarding">
            <div className="mb-6 p-4 rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Finish Your Setup</span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">In Progress</span>
              </div>
              <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "60%" }} />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">Tap here to complete your profile and start getting booked</p>
            </div>
          </Link>
        )}

        {/* Launchpad Grid */}
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
