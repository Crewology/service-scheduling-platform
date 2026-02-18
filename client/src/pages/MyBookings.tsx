import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, MapPin, DollarSign, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { formatTimeForDisplay } from "@shared/timeSlots";

export default function MyBookings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: bookings, isLoading } = trpc.booking.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
      no_show: "destructive",
      refunded: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const filterBookings = (status?: string[]) => {
    if (!bookings) return [];
    if (!status) return bookings;
    return bookings.filter((b: any) => status.includes(b.status));
  };

  const upcomingBookings = filterBookings(["pending", "confirmed"]);
  const pastBookings = filterBookings(["completed", "cancelled", "no_show", "refunded"]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => setLocation("/")}>
              ← Back
            </Button>
            <h1 className="text-xl font-bold">SkillLink</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">
            Manage and track all your service bookings
          </p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({bookings?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No upcoming bookings</p>
                  <Button onClick={() => setLocation("/browse")}>
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : pastBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No past bookings</p>
                </CardContent>
              </Card>
            ) : (
              pastBookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-12">Loading bookings...</p>
            ) : !bookings || bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No bookings yet</p>
                  <Button onClick={() => setLocation("/browse")}>
                    Browse Services
                  </Button>
                </CardContent>
              </Card>
            ) : (
              bookings.map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} setLocation={setLocation} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BookingCard({ booking, setLocation }: { booking: any; setLocation: (path: string) => void }) {
  const { data: service } = trpc.service.getById.useQuery({ id: booking.serviceId });
  const { data: provider } = trpc.provider.getById.useQuery({ id: booking.providerId });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
      no_show: "destructive",
      refunded: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{service?.name || "Loading..."}</CardTitle>
            <CardDescription>
              by {provider?.businessName || "Loading..."}
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1">
              Booking #{booking.bookingNumber}
            </p>
          </div>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatDate(booking.bookingDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {formatTimeForDisplay(booking.startTime)} - {formatTimeForDisplay(booking.endTime)}
            </span>
          </div>
          {booking.locationType === "mobile" && booking.serviceAddressLine1 && (
            <div className="flex items-center gap-2 md:col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {booking.serviceAddressLine1}, {booking.serviceCity}, {booking.serviceState}
              </span>
            </div>
          )}
          {booking.totalPrice && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">${booking.totalPrice}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation(`/booking/${booking.id}`)}
          >
            View Details
          </Button>
          {(booking.status === "pending" || booking.status === "confirmed") && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/messages/${booking.id}`)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Provider
            </Button>
          )}
          {booking.status === "completed" && !booking.reviewId && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setLocation(`/review/${booking.id}`)}
            >
              Leave Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
