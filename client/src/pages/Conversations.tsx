import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MessageSquare, ArrowRight, Inbox } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";

export default function Conversations() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: conversations, isLoading } = trpc.message.myConversations.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-8 max-w-3xl">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-8 max-w-3xl">
        <PageHeader
          title="Messages"
          subtitle="Your conversations with providers and customers"
        />

        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-16 text-center">
              <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-sm mb-6">
                When you book a service or receive a booking, you can message the other party here.
              </p>
              <Button onClick={() => setLocation("/browse")} variant="outline">
                Browse Services
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 mt-6">
            {conversations.map((conv: any) => {
              const isUnread = conv.unreadCount > 0;
              const otherName = conv.otherUserName || "Unknown User";
              const lastMsg = conv.lastMessage || "";
              const preview = lastMsg.length > 80 ? lastMsg.slice(0, 80) + "..." : lastMsg;
              const timeStr = conv.lastAt ? formatTimeAgo(new Date(conv.lastAt)) : "";

              return (
                <Card
                  key={conv.conversationId}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    isUnread ? "border-primary/30 bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (conv.bookingId) {
                      setLocation(`/messages/${conv.bookingId}`);
                    }
                  }}
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {conv.otherUserPhoto ? (
                          <img
                            src={conv.otherUserPhoto}
                            alt={otherName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={`text-sm truncate ${isUnread ? "font-semibold" : "font-medium"}`}>
                            {otherName}
                          </h4>
                          <span className="text-xs text-muted-foreground shrink-0">{timeStr}</span>
                        </div>
                        {conv.bookingLabel && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.bookingLabel}
                          </p>
                        )}
                        <p className={`text-sm truncate mt-0.5 ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                          {preview || "No messages yet"}
                        </p>
                      </div>

                      {/* Unread badge + arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isUnread && (
                          <span className="h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
