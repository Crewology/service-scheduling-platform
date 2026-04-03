import { useState, useMemo, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedPage } from "@/hooks/useProtectedPage";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  User,
  Grid3X3,
  Wrench,
  CreditCard,
  Loader2,
  Camera,
  Plus,
  X,
  Search,
  DollarSign,
  Clock,
  Rocket,
} from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";

// ============================================================================
// CATEGORY ICON MAP — visual icons for each category
// ============================================================================
const CATEGORY_ICONS: Record<number, string> = {
  15: "🎬", 170: "💈", 7: "✂️", 126: "🔒", 195: "💃", 202: "🔨",
  23: "🦷", 20: "🎵", 22: "🚛", 177: "🎉", 196: "👁️", 178: "💰",
  109: "🏋️", 197: "📋", 9: "🔧", 193: "🧘", 188: "🧹", 200: "⚡",
  179: "🏠", 171: "💇", 174: "🚗", 176: "🔩", 111: "🔗", 10: "💆",
  168: "🚙", 169: "🛠️", 199: "🎪", 158: "🎯", 73: "🍽️", 12: "💪",
  11: "🐾", 17: "📸", 148: "💦", 26: "📅", 8: "💅", 194: "☀️",
  198: "💻", 19: "🎥", 155: "📱", 201: "🖥️", 205: "🌐",
};

const STEPS = [
  { id: 1, title: "Your Profile", icon: User, description: "Photo, name & location" },
  { id: 2, title: "Your Skills", icon: Grid3X3, description: "Choose your categories" },
  { id: 3, title: "Your Services", icon: Wrench, description: "Add services & pricing" },
  { id: 4, title: "Get Paid", icon: CreditCard, description: "Connect Stripe" },
];

