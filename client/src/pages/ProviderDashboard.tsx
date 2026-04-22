import { useState, useMemo, useRef } from "react";
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
  Grid3X3,
  Plus,
  Settings,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  X,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { NavHeader } from "@/components/shared/NavHeader";
import { ShareProfile } from "@/components/ShareProfile";
import { formatCurrency } from "@/lib/dateUtils";
import { formatDuration, DURATION_PRESETS } from "../../../shared/duration";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Checkbox } from "@/components/ui/checkbox";

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
  // Use the /api/og/ URL for sharing — this serves proper OG meta tags for social media previews
  const shareableUrl = provider.profileSlug
    ? `${window.location.origin}/api/og/provider/${provider.profileSlug}`
    : null;

  const copyUrl = () => {
    if (shareableUrl) {
      navigator.clipboard.writeText(shareableUrl);
      toast.success("Profile link copied! This link shows your profile preview on social media.");
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
            <ShareProfile
              url={profileUrl!}
              shareUrl={`/api/og/provider/${provider.profileSlug}`}
              title={provider.businessName}
              description={provider.description || `Book services from ${provider.businessName} on OlogyCrew`}
              size="icon"
              variant="outline"
            />
          </div>

          {editingSlug ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{window.location.origin}/p/</div>
              <Input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="your-custom-url"
                className="w-full text-base"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{ fontSize: '16px' }}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => updateSlug.mutate({ slug: slugInput })}
                  disabled={updateSlug.isPending || slugInput.length < 3}
                >
                  {updateSlug.isPending ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingSlug(false)}>Cancel</Button>
              </div>
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
// REFER A PROVIDER CARD
// ============================================================================
function ReferProviderCard() {
  const { data: myCode, isLoading } = trpc.referral.getMyCode.useQuery();
  const { data: stats } = trpc.referral.getStats.useQuery();
  const [copied, setCopied] = useState(false);

  const referralLink = myCode
    ? `${window.location.origin}/provider/onboarding?ref=${myCode.code}`
    : "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    if (!referralLink) return;
    if (navigator.share) {
      navigator.share({
        title: "Join OlogyCrew as a Provider",
        text: "I've been using OlogyCrew to manage my service bookings and it's great! Sign up with my referral link and we both earn credits.",
        url: referralLink,
      }).catch(() => {});
    } else {
      copyLink();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Refer a Provider</h2>
          <p className="text-muted-foreground mt-1">
            Share your referral link with fellow service professionals and earn credits when they join
          </p>
        </div>
        <Link href="/referrals">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            View All Referrals
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalReferrals}</div>
              <div className="text-xs text-muted-foreground">Total Referrals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.completedReferrals}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pendingReferrals}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">${stats.totalEarnings}</div>
              <div className="text-xs text-muted-foreground">Credits Earned</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Referral Link Card */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full">
              <Label className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1 block">
                Your Provider Referral Link
              </Label>
              {isLoading ? (
                <div className="h-10 bg-white/50 rounded-md animate-pulse" />
              ) : (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={referralLink}
                    className="bg-white dark:bg-background text-sm font-mono"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    onClick={shareLink}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {myCode && (
            <p className="text-xs text-muted-foreground mt-3">
              Referral code: <span className="font-mono font-semibold">{myCode.code}</span>
              {" "}&middot;{" "}
              You earn {myCode.referrerDiscountPercent}% credit &middot; They get {myCode.refereeDiscountPercent}% off their first booking
            </p>
          )}
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
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  const deleteDoc = trpc.verification.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      utils.verification.myDocuments.invalidate();
      setDeletingDocId(null);
    },
    onError: (err) => toast.error(err.message),
  });

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
                    {deletingDocId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteDoc.mutate({ documentId: doc.id })}
                          disabled={deleteDoc.isPending}
                        >
                          {deleteDoc.isPending ? "Deleting..." : "Confirm"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingDocId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingDocId(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
  const [showPortfolioUpload, setShowPortfolioUpload] = useState(false);
  const [portfolioUploadCategory, setPortfolioUploadCategory] = useState<number | undefined>(undefined);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [portfolioMediaType, setPortfolioMediaType] = useState<"image" | "before_after">("image");
  const [portfolioBeforeUrl, setPortfolioBeforeUrl] = useState("");
  const [portfolioAfterUrl, setPortfolioAfterUrl] = useState("");
  const [activeTab, setActiveTab] = useState("bookings");
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [conflictBookingId, setConflictBookingId] = useState<number | null>(null);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [conflictData, setConflictData] = useState<any[]>([]);
  const [packageName, setPackageName] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageServiceIds, setPackageServiceIds] = useState<number[]>([]);
  const [respondingQuoteId, setRespondingQuoteId] = useState<number | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDuration, setQuoteDuration] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteValidDays, setQuoteValidDays] = useState("7");
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  
  const uploadProfilePhoto = trpc.provider.uploadProfilePhoto.useMutation({
    onSuccess: () => {
      utils.provider.getMyProfile.invalidate();
      utils.auth.me.invalidate();
      toast.success("Profile photo updated!");
    },
    onError: (err) => toast.error(err.message || "Failed to upload photo"),
  });

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadProfilePhoto.mutate({ photoData: base64, contentType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: services } = trpc.service.listMine.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: myCategories } = trpc.provider.getMyCategories.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: allCategories } = trpc.category.list.useQuery();
  
  const { data: bookings } = trpc.booking.listForProvider.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: earnings } = trpc.provider.earnings.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: analytics } = trpc.provider.analytics.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: providerQuotes } = trpc.provider.providerQuotes.useQuery(undefined, {
    enabled: !!provider,
  });
  const { data: quoteCount } = trpc.provider.quoteCount.useQuery(undefined, {
    enabled: !!provider,
  });

  const respondToQuote = trpc.provider.respondToQuote.useMutation({
    onSuccess: () => {
      utils.provider.providerQuotes.invalidate();
      utils.provider.quoteCount.invalidate();
      setRespondingQuoteId(null);
      setQuoteAmount("");
      setQuoteDuration("");
      setQuoteNotes("");
      setQuoteValidDays("7");
      toast.success("Quote sent to customer!");
    },
    onError: (err) => toast.error(err.message),
  });

  const declineQuoteRequest = trpc.provider.updateQuoteStatus.useMutation({
    onSuccess: () => {
      utils.provider.providerQuotes.invalidate();
      utils.provider.quoteCount.invalidate();
      toast.success("Quote request declined");
    },
    onError: (err) => toast.error(err.message),
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

  const { data: portfolio } = trpc.provider.getPortfolio.useQuery(undefined, {
    enabled: !!provider,
  });

  const uploadPortfolioPhoto = trpc.provider.uploadPortfolioPhoto.useMutation();
  const addPortfolioItem = trpc.provider.addPortfolioItem.useMutation({
    onSuccess: () => {
      utils.provider.getPortfolio.invalidate();
      setShowPortfolioUpload(false);
      setPortfolioTitle("");
      setPortfolioDescription("");
      setPortfolioUploadCategory(undefined);
      setPortfolioMediaType("image");
      setPortfolioBeforeUrl("");
      setPortfolioAfterUrl("");
      toast.success("Work sample added to your portfolio!");
    },
    onError: (err) => toast.error(err.message),
  });
  const deletePortfolioItem = trpc.provider.deletePortfolioItem.useMutation({
    onSuccess: () => {
      utils.provider.getPortfolio.invalidate();
      toast.success("Portfolio item removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const createPackage = trpc.provider.createPackage.useMutation({
    onSuccess: () => {
      trpc.useUtils().provider.myPackages.invalidate();
      setShowPackageDialog(false);
      setPackageName("");
      setPackageDescription("");
      setPackagePrice("");
      setPackageServiceIds([]);
      toast.success("Package created!");
    },
    onError: (err: any) => toast.error(err.message),
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
      depositRequired: service.depositRequired ?? false,
      depositType: service.depositType || "fixed",
      depositAmount: service.depositAmount || "",
      depositPercentage: service.depositPercentage || "",
    });
    setEditingService(service);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Welcome back, {provider.businessName}!</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
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

        {/* Onboarding Checklist Widget */}
        <OnboardingChecklist
          provider={provider}
          services={services}
          myCategories={myCategories}
          portfolio={portfolio}
          connectStatus={undefined}
          onEditProfile={() => {
            setProfileForm({
              businessName: provider.businessName || "",
              description: provider.description || "",
              city: provider.city || "",
              state: provider.state || "",
              addressLine1: provider.addressLine1 || "",
              postalCode: provider.postalCode || "",
              serviceRadiusMiles: provider.serviceRadiusMiles || 0,
              acceptsMobile: provider.acceptsMobile || false,
              acceptsFixedLocation: provider.acceptsFixedLocation || false,
              acceptsVirtual: provider.acceptsVirtual || false,
            });
            setEditingProfile(true);
          }}
          onUploadPhoto={() => profilePhotoInputRef.current?.click()}
          onUploadPortfolio={() => {
            setActiveTab("portfolio");
            setTimeout(() => setShowPortfolioUpload(true), 100);
          }}
        />
        {/* Hidden file input for profile photo upload from checklist */}
        <input
          ref={profilePhotoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleProfilePhotoUpload}
        />

        {/* Main Content Tabs - Consolidated from 12 to 6 */}
        <Tabs defaultValue="bookings" className="space-y-6" value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tab Bar */}
          <div className="hidden md:block">
            <TabsList className="inline-flex h-auto gap-1 w-full p-1">
              <TabsTrigger value="bookings" className="flex-1 text-sm px-3 py-2"><Calendar className="h-4 w-4 mr-1.5" />Bookings</TabsTrigger>
              <TabsTrigger value="services" className="flex-1 text-sm px-3 py-2"><Package className="h-4 w-4 mr-1.5" />Services</TabsTrigger>
              <TabsTrigger value="schedule" className="flex-1 text-sm px-3 py-2"><Clock className="h-4 w-4 mr-1.5" />Schedule</TabsTrigger>
              <TabsTrigger value="finances" className="flex-1 text-sm px-3 py-2"><DollarSign className="h-4 w-4 mr-1.5" />Finances</TabsTrigger>
              <TabsTrigger value="my-page" className="flex-1 text-sm px-3 py-2"><Globe className="h-4 w-4 mr-1.5" />My Page</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-sm px-3 py-2"><Settings className="h-4 w-4 mr-1.5" />More</TabsTrigger>
            </TabsList>
          </div>

          {/* Mobile Bottom Navigation Bar */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg">
            <div className="grid grid-cols-6 h-16">
              {[
                { value: "bookings", icon: Calendar, label: "Bookings" },
                { value: "services", icon: Package, label: "Services" },
                { value: "schedule", icon: Clock, label: "Schedule" },
                { value: "finances", icon: DollarSign, label: "Finances" },
                { value: "my-page", icon: Globe, label: "My Page" },
                { value: "settings", icon: Settings, label: "More" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setActiveTab(value)}
                  className={`flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors ${
                    activeTab === value
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${activeTab === value ? "text-primary" : ""}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Bookings</h2>
              <Link href="/provider/calendar">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Calendar View
                </Button>
              </Link>
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">{booking.serviceName || 'Service'}</CardTitle>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{booking.bookingNumber}</p>
                          <CardDescription>
                            {booking.bookingType === "multi_day" && booking.endDate
                              ? `${new Date(booking.bookingDate).toLocaleDateString()} — ${new Date(booking.endDate).toLocaleDateString()}`
                              : new Date(booking.bookingDate).toLocaleDateString()} at {booking.startTime}
                          </CardDescription>
                          {booking.bookingType && booking.bookingType !== "single" && (
                            <Badge variant="outline" className="mt-1 w-fit text-xs">
                              {booking.bookingType === "multi_day"
                                ? `Multi-Day (${booking.totalDays || "—"} days)`
                                : `Recurring (${booking.recurrenceTotalSessions || "—"} sessions • ${booking.recurrenceFrequency || "weekly"})`}
                            </Badge>
                          )}
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
                          <p className="text-sm font-medium mb-1">{booking.bookingType === "multi_day" ? "Duration / Day" : booking.bookingType === "recurring" ? "Duration / Session" : "Duration"}</p>
                          <p className="text-sm text-muted-foreground">{formatDuration(booking.durationMinutes)}</p>
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
                      <div className="flex flex-wrap gap-2">
                        {booking.status === "pending" && (
                          <>
            <Button 
              size="sm" 
              onClick={async () => {
                try {
                  const result = await utils.booking.checkConflicts.fetch({ bookingId: booking.id });
                  if (result.hasConflicts) {
                    setConflictBookingId(booking.id);
                    setConflictData(result.conflicts);
                    setShowConflictWarning(true);
                  } else {
                    updateBookingStatus.mutate({ id: booking.id, status: "confirmed" });
                  }
                } catch {
                  updateBookingStatus.mutate({ id: booking.id, status: "confirmed" });
                }
              }}
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

            {/* ============================================================ */}
            {/* QUOTE REQUESTS SECTION                                       */}
            {/* ============================================================ */}
            <div className="border-t pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">Quote Requests</h2>
                  {(quoteCount?.pending || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {quoteCount?.pending} pending
                    </Badge>
                  )}
                </div>
              </div>

              {!providerQuotes || providerQuotes.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">No quote requests yet</p>
                    <p className="text-sm text-muted-foreground">
                      When customers request custom quotes, they'll appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {providerQuotes.map((quote: any) => (
                    <Card key={quote.id} className={quote.status === "pending" ? "border-amber-300 bg-amber-50/30" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{quote.title}</CardTitle>
                            <CardDescription className="mt-1">
                              From: {quote.customerName || "Customer"}
                              {quote.customerEmail && ` (${quote.customerEmail})`}
                            </CardDescription>
                          </div>
                          <Badge variant={
                            quote.status === "pending" ? "secondary" :
                            quote.status === "quoted" ? "default" :
                            quote.status === "accepted" ? "outline" :
                            quote.status === "booked" ? "default" :
                            "destructive"
                          }>
                            {quote.status === "pending" ? "Awaiting Your Quote" :
                             quote.status === "quoted" ? "Quote Sent" :
                             quote.status === "accepted" ? "Accepted" :
                             quote.status === "booked" ? "Booked" :
                             quote.status === "declined" ? "Declined" :
                             quote.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{quote.description}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                          {quote.preferredDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(quote.preferredDate).toLocaleDateString()}
                              {quote.preferredTime && ` at ${quote.preferredTime}`}
                            </span>
                          )}
                          {quote.location && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5" />
                              {quote.location}
                            </span>
                          )}
                          {quote.locationType && (
                            <span className="flex items-center gap-1">
                              {quote.locationType === "mobile" ? "\ud83d\ude97 Mobile" :
                               quote.locationType === "fixed_location" ? "\ud83c\udfe2 At Location" :
                               "\ud83d\udcbb Virtual"}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Show quoted amount if already responded */}
                        {quote.status === "quoted" && quote.quotedAmount && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Your Quote</span>
                              <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                                ${parseFloat(quote.quotedAmount).toFixed(2)}
                              </span>
                            </div>
                            {quote.quotedDurationMinutes && (
                              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                Est. duration: {formatDuration(quote.quotedDurationMinutes)}
                              </p>
                            )}
                            {quote.providerNotes && (
                              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">{quote.providerNotes}</p>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {quote.status === "pending" && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => setRespondingQuoteId(quote.id)}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Send Quote
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => declineQuoteRequest.mutate({ quoteId: quote.id, status: "declined", reason: "Unable to fulfill this request" })}
                              disabled={declineQuoteRequest.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Services Tab — grouped by category */}
          <TabsContent value="services" className="space-y-6 pb-20 md:pb-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">My Categories & Services</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage the categories you serve and the services you offer in each</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/provider/onboarding">
                  <Button variant="outline" size="sm">
                    <Grid3X3 className="h-4 w-4 mr-1" /> Manage Categories
                  </Button>
                </Link>
                <Link href="/provider/services/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add Service
                  </Button>
                </Link>
              </div>
            </div>

            {/* Active Categories with their services */}
            {myCategories && myCategories.length > 0 ? (
              myCategories.map((pc: any) => {
                const cat = pc.category;
                if (!cat) return null;
                const catServices = services?.filter((s: any) => s.categoryId === cat.id) || [];
                const displayName = cat.name.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
                const CATEGORY_ICONS: Record<number, string> = {
                  15: "🎬", 170: "💈", 7: "✂️", 126: "🔒", 195: "💃", 202: "🔨",
                  23: "🦷", 20: "🎵", 22: "🚛", 177: "🎉", 196: "👁️", 178: "💰",
                  109: "🏋️", 197: "📋", 9: "🔧", 193: "🧘", 188: "🧹", 200: "⚡",
                  179: "🏠", 171: "💇", 174: "🚗", 176: "🔩", 111: "🔗", 10: "💆",
                  168: "🚙", 169: "🛠️", 199: "🎪", 158: "🎯", 73: "🍽️", 12: "💪",
                  11: "🐾", 17: "📸", 148: "💦", 26: "📅", 8: "💅", 194: "☀️",
                  198: "💻", 19: "🎥", 155: "📱", 201: "🖥️", 205: "🌐",
                };
                return (
                  <Card key={cat.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <span className="text-xl">{CATEGORY_ICONS[cat.id] || "📦"}</span>
                          {displayName}
                          <Badge variant="outline" className="text-xs ml-1">
                            {catServices.length} service{catServices.length !== 1 ? "s" : ""}
                          </Badge>
                        </CardTitle>
                        <Link href="/provider/services/new">
                          <Button size="sm" variant="outline">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {catServices.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30 border-dashed">
                          No services in this category yet
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {catServices.map((service: any) => (
                            <div key={service.id} className="p-3 rounded-lg border bg-card">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{service.name}</p>
                                  {service.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{service.description}</p>
                                  )}
                                </div>
                                <div className="text-right ml-2 flex-shrink-0">
                                  <span className="font-semibold text-sm text-primary">
                                    {service.pricingModel === "fixed" && service.basePrice && formatCurrency(parseFloat(service.basePrice))}
                                    {service.pricingModel === "hourly" && service.hourlyRate && `${formatCurrency(parseFloat(service.hourlyRate))}/hr`}
                                    {service.pricingModel === "package" && service.basePrice && formatCurrency(parseFloat(service.basePrice))}
                                    {service.pricingModel === "custom_quote" && "Quote"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span className="capitalize">{service.serviceType.replace('_', ' ')}</span>
                                {service.durationMinutes && <span>· {formatDuration(service.durationMinutes)}</span>}
                              </div>
                              <div className="flex gap-1 mt-2 pt-2 border-t">
                                <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => openEditService(service)}>
                                  <Pencil className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setManagingPhotosServiceId(service.id)}>
                                  <ImageIcon className="h-3 w-3 mr-1" /> Photos
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => setDeletingServiceId(service.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No categories selected</h3>
                  <p className="text-muted-foreground mb-4">Select the service categories you offer to start adding services</p>
                  <Link href="/provider/onboarding">
                    <Button>Select Your Categories</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* ── PORTFOLIO / WORK SAMPLES ── */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Portfolio & Work Samples</h3>
                  <p className="text-sm text-muted-foreground mt-1">Showcase your best work to attract more customers</p>
                </div>
                <Button size="sm" onClick={() => setShowPortfolioUpload(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Add Work
                </Button>
              </div>
              <PortfolioGallery categories={myCategories} />
            </div>

            {/* Service Packages Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" /> Service Packages</h3>
                  <p className="text-sm text-muted-foreground mt-1">Bundle multiple services together with a discount</p>
                </div>
                <Button size="sm" onClick={() => setShowPackageDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create Package
                </Button>
              </div>
              <PackagesList />
            </div>

            {/* Services without a matching category */}
            {services && services.length > 0 && myCategories && (() => {
              const myCatIds = new Set(myCategories.map((pc: any) => pc.categoryId));
              const uncategorized = services.filter((s: any) => !myCatIds.has(s.categoryId));
              if (uncategorized.length === 0) return null;
              return (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-muted-foreground">Other Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {uncategorized.map((service: any) => (
                        <div key={service.id} className="p-3 rounded-lg border bg-card">
                          <p className="font-medium text-sm">{service.name}</p>
                          <div className="flex gap-1 mt-2 pt-2 border-t">
                            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => openEditService(service)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => setDeletingServiceId(service.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* === SCHEDULE TAB (Availability + Calendar Sync) === */}
          <TabsContent value="schedule" className="space-y-6 pb-20 md:pb-0">
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
          
            {/* Calendar Sync sub-section */}
            <div className="border-t pt-6">
              <CalendarSyncSection />
            </div>
          </TabsContent>

          {/* === FINANCES TAB (Earnings + Payments) === */}
          <TabsContent value="finances" className="space-y-6 pb-20 md:pb-0">
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
          
            {/* Stripe Connect & Payments sub-section */}
            <div className="border-t pt-6">
              <StripeConnectSection provider={provider} />
            </div>

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

          {/* === MY PAGE TAB (Public Profile + Analytics + Embed Widget) === */}
          <TabsContent value="my-page" className="space-y-6 pb-20 md:pb-0">
            <PublicProfileSection provider={provider} />

          {/* Analytics sub-section inside My Page */}
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
          
          {/* Embed Widget sub-section inside My Page */}
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

          {/* === SETTINGS/MORE TAB (Reviews + Promo Codes + Verification) === */}
          <TabsContent value="settings" className="space-y-6 pb-20 md:pb-0">
            {/* Reviews sub-section */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Customer Reviews</h2>
              </div>
              <Card className="mt-4">
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
            </div>

            {/* Promo Codes sub-section */}
            <div className="border-t pt-6">
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
            </div>

            {/* Refer a Provider sub-section */}
            <div className="border-t pt-6">
              <ReferProviderCard />
            </div>

            {/* Verification Documents sub-section */}
            <div className="border-t pt-6">
              <VerificationDocumentsTab />
            </div>
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
              <Label>Bio / Description</Label>
              <Textarea value={profileForm.description || ""} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} rows={4} placeholder="Tell customers about your experience, skills, and what makes your services unique..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input value={profileForm.city || ""} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={profileForm.state || ""} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label>Duration</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={serviceForm.durationMinutes || 60}
                onChange={e => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) || 60 })}
              >
                {DURATION_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Cancellation Policy</Label>
              <Textarea value={serviceForm.cancellationPolicy || ""} onChange={e => setServiceForm({ ...serviceForm, cancellationPolicy: e.target.value })} rows={2} />
            </div>
            {/* Deposit Settings */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-deposit-required"
                  checked={serviceForm.depositRequired || false}
                  onChange={e => setServiceForm({ ...serviceForm, depositRequired: e.target.checked, ...(!e.target.checked && { depositAmount: "", depositPercentage: "" }) })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="edit-deposit-required" className="mb-0 cursor-pointer">Require Deposit</Label>
              </div>
              {serviceForm.depositRequired && (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label>Deposit Type</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={serviceForm.depositType || "fixed"}
                      onChange={e => setServiceForm({ ...serviceForm, depositType: e.target.value, depositAmount: "", depositPercentage: "" })}
                    >
                      <option value="fixed">Fixed Amount ($)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  {serviceForm.depositType === "percentage" ? (
                    <div>
                      <Label>Deposit Percentage (%)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={serviceForm.depositPercentage || ""}
                        onChange={e => setServiceForm({ ...serviceForm, depositPercentage: e.target.value })}
                        placeholder="e.g. 25"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>Deposit Amount ($)</Label>
                      <Input
                        type="number"
                        min="0.50"
                        step="0.01"
                        value={serviceForm.depositAmount || ""}
                        onChange={e => setServiceForm({ ...serviceForm, depositAmount: e.target.value })}
                        placeholder="e.g. 50.00"
                      />
                    </div>
                  )}
                </div>
              )}
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

      {/* Portfolio Upload Dialog */}
      <Dialog open={showPortfolioUpload} onOpenChange={(open) => {
        setShowPortfolioUpload(open);
        if (!open) {
          setPortfolioMediaType("image");
          setPortfolioBeforeUrl("");
          setPortfolioAfterUrl("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Work Sample</DialogTitle>
            <DialogDescription>Upload photos showcasing your work</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Type Toggle */}
            <div>
              <Label>Type</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <Button
                  type="button"
                  variant={portfolioMediaType === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPortfolioMediaType("image")}
                >
                  Single Photo
                </Button>
                <Button
                  type="button"
                  variant={portfolioMediaType === "before_after" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPortfolioMediaType("before_after")}
                >
                  Before & After
                </Button>
              </div>
            </div>

            <div>
              <Label>Category (optional)</Label>
              <select
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={portfolioUploadCategory || ""}
                onChange={(e) => setPortfolioUploadCategory(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">General</option>
                {myCategories?.map((pc: any) => (
                  <option key={pc.categoryId} value={pc.categoryId}>
                    {pc.category?.name?.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input value={portfolioTitle} onChange={(e) => setPortfolioTitle(e.target.value)} placeholder="e.g., Kitchen Renovation" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={portfolioDescription} onChange={(e) => setPortfolioDescription(e.target.value)} placeholder="Brief description of this work" rows={2} />
            </div>

            {portfolioMediaType === "image" ? (
              /* Single Photo Upload */
              <div>
                <Label>Photo</Label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = (reader.result as string).split(",")[1];
                      try {
                        const { url } = await uploadPortfolioPhoto.mutateAsync({ base64, mimeType: file.type, fileName: file.name });
                        await addPortfolioItem.mutateAsync({
                          imageUrl: url,
                          categoryId: portfolioUploadCategory,
                          title: portfolioTitle || undefined,
                          description: portfolioDescription || undefined,
                          mediaType: "image",
                        });
                      } catch (err: any) { toast.error(err.message || "Upload failed"); }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            ) : (
              /* Before & After Upload */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Photo */}
                  <div>
                    <Label className="text-sm">Before Photo</Label>
                    {portfolioBeforeUrl ? (
                      <div className="relative mt-1">
                        <img src={portfolioBeforeUrl} alt="Before" className="w-full h-32 object-cover rounded-md border" />
                        <button
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          onClick={() => setPortfolioBeforeUrl("")}
                        >&times;</button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1 w-full text-xs"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64 = (reader.result as string).split(",")[1];
                            try {
                              const { url } = await uploadPortfolioPhoto.mutateAsync({ base64, mimeType: file.type, fileName: file.name });
                              setPortfolioBeforeUrl(url);
                            } catch (err: any) { toast.error(err.message || "Upload failed"); }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    )}
                  </div>
                  {/* After Photo */}
                  <div>
                    <Label className="text-sm">After Photo</Label>
                    {portfolioAfterUrl ? (
                      <div className="relative mt-1">
                        <img src={portfolioAfterUrl} alt="After" className="w-full h-32 object-cover rounded-md border" />
                        <button
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          onClick={() => setPortfolioAfterUrl("")}
                        >&times;</button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-1 w-full text-xs"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const base64 = (reader.result as string).split(",")[1];
                            try {
                              const { url } = await uploadPortfolioPhoto.mutateAsync({ base64, mimeType: file.type, fileName: file.name });
                              setPortfolioAfterUrl(url);
                            } catch (err: any) { toast.error(err.message || "Upload failed"); }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    )}
                  </div>
                </div>
                {portfolioBeforeUrl && portfolioAfterUrl && (
                  <Button
                    className="w-full"
                    onClick={async () => {
                      try {
                        await addPortfolioItem.mutateAsync({
                          imageUrl: portfolioAfterUrl,
                          beforeImageUrl: portfolioBeforeUrl,
                          categoryId: portfolioUploadCategory,
                          title: portfolioTitle || undefined,
                          description: portfolioDescription || undefined,
                          mediaType: "before_after",
                        });
                      } catch (err: any) { toast.error(err.message || "Save failed"); }
                    }}
                    disabled={addPortfolioItem.isPending}
                  >
                    {addPortfolioItem.isPending ? "Saving..." : "Save Before & After"}
                  </Button>
                )}
              </div>
            )}

            {(uploadPortfolioPhoto.isPending || addPortfolioItem.isPending) && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
          </div>
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

      {/* Package Creation Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPackageDialog(false);
          setPackageName("");
          setPackageDescription("");
          setPackagePrice("");
          setPackageServiceIds([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Service Package</DialogTitle>
            <DialogDescription>Bundle multiple services together with a combined price</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Package Name</Label>
              <Input
                placeholder="e.g., Full Event Package"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                placeholder="e.g., DJ + Photography + AV Setup for your event"
                value={packageDescription}
                onChange={(e) => setPackageDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Package Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="99.99"
                value={packagePrice}
                onChange={(e) => setPackagePrice(e.target.value)}
              />
              {services && packageServiceIds.length > 0 && (() => {
                const total = services
                  .filter((s: any) => packageServiceIds.includes(s.id))
                  .reduce((sum: number, s: any) => sum + Number(s.price || 0), 0);
                const savings = total - Number(packagePrice || 0);
                return total > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Individual total: ${total.toFixed(2)}
                    {savings > 0 && <span className="text-green-600 ml-1">(Customer saves ${savings.toFixed(2)})</span>}
                  </p>
                ) : null;
              })()}
            </div>
            <div>
              <Label>Select Services to Bundle</Label>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
                {services && services.length > 0 ? services.map((service: any) => (
                  <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                    <input
                      type="checkbox"
                      checked={packageServiceIds.includes(service.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPackageServiceIds([...packageServiceIds, service.id]);
                        } else {
                          setPackageServiceIds(packageServiceIds.filter(id => id !== service.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{service.name}</span>
                    <span className="text-xs text-muted-foreground">${Number(service.price || 0).toFixed(2)}</span>
                  </label>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No services available. Add services first.</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>Cancel</Button>
            <Button
              disabled={!packageName || !packagePrice || packageServiceIds.length < 2}
              onClick={() => {
                const originalPrice = services
                  ? services
                      .filter((s: any) => packageServiceIds.includes(s.id))
                      .reduce((sum: number, s: any) => sum + Number(s.price || 0), 0)
                  : 0;
                createPackage.mutate({
                  name: packageName,
                  description: packageDescription || undefined,
                  packagePrice: packagePrice,
                  originalPrice: originalPrice.toString(),
                  serviceIds: packageServiceIds,
                });
              }}
            >
              Create Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Conflict Warning Dialog */}
      <Dialog open={showConflictWarning} onOpenChange={setShowConflictWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Schedule Conflict Detected
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This booking overlaps with {conflictData.length} existing booking{conflictData.length > 1 ? "s" : ""}:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conflictData.map((conflict, i) => (
                <div key={i} className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="font-medium text-sm">{conflict.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {conflict.bookingDate} &middot; {conflict.startTime} - {conflict.endTime}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                    {conflict.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium">
              Do you still want to accept this booking?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConflictWarning(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (conflictBookingId) {
                  updateBookingStatus.mutate({ id: conflictBookingId, status: "confirmed" });
                }
                setShowConflictWarning(false);
                setConflictBookingId(null);
                setConflictData([]);
              }}
            >
              Accept Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond to Quote Dialog */}
      <Dialog open={respondingQuoteId !== null} onOpenChange={() => setRespondingQuoteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Send Your Quote
            </DialogTitle>
            <DialogDescription>
              Provide your pricing and estimated duration for this service request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quote-amount">Your Price ($) *</Label>
              <Input
                id="quote-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 150.00"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-duration">Estimated Duration *</Label>
              <select
                id="quote-duration"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={quoteDuration}
                onChange={(e) => setQuoteDuration(e.target.value)}
              >
                <option value="">Select duration...</option>
                {DURATION_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-notes">Notes for Customer</Label>
              <Textarea
                id="quote-notes"
                placeholder="Any additional details about your quote..."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-valid">Quote Valid For (days)</Label>
              <Input
                id="quote-valid"
                type="number"
                min="1"
                max="30"
                value={quoteValidDays}
                onChange={(e) => setQuoteValidDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingQuoteId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!respondingQuoteId || !quoteAmount || !quoteDuration) {
                  toast.error("Please fill in price and duration");
                  return;
                }
                respondToQuote.mutate({
                  quoteId: respondingQuoteId,
                  quotedAmount: quoteAmount,
                  quotedDurationMinutes: parseInt(quoteDuration),
                  providerNotes: quoteNotes || undefined,
                  validDays: parseInt(quoteValidDays) || 7,
                });
              }}
              disabled={respondToQuote.isPending || !quoteAmount || !quoteDuration}
            >
              {respondToQuote.isPending ? "Sending..." : "Send Quote"}
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

// ============================================================================
// ONBOARDING CHECKLIST WIDGET
// ============================================================================
function OnboardingChecklist({
  provider,
  services,
  myCategories,
  portfolio,
  connectStatus,
  onEditProfile,
  onUploadPhoto,
  onUploadPortfolio,
}: {
  provider: any;
  services: any[] | undefined;
  myCategories: any[] | undefined;
  portfolio: any[] | undefined;
  connectStatus: any;
  onEditProfile?: () => void;
  onUploadPhoto?: () => void;
  onUploadPortfolio?: () => void;
}) {
  const { data: stripeStatus } = trpc.stripeConnect.getStatus.useQuery();
  const { data: mySchedule } = trpc.availability.getMySchedule.useQuery();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const steps = useMemo(() => {
    const hasPhoto = !!provider.profilePhotoUrl;
    const hasBio = !!provider.description && provider.description.length > 10;
    const hasCategories = (myCategories?.length || 0) > 0;
    const hasServices = (services?.length || 0) > 0;
    const hasPortfolio = (portfolio?.length || 0) > 0;
    const hasStripe = stripeStatus?.connected && stripeStatus?.chargesEnabled;
    const hasAvailability = (mySchedule?.length || 0) > 0;

    return [
      {
        id: "photo",
        label: "Add a profile photo",
        description: "Help customers recognize you",
        done: hasPhoto,
        action: () => onUploadPhoto ? onUploadPhoto() : setLocation("/profile"),
        actionLabel: "Add Photo",
        priority: 1,
      },
      {
        id: "bio",
        label: "Write your bio / description",
        description: "Tell customers about your experience",
        done: hasBio,
        action: () => onEditProfile ? onEditProfile() : setLocation("/provider/onboarding"),
        actionLabel: "Write Bio",
        priority: 2,
      },
      {
        id: "categories",
        label: "Select service categories",
        description: "Choose the types of services you offer",
        done: hasCategories,
        action: () => setLocation("/provider/onboarding"),
        actionLabel: "Select Categories",
        priority: 3,
      },
      {
        id: "services",
        label: "Add at least one service",
        description: "Create a service with pricing so customers can book",
        done: hasServices,
        action: () => setLocation("/provider/services/new"),
        actionLabel: "Add Service",
        priority: 4,
      },
      {
        id: "availability",
        label: "Set your availability",
        description: "Let customers know when you're available",
        done: hasAvailability,
        action: () => setLocation("/provider/availability"),
        actionLabel: "Set Schedule",
        priority: 5,
      },
      {
        id: "portfolio",
        label: "Upload work samples",
        description: "Showcase your best work to attract customers",
        done: hasPortfolio,
        action: () => onUploadPortfolio ? onUploadPortfolio() : setLocation("/provider/onboarding"),
        actionLabel: "Upload",
        priority: 6,
      },
      {
        id: "stripe",
        label: "Connect payment account",
        description: "Set up Stripe to receive payments",
        done: !!hasStripe,
        action: () => setLocation("/provider/onboarding?step=4"),
        actionLabel: "Connect Stripe",
        priority: 7,
      },
    ];
  }, [provider, services, myCategories, portfolio, stripeStatus, mySchedule, setLocation, onEditProfile, onUploadPhoto, onUploadPortfolio]);

  const completedCount = steps.filter((s: any) => s.done).length;
  const totalSteps = steps.length;
  const allDone = completedCount === totalSteps;
  const progress = Math.round((completedCount / totalSteps) * 100);

  // Find the next incomplete step for the "What's Next" nudge
  const nextStep = useMemo(() => {
    return steps.find(s => !s.done);
  }, [steps]);

  // Show celebration when all done
  useMemo(() => {
    if (allDone && !dismissed) {
      setShowCelebration(true);
    }
  }, [allDone]);

  if (dismissed && !showCelebration) return null;

  // Celebration state when all steps complete
  if (allDone && showCelebration) {
    return (
      <Card className="mb-8 border-green-500/30 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Profile Complete!</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your profile is fully set up and ready to receive bookings. Customers can now find and book your services.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowCelebration(false); setDismissed(true); }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dismissed) return null;

  return (
    <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Circular progress indicator */}
            <div className="relative flex-shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="text-primary transition-all duration-700"
                  strokeDasharray={`${progress * 0.974} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                {progress}%
              </span>
            </div>
            <div>
              <CardTitle className="text-lg">
                Complete Your Profile
              </CardTitle>
              <CardDescription className="mt-0.5">
                {completedCount} of {totalSteps} steps done
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {/* Linear progress bar */}
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* "What's Next" nudge for the next incomplete step */}
        {nextStep && (
          <div
            className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => nextStep.action()}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">Next: {nextStep.label}</p>
              <p className="text-xs text-muted-foreground">{nextStep.description}</p>
            </div>
            <Button size="sm" className="h-7 text-xs shrink-0">
              {nextStep.actionLabel}
            </Button>
          </div>
        )}

        {/* All steps grid — exclude the "next" step since it's already highlighted above */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {steps.filter((s: any) => s !== nextStep).map((step: any, idx: number) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                step.done
                  ? "bg-muted/30 border-transparent"
                  : step === nextStep
                  ? "bg-primary/5 border-primary/20 cursor-pointer hover:border-primary/40"
                  : "bg-background border-border hover:border-primary/30 cursor-pointer"
              }`}
              onClick={() => !step.done && step.action()}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                step.done ? "bg-green-500/20 text-green-600" : "bg-muted text-muted-foreground"
              }`}>
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-medium">{idx + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{step.description}</p>
              </div>
              {!step.done && (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// BEFORE/AFTER COMPARISON CARD
// ============================================================================
function BeforeAfterCard({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-col-resize select-none overflow-hidden"
      onMouseMove={(e) => { if (e.buttons === 1) handleMove(e.clientX); }}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      {/* After image (full) */}
      <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />
      {/* Before image (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: containerRef.current?.offsetWidth || '100%' }} />
      </div>
      {/* Slider line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
          <span className="text-[10px] text-gray-500">↔</span>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">Before</span>
      <span className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">After</span>
    </div>
  );
}

// ============================================================================
// PORTFOLIO GALLERY (inside dashboard)
// ============================================================================
function PortfolioGallery({ categories }: { categories: any[] | undefined }) {
  const { data: portfolio } = trpc.provider.getPortfolio.useQuery();
  const utils = trpc.useUtils();
  const deleteItem = trpc.provider.deletePortfolioItem.useMutation({
    onSuccess: () => {
      utils.provider.getPortfolio.invalidate();
      toast.success("Removed");
    },
  });

  if (!portfolio || portfolio.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No portfolio items yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload photos of your work to attract more customers</p>
        </CardContent>
      </Card>
    );
  }

  // Group by category
  const grouped = new Map<number | null, any[]>();
  for (const item of portfolio) {
    const key = item.categoryId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const CATEGORY_ICONS: Record<number, string> = {
    15: "\uD83C\uDFAC", 170: "\uD83D\uDC88", 7: "\u2702\uFE0F", 126: "\uD83D\uDD12", 195: "\uD83D\uDC83", 202: "\uD83D\uDD28",
    23: "\uD83E\uDDB7", 20: "\uD83C\uDFB5", 22: "\uD83D\uDE9B", 177: "\uD83C\uDF89", 196: "\uD83D\uDC41\uFE0F", 178: "\uD83D\uDCB0",
    109: "\uD83C\uDFCB\uFE0F", 197: "\uD83D\uDCCB", 9: "\uD83D\uDD27", 193: "\uD83E\uDDD8", 188: "\uD83E\uDDF9", 200: "\u26A1",
    179: "\uD83C\uDFE0", 171: "\uD83D\uDC87", 174: "\uD83D\uDE97", 176: "\uD83D\uDD29", 111: "\uD83D\uDD17", 10: "\uD83D\uDC86",
    168: "\uD83D\uDE99", 169: "\uD83D\uDEE0\uFE0F", 199: "\uD83C\uDFAA", 158: "\uD83C\uDFAF", 73: "\uD83C\uDF7D\uFE0F", 12: "\uD83D\uDCAA",
    11: "\uD83D\uDC3E", 17: "\uD83D\uDCF8", 148: "\uD83D\uDCA6", 26: "\uD83D\uDCC5", 8: "\uD83D\uDC85", 194: "\u2600\uFE0F",
    198: "\uD83D\uDCBB", 19: "\uD83C\uDFA5", 155: "\uD83D\uDCF1", 201: "\uD83D\uDDA5\uFE0F", 205: "\uD83C\uDF10",
  };

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([catId, items]) => {
        const cat = categories?.find((c: any) => c.categoryId === catId)?.category;
        const catName = cat ? cat.name.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") : "General";
        return (
          <div key={catId ?? "general"}>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <span>{catId ? CATEGORY_ICONS[catId] || "\uD83D\uDCE6" : "\uD83D\uDDBC\uFE0F"}</span> {catName}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((item: any) => (
                <div key={item.id} className="group relative rounded-lg overflow-hidden border bg-card aspect-square">
                  {item.mediaType === "before_after" && item.beforeImageUrl ? (
                    <BeforeAfterCard beforeUrl={item.beforeImageUrl} afterUrl={item.imageUrl} />
                  ) : (
                    <img src={item.imageUrl} alt={item.title || "Portfolio"} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    {item.mediaType === "before_after" && (
                      <Badge className="absolute top-1 left-1 text-[9px] bg-blue-500">Before & After</Badge>
                    )}
                    {item.title && <p className="text-white text-xs font-medium truncate">{item.title}</p>}
                    {item.description && <p className="text-white/70 text-[10px] truncate">{item.description}</p>}
                    <button
                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1"
                      onClick={() => deleteItem.mutate({ id: item.id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PackagesList() {
  const { data: packages, isLoading } = trpc.provider.myPackages.useQuery();
  const utils = trpc.useUtils();
  const deletePackage = trpc.provider.deletePackage.useMutation({
    onSuccess: () => {
      utils.provider.myPackages.invalidate();
      toast.success("Package deleted");
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading packages...</div>;
  }

  if (!packages || packages.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No packages yet. Bundle your services to offer discounts!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {packages.map((pkg: any) => {
        const discount = pkg.originalPrice && pkg.price
          ? Math.round((1 - Number(pkg.price) / Number(pkg.originalPrice)) * 100)
          : 0;
        return (
          <Card key={pkg.id} className="relative">
            {discount > 0 && (
              <Badge className="absolute top-3 right-3 bg-green-500 text-white">
                {discount}% off
              </Badge>
            )}
            <CardContent className="p-4">
              <h4 className="font-semibold">{pkg.name}</h4>
              {pkg.description && <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>}
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-lg font-bold text-primary">${Number(pkg.price).toFixed(2)}</span>
                {pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price) && (
                  <span className="text-sm text-muted-foreground line-through">${Number(pkg.originalPrice).toFixed(2)}</span>
                )}
              </div>
              {pkg.services && pkg.services.length > 0 && (
                <div className="mt-2 space-y-1">
                  {pkg.services.map((svc: any, i: number) => (
                    <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      {svc.serviceName}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 pt-2 border-t">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive"
                  onClick={() => deletePackage.mutate({ packageId: pkg.id })}
                  disabled={deletePackage.isPending}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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
            Subscribe to this URL in any calendar app to automatically sync your bookings. Updates every 15 minutes.
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
          {/* One-click subscribe buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                if (calendarData?.feedUrl) {
                  const webcalUrl = calendarData.feedUrl.replace(/^https?:\/\//, "webcal://");
                  window.location.href = webcalUrl;
                  toast.success("Opening calendar app...");
                }
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Subscribe with Calendar App
            </Button>
            {calendarData?.googleCalUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(calendarData.googleCalUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Add to Google Calendar
              </Button>
            )}
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
