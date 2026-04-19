import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { MessageSquare, ArrowRight, Inbox, Search, X, Calendar, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";
import { useSSE } from "@/hooks/useSSE";
import { useCallback, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export default function Conversations() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [sseConnected, setSseConnected] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const { data: conversations, isLoading } = trpc.message.myConversations.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: sseConnected ? 60000 : 15000,
  });

  // Search query — only fires when user submits
  const { data: searchResults, isLoading: isSearching } = trpc.message.searchMessages.useQuery(
    {
      query: activeSearch,
      dateFrom: searchDateFrom || undefined,
      dateTo: searchDateTo || undefined,
    },
    {
      enabled: isAuthenticated && activeSearch.length > 0,
    }
  );

  // SSE real-time updates
  const handleNewMessage = useCallback((data: any) => {
    utils.message.myConversations.invalidate();
    utils.message.unreadCount.invalidate();
  }, [utils]);

  const handleNotification = useCallback((data: any) => {
    if (data.notificationType === "message_received") {
      utils.message.myConversations.invalidate();
    }
  }, [utils]);

  useSSE({
    enabled: isAuthenticated,
    onNewMessage: handleNewMessage,
    onNotification: handleNotification,
    onConnected: () => setSseConnected(true),
    onDisconnected: () => setSseConnected(false),
  });

  // Auto-open a specific conversation if linked from notification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conversation");
    if (convId && conversations && conversations.length > 0) {
      const match = conversations.find((c: any) => c.conversationId === convId);
      if (match?.bookingId) {
        setLocation(`/messages/${match.bookingId}`);
      }
    }
  }, [conversations, setLocation]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveSearch(searchQuery.trim());
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchDateFrom("");
    setSearchDateTo("");
    setActiveSearch("");
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Group search results by conversation
  const groupedResults = useMemo(() => {
    if (!searchResults) return [];
    const groups = new Map<string, { otherUserName: string; messages: typeof searchResults }>();
    for (const msg of searchResults) {
      if (!groups.has(msg.conversationId)) {
        groups.set(msg.conversationId, { otherUserName: msg.otherUserName, messages: [] });
      }
      groups.get(msg.conversationId)!.messages.push(msg);
    }
    return Array.from(groups.entries()).map(([convId, data]) => ({
      conversationId: convId,
      otherUserName: data.otherUserName,
      messages: data.messages,
    }));
  }, [searchResults]);

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
        <div className="flex items-center justify-between">
          <PageHeader
            title="Messages"
            subtitle="Your conversations with providers and customers"
          />
          <div className="flex items-center gap-2">
            {sseConnected && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
            <Button
              variant={searchOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) clearSearch();
              }}
              title="Search messages"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Panel */}
        {searchOpen && (
          <Card className="mt-4 mb-4">
            <CardContent className="py-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    autoFocus
                  />
                </div>
                <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                  <Search className="h-4 w-4 mr-1.5" />
                  Search
                </Button>
                {activeSearch && (
                  <Button variant="ghost" size="icon" onClick={clearSearch} title="Clear search">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {/* Date filters */}
              <div className="flex gap-3 mt-3 items-center">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex gap-2 items-center text-sm">
                  <span className="text-muted-foreground">From</span>
                  <Input
                    type="date"
                    value={searchDateFrom}
                    onChange={(e) => setSearchDateFrom(e.target.value)}
                    className="h-8 w-auto"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={searchDateTo}
                    onChange={(e) => setSearchDateTo(e.target.value)}
                    className="h-8 w-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search Results */}
        {activeSearch ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                {isSearching
                  ? "Searching..."
                  : searchResults
                    ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${activeSearch}"`
                    : "No results"}
              </p>
            </div>

            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : groupedResults.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    No messages found matching "{activeSearch}"
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groupedResults.map((group) => (
                  <div key={group.conversationId}>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
                      Conversation with {group.otherUserName}
                    </p>
                    <div className="space-y-1.5">
                      {group.messages.map((msg: any) => (
                        <Card
                          key={msg.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            if (msg.bookingId) {
                              setLocation(`/messages/${msg.bookingId}`);
                            } else {
                              toast.info("This message is from a direct conversation.");
                            }
                          }}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium">
                                    {msg.isFromMe ? "You" : msg.otherUserName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(msg.createdAt).toLocaleString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground">
                                  <HighlightText text={msg.messageText} query={activeSearch} />
                                </p>
                                {msg.attachmentUrl && (
                                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <FileText className="h-3 w-3" />
                                    <span>Attachment</span>
                                  </div>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Conversations List */
          <>
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
                    You can also start a conversation from any provider's profile page.
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
                        } else {
                          toast.info("This conversation doesn't have a linked booking yet. Messages will appear once a booking is created.");
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
          </>
        )}
      </div>
    </div>
  );
}

// Highlight matching text in search results
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
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
