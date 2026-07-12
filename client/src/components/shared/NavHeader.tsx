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
            href="/profile"
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 text-muted-foreground" />
            My Profile
          </Link>
          {providerProfile?.profileSlug && (
            <Link
              href={`/p/${providerProfile.profileSlug}`}
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
            href="/account/subscription"
            className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            My Subscription
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

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-4 ml-6">
            <Link
              href="/browse"
              className={`text-sm font-medium transition-colors ${
                location === "/browse" ? "text-primary" : "hover:text-primary"
              }`}
            >
              Browse Services
            </Link>
            <Link
              href="/featured"
              className={`text-sm font-medium transition-colors ${
                location === "/featured" ? "text-primary" : "hover:text-primary"
              }`}
            >
              Featured
            </Link>
            <Link
              href="/search"
              className={`text-sm font-medium transition-colors ${
                location === "/search" ? "text-primary" : "hover:text-primary"
              }`}
            >
              Search
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors ${
                location === "/pricing" ? "text-primary" : "hover:text-primary"
              }`}
            >
              Plans
            </Link>
            <Link
              href="/help"
              className={`text-sm font-medium transition-colors ${
                location === "/help" ? "text-primary" : "hover:text-primary"
              }`}
            >
              Help
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="hidden lg:flex items-center gap-1">
            {isAuthenticated ? (
              <>
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

                {/* My Quotes */}
                <Link href="/my-quotes">
                  <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Quotes">
                    <FileText className="h-4 w-4" />
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

                {/* View Mode Switcher for providers */}
                <ViewModeSwitcher />

                {/* My Dashboard — show for providers and admins with provider profiles */}
                {isProvider && (isProviderView || isAdmin) && (
                  <Link href="/provider/dashboard">
                    <Button variant="outline" size="sm" className="text-xs px-2.5">
                      My Dashboard
                    </Button>
                  </Link>
                )}

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

          {/* Mobile actions: AI Assistant + Notifications + Hamburger */}
          <div className="flex lg:hidden items-center gap-1">
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

              {/* App-Style Grid Navigation */}
              <div className="flex-1 px-5 py-5 overflow-y-auto">
                {/* Discover Grid */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Discover</p>
                <div className="grid grid-cols-4 gap-2 mb-6">
                  <Link href="/browse" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                      <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Grid3X3 className="h-6 w-6 text-blue-600" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">Browse</span>
                    </div>
                  </Link>
                  <Link href="/featured" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                      <div className="h-11 w-11 rounded-2xl bg-pink-50 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-pink-600" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">Featured</span>
                    </div>
                  </Link>
                  <Link href="/search" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                      <div className="h-11 w-11 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <Search className="h-6 w-6 text-purple-600" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">Search</span>
                    </div>
                  </Link>
                  <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                      <div className="h-11 w-11 rounded-2xl bg-green-50 flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-green-600" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">Plans</span>
                    </div>
                  </Link>
                  <Link href="/help" onClick={() => setMobileMenuOpen(false)}>
                    <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                      <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <HelpCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">Help</span>
                    </div>
                  </Link>
                </div>

                {isAuthenticated && (
                  <>
                    {/* My Account Grid */}
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Account</p>
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      <Link href="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-indigo-600" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Bookings</span>
                        </div>
                      </Link>
                      <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all relative">
                          <div className="h-11 w-11 rounded-2xl bg-sky-50 flex items-center justify-center relative">
                            <MessageSquare className="h-6 w-6 text-sky-600" />
                            {unreadMessages > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {unreadMessages}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Messages</span>
                        </div>
                      </Link>
                      <Link href="/saved-providers" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-rose-50 flex items-center justify-center">
                            <Heart className="h-6 w-6 text-rose-500" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Saved</span>
                        </div>
                      </Link>
                      <Link href="/my-quotes" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-teal-50 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-teal-600" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Quotes</span>
                        </div>
                      </Link>
                      <Link href="/my-waitlist" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-orange-50 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-orange-500" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Waitlist</span>
                        </div>
                      </Link>
                      <Link href="/notifications" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-yellow-50 flex items-center justify-center">
                            <Bell className="h-6 w-6 text-yellow-600" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Alerts</span>
                        </div>
                      </Link>
                      <Link href="/referrals" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <Coins className="h-6 w-6 text-emerald-600" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Referrals</span>
                        </div>
                      </Link>
                      <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                          <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <Settings className="h-6 w-6 text-slate-600" />
                          </div>
                          <span className="text-[11px] font-medium text-center leading-tight">Settings</span>
                        </div>
                      </Link>
                    </div>

                    {/* Provider Grid */}
                    {isProvider && (isProviderView || isAdmin) && (
                      <>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Provider</p>
                        <div className="grid grid-cols-4 gap-2 mb-6">
                          <Link href="/provider/dashboard" onClick={() => setMobileMenuOpen(false)}>
                            <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                              <div className="h-11 w-11 rounded-2xl bg-violet-50 flex items-center justify-center">
                                <LayoutDashboard className="h-6 w-6 text-violet-600" />
                              </div>
                              <span className="text-[11px] font-medium text-center leading-tight">Dashboard</span>
                            </div>
                          </Link>
                        </div>
                      </>
                    )}

                    {/* Admin Grid */}
                    {isAdmin && (
                      <>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Admin</p>
                        <div className="grid grid-cols-4 gap-2 mb-6">
                          <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                            <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl hover:bg-muted/50 active:bg-muted active:scale-95 transition-all">
                              <div className="h-11 w-11 rounded-2xl bg-blue-100 flex items-center justify-center">
                                <Shield className="h-6 w-6 text-blue-700" />
                              </div>
                              <span className="text-[11px] font-medium text-center leading-tight text-blue-700">Admin</span>
                            </div>
                          </Link>
                        </div>
                      </>
                    )}
                  </>
                )}
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
