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
  CreditCard,
  Link2,
  Copy,
  ExternalLink,
  AlertCircle,
  Image as ImageIcon,
  Crown,
  Code2,
  BarChart3,
  Users,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Smartphone,
  CalendarPlus,
  Clipboard,
  Tag,
  FileCheck,
  Upload,
  FileText,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { NavHeader } from "@/components/shared/NavHeader";
import { formatCurrency } from "@/lib/dateUtils";
import { PhotoUpload } from "@/components/PhotoUpload";

// ============================================================================
// SERVICE PHOTOS MANAGER
// ============================================================================
function ServicePhotosManager({ serviceId, onClose }: { serviceId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: photos, refetch } = trpc.service.getPhotos.useQuery({ serviceId });

  return (
    <div>
      <PhotoUpload
        serviceId={serviceId}
        existingPhotos={(photos || []).map((p: any) => ({
          id: p.id,
          url: p.photoUrl,
          caption: p.caption,
          displayOrder: p.sortOrder || 0,
        }))}
        maxPhotos={5}
        onPhotosChanged={() => {
          refetch();
          utils.service.listByProvider.invalidate();
        }}
      />
    </div>
  );
}

// ============================================================================
// STRIPE CONNECT SECTION
// ============================================================================
function StripeConnectSection({ provider }: { provider: any }) {
  const { data: connectStatus, isLoading } = trpc.stripeConnect.getStatus.useQuery();
  const { data: balance } = trpc.stripeConnect.getBalance.useQuery(undefined, {
    enabled: connectStatus?.connected && connectStatus?.chargesEnabled,
  });

  const startOnboarding = trpc.stripeConnect.startOnboarding.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success("Stripe onboarding opened in a new tab");
    },
    onError: (err) => toast.error(err.message),
  });

  const getDashboardLink = trpc.stripeConnect.getDashboardLink.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
    },
    onError: (err) => toast.error(err.message),
  });

  const getOnboardingLink = trpc.stripeConnect.getOnboardingLink.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success("Onboarding resumed in a new tab");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="animate-pulse text-muted-foreground">Loading payment status...</div>;
  }

  // Not connected yet
  if (!connectStatus?.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Accept Payments</h2>
          <p className="text-muted-foreground mt-1">Connect your Stripe account to receive payments directly from clients</p>
        </div>

        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Set Up Payments</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                Connect with Stripe to accept credit cards, debit cards, and other payment methods.
                Payments go directly to your bank account — the platform takes just a 1% service fee.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => startOnboarding.mutate({ origin: window.location.origin })}
              disabled={startOnboarding.isPending}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {startOnboarding.isPending ? "Setting up..." : "Connect with Stripe"}
            </Button>
            <p className="text-xs text-muted-foreground">You'll be redirected to Stripe to complete setup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">1</div>
              <p>Connect your Stripe account (takes about 5 minutes)</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">2</div>
              <p>Clients pay when they book your services</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">3</div>
              <p>Money goes directly to your bank account (minus 1% platform fee)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected but onboarding incomplete
  if (!connectStatus.detailsSubmitted || connectStatus.status === "onboarding") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Complete Payment Setup</h2>
          <p className="text-muted-foreground mt-1">Your Stripe account needs additional information</p>
        </div>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Onboarding Incomplete</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                Stripe needs more information to activate your account. Click below to continue where you left off.
              </p>
            </div>
            <Button
              onClick={() => getOnboardingLink.mutate({ origin: window.location.origin })}
              disabled={getOnboardingLink.isPending}
            >
              {getOnboardingLink.isPending ? "Loading..." : "Continue Setup"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fully connected
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payments</h2>
          <p className="text-muted-foreground mt-1">Your Stripe account is connected and active</p>
        </div>
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="w-3 h-3" /> Active
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance?.available || 0)}</div>
            <p className="text-xs text-muted-foreground">Ready for payout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance?.pending || 0)}</div>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payouts</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectStatus.payoutsEnabled ? "Enabled" : "Pending"}</div>
            <p className="text-xs text-muted-foreground">Direct to your bank</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage Your Payments</CardTitle>
          <CardDescription>View detailed transaction history, manage payouts, and update your bank info on Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => getDashboardLink.mutate()}
            disabled={getDashboardLink.isPending}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {getDashboardLink.isPending ? "Loading..." : "Open Stripe Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PUBLIC PROFILE SECTION
// ============================================================================
function PublicProfileSection({ provider }: { provider: any }) {
  const utils = trpc.useUtils();
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState("");

  const generateSlug = trpc.provider.generateSlug.useMutation({
    onSuccess: (data) => {
      utils.provider.getMyProfile.invalidate();
      toast.success(`Profile URL created: /p/${data.slug}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSlug = trpc.provider.updateSlug.useMutation({
    onSuccess: (data) => {
      utils.provider.getMyProfile.invalidate();
      setEditingSlug(false);
      toast.success(`Profile URL updated to /p/${data.slug}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const profileUrl = provider.profileSlug
    ? `${window.location.origin}/p/${provider.profileSlug}`
    : null;

  const copyUrl = () => {
    if (profileUrl) {
      navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied to clipboard!");
    }
  };

  if (!provider.profileSlug) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Your Public Page</h2>
          <p className="text-muted-foreground mt-1">Create a shareable profile page — your own mini-website</p>
        </div>

        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Link2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Create Your Public Profile</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                Get a shareable link that shows your services, reviews, and business info.
                Share it on social media, business cards, or anywhere you want clients to find you.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => generateSlug.mutate()}
              disabled={generateSlug.isPending}
            >
              <Link2 className="w-4 h-4 mr-2" />
              {generateSlug.isPending ? "Creating..." : "Create My Page"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your Public Page</h2>
        <p className="text-muted-foreground mt-1">Share this link with clients — it's your mini-website</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Profile Link</CardTitle>
          <CardDescription>Share this URL with clients, on social media, or on your business cards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-mono truncate">
              {profileUrl}
            </div>
            <Button variant="outline" size="icon" onClick={copyUrl} title="Copy link">
              <Copy className="w-4 h-4" />
            </Button>
            <Link href={`/p/${provider.profileSlug}`} target="_blank">
              <Button variant="outline" size="icon" title="Preview">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {editingSlug ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{window.location.origin}/p/</span>
              <Input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-custom-url"
                className="max-w-xs"
              />
              <Button
                size="sm"
                onClick={() => updateSlug.mutate({ slug: slugInput })}
                disabled={updateSlug.isPending || slugInput.length < 3}
              >
                {updateSlug.isPending ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingSlug(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { setSlugInput(provider.profileSlug || ""); setEditingSlug(true); }}>
              <Pencil className="w-3 h-3 mr-1" /> Customize URL
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What clients see</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Your public page includes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your business name, description, and verification status</li>
            <li>All your active services with pricing</li>
            <li>Customer reviews and ratings</li>
            <li>Location and service area</li>
            <li>Direct booking links for each service</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// VERIFICATION DOCUMENTS TAB
// ============================================================================
function VerificationDocumentsTab() {
  const { data: documents, isLoading } = trpc.verification.myDocuments.useQuery();
  const utils = trpc.useUtils();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("identity");

  const uploadDoc = trpc.verification.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully. It will be reviewed by our team.");
      utils.verification.myDocuments.invalidate();
      setUploading(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadDoc.mutate({
        documentType: selectedType as any,
        documentData: base64,
        contentType: file.type || "application/pdf",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const docTypes = [
    { value: "identity", label: "Government ID", description: "Driver's license, passport, or state ID" },
    { value: "business_license", label: "Business License", description: "Business registration or license" },
    { value: "insurance", label: "Insurance Certificate", description: "Liability or professional insurance" },
    { value: "background_check", label: "Background Check", description: "Background check clearance" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved": return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Verification Documents
        </h2>
        <p className="text-muted-foreground mt-1">
          Upload documents to verify your identity and business credentials. Verified providers earn a trust badge.
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Document</CardTitle>
          <CardDescription>Select a document type and upload a file (PDF, JPG, PNG — max 10MB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {docTypes.map((dt) => (
              <button
                key={dt.value}
                onClick={() => setSelectedType(dt.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedType === dt.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <FileText className="h-5 w-5 mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{dt.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{dt.description}</p>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading || uploadDoc.isPending}
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
                {uploading || uploadDoc.isPending ? "Uploading..." : "Choose File & Upload"}
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Existing Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !documents || documents.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload your first document above to start the verification process</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{doc.documentType.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                      {doc.rejectionReason && doc.verificationStatus === "rejected" && (
                        <p className="text-xs text-red-600 mt-1">Reason: {doc.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(doc.verificationStatus)}
                    <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================
export default function ProviderDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const utils = trpc.useUtils();

  const [editingService, setEditingService] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [serviceForm, setServiceForm] = useState<any>({});
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [managingPhotosServiceId, setManagingPhotosServiceId] = useState<number | null>(null);
  
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

  const { data: analytics } = trpc.provider.analytics.useQuery(undefined, {
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
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="public-profile">My Page</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Calendar Sync</TabsTrigger>
            <TabsTrigger value="widgets">Embed Widget</TabsTrigger>
            <TabsTrigger value="promo-codes">Promo Codes</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
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
                        <Link href={`/booking/${booking.id}/detail`}>
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
                      <div className="mt-3 pt-3 border-t">
                        <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setManagingPhotosServiceId(service.id)}>
                          <ImageIcon className="h-3.5 w-3.5 mr-1" />
                          Manage Photos
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

          {/* Payments Tab - Stripe Connect */}
          <TabsContent value="payments" className="space-y-6">
            <StripeConnectSection provider={provider} />
            
            {/* Subscription Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subscription Plan</CardTitle>
                <CardDescription>Upgrade your plan to unlock more features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{(provider as any)?.subscriptionTier || "Free"} Plan</p>
                    <p className="text-sm text-muted-foreground">Manage your subscription, upgrade, or view plan details</p>
                  </div>
                  <Link href="/provider/subscription">
                    <Button variant="outline" size="sm">
                      <Crown className="h-4 w-4 mr-1" />
                      Manage Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Public Profile Tab */}
          <TabsContent value="public-profile" className="space-y-6">
            <PublicProfileSection provider={provider} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Business Analytics</h2>
              <p className="text-muted-foreground mt-1">Track your performance, revenue trends, and customer insights</p>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                  <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.customerRetention?.totalCustomers ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Unique customers</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Returning Customers</CardTitle>
                  <RefreshCw className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.customerRetention?.returningCustomers ?? 0}</div>
                  <p className="text-xs text-muted-foreground">{analytics?.customerRetention?.retentionRate ?? 0}% retention rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Bookings/Customer</CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.customerRetention?.avgBookingsPerCustomer ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Per unique customer</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
                  <CreditCard className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.refundAnalytics?.refundRate ?? 0}%</div>
                  <p className="text-xs text-muted-foreground">{analytics?.refundAnalytics?.totalRefunds ?? 0} total refunds</p>
                </CardContent>
              </Card>
            </div>

            {/* Booking Source Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Booking Sources</CardTitle>
                <CardDescription>Where your bookings are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.bookingSources || analytics.bookingSources.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No booking data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.bookingSources.map((source: any) => {
                      const totalBookings = analytics.bookingSources.reduce((sum: number, s: any) => sum + Number(s.count), 0);
                      const percentage = totalBookings > 0 ? Math.round((Number(source.count) / totalBookings) * 100) : 0;
                      const sourceLabels: Record<string, { label: string; icon: any; color: string }> = {
                        direct: { label: "Direct (Website)", icon: Globe, color: "bg-blue-500" },
                        embed_widget: { label: "Embed Widget", icon: Code2, color: "bg-green-500" },
                        provider_page: { label: "Provider Page", icon: ExternalLink, color: "bg-purple-500" },
                        api: { label: "API", icon: Smartphone, color: "bg-orange-500" },
                      };
                      const config = sourceLabels[source.source] || { label: source.source, icon: Globe, color: "bg-gray-500" };
                      const IconComponent = config.icon;
                      return (
                        <div key={source.source} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{config.label}</span>
                              <span className="text-sm text-muted-foreground">{source.count} bookings ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className={`${config.color} h-2 rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-sm font-semibold">{formatCurrency(Number(source.revenue))}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Booking Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Trends</CardTitle>
                <CardDescription>Booking volume and revenue over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.bookingTrends || analytics.bookingTrends.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No trend data yet. Bookings will appear here over time.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.bookingTrends.map((month: any) => {
                      const maxBookings = Math.max(...analytics.bookingTrends.map((m: any) => Number(m.totalBookings)));
                      const barWidth = maxBookings > 0 ? Math.round((Number(month.totalBookings) / maxBookings) * 100) : 0;
                      return (
                        <div key={month.month} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{month.month}</span>
                          <div className="flex-1">
                            <div className="w-full bg-muted rounded-full h-6 relative">
                              <div className="bg-primary h-6 rounded-full transition-all flex items-center" style={{ width: `${Math.max(barWidth, 5)}%` }}>
                                <span className="text-xs text-primary-foreground font-medium pl-2 whitespace-nowrap">{month.totalBookings}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 w-24">
                            <span className="text-sm font-medium">{formatCurrency(Number(month.revenue))}</span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-xs">{month.completedBookings} done</Badge>
                            {Number(month.cancelledBookings) > 0 && (
                              <Badge variant="destructive" className="text-xs">{month.cancelledBookings} cancelled</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Services */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Services</CardTitle>
                <CardDescription>Your most booked services ranked by volume</CardDescription>
              </CardHeader>
              <CardContent>
                {(!analytics?.topServices || analytics.topServices.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No service data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.topServices.map((svc: any, idx: number) => (
                      <div key={svc.serviceId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">#{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{svc.serviceName || `Service #${svc.serviceId}`}</p>
                          <p className="text-xs text-muted-foreground">{svc.totalBookings} bookings ({svc.completedBookings} completed)</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold">{formatCurrency(Number(svc.revenue))}</p>
                          {Number(svc.avgRating) > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              {Number(svc.avgRating).toFixed(1)} ({svc.reviewCount})
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Sync Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <CalendarSyncSection />
          </TabsContent>

          {/* Embed Widget Tab */}
          <TabsContent value="widgets" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Embed Booking Widget</h2>
                <p className="text-muted-foreground mt-1">Add a booking calendar to your website so clients can book directly</p>
              </div>
              <Card>
                <CardContent className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Code2 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Get Your Embed Code</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
                      Generate a customizable booking widget you can embed on your website, share on social media, or add to your email signature.
                    </p>
                  </div>
                  <Link href="/provider/widgets">
                    <Button size="lg">
                      <Code2 className="w-4 h-4 mr-2" />
                      Open Widget Generator
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">All Services Widget</p>
                      <p className="text-xs text-muted-foreground">Shows all your services with a picker</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/embed/provider/${provider.id}`);
                      toast.success("Widget URL copied!");
                    }}>
                      <Copy className="w-3 h-3 mr-1" /> Copy URL
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Promo Codes Tab */}
          <TabsContent value="promo-codes" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Promo & Referral Codes</h2>
                  <p className="text-muted-foreground mt-1">Create discount codes to attract new customers and reward loyal clients</p>
                </div>
                <Link href="/provider/promo-codes">
                  <Button>
                    <Tag className="h-4 w-4 mr-2" />
                    Manage Promo Codes
                  </Button>
                </Link>
              </div>
              <Card>
                <CardContent className="py-6 text-center">
                  <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Create and manage promo codes from the dedicated page</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Verification Documents Tab */}
          <TabsContent value="verification" className="space-y-6">
            <VerificationDocumentsTab />
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

      {/* Manage Photos Dialog */}
      <Dialog open={!!managingPhotosServiceId} onOpenChange={() => setManagingPhotosServiceId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Service Photos</DialogTitle>
            <DialogDescription>Upload, remove, or set cover photos for your service</DialogDescription>
          </DialogHeader>
          {managingPhotosServiceId && (
            <ServicePhotosManager
              serviceId={managingPhotosServiceId}
              onClose={() => setManagingPhotosServiceId(null)}
            />
          )}
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


// ============================================================================
// CALENDAR SYNC SECTION
// ============================================================================

function CalendarSyncSection() {
  const { data: calendarData, isLoading } = trpc.provider.getCalendarFeedUrl.useQuery();
  const [copied, setCopied] = useState(false);

  const copyFeedUrl = () => {
    if (calendarData?.feedUrl) {
      navigator.clipboard.writeText(calendarData.feedUrl);
      setCopied(true);
      toast.success("Calendar feed URL copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading calendar settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Calendar Sync</h2>
        <p className="text-muted-foreground mt-1">
          Sync your OlogyCrew bookings with Google Calendar, Apple Calendar, or Outlook to avoid double-bookings
        </p>
      </div>

      {/* Feed URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Your Calendar Feed URL
          </CardTitle>
          <CardDescription>
            Subscribe to this URL in any calendar app to automatically sync your bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={calendarData?.feedUrl || ""}
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" onClick={copyFeedUrl}>
              <Clipboard className={`h-4 w-4 ${copied ? "text-green-500" : ""}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This URL is private — only share it with calendar apps you trust. It includes all your confirmed, pending, and completed bookings.
          </p>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Google Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              Google Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Google Calendar</li>
              <li>Click "+" next to "Other calendars"</li>
              <li>Select "From URL"</li>
              <li>Paste your feed URL</li>
              <li>Click "Add calendar"</li>
            </ol>
            {calendarData?.googleCalUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(calendarData.googleCalUrl, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Add to Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Apple Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-gray-600" />
              </div>
              Apple Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Calendar app</li>
              <li>Go to File → New Calendar Subscription</li>
              <li>Paste your feed URL</li>
              <li>Set auto-refresh to "Every 15 minutes"</li>
              <li>Click "Subscribe"</li>
            </ol>
          </CardContent>
        </Card>

        {/* Outlook */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-indigo-600" />
              </div>
              Outlook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Outlook Calendar</li>
              <li>Click "Add calendar"</li>
              <li>Select "Subscribe from web"</li>
              <li>Paste your feed URL</li>
              <li>Click "Import"</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>How it works:</strong> Your calendar app will periodically check this URL for updates (usually every 15-60 minutes depending on the app).</p>
              <p>New bookings, cancellations, and status changes will automatically appear in your synced calendar. Each booking includes the service name, customer name, location, and amount.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
