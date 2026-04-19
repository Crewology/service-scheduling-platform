import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Send, Paperclip, X, FileText, Download, Check, CheckCheck } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";
import { useSSE } from "@/hooks/useSSE";

// Helper to determine if a URL is an image
function isImageUrl(url: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const lower = url.toLowerCase().split("?")[0];
  return imageExts.some(ext => lower.endsWith(ext));
}

// Helper to get file name from URL
function getFileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const parts = path.split("/");
    const raw = parts[parts.length - 1] || "file";
    const cleaned = raw.replace(/^\d+-[a-z0-9]+-/, "");
    return decodeURIComponent(cleaned);
  } catch {
    return "file";
  }
}

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function Messages() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl: string | null;
    base64: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Typing indicator state
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  // Read receipt state — tracks which messages have been read
  const [readConversationAt, setReadConversationAt] = useState<string | null>(null);

  const { data: booking } = trpc.booking.getById.useQuery(
    { id: parseInt(bookingId!) },
    { enabled: isAuthenticated && !!bookingId }
  );

  const { data: messagesList, refetch } = trpc.message.listByBooking.useQuery(
    { bookingId: parseInt(bookingId!) },
    { enabled: isAuthenticated && !!bookingId, refetchInterval: 15000 }
  );

  const { data: service } = trpc.service.getById.useQuery(
    { id: booking?.serviceId || 0 },
    { enabled: !!booking }
  );

  const { data: provider } = trpc.provider.getById.useQuery(
    { id: booking?.providerId || 0 },
    { enabled: !!booking }
  );

  const uploadAttachment = trpc.message.uploadAttachment.useMutation();
  const sendTypingMutation = trpc.message.sendTyping.useMutation();
  const markAsReadMutation = trpc.message.markAsRead.useMutation();

  // Compute conversationId for this chat
  const recipientId = booking && provider && user
    ? (booking.customerId === user.id ? provider.userId : booking.customerId)
    : null;
  const conversationId = user && recipientId
    ? `conv-${Math.min(user.id, recipientId)}-${Math.max(user.id, recipientId)}`
    : null;

  // SSE: listen for typing and read receipt events
  const handleTyping = useCallback((data: any) => {
    if (data.conversationId === conversationId && data.senderId !== user?.id) {
      if (data.isTyping) {
        setOtherUserTyping(true);
        setTypingUserName(data.senderName || "");
        // Auto-clear after 4 seconds if no new typing event
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 4000);
      } else {
        setOtherUserTyping(false);
      }
    }
  }, [conversationId, user?.id]);

  const handleReadReceipt = useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      setReadConversationAt(data.readAt);
      // Refresh messages to update read status
      refetch();
    }
  }, [conversationId, refetch]);

  const handleNewMessage = useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      refetch();
      // Clear typing indicator when a message arrives
      setOtherUserTyping(false);
    }
  }, [conversationId, refetch]);

  useSSE({
    enabled: isAuthenticated,
    onTyping: handleTyping,
    onReadReceipt: handleReadReceipt,
    onNewMessage: handleNewMessage,
  });

  // Mark messages as read when viewing the conversation
  useEffect(() => {
    if (conversationId && isAuthenticated && messagesList && messagesList.length > 0) {
      const hasUnread = messagesList.some((m: any) => m.recipientId === user?.id && !m.isRead);
      if (hasUnread) {
        markAsReadMutation.mutate({ conversationId });
        utils.message.unreadCount.invalidate();
        utils.message.myConversations.invalidate();
      }
    }
  }, [conversationId, messagesList, isAuthenticated, user?.id]);

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setMessage("");
      setPendingAttachment(null);
      refetch();
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesList]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Debounced typing indicator sender
  const handleTypingInput = useCallback((text: string) => {
    setMessage(text);
    if (!conversationId || !recipientId) return;

    const now = Date.now();
    // Only send typing event every 2 seconds
    if (now - lastTypingSentRef.current > 2000 && text.length > 0) {
      lastTypingSentRef.current = now;
      sendTypingMutation.mutate({
        recipientId,
        conversationId,
        isTyping: true,
      });
    }
  }, [conversationId, recipientId, sendTypingMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "text/csv",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not supported. Use images, PDF, Word, Excel, or text files.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      setPendingAttachment({ file, previewUrl, base64 });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const removePendingAttachment = useCallback(() => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  }, [pendingAttachment]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSend = async () => {
    if ((!message.trim() && !pendingAttachment) || !booking || !provider) return;
    
    const rid = booking.customerId === user?.id ? provider.userId : booking.customerId;
    let attachmentUrl: string | undefined;

    if (pendingAttachment) {
      setIsUploading(true);
      try {
        const result = await uploadAttachment.mutateAsync({
          base64: pendingAttachment.base64,
          mimeType: pendingAttachment.file.type,
          fileName: pendingAttachment.file.name,
          fileSize: pendingAttachment.file.size,
        });
        attachmentUrl = result.url;
      } catch (err: any) {
        toast.error(err.message || "Failed to upload attachment");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    sendMessage.mutate({
      recipientId: rid,
      messageText: message.trim(),
      bookingId: parseInt(bookingId!),
      attachmentUrl,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSending = sendMessage.isPending || isUploading;

  // Determine the last message sent by the current user that has been read
  const getReadStatus = (msg: any, index: number) => {
    if (msg.senderId !== user?.id) return null; // Only show on sent messages
    
    if (msg.isRead) {
      // Find if this is the last read message to show "Seen at" timestamp
      const isLastReadByMe = !messagesList?.slice(index + 1).some(
        (m: any) => m.senderId === user?.id && m.isRead
      );
      return {
        status: "read" as const,
        readAt: msg.readAt,
        showTimestamp: isLastReadByMe,
      };
    }
    return { status: "delivered" as const, readAt: null, showTimestamp: false };
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8 max-w-4xl">
        {/* Conversation Header */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">
              {service?.name} - Booking #{booking.bookingNumber}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Conversation with {provider?.businessName}
            </p>
          </CardHeader>
        </Card>

        {/* Messages */}
        <Card className="h-[calc(100vh-16rem)] sm:h-[600px] flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {!messagesList || messagesList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messagesList.map((msg: any, index: number) => {
                  const isMe = msg.senderId === user?.id;
                  const readInfo = getReadStatus(msg, index);
                  return (
                    <div key={msg.id}>
                      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isMe
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {/* Attachment display */}
                          {msg.attachmentUrl && (
                            <MessageAttachment url={msg.attachmentUrl} isMe={isMe} />
                          )}
                          {/* Message text */}
                          {msg.messageText && msg.messageText !== "📎 Attachment" && (
                            <p className="text-sm">{msg.messageText}</p>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                            <p className={`text-xs ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </p>
                            {/* Read receipt checkmarks */}
                            {isMe && readInfo && (
                              <span className={`inline-flex ${readInfo.status === "read" ? "text-blue-300" : "text-primary-foreground/50"}`}>
                                {readInfo.status === "read" ? (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* "Seen" timestamp on last read message */}
                      {isMe && readInfo?.showTimestamp && readInfo.readAt && (
                        <p className="text-[10px] text-muted-foreground text-right mt-0.5 mr-1">
                          Seen {new Date(readInfo.readAt).toLocaleString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {otherUserTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {typingUserName ? `${typingUserName} is typing` : "Typing"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Pending attachment preview */}
          {pendingAttachment && (
            <div className="border-t px-4 pt-3 pb-1">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2 max-w-xs">
                {pendingAttachment.previewUrl ? (
                  <img
                    src={pendingAttachment.previewUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-background rounded flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{pendingAttachment.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(pendingAttachment.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={removePendingAttachment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleFileSelect}
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-10 w-10"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                title="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => handleTypingInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={(!message.trim() && !pendingAttachment) || isSending}
              >
                {isSending ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Inline attachment component for message bubbles
function MessageAttachment({ url, isMe }: { url: string; isMe: boolean }) {
  const fileName = getFileNameFromUrl(url);

  if (isImageUrl(url)) {
    return (
      <div className="mb-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Attachment"
            className="max-w-full max-h-64 rounded-md object-contain cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mb-2 p-2 rounded-md transition-colors ${
        isMe
          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
          : "bg-background/50 hover:bg-background/80"
      }`}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="text-sm truncate flex-1">{fileName}</span>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  );
}
