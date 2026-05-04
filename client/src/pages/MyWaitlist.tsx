import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Clock, Calendar, ArrowLeft, Loader2, ListX } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function MyWaitlist() {
  const { user, isAuthenticated } = useAuth();
  const authLoading = !isAuthenticated && !user;

  const { data: entries, isLoading, refetch } = trpc.waitlist.myEntries.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const leaveWaitlistMutation = trpc.waitlist.leave.useMutation({
    onSuccess: () => {
      toast.success("Removed from waitlist");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-2xl py-12 text-center">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Sign in to view your waitlist</h2>
        <p className="text-muted-foreground mb-6">
          You need to be signed in to manage your waitlist entries.
        </p>
        <a href={getLoginUrl()}>
          <Button>Sign In</Button>
        </a>
      </div>
    );
  }

  const waitingEntries = entries?.filter((e) => e.status === "waiting") || [];
  const notifiedEntries = entries?.filter((e) => e.status === "notified") || [];
  const pastEntries = entries?.filter((e) => ["booked", "expired", "cancelled"].includes(e.status)) || [];

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  };

  const statusColors: Record<string, string> = {
    waiting: "bg-amber-100 text-amber-800 border-amber-200",
    notified: "bg-green-100 text-green-800 border-green-200",
    booked: "bg-blue-100 text-blue-800 border-blue-200",
    expired: "bg-gray-100 text-gray-600 border-gray-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    waiting: "Waiting",
    notified: "Spot Available!",
    booked: "Booked",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  const renderEntry = (entry: any) => (
    <Card key={entry.id} className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{entry.serviceName}</h3>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColors[entry.status] || ""}`}>
                {statusLabels[entry.status] || entry.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(entry.bookingDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
              </span>
            </div>
            {entry.status === "waiting" && (
              <p className="text-xs text-muted-foreground mt-1">
                Position #{entry.position} in queue
              </p>
            )}
            {entry.status === "notified" && (
              <p className="text-xs text-green-700 mt-1 font-medium">
                A spot opened up! Book now before it expires.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            {entry.status === "notified" && (
              <Link href={`/services/${entry.serviceId}`}>
                <Button size="sm" className="h-7 text-xs">
                  Book Now
                </Button>
              </Link>
            )}
            {["waiting", "notified"].includes(entry.status) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => leaveWaitlistMutation.mutate({ id: entry.id })}
                disabled={leaveWaitlistMutation.isPending}
              >
                <BellOff className="h-3 w-3 mr-1" />
                Leave
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/my-bookings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">My Waitlist</h1>
          <p className="text-sm text-muted-foreground">
            Get notified when spots open up in full group classes
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListX className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">No waitlist entries</h3>
            <p className="text-sm text-muted-foreground mb-4">
              When a group class is full, you can tap "Notify Me" to join the waitlist.
              We'll let you know when a spot opens up.
            </p>
            <Link href="/explore">
              <Button variant="outline">Browse Services</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Spots Available - Urgent */}
          {notifiedEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                <Bell className="h-4 w-4" />
                Spots Available ({notifiedEntries.length})
              </h2>
              <div className="space-y-2">
                {notifiedEntries.map(renderEntry)}
              </div>
            </div>
          )}

          {/* Currently Waiting */}
          {waitingEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Waiting ({waitingEntries.length})
              </h2>
              <div className="space-y-2">
                {waitingEntries.map(renderEntry)}
              </div>
            </div>
          )}

          {/* Past Entries */}
          {pastEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                Past ({pastEntries.length})
              </h2>
              <div className="space-y-2">
                {pastEntries.map(renderEntry)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
