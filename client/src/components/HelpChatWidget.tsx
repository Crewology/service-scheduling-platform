import { useState, useCallback } from "react";
import { MessageCircleQuestion, X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "How do I book a service?",
  "How do I become a provider?",
  "How do I set up my availability?",
  "What are the subscription plans?",
  "How do I connect Stripe for payments?",
  "Tips to grow my business on OlogyCrew",
];

export function HelpChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const chatMutation = trpc.helpChat.chat.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: response.content as string },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or visit our Help Center for detailed guides.",
        },
      ]);
    },
  });

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMessages: Message[] = [
        ...messages,
        { role: "user", content },
      ];
      setMessages(newMessages);
      chatMutation.mutate({ messages: newMessages });
    },
    [messages, chatMutation]
  );

  const handleToggle = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && !isMinimized && (
        <div
          className={cn(
            "fixed bottom-20 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)]",
            "rounded-2xl border border-border bg-background shadow-2xl",
            "flex flex-col overflow-hidden",
            "animate-in slide-in-from-bottom-4 fade-in duration-300"
          )}
          style={{ height: "min(600px, calc(100vh - 8rem))" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <MessageCircleQuestion className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  OlogyCrew Assistant
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ask me anything about the platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleMinimize}
                title="Minimize"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClose}
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-hidden">
            <AIChatBox
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={chatMutation.isPending}
              placeholder="Ask about OlogyCrew..."
              height="100%"
              emptyStateMessage="Hi! I'm the OlogyCrew Assistant. Ask me how to use the platform, get tips for your business, or learn about features."
              suggestedPrompts={SUGGESTED_PROMPTS}
              className="border-0 shadow-none rounded-none"
            />
          </div>
        </div>
      )}

      {/* Minimized Bar */}
      {isOpen && isMinimized && (
        <div
          className={cn(
            "fixed bottom-20 right-4 z-50",
            "rounded-full border border-border bg-background shadow-lg px-4 py-2",
            "flex items-center gap-2 cursor-pointer hover:shadow-xl transition-shadow",
            "animate-in slide-in-from-bottom-2 fade-in duration-200"
          )}
          onClick={() => setIsMinimized(false)}
        >
          <MessageCircleQuestion className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            OlogyCrew Assistant
          </span>
          {messages.length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {messages.filter((m) => m.role === "assistant").length}
            </span>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed bottom-4 right-4 z-50",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "hover:scale-105 hover:shadow-xl active:scale-95",
          "transition-all duration-200",
          isOpen && !isMinimized && "rotate-0"
        )}
        title="Help Assistant"
        aria-label="Open help assistant"
      >
        {isOpen && !isMinimized ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircleQuestion className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
