import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// getLoginUrl kept for backward compat if needed elsewhere
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  MessageSquare,
  Calendar,
  Bell,
  Menu,
  X,
  MessageCircleQuestion,
  Sparkles,
  User,
  Briefcase,
  CheckCheck,
  ExternalLink,
  Heart,
  FileText,
  LogOut,
  Settings,
  ChevronDown,
  Coins,
  CreditCard,
  Download,
  Shield,
  Trash2,
  Search,
  Grid3X3,
  HelpCircle,
  Clock,
  LayoutDashboard,
  Compass,
  Award,
  ShieldCheck,
  BarChart3,
  Image,
  Rocket,
  UserCircle,
  Star,
  Tag,
  Gift,
  BookOpen,
  Users,
  UserCog,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import { toast } from "sonner";
import { ViewModeSwitcher, ViewModeSwitcherMobile } from "@/components/ViewModeSwitcher";
import { useViewMode } from "@/contexts/ViewModeContext";
import { usePWAInstallContext } from "@/contexts/PWAInstallContext";

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const [sseConnected, setSseConnected] = useState(false);

  // Fetch initial data (polling as fallback, but SSE will push updates)
  const { data: notifData } = trpc.notification.list.useQuery(
    { unreadOnly: false },
    { refetchInterval: sseConnected ? 60000 : 15000 } // Slower polling when SSE is active
  );
  const { data: countData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: sseConnected ? 60000 : 15000,
  });

  // Real-time SSE connection
  const handleSSENotification = useCallback((data: any) => {
    // Invalidate queries to refresh the list
    utils.notification.list.invalidate();
    utils.notification.unreadCount.invalidate();

    // Show toast for new notification
    toast(data.title || "New Notification", {
      description: data.message?.slice(0, 100) || "",
      duration: 5000,
    });
  }, [utils]);

  const handleSSEUnreadCount = useCallback((_data: any) => {
    utils.notification.unreadCount.invalidate();
  }, [utils]);

  const handleSSENewMessage = useCallback((data: any) => {
    // Invalidate message-related queries
    utils.notification.list.invalidate();
    utils.notification.unreadCount.invalidate();

    toast(`Message from ${data.senderName || "Someone"}`, {
      description: data.messagePreview?.slice(0, 80) || "New message received",
      duration: 4000,
    });
  }, [utils]);

  useSSE({
    enabled: true,
    onNotification: handleSSENotification,
    onUnreadCount: handleSSEUnreadCount,
    onNewMessage: handleSSENewMessage,
    onConnected: () => setSseConnected(true),
    onDisconnected: () => setSseConnected(false),
  });

  const markRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onMutate: async () => {
      await utils.notification.list.cancel();
      await utils.notification.unreadCount.cancel();
      const prevList = utils.notification.list.getData({ unreadOnly: false });
      // Optimistically mark all as read
      if (prevList) {
        utils.notification.list.setData({ unreadOnly: false }, prevList.map((n: any) => ({ ...n, isRead: true })));
      }
      utils.notification.unreadCount.setData(undefined, { count: 0 });
      return { prevList };
    },
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
    onError: (_err, _vars, context) => {
      if (context?.prevList) {
        utils.notification.list.setData({ unreadOnly: false }, context.prevList);
      }
      toast.error("Failed to mark notifications as read");
    },
  });
  const clearAll = trpc.notification.clearAll.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await utils.notification.list.cancel();
      await utils.notification.unreadCount.cancel();
      // Snapshot previous values
      const prevList = utils.notification.list.getData({ unreadOnly: false });
      const prevCount = utils.notification.unreadCount.getData();
      // Optimistically clear
      utils.notification.list.setData({ unreadOnly: false }, []);
      utils.notification.unreadCount.setData(undefined, { count: 0 });
      return { prevList, prevCount };
    },
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      toast.success("All notifications cleared");
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.prevList) {
        utils.notification.list.setData({ unreadOnly: false }, context.prevList);
      }
      if (context?.prevCount) {
        utils.notification.unreadCount.setData(undefined, context.prevCount);
      }
      toast.error("Failed to clear notifications");
    },
  });

  const unreadCount = countData?.count ?? 0;
  const notifications = notifData ?? [];
  const recent = notifications.slice(0, 8);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function getIcon(type: string) {
    switch (type) {
      case "booking_created":
      case "booking_confirmed":
        return "📅";
      case "booking_cancelled":
        return "❌";
      case "booking_completed":
        return "✅";
      case "reminder_24h":
      case "reminder_1h":
        return "⏰";
      case "payment_received":
        return "💰";
      case "message_received":
        return "💬";
      case "review_received":
        return "⭐";
      default:
        return "🔔";
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 lg:h-4 lg:w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center p-0 text-[9px]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 mt-2 w-[380px] max-w-[calc(100vw-2rem)] lg:absolute lg:left-auto lg:translate-x-0 lg:right-0 lg:top-full bg-white rounded-lg shadow-xl border z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <CheckCheck className="h-3 w-3" />
                  {markAllRead.isPending ? "Marking..." : "Mark all read"}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="text-xs text-destructive hover:underline flex items-center gap-1 disabled:opacity-50"
                  onClick={() => clearAll.mutate()}
                  disabled={clearAll.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  {clearAll.isPending ? "Clearing..." : "Clear all"}
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              recent.map((n: any) => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !n.isRead ? "bg-blue-50/50" : ""
                  }`}
                  onClick={async () => {
                    if (!n.isRead) {
                      try {
                        await markRead.mutateAsync({ notificationId: n.id });
                      } catch {}
                    }
                    if (n.actionUrl) {
                      window.location.href = n.actionUrl;
                      setOpen(false);
                    }
                  }}
                >
                  <span className="text-lg mt-0.5 shrink-0">{getIcon(n.notificationType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.isRead ? "font-medium" : ""}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 bg-gray-50">
              <Link
                href="/notifications"
                className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
                onClick={() => setOpen(false)}
              >
                View all notifications
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreditBadge() {
  const { isAuthenticated } = useAuth();
  const { data: balance } = trpc.referral.getCreditBalance.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const balanceStr = typeof balance === "object" && balance ? balance.balance : "0";
  const creditAmount = parseFloat(balanceStr || "0");
  if (!isAuthenticated || creditAmount <= 0) return null;

  return (
    <Link href="/referrals">
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 gap-1.5 px-2.5 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
        title="Referral Credits"
      >
        <Coins className="h-4 w-4" />
        <span className="text-xs font-semibold">${creditAmount.toFixed(0)}</span>
      </Button>
    </Link>
  );
}

function UserMenuDropdown({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const { isInstalled, triggerInstall } = usePWAInstallContext();
  const { isProviderView } = useViewMode();
  const { data: providerProfile } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1"
        onClick={() => setOpen(!open)}
      >
        <User className="h-4 w-4" />
        <span className="max-w-[120px] truncate">{user?.name || user?.email}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border z-[100] overflow-hidden py-1">
          <Link
            href="/account"
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            My Account
          </Link>
          {providerProfile?.profileSlug && (
            <Link
              href={`/${providerProfile.profileSlug}`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              My Page
            </Link>
          )}
          {providerProfile && (
            <Link
              href="/provider/calendar"
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              My Calendar
            </Link>
          )}
          <Link
            href={isProviderView ? "/provider/subscription" : "/customer/subscription"}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            My Subscription
          </Link>
          <Link
            href={isProviderView ? "/provider/billing" : "/customer/billing"}
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            Billing History
          </Link>
          <Link
            href="/notification-settings"
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            Settings
          </Link>
          {user?.role === "admin" && (
            <>
              <div className="border-t my-1" />
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors text-blue-700 font-medium"
                onClick={() => setOpen(false)}
              >
                <Shield className="h-4 w-4" />
                Admin Dashboard
              </Link>
            </>
          )}
          {!isInstalled && (
            <button
              className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors w-full text-left"
              onClick={() => {
                setOpen(false);
                triggerInstall();
              }}
            >
              <Download className="h-4 w-4 text-muted-foreground" />
              Install App
            </button>
          )}
          <div className="border-t my-1" />
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            onClick={() => {
              setOpen(false);
              // Navigate directly to the logout endpoint - this guarantees
              // the browser processes the Set-Cookie header before loading the next page
              window.location.href = "/api/auth/logout";
            }}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

// Mobile menu tile data - matches LoggedInHome.tsx landing page tiles exactly
const MOBILE_PROVIDER_TILES = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/provider/dashboard", color: "bg-gray-100", iconColor: "text-gray-700" },
  { label: "Bookings", icon: Calendar, href: "/my-bookings", color: "bg-blue-100", iconColor: "text-blue-600" },
  { label: "Services", icon: Briefcase, href: "/provider/services", color: "bg-purple-100", iconColor: "text-purple-600" },
  { label: "Schedule", icon: Clock, href: "/provider/availability", color: "bg-green-100", iconColor: "text-green-600" },
  { label: "Messages", icon: MessageSquare, href: "/messages", color: "bg-sky-100", iconColor: "text-sky-600" },
  { label: "Analytics", icon: BarChart3, href: "/provider/analytics", color: "bg-amber-100", iconColor: "text-amber-700" },
  { label: "Payouts", icon: CreditCard, href: "/provider/payouts", color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { label: "Boost", icon: Rocket, href: "/provider/promotions", color: "bg-purple-100", iconColor: "text-purple-600" },
  { label: "My Page", icon: UserCircle, href: "/provider/my-page", color: "bg-teal-100", iconColor: "text-teal-600" },
  { label: "Invoices", icon: FileText, href: "/provider/invoices", color: "bg-orange-100", iconColor: "text-orange-600" },
  { label: "Widgets", icon: Grid3X3, href: "/provider/widgets", color: "bg-rose-100", iconColor: "text-rose-600" },
  { label: "Reviews", icon: Star, href: "/provider/reviews", color: "bg-teal-100", iconColor: "text-teal-600" },
  { label: "Featured", icon: Award, href: "/featured", color: "bg-yellow-100", iconColor: "text-yellow-600" },
  { label: "Plans", icon: ShieldCheck, href: "/provider/subscription", color: "bg-rose-100", iconColor: "text-rose-600" },
  { label: "Help", icon: HelpCircle, href: "/help", color: "bg-cyan-100", iconColor: "text-cyan-600" },
  { label: "Profile", icon: UserCog, href: "/provider/onboarding", color: "bg-violet-100", iconColor: "text-violet-600" },
  { label: "Account", icon: Settings, href: "/account", color: "bg-slate-100", iconColor: "text-slate-600" },
];

const MOBILE_CUSTOMER_TILES = [
  { label: "Browse", icon: Compass, href: "/browse", color: "bg-blue-100", iconColor: "text-blue-600" },
  { label: "Search", icon: Search, href: "/search", color: "bg-purple-100", iconColor: "text-purple-600" },
  { label: "Featured", icon: Award, href: "/featured", color: "bg-yellow-100", iconColor: "text-yellow-600" },
  { label: "My Bookings", icon: BookOpen, href: "/my-bookings", color: "bg-green-100", iconColor: "text-green-600" },
  { label: "Messages", icon: MessageSquare, href: "/messages", color: "bg-sky-100", iconColor: "text-sky-600" },
  { label: "Saved", icon: Heart, href: "/saved-providers", color: "bg-pink-100", iconColor: "text-pink-600" },
  { label: "Waitlist", icon: Clock, href: "/my-waitlist", color: "bg-amber-100", iconColor: "text-amber-700" },
  { label: "Referrals", icon: Gift, href: "/referral-program", color: "bg-emerald-100", iconColor: "text-emerald-600" },
  { label: "Alerts", icon: Bell, href: "/notifications", color: "bg-orange-100", iconColor: "text-orange-600" },
  { label: "Reviews", icon: Star, href: "/my-reviews", color: "bg-teal-100", iconColor: "text-teal-600" },
  { label: "Receipts & Invoices", icon: CreditCard, href: "/receipts", color: "bg-orange-100", iconColor: "text-orange-600" },
  { label: "Plans", icon: ShieldCheck, href: "/customer/subscription", color: "bg-rose-100", iconColor: "text-rose-600" },
  { label: "Help", icon: HelpCircle, href: "/help", color: "bg-cyan-100", iconColor: "text-cyan-600" },
  { label: "Account", icon: Settings, href: "/account", color: "bg-slate-100", iconColor: "text-slate-600" },
];

const MOBILE_ADMIN_TILES = [
  { label: "Admin", icon: LayoutDashboard, href: "/admin", color: "bg-red-100", iconColor: "text-red-600" },
  { label: "Users", icon: Users, href: "/admin?tab=users", color: "bg-violet-100", iconColor: "text-violet-600" },
];

function MobileMenuTiles({ isAuthenticated, isProvider, isAdmin, isProviderView, unreadMessages, onClose }: {
  isAuthenticated: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  isProviderView: boolean;
  unreadMessages: number;
  onClose: () => void;
}) {
  // Determine which tiles to show based on view mode (same logic as landing page)
  const baseTiles = isAuthenticated
    ? (isProviderView ? MOBILE_PROVIDER_TILES : MOBILE_CUSTOMER_TILES)
    : MOBILE_CUSTOMER_TILES.filter(t => ["/browse", "/search", "/featured", "/pricing", "/help"].includes(t.href));

  // Prepend admin tiles and deduplicate (same as landing page)
  const allTiles = isAdmin
    ? [...MOBILE_ADMIN_TILES, ...baseTiles].filter((tile, idx, arr) => arr.findIndex(t => t.href === tile.href) === idx)
    : baseTiles;

  return (
    <div className="grid grid-cols-4 gap-2">
      {allTiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link key={`${tile.label}-${tile.href}`} href={tile.href} onClick={onClose}>
            <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
              <div className={`h-11 w-11 rounded-2xl ${tile.color} flex items-center justify-center relative`}>
                <Icon className={`h-6 w-6 ${tile.iconColor}`} />
                {tile.label === "Messages" && unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-center leading-tight">{tile.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function MobileLogoutButton({ onClose }: { onClose: () => void }) {
  return (
    <div>
      <button
        className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
        onClick={() => {
          onClose();
          // Navigate directly to the logout endpoint - this guarantees
          // the browser processes the Set-Cookie header before loading the next page
          window.location.href = "/api/auth/logout";
        }}
      >
        <LogOut className="h-5 w-5 text-red-500" />
        <span className="text-[15px] font-medium text-red-600">Log Out</span>
      </button>
    </div>
  );
}

export function NavHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unread message count (polls every 15s)
  const { data: unreadCount } = trpc.message.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  // Check for provider profile as fallback (in case role hasn't been updated yet)
  const { data: myProfile } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const unreadMessages = typeof unreadCount === "number" ? unreadCount : 0;

  const isProvider = user?.role === "provider" || !!myProfile;
  const isAdmin = user?.role === "admin";
  const { isProviderView, isCustomerView, canSwitch } = useViewMode();
  const { isInstalled: pwaInstalled, triggerInstall: pwaInstall } = usePWAInstallContext();

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png"
              alt="OlogyCrew"
              className="h-9 w-9 lg:h-8 lg:w-8 object-contain rounded-lg"
            />
            <span className="hidden lg:inline text-xl font-bold gradient-text whitespace-nowrap">OlogyCrew</span>
          </Link>

          {/* Desktop Nav - hidden per user request */}

          {/* Right side actions */}
          <div className="hidden lg:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                {/* Browse Services */}
                <Link href="/browse">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Browse Services">
                    <Compass className="h-4 w-4" />
                  </Button>
                </Link>

                {/* My Bookings */}
                <Link href="/my-bookings">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9" title="My Bookings">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </Link>

                {/* Saved Providers */}
                <Link href="/saved-providers">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Saved">
                    <Heart className="h-4 w-4" />
                  </Button>
                </Link>


                {/* Messages with unread badge */}
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Messages">
                    <MessageSquare className="h-4 w-4" />
                    {unreadMessages > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center p-0 text-[9px]"
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* Credit Balance */}
                <CreditBadge />

                {/* Notifications Dropdown */}
                <NotificationDropdown />

                {/* Search */}
                <Link href="/search">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Search">
                    <Search className="h-4 w-4" />
                  </Button>
                </Link>

                {/* View Mode Switcher for providers */}
                <ViewModeSwitcher />

                {/* My Dashboard — hidden per user request */}

                {/* Admin Dashboard */}
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="text-xs px-2.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                      <Shield className="h-3.5 w-3.5 mr-1" />
                      Admin
                    </Button>
                  </Link>
                )}

                {/* User menu dropdown */}
                <UserMenuDropdown user={user} />
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/pricing">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile actions: Browse + AI Assistant + Notifications + Search + Hamburger */}
          <div className="flex lg:hidden items-center gap-1">
            {/* Browse Services (mobile) */}
            <Link href="/browse">
              <Button variant="ghost" size="icon" className="relative h-10 w-10" title="Browse Services">
                <Compass className="h-5 w-5" />
              </Button>
            </Link>

            {/* AI Assistant button (mobile only) */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10"
              onClick={() => window.dispatchEvent(new Event('toggle-help-chat'))}
              title="AI Assistant"
            >
              <Sparkles className="h-6 w-6" />
            </Button>

            {/* Notification bell (mobile only) */}
            {isAuthenticated && <NotificationDropdown />}

            {/* Search (mobile) */}
            <Link href="/search">
              <Button variant="ghost" size="icon" className="relative h-10 w-10" title="Search">
                <Search className="h-5 w-5" />
              </Button>
            </Link>

            {/* Hamburger menu */}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Full-Screen App Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-[57px] z-50 bg-background animate-in slide-in-from-right-full duration-200 overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* User Profile Summary */}
              {isAuthenticated && user ? (
                <div className="px-6 py-5 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {user.profilePhotoUrl ? (
                        <AvatarImage src={user.profilePhotoUrl} alt={user.name || ""} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {(user.name || user.email || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-base truncate">{user.name || "User"}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {(isProvider || isAdmin) && (
                        <div className="flex gap-1.5 mt-1">
                          {isProvider && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Provider</Badge>}
                          {isAdmin && <Badge variant="default" className="text-[10px] px-1.5 py-0">Admin</Badge>}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* View Mode Switcher */}
                  <div className="mt-3">
                    <ViewModeSwitcherMobile />
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5 border-b">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full h-12 text-base">Sign In to Get Started</Button>
                  </Link>
                </div>
              )}

              {/* App-Style Grid Navigation - matches landing page tiles exactly */}
              <div className="flex-1 px-5 py-5 overflow-y-auto">
                <MobileMenuTiles
                  isAuthenticated={isAuthenticated}
                  isProvider={isProvider}
                  isAdmin={isAdmin}
                  isProviderView={isProviderView}
                  unreadMessages={unreadMessages}
                  onClose={() => setMobileMenuOpen(false)}
                />
              </div>

              {/* Footer Actions */}
              <div className="px-4 py-4 border-t mt-auto space-y-2">
                {!pwaInstalled && (
                  <button
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      pwaInstall();
                    }}
                  >
                    <Download className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[15px] font-medium">Install App</span>
                  </button>
                )}
                {isAuthenticated && (
                  <MobileLogoutButton onClose={() => setMobileMenuOpen(false)} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
