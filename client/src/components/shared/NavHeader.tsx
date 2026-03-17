import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { MessageSquare, Calendar, Bell, Menu, X, User } from "lucide-react";
import { useState } from "react";

export function NavHeader() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unread message count (polls every 15s)
  const { data: unreadCount } = trpc.message.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  // Unread notifications count
  const { data: notifications } = trpc.notification.list.useQuery(
    { unreadOnly: true },
    { enabled: isAuthenticated, refetchInterval: 30000 }
  );

  const unreadMessages = typeof unreadCount === "number" ? unreadCount : 0;
  const unreadNotifications = notifications?.length || 0;

  const isProvider = user?.role === "provider";
  const isAdmin = user?.role === "admin";

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold gradient-text">
            SkillLink
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

                {/* Notifications */}
                <Link href="/my-bookings">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadNotifications > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 min-w-[16px] flex items-center justify-center p-0 text-[9px]"
                      >
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </Link>

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
