import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Send, Paperclip, X, FileText, Image as ImageIcon, Download } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";

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
    // Remove the timestamp-hash prefix (e.g., "1234567890-abc12345-")
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

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl: string | null;
    base64: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: booking } = trpc.booking.getById.useQuery(
    { id: parseInt(bookingId!) },
    { enabled: isAuthenticated && !!bookingId }
  );

  const { data: messages, refetch } = trpc.message.listByBooking.useQuery(
    { bookingId: parseInt(bookingId!) },
    { enabled: isAuthenticated && !!bookingId, refetchInterval: 5000 }
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
  }, [messages]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

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

    // Read as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      setPendingAttachment({ file, previewUrl, base64 });
    };
    reader.readAsDataURL(file);

    // Reset file input so the same file can be re-selected
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
    
    const recipientId = booking.customerId === user?.id ? provider.userId : booking.customerId;
    let attachmentUrl: string | undefined;

    // Upload attachment first if present
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
      recipientId,
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
              {!messages || messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {/* Attachment display */}
                        {msg.attachmentUrl && (
                          <MessageAttachment
                            url={msg.attachmentUrl}
                            isMe={isMe}
                          />
                        )}
                        {/* Message text (skip if it's just the placeholder) */}
                        {msg.messageText && msg.messageText !== "📎 Attachment" && (
                          <p className="text-sm">{msg.messageText}</p>
                        )}
                        <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleFileSelect}
              />
              {/* Attachment button */}
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
                onChange={(e) => setMessage(e.target.value)}
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

  // Non-image file
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
