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
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: notifData } = trpc.notification.list.useQuery(
    { unreadOnly: false },
    { refetchInterval: 15000 }
  );
  const { data: countData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 15000,
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
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-lg shadow-xl border z-[100] overflow-hidden">
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

export function NavHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unread message count (polls every 15s)
  const { data: unreadCount } = trpc.message.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const unreadMessages = typeof unreadCount === "number" ? unreadCount : 0;

  const isProvider = user?.role === "provider";
  const isAdmin = user?.role === "admin";

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold gradient-text">
            OlogyCrew
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
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
          </nav>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* My Bookings */}
                <Link href="/my-bookings">
                  <Button variant="ghost" size="sm" className="relative">
                    <Calendar className="h-4 w-4 mr-1" />
                    My Bookings
                  </Button>
                </Link>

                {/* Messages with unread badge */}
                <Link href="/my-bookings">
                  <Button variant="ghost" size="sm" className="relative">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px]"
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* Notifications Dropdown */}
                <NotificationDropdown />

                {/* Provider Dashboard */}
                {isProvider && (
                  <Link href="/provider/dashboard">
                    <Button variant="outline" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                )}

                {/* Admin */}
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      Admin
                    </Button>
                  </Link>
                )}

                {/* User profile */}
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <User className="h-4 w-4" />
                    {user?.name || user?.email}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm">Sign In</Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button size="sm">Get Started</Button>
                </a>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            <Link href="/browse" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Browse Services</Button>
            </Link>
            <Link href="/search" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">Search</Button>
            </Link>
            {isAuthenticated ? (
              <>
                <Link href="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start relative">
                    <Calendar className="h-4 w-4 mr-2" />
                    My Bookings
                  </Button>
                </Link>
                <Link href="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
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
                {isProvider && (
                  <Link href="/provider/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
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
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="w-full">Sign In</Button>
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
