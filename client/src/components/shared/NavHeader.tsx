import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import {
  MessageSquare,
  Calendar,
  Bell,
  Menu,
  X,
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
} from "lucide-react";
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
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
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
        <Bell className="h-4 w-4" />
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
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => markAllRead.mutate()}
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
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
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ notificationId: n.id });
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
            onClick={async () => {
              setOpen(false);
              await logout();
              window.location.href = "/";
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
  const { logout } = useAuth();
  return (
    <div className="border-t pt-2 mt-2">
      <Button
        variant="ghost"
        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={async () => {
          onClose();
          await logout();
          window.location.href = "/";
        }}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Log Out
      </Button>
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
              className="h-8 w-8 object-contain rounded-lg"
            />
            <span className="text-lg font-bold gradient-text hidden lg:inline whitespace-nowrap">OlogyCrew</span>
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

                {/* Provider Dashboard — show when in provider view */}
                {isProvider && isProviderView && (
                  <Link href="/provider/dashboard">
                    <Button variant="outline" size="sm" className="text-xs px-2.5">
                      Dashboard
                    </Button>
                  </Link>
                )}

                {/* Admin */}
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="text-xs px-2.5">
                      Admin
                    </Button>
                  </Link>
                )}

                {/* User menu dropdown */}
                <UserMenuDropdown user={user} />
              </>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm">Sign In</Button>
                </a>
                <Link href="/pricing">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t py-4 space-y-2">
            {/* Mobile View Switcher */}
            <div className="px-2 pb-2">
              <ViewModeSwitcherMobile />
            </div>
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Browse Services</Button>
            </Link>
            <Link href="/search" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Search</Button>
            </Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Plans</Button>
            </Link>
            <Link href="/help" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Help</Button>
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start relative">
                    <Calendar className="h-4 w-4 mr-2" />
                    My Bookings
                  </Button>
                </Link>
                <Link href="/saved-providers" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2" />
                    Saved Providers
                  </Button>
                </Link>
                <Link href="/my-quotes" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    My Quotes
                  </Button>
                </Link>
                <Link href="/my-waitlist" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    My Waitlist
                  </Button>
                </Link>
                <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start relative">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge variant="destructive" className="ml-2 text-[10px] h-5">
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/notifications" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start relative">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Button>
                </Link>
                <Link href="/referrals" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Coins className="h-4 w-4 mr-2" />
                    Referral Credits
                  </Button>
                </Link>
                {isProvider && isProviderView && (
                  <Link href="/provider/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Provider Dashboard
                    </Button>
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Admin</Button>
                  </Link>
                )}
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </Button>
                </Link>
                <MobileLogoutButton onClose={() => setMobileMenuOpen(false)} />
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="w-full">Sign In</Button>
              </a>
            )}
            {/* Install App - always visible if not already installed */}
            {!pwaInstalled && (
              <div className="border-t pt-2 mt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    pwaInstall();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
