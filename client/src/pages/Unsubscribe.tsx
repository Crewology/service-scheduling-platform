import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Mail, CheckCircle, AlertCircle, Loader2, ShieldAlert, Bell, Calendar, MessageSquare, CreditCard, Megaphone } from "lucide-react";
import { Link } from "wouter";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const EMAIL_TYPES = [
  { key: "bookingEmail" as const, label: "Booking Updates", description: "Confirmations, cancellations, and status changes", icon: Calendar },
  { key: "reminderEmail" as const, label: "Appointment Reminders", description: "Upcoming booking reminders (24 hours before)", icon: Bell },
  { key: "messageEmail" as const, label: "Message Notifications", description: "New messages from providers or customers", icon: MessageSquare },
  { key: "paymentEmail" as const, label: "Payment & Receipts", description: "Payment confirmations, refunds, and receipts", icon: CreditCard },
  { key: "marketingEmail" as const, label: "Promotions & Updates", description: "New features, tips, and special offers", icon: Megaphone },
];

export default function Unsubscribe() {
  const { token } = useParams<{ token: string }>();
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Record<string, boolean>>({});

  const { data: prefs, isLoading, refetch } = trpc.notification.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const unsubscribeMutation = trpc.notification.unsubscribe.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setUnsubscribed(true);
        setShowConfirm(false);
      }
    },
  });

  const updateMutation = trpc.notification.updatePreferencesByToken.useMutation({
    onSuccess: (data) => {
      if (data.success && data.prefs) {
        setLocalPrefs(data.prefs);
        setSaved(true);
        toast.success("Email preferences updated");
        setTimeout(() => setSaved(false), 3000);
      }
    },
    onError: () => {
      toast.error("Failed to update preferences");
    },
  });

  // Initialize local prefs from server data
  useEffect(() => {
    if (prefs) {
      setLocalPrefs({
        bookingEmail: prefs.bookingEmail,
        reminderEmail: prefs.reminderEmail,
        messageEmail: prefs.messageEmail,
        paymentEmail: prefs.paymentEmail,
        marketingEmail: prefs.marketingEmail,
      });
    }
  }, [prefs]);

  const handleToggle = (key: string, value: boolean) => {
    const newPrefs = { ...localPrefs, [key]: value };
    setLocalPrefs(newPrefs);
    // Auto-save on toggle
    updateMutation.mutate({
      token: token || "",
      [key]: value,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prefs && !unsubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-sm text-muted-foreground mb-6">
              This unsubscribe link is invalid or has expired. If you want to manage your
              notification preferences, please sign in to your account.
            </p>
            <Link href="/">
              <Button>Go to OlogyCrew</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-bold mb-2">Unsubscribed Successfully</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You've been unsubscribed from all OlogyCrew email notifications.
              You can re-enable them at any time from your notification settings.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/">
                <Button variant="outline">Go to OlogyCrew</Button>
              </Link>
              <Link href="/notification-settings">
                <Button>Manage Preferences</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Confirmation step for unsubscribe all ──
  if (showConfirm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-amber-200">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2">
              <ShieldAlert className="h-10 w-10 text-amber-500" />
            </div>
            <CardTitle>Are you sure?</CardTitle>
            <CardDescription>
              You will stop receiving <strong>all</strong> email notifications from OlogyCrew,
              including booking confirmations, payment receipts, and appointment reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="destructive"
              onClick={() => unsubscribeMutation.mutate({ token: token || "" })}
              disabled={unsubscribeMutation.isPending}
            >
              {unsubscribeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unsubscribing...
                </>
              ) : (
                "Yes, Unsubscribe from All Emails"
              )}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={unsubscribeMutation.isPending}
            >
              No, Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main page: Granular per-type toggles ──
  const enabledCount = Object.values(localPrefs).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Mail className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>
            Choose which emails you'd like to receive from OlogyCrew. Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Per-type toggles */}
          <div className="space-y-3">
            {EMAIL_TYPES.map(({ key, label, description, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  checked={localPrefs[key] ?? true}
                  onCheckedChange={(value) => handleToggle(key, value)}
                  disabled={updateMutation.isPending}
                />
              </div>
            ))}
          </div>

          {/* Status indicator */}
          {saved && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Preferences saved
            </div>
          )}

          {/* Summary */}
          <div className="pt-2 border-t">
            <p className="text-xs text-center text-muted-foreground">
              You're receiving {enabledCount} of {EMAIL_TYPES.length} email types.
            </p>
          </div>

          {/* Unsubscribe all option */}
          <div className="pt-2">
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirm(true)}
            >
              Unsubscribe from All Emails
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can also{" "}
            <Link href="/notification-settings" className="text-primary hover:underline">
              manage all notification settings
            </Link>{" "}
            from your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
