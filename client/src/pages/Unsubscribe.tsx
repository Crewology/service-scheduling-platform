import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "wouter";
import { useState } from "react";
import { Mail, CheckCircle, AlertCircle, Loader2, ShieldAlert } from "lucide-react";
import { Link } from "wouter";

export default function Unsubscribe() {
  const { token } = useParams<{ token: string }>();
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: prefs, isLoading } = trpc.notification.getByToken.useQuery(
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

  // ── Confirmation step ──
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
              No, Keep My Emails
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-1">
              Prefer to keep some emails?{" "}
              <Link href="/notification-settings" className="text-primary hover:underline">
                Manage individual preferences
              </Link>{" "}
              instead.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Initial landing ──
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Mail className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle>Unsubscribe from Emails</CardTitle>
          <CardDescription>
            This will unsubscribe you from all OlogyCrew email notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefs && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-muted-foreground">
                You are currently receiving:
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {prefs.bookingEmail && <li>Booking updates</li>}
                {prefs.reminderEmail && <li>Appointment reminders</li>}
                {prefs.messageEmail && <li>Message notifications</li>}
                {prefs.paymentEmail && <li>Payment receipts</li>}
                {prefs.marketingEmail && <li>Marketing emails</li>}
              </ul>
            </div>
          )}

          <Button
            className="w-full"
            variant="destructive"
            onClick={() => setShowConfirm(true)}
          >
            Unsubscribe from All Emails
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Or{" "}
            <Link href="/notification-settings" className="text-primary hover:underline">
              manage individual preferences
            </Link>{" "}
            to choose which emails you receive.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
