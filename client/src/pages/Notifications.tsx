import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { NavHeader } from "@/components/shared/NavHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  CheckCheck,
  Settings,
  ArrowLeft,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

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
    case "payment_failed":
      return "⚠️";
    case "message_received":
      return "💬";
    case "review_received":
      return "⭐";
    case "subscription_cancelled":
    case "subscription_updated":
      return "📋";
    default:
      return "🔔";
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function typeLabel(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Notifications() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  const { data: notifications, isLoading } = trpc.notification.list.useQuery(
    { unreadOnly: false },
    { enabled: isAuthenticated }
  );

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

  const deleteNotification = trpc.notification.deleteNotification.useMutation({
    onMutate: async ({ notificationId }) => {
      // Optimistic update: remove from cache immediately
      await utils.notification.list.cancel();
      const prev = utils.notification.list.getData({ unreadOnly: false });
      utils.notification.list.setData({ unreadOnly: false }, (old: any) =>
        old ? old.filter((n: any) => n.id !== notificationId) : []
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.notification.list.setData({ unreadOnly: false }, context.prev);
      }
      toast.error("Failed to delete notification");
    },
    onSettled: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const clearAll = trpc.notification.clearAll.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      toast.success("All notifications cleared");
      setShowClearAllDialog(false);
    },
    onError: () => {
      toast.error("Failed to clear notifications");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-16 text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view notifications</h1>
          <p className="text-muted-foreground mb-6">
            You need to be signed in to see your notifications.
          </p>
          <a href={getLoginUrl()}>
            <Button>Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container max-w-3xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications && notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearAllDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
            <Link href="/notification-settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h2 className="text-lg font-medium mb-1">No notifications</h2>
              <p className="text-sm text-muted-foreground">
                You're all caught up! We'll notify you when something important happens.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {notifications.map((n: any) => (
              <Card
                key={n.id}
                className={`group cursor-pointer transition-all hover:shadow-sm ${
                  !n.isRead ? "border-primary/20 bg-primary/[0.02]" : ""
                }`}
                onClick={() => {
                  if (!n.isRead) markRead.mutate({ notificationId: n.id });
                  if (n.actionUrl) window.location.href = n.actionUrl;
                }}
              >
                <CardContent className="flex gap-4 py-4 px-5">
                  <span className="text-xl mt-0.5 shrink-0">
                    {getIcon(n.notificationType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-snug ${
                          !n.isRead ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(n.createdAt)}
                        </span>
                        {!n.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        {/* Delete button - visible on hover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate({ notificationId: n.id });
                          }}
                          title="Delete notification"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {n.message}
                    </p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {typeLabel(n.notificationType)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => clearAll.mutate()}
              disabled={clearAll.isPending}
            >
              {clearAll.isPending ? "Clearing..." : "Clear All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