// ============================================================================
// ADD SERVICE DIALOG
// ============================================================================
function AddServiceDialog({
  open,
  onClose,
  categoryId,
  categoryName,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceType, setServiceType] = useState("fixed_location");
  const [pricingModel, setPricingModel] = useState("fixed");
  const [basePrice, setBasePrice] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [duration, setDuration] = useState(60);

  const createService = trpc.service.create.useMutation({
    onSuccess: () => {
      toast.success(`Service "${name}" added!`);
      setName("");
      setDescription("");
      setBasePrice("");
      setHourlyRate("");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Service name is required");
      return;
    }
    createService.mutate({
      name: name.trim(),
      categoryId,
      description: description || undefined,
      serviceType: serviceType as any,
      pricingModel: pricingModel as any,
      basePrice: pricingModel === "fixed" || pricingModel === "package" ? basePrice : undefined,
      hourlyRate: pricingModel === "hourly" ? hourlyRate : undefined,
      durationMinutes: duration,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Service to {categoryName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Service Name *</Label>
            <Input
              placeholder="e.g., Classic Haircut, Full Mix & Master"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="What's included in this service?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_location">At My Location</SelectItem>
                  <SelectItem value="mobile">Mobile (I Travel)</SelectItem>
                  <SelectItem value="virtual">Virtual / Online</SelectItem>
                  <SelectItem value="hybrid">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pricing</Label>
              <Select value={pricingModel} onValueChange={setPricingModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                  <SelectItem value="package">Package</SelectItem>
                  <SelectItem value="custom_quote">Custom Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(pricingModel === "fixed" || pricingModel === "package") && (
              <div className="space-y-2">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
            )}
            {pricingModel === "hourly" && (
              <div className="space-y-2">
                <Label>Hourly Rate ($)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createService.isPending}>
            {createService.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN ONBOARDING COMPONENT
// ============================================================================
export default function ProviderOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useProtectedPage();

  // Data queries
  const { data: existingProvider, isLoading: providerLoading } = trpc.provider.getMyProfile.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: myCategories, refetch: refetchMyCategories } = trpc.provider.getMyCategories.useQuery(undefined, {
    enabled: !!existingProvider,
  });
  const { data: myServices, refetch: refetchMyServices } = trpc.service.listMine.useQuery(undefined, {
    enabled: !!existingProvider,
  });

  // Step 1: Profile
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [acceptsMobile, setAcceptsMobile] = useState(false);
  const [acceptsFixedLocation, setAcceptsFixedLocation] = useState(true);
  const [acceptsVirtual, setAcceptsVirtual] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(25);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 2: Categories
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [categorySearch, setCategorySearch] = useState("");

  // Step 3: Services
  const [addServiceDialogOpen, setAddServiceDialogOpen] = useState(false);
  const [addServiceCategoryId, setAddServiceCategoryId] = useState<number>(0);
  const [addServiceCategoryName, setAddServiceCategoryName] = useState("");

  // Mutations
  const createProvider = trpc.provider.create.useMutation({
    onSuccess: () => {
      utils.provider.getMyProfile.invalidate();
      toast.success("Profile created!");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadProfilePhoto = trpc.provider.uploadProfilePhoto.useMutation({
    onSuccess: (data) => {
      setPhotoPreview(data.url);
      toast.success("Photo uploaded!");
    },
    onError: (err) => toast.error(err.message),
  });

  const setMyCategories = trpc.provider.setMyCategories.useMutation({
    onSuccess: () => {
      refetchMyCategories();
      toast.success("Categories saved!");
      setCurrentStep(3);
    },
    onError: (err) => toast.error(err.message),
  });

  const startOnboarding = trpc.stripeConnect.startOnboarding.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Stripe Connect opened in a new tab");
    },
    onError: (err) => toast.error(err.message),
  });

  // Photo upload handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        setPhotoPreview(reader.result as string);
        if (existingProvider) {
          uploadProfilePhoto.mutate({ photoData: base64, contentType: file.type });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Step completion tracking
  const stepComplete = useMemo(() => ({
    1: !!existingProvider,
    2: (myCategories?.length ?? 0) > 0,
    3: (myServices?.length ?? 0) > 0,
    4: existingProvider?.payoutEnabled === true,
  }), [existingProvider, myCategories, myServices]);

  // Initialize selected categories from existing data
  useMemo(() => {
    if (myCategories && myCategories.length > 0 && selectedCategoryIds.size === 0) {
      setSelectedCategoryIds(new Set(myCategories.map((c: any) => c.categoryId)));
    }
  }, [myCategories]);

  // Filtered categories for search
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!categorySearch.trim()) return categories;
    const term = categorySearch.toLowerCase();
    return categories.filter((c: any) => c.name.toLowerCase().includes(term));
  }, [categories, categorySearch]);

  // Group services by category
  const servicesByCategory = useMemo(() => {
    if (!myServices || !categories) return new Map();
    const map = new Map<number, { category: any; services: any[] }>();
    for (const service of myServices) {
      if (!map.has(service.categoryId)) {
        const cat = categories.find((c: any) => c.id === service.categoryId);
        map.set(service.categoryId, { category: cat, services: [] });
      }
      map.get(service.categoryId)!.services.push(service);
    }
    return map;
  }, [myServices, categories]);

  // Handlers
  const handleCreateProfile = async () => {
    if (!businessName.trim() || !businessType) {
      toast.error("Business name and type are required");
      return;
    }
    await createProvider.mutateAsync({
      businessName: businessName.trim(),
      businessType: businessType as any,
      description: description || undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      serviceRadiusMiles: acceptsMobile ? serviceRadius : undefined,
      acceptsMobile,
      acceptsFixedLocation,
      acceptsVirtual,
    });

    // Upload photo if selected before provider was created
    if (photoPreview && photoPreview.startsWith("data:")) {
      const base64 = photoPreview.split(",")[1];
      const contentType = photoPreview.split(";")[0].split(":")[1];
      uploadProfilePhoto.mutate({ photoData: base64, contentType });
    }

    setCurrentStep(2);
  };

  const handleSaveCategories = () => {
    if (selectedCategoryIds.size === 0) {
      toast.error("Select at least one category");
      return;
    }
    setMyCategories.mutate({ categoryIds: Array.from(selectedCategoryIds) });
  };

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddServiceDialog = (categoryId: number, categoryName: string) => {
    setAddServiceCategoryId(categoryId);
    setAddServiceCategoryName(categoryName);
    setAddServiceDialogOpen(true);
  };

  if (providerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Set Up Your Provider Profile</h1>
          <p className="text-muted-foreground mt-2">
            Show the world everything you can do — add all your skills and services
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-10 px-4">
          {STEPS.map((step, index) => {
            const isComplete = stepComplete[step.id as keyof typeof stepComplete];
            const isCurrent = currentStep === step.id;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1.5 transition-all ${isCurrent ? "scale-110" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 md:w-16 h-0.5 mx-1 ${isComplete ? "bg-green-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* STEP 1: YOUR PROFILE                                             */}
        {/* ================================================================ */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Profile
              </CardTitle>
              <CardDescription>
                Your photo and business info — this is what customers see first
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {existingProvider ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">{existingProvider.businessName}</h3>
                  <p className="text-muted-foreground mt-1">Profile created</p>
                  <Button className="mt-4" onClick={() => setCurrentStep(2)}>
                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Profile Photo */}
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="relative w-28 h-28 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? "Change Photo" : "Add Profile Photo"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Business Name *</Label>
                      <Input
                        placeholder="e.g., Chisolm Audio, Elite Barber Studio"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Type *</Label>
                      <Select value={businessType} onValueChange={setBusinessType}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                          <SelectItem value="llc">LLC</SelectItem>
                          <SelectItem value="corporation">Corporation</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>About You / Your Business</Label>
                    <Textarea
                      placeholder="Tell customers what makes you special — your experience, certifications, what you're passionate about..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input placeholder="ZIP" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">How do you serve clients?</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">In-Person</p>
                          <p className="text-xs text-muted-foreground">At your location</p>
                        </div>
                        <Switch checked={acceptsFixedLocation} onCheckedChange={setAcceptsFixedLocation} />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">Mobile</p>
                          <p className="text-xs text-muted-foreground">Travel to clients</p>
                        </div>
                        <Switch checked={acceptsMobile} onCheckedChange={setAcceptsMobile} />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">Virtual</p>
                          <p className="text-xs text-muted-foreground">Online sessions</p>
                        </div>
                        <Switch checked={acceptsVirtual} onCheckedChange={setAcceptsVirtual} />
                      </div>
                    </div>
                  </div>

                  {acceptsMobile && (
                    <div className="space-y-2">
                      <Label>Service Radius (miles)</Label>
                      <Input
                        type="number"
                        value={serviceRadius}
                        onChange={(e) => setServiceRadius(parseInt(e.target.value) || 25)}
                        min={1}
                        max={200}
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleCreateProfile} disabled={createProvider.isPending}>
                      {createProvider.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Profile & Continue
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ================================================================ */}
        {/* STEP 2: YOUR SKILLS (Multi-Category Selection)                   */}
        {/* ================================================================ */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Your Skills & Categories
              </CardTitle>
              <CardDescription>
                Select every category you can provide services in. You're multi-talented — show it!
                A chef who also does power washing? A DJ who cuts hair? Select them all.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected count */}
              {selectedCategoryIds.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedCategoryIds.size} selected:
                  </span>
                  {Array.from(selectedCategoryIds).map((id) => {
                    const cat = categories?.find((c: any) => c.id === id);
                    if (!cat) return null;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="gap-1 cursor-pointer hover:bg-destructive/10"
                        onClick={() => toggleCategory(id)}
                      >
                        {CATEGORY_ICONS[id] || "📦"} {cat.name}
                        <X className="h-3 w-3" />
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Category Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCategories.map((cat: any) => {
                  const isSelected = selectedCategoryIds.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-transparent bg-muted/50 hover:border-muted-foreground/20"
                      }`}
                    >
                      <div className="text-2xl mb-1">{CATEGORY_ICONS[cat.id] || "📦"}</div>
                      <div className="text-xs font-medium leading-tight line-clamp-2">
                        {cat.name.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-primary mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSaveCategories} disabled={setMyCategories.isPending || selectedCategoryIds.size === 0}>
                  {setMyCategories.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Categories & Continue ({selectedCategoryIds.size})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================ */}
        {/* STEP 3: YOUR SERVICES (Per-Category)                             */}
        {/* ================================================================ */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Add Your Services
              </CardTitle>
              <CardDescription>
                Add specific services under each category you selected. Set your own pricing for each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show each selected category with its services */}
              {myCategories && myCategories.length > 0 ? (
                myCategories.map((pc: any) => {
                  const cat = pc.category;
                  if (!cat) return null;
                  const catServices = myServices?.filter((s: any) => s.categoryId === cat.id) || [];
                  const displayName = cat.name.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

                  return (
                    <div key={cat.id} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{CATEGORY_ICONS[cat.id] || "📦"}</span>
                          <h3 className="font-semibold">{displayName}</h3>
                          <Badge variant="outline" className="text-xs">
                            {catServices.length} service{catServices.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddServiceDialog(cat.id, displayName)}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Service
                        </Button>
                      </div>

                      {catServices.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg bg-muted/30">
                          No services yet — add your first service in this category
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {catServices.map((service: any) => (
                            <div
                              key={service.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                            >
                              <div>
                                <p className="font-medium text-sm">{service.name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  {service.durationMinutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> {service.durationMinutes} min
                                    </span>
                                  )}
                                  <span className="capitalize">{service.serviceType.replace("_", " ")}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-sm text-primary">
                                  {service.pricingModel === "fixed" && `$${parseFloat(service.basePrice || "0").toFixed(2)}`}
                                  {service.pricingModel === "hourly" && `$${parseFloat(service.hourlyRate || "0").toFixed(2)}/hr`}
                                  {service.pricingModel === "package" && `$${parseFloat(service.basePrice || "0").toFixed(2)}`}
                                  {service.pricingModel === "custom_quote" && "Quote"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Go back to Step 2 and select your categories first</p>
                  <Button variant="outline" className="mt-4" onClick={() => setCurrentStep(2)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Select Categories
                  </Button>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  disabled={(myServices?.length ?? 0) === 0}
                >
                  Continue to Payments
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ================================================================ */}
        {/* STEP 4: GET PAID (Stripe Connect)                                */}
        {/* ================================================================ */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Connect Your Payment Account
              </CardTitle>
              <CardDescription>
                Set up Stripe to receive payments directly. Only a 1% platform fee applies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {existingProvider?.payoutEnabled ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Payments Connected</h3>
                  <p className="text-muted-foreground mt-1">You're all set to receive payments</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg border text-center">
                      <p className="text-2xl font-bold text-green-600">1%</p>
                      <p className="text-sm text-muted-foreground">Platform fee</p>
                    </div>
                    <div className="p-4 rounded-lg border text-center">
                      <p className="text-2xl font-bold">Direct</p>
                      <p className="text-sm text-muted-foreground">Payments to you</p>
                    </div>
                    <div className="p-4 rounded-lg border text-center">
                      <p className="text-2xl font-bold">Secure</p>
                      <p className="text-sm text-muted-foreground">Powered by Stripe</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>1. Click below to set up your Stripe account</li>
                      <li>2. Complete the Stripe verification process</li>
                      <li>3. Customers book and pay — money goes directly to you</li>
                      <li>4. OlogyCrew only takes a 1% platform fee</li>
                    </ul>
                  </div>
                </>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex gap-2">
                  {!existingProvider?.payoutEnabled && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          toast.success("Welcome! You can set up payments later from your dashboard.");
                          setLocation("/provider/dashboard");
                        }}
                      >
                        Skip for now
                      </Button>
                      <Button
                        onClick={() => startOnboarding.mutate({ origin: window.location.origin })}
                        disabled={startOnboarding.isPending}
                      >
                        {startOnboarding.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Connect Stripe Account
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => {
                      toast.success("Welcome to OlogyCrew! Your profile is live.");
                      setLocation("/provider/dashboard");
                    }}
                  >
                    <Rocket className="h-4 w-4 mr-1" />
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Service Dialog */}
      <AddServiceDialog
        open={addServiceDialogOpen}
        onClose={() => setAddServiceDialogOpen(false)}
        categoryId={addServiceCategoryId}
        categoryName={addServiceCategoryName}
        onSuccess={() => {
          refetchMyServices();
          utils.service.listMine.invalidate();
        }}
      />
    </div>
  );
}
