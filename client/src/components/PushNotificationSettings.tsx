import { Bell, BellOff, BellRing, Send, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export function PushNotificationSettings() {
  const { user } = useAuth();

  const {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  if (!user) return null;

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success("Notifications enabled", {
        description: "You'll receive push notifications for bookings, messages, and more.",
      });
    } else if (permission === "denied") {
      toast.error("Notifications blocked", {
        description: "Please enable notifications in your browser settings to receive alerts.",
      });
    }
  };

  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success("Notifications disabled", {
        description: "You won't receive push notifications on this device anymore.",
      });
    }
  };

  const handleTest = async () => {
    const success = await sendTest();
    if (success) {
      toast.success("Test sent!", {
        description: "You should see a notification shortly.",
      });
    } else {
      toast.error("Test failed", {
        description: "Could not send test notification. Try re-enabling notifications.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant alerts on this device for bookings, messages, and updates — even when the app isn't open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <BellOff className="h-5 w-5 shrink-0" />
            <p>Push notifications are not supported in this browser. Try using Chrome, Edge, or Firefox.</p>
          </div>
        ) : permission === "denied" ? (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <BellOff className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Notifications are blocked</p>
              <p className="text-xs mt-0.5">To enable, click the lock icon in your browser's address bar and allow notifications.</p>
            </div>
          </div>
        ) : isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-700 dark:text-green-400">
              <BellRing className="h-5 w-5 shrink-0" />
              <p>Push notifications are <strong>enabled</strong> on this device.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isLoading}
              >
                <Send className="h-4 w-4 mr-1" />
                Send Test
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="text-muted-foreground"
              >
                <BellOff className="h-4 w-4 mr-1" />
                Disable
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <Bell className="h-5 w-5 shrink-0" />
              <p>Push notifications are not enabled on this device.</p>
            </div>
            <Button
              onClick={handleSubscribe}
              disabled={isLoading}
              size="sm"
            >
              <Bell className="h-4 w-4 mr-1" />
              {isLoading ? "Enabling..." : "Enable Push Notifications"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
