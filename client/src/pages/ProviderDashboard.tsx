import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Calendar, 
  DollarSign, 
  Package, 
  Star,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  Eye,
  XCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { NavHeader } from "@/components/shared/NavHeader";
import { formatCurrency } from "@/lib/dateUtils";

export default function ProviderDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const utils = trpc.useUtils();

  const [editingService, setEditingService] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [serviceForm, setServiceForm] = useState<any>({});
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  
  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: services } = trpc.service.listMine.useQuery(undefined, {
    enabled: !!provider,
  });
  
  const { data: bookings } = trpc.booking.listForProvider.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: earnings } = trpc.provider.earnings.useQuery(undefined, {
    enabled: !!provider,
  });

  const updateBookingStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      utils.booking.listForProvider.invalidate();
      utils.provider.earnings.invalidate();
      toast.success("Booking updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateService = trpc.service.update.useMutation({
    onSuccess: () => {
      utils.service.listMine.invalidate();
      setEditingService(null);
      toast.success("Service updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteService = trpc.service.delete.useMutation({
    onSuccess: () => {
      utils.service.listMine.invalidate();
      setDeletingServiceId(null);
      toast.success("Service deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProvider = trpc.provider.update.useMutation({
    onSuccess: () => {
      utils.provider.getMyProfile.invalidate();
      setEditingProfile(false);
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(err.message),
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

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Create Provider Profile</CardTitle>
            <CardDescription>
              You need to create a provider profile to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/provider/onboarding")} className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
  const totalServices = services?.length || 0;

  const openEditProfile = () => {
    setProfileForm({
      businessName: provider.businessName || "",
      description: provider.description || "",
      addressLine1: provider.addressLine1 || "",
      city: provider.city || "",
      state: provider.state || "",
      postalCode: provider.postalCode || "",
      serviceRadiusMiles: provider.serviceRadiusMiles || 0,
      acceptsMobile: provider.acceptsMobile,
      acceptsFixedLocation: provider.acceptsFixedLocation,
      acceptsVirtual: provider.acceptsVirtual,
    });
    setEditingProfile(true);
  };

  const openEditService = (service: any) => {
    setServiceForm({
      id: service.id,
      name: service.name || "",
      description: service.description || "",
      basePrice: service.basePrice || "",
      hourlyRate: service.hourlyRate || "",
      durationMinutes: service.durationMinutes || 60,
      cancellationPolicy: service.cancellationPolicy || "",
    });
    setEditingService(service);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {provider.businessName}!</h1>
            <p className="text-muted-foreground">Manage your services, bookings, and availability</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={provider.verificationStatus === "verified" ? "default" : "secondary"}>
                {provider.verificationStatus}
              </Badge>
              {provider.averageRating && parseFloat(provider.averageRating) > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  {parseFloat(provider.averageRating).toFixed(1)} ({provider.totalReviews} reviews)
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={openEditProfile}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingBookings}</div>
              <p className="text-xs text-muted-foreground">Awaiting your response</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{confirmedBookings}</div>
              <p className="text-xs text-muted-foreground">Upcoming bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Services</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalServices}</div>
              <p className="text-xs text-muted-foreground">Services offered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Number(earnings?.totalEarnings || 0))}</div>
              <p className="text-xs text-muted-foreground">From completed jobs</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="services">My Services</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Bookings</h2>
            </div>

            {!bookings || bookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No bookings yet</p>
                  <p className="text-sm text-muted-foreground">
                    Bookings will appear here once customers start booking your services
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking: any) => (
                  <Card key={booking.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{booking.bookingNumber}</CardTitle>
                          <CardDescription>
                            {new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                          </CardDescription>
                        </div>
                        <Badge variant={
                          booking.status === "pending" ? "secondary" :
                          booking.status === "confirmed" ? "default" :
                          booking.status === "completed" ? "outline" :
                          "destructive"
                        }>
                          {booking.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium mb-1">Location</p>
                          <p className="text-sm text-muted-foreground capitalize">{booking.locationType?.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Duration</p>
                          <p className="text-sm text-muted-foreground">{booking.durationMinutes} minutes</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Total Amount</p>
                          <p className="text-sm font-semibold">{formatCurrency(parseFloat(booking.totalAmount || "0"))}</p>
                        </div>
                      </div>
                      {booking.customerNotes && (
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">Customer Notes</p>
                          <p className="text-sm text-muted-foreground">{booking.customerNotes}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {booking.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "confirmed" })}
                              disabled={updateBookingStatus.isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "cancelled", cancellationReason: "Declined by provider" })}
                              disabled={updateBookingStatus.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        {booking.status === "confirmed" && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "in_progress" })}
                              disabled={updateBookingStatus.isPending}
                            >
                              Start Service
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "cancelled", cancellationReason: "Cancelled by provider" })}
                              disabled={updateBookingStatus.isPending}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {booking.status === "in_progress" && (
                          <Button 
                            size="sm" 
                            onClick={() => updateBookingStatus.mutate({ id: booking.id, status: "completed" })}
                            disabled={updateBookingStatus.isPending}
                          >
                            Mark Complete
                          </Button>
                        )}
                        <Link href={`/booking/${booking.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/messages/${booking.id}`}>
                          <Button size="sm" variant="ghost">
                            Message Customer
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Services</h2>
              <Link href="/provider/services/new">
                <Button>Add Service</Button>
              </Link>
            </div>

            {!services || services.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No services yet</p>
                  <Link href="/provider/services/new">
                    <Button>Create Your First Service</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service: any) => (
                  <Card key={service.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {service.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {service.pricingModel === "fixed" && service.basePrice && (
                          <p className="font-semibold text-primary">{formatCurrency(parseFloat(service.basePrice))}</p>
                        )}
                        {service.pricingModel === "hourly" && service.hourlyRate && (
                          <p className="font-semibold text-primary">{formatCurrency(parseFloat(service.hourlyRate))}/hour</p>
                        )}
                        <p className="text-muted-foreground capitalize">{service.serviceType.replace('_', ' ')}</p>
                        {service.durationMinutes && (
                          <p className="text-muted-foreground">{service.durationMinutes} min</p>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditService(service)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                        <Link href={`/service/${service.id}`} className="flex-1">
                          <Button size="sm" variant="ghost" className="w-full">
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeletingServiceId(service.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Availability Tab */}
          <TabsContent value="availability" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Manage Availability</h2>
            </div>
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Manage your availability</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Set your weekly schedule and manage date-specific overrides
                </p>
                <Button onClick={() => setLocation("/provider/availability")}>
                  Manage Availability
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Customer Reviews</h2>
            </div>
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Manage customer reviews</p>
                <p className="text-sm text-muted-foreground mb-4">
                  View and respond to customer feedback
                </p>
                <Button onClick={() => setLocation("/provider/reviews")}>
                  View Reviews
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Earnings</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <Wallet className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(Number(earnings?.totalEarnings || 0))}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(Number(earnings?.thisMonthEarnings || 0))}</div>
                  <p className="text-xs text-muted-foreground">Current month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(Number(earnings?.pendingPayouts || 0))}</div>
                  <p className="text-xs text-muted-foreground">From confirmed bookings</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{earnings?.completedBookings || 0}</div>
                  <p className="text-xs text-muted-foreground">Total completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Completed bookings list */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Completed Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings?.filter(b => b.status === "completed").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No completed bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {bookings?.filter(b => b.status === "completed").slice(0, 10).map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{booking.bookingNumber}</p>
                          <p className="text-xs text-muted-foreground">{new Date(booking.bookingDate).toLocaleDateString()}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(parseFloat(booking.subtotal || "0"))}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Business Profile</DialogTitle>
            <DialogDescription>Update your business information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Business Name</Label>
              <Input value={profileForm.businessName || ""} onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={profileForm.description || ""} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input value={profileForm.city || ""} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={profileForm.state || ""} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Address</Label>
                <Input value={profileForm.addressLine1 || ""} onChange={e => setProfileForm({ ...profileForm, addressLine1: e.target.value })} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={profileForm.postalCode || ""} onChange={e => setProfileForm({ ...profileForm, postalCode: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Service Radius (miles)</Label>
              <Input type="number" value={profileForm.serviceRadiusMiles || 0} onChange={e => setProfileForm({ ...profileForm, serviceRadiusMiles: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={profileForm.acceptsMobile || false} onChange={e => setProfileForm({ ...profileForm, acceptsMobile: e.target.checked })} />
                Mobile
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={profileForm.acceptsFixedLocation || false} onChange={e => setProfileForm({ ...profileForm, acceptsFixedLocation: e.target.checked })} />
                Fixed Location
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={profileForm.acceptsVirtual || false} onChange={e => setProfileForm({ ...profileForm, acceptsVirtual: e.target.checked })} />
                Virtual
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
            <Button onClick={() => updateProvider.mutate(profileForm)} disabled={updateProvider.isPending}>
              {updateProvider.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service Name</Label>
              <Input value={serviceForm.name || ""} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={serviceForm.description || ""} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Price ($)</Label>
                <Input type="number" step="0.01" value={serviceForm.basePrice || ""} onChange={e => setServiceForm({ ...serviceForm, basePrice: e.target.value })} />
              </div>
              <div>
                <Label>Hourly Rate ($)</Label>
                <Input type="number" step="0.01" value={serviceForm.hourlyRate || ""} onChange={e => setServiceForm({ ...serviceForm, hourlyRate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={serviceForm.durationMinutes || 60} onChange={e => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) || 60 })} />
            </div>
            <div>
              <Label>Cancellation Policy</Label>
              <Textarea value={serviceForm.cancellationPolicy || ""} onChange={e => setServiceForm({ ...serviceForm, cancellationPolicy: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
            <Button onClick={() => updateService.mutate(serviceForm)} disabled={updateService.isPending}>
              {updateService.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Confirmation */}
      <Dialog open={!!deletingServiceId} onOpenChange={() => setDeletingServiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot be undone. Existing bookings for this service will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingServiceId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingServiceId && deleteService.mutate({ id: deletingServiceId })} disabled={deleteService.isPending}>
              {deleteService.isPending ? "Deleting..." : "Delete Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
