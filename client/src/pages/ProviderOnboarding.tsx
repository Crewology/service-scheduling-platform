import { useState, useMemo } from "react";
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
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Building2,
  Wrench,
  Clock,
  CreditCard,
  Rocket,
  Loader2,
} from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";

const STEPS = [
  { id: 1, title: "Business Profile", icon: Building2, description: "Tell us about your business" },
  { id: 2, title: "First Service", icon: Wrench, description: "Add your first service listing" },
  { id: 3, title: "Availability", icon: Clock, description: "Set your working hours" },
  { id: 4, title: "Get Paid", icon: CreditCard, description: "Connect your payment account" },
  { id: 5, title: "Launch", icon: Rocket, description: "Review and go live" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ProviderOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const utils = trpc.useUtils();

  useProtectedPage();

  // Check if provider already exists
  const { data: existingProvider, isLoading: providerLoading } = trpc.provider.getMyProfile.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: myServices } = trpc.service.listByProvider.useQuery(
    { providerId: existingProvider?.id ?? 0 },
    { enabled: !!existingProvider }
  );
  const { data: mySchedule } = trpc.availability.getMySchedule.useQuery(undefined, {
    enabled: !!existingProvider,
  });

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [acceptsMobile, setAcceptsMobile] = useState(false);
  const [acceptsFixedLocation, setAcceptsFixedLocation] = useState(true);
  const [acceptsVirtual, setAcceptsVirtual] = useState(false);
  const [serviceRadius, setServiceRadius] = useState<number>(25);

  // Step 2: First Service
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceType, setServiceType] = useState<string>("fixed_location");
  const [pricingModel, setPricingModel] = useState<string>("fixed");
  const [basePrice, setBasePrice] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Step 3: Availability
  const [schedules, setSchedules] = useState<Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }>>([
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", enabled: true },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", enabled: true },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", enabled: true },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", enabled: true },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", enabled: true },
    { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", enabled: false },
    { dayOfWeek: 0, startTime: "10:00", endTime: "14:00", enabled: false },
  ]);

  // Mutations
  const createProvider = trpc.provider.create.useMutation({
    onSuccess: () => {
      utils.provider.getMyProfile.invalidate();
      toast.success("Business profile created!");
      setCurrentStep(2);
    },
    onError: (err) => toast.error(err.message),
  });

  const createService = trpc.service.create.useMutation({
    onSuccess: () => {
      if (existingProvider) {
        utils.service.listByProvider.invalidate({ providerId: existingProvider.id });
      }
      toast.success("Service created!");
      setCurrentStep(3);
    },
    onError: (err) => toast.error(err.message),
  });

  const createSchedule = trpc.availability.createSchedule.useMutation({
    onSuccess: () => {
      utils.availability.getMySchedule.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const startOnboarding = trpc.stripeConnect.startOnboarding.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Stripe Connect setup opened in a new tab");
    },
    onError: (err) => toast.error(err.message),
  });

  // Determine which steps are complete
  const stepComplete = useMemo(() => ({
    1: !!existingProvider,
    2: (myServices?.length ?? 0) > 0,
    3: (mySchedule?.length ?? 0) > 0,
    4: existingProvider?.payoutEnabled === true,
    5: false,
  }), [existingProvider, myServices, mySchedule]);

  // Auto-advance to first incomplete step
  const firstIncompleteStep = useMemo(() => {
    for (let i = 1; i <= 5; i++) {
      if (!stepComplete[i as keyof typeof stepComplete]) return i;
    }
    return 5;
  }, [stepComplete]);

  // If provider already exists and has completed onboarding, redirect
  if (!providerLoading && existingProvider && stepComplete[1] && stepComplete[2] && stepComplete[3]) {
    if (currentStep < firstIncompleteStep) {
      setCurrentStep(firstIncompleteStep);
    }
  }

  const handleCreateProvider = () => {
    if (!businessName || !businessType) {
      toast.error("Please fill in your business name and type");
      return;
    }
    createProvider.mutate({
      businessName,
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
  };

  const handleCreateService = () => {
    if (!serviceName || !serviceCategory) {
      toast.error("Please fill in the service name and category");
      return;
    }
    createService.mutate({
      name: serviceName,
      categoryId: parseInt(serviceCategory),
      description: serviceDescription || undefined,
      serviceType: serviceType as any,
      pricingModel: pricingModel as any,
      basePrice: pricingModel === "fixed" || pricingModel === "package" ? basePrice : undefined,
      hourlyRate: pricingModel === "hourly" ? hourlyRate : undefined,
      durationMinutes,
    });
  };

  const handleSaveAvailability = async () => {
    const enabled = schedules.filter(s => s.enabled);
    if (enabled.length === 0) {
      toast.error("Please enable at least one day");
      return;
    }
    
    let saved = 0;
    for (const schedule of enabled) {
      try {
        await createSchedule.mutateAsync({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isAvailable: true,
        });
        saved++;
      } catch {
        // May already exist, skip
      }
    }
    
    if (saved > 0) {
      toast.success(`Saved ${saved} schedule${saved > 1 ? 's' : ''}`);
    }
    utils.availability.getMySchedule.invalidate();
    setCurrentStep(4);
  };

  const handleStripeConnect = () => {
    startOnboarding.mutate({ origin: window.location.origin });
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
          <h1 className="text-3xl font-bold">Welcome to SkillLink</h1>
          <p className="text-muted-foreground mt-2">
            Let's get your business set up in a few easy steps
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
                  className={`flex flex-col items-center gap-1.5 transition-all ${
                    isCurrent ? "scale-110" : ""
                  }`}
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
                    {isComplete ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-0.5 mx-1 ${
                      stepComplete[step.id as keyof typeof stepComplete]
                        ? "bg-green-500"
                        : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Business Profile */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Profile
                </CardTitle>
                <CardDescription>
                  Tell us about your business so customers can find you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {existingProvider ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">{existingProvider.businessName}</h3>
                    <p className="text-muted-foreground mt-1">Business profile already created</p>
                    <Button className="mt-4" onClick={() => setCurrentStep(2)}>
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name *</Label>
                        <Input
                          id="businessName"
                          placeholder="e.g., Elite Barber Studio"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type *</Label>
                        <Select value={businessType} onValueChange={setBusinessType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
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
                      <Label htmlFor="description">Business Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Tell customers what makes your business special..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input id="state" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">ZIP Code</Label>
                        <Input id="postalCode" placeholder="ZIP" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Service Locations</Label>
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
                          max={100}
                        />
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button onClick={handleCreateProvider} disabled={createProvider.isPending}>
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

          {/* Step 2: First Service */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Add Your First Service
                </CardTitle>
                <CardDescription>
                  Create a service listing that customers can book
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(myServices?.length ?? 0) > 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">
                      {myServices?.length} service{(myServices?.length ?? 0) > 1 ? "s" : ""} created
                    </h3>
                    <p className="text-muted-foreground mt-1">You can add more services later from your dashboard</p>
                    <Button className="mt-4" onClick={() => setCurrentStep(3)}>
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Service Name *</Label>
                        <Input
                          placeholder="e.g., Classic Haircut"
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={serviceCategory} onValueChange={setServiceCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Service Description</Label>
                      <Textarea
                        placeholder="Describe what's included in this service..."
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Service Type</Label>
                        <Select value={serviceType} onValueChange={setServiceType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed_location">At My Location</SelectItem>
                            <SelectItem value="mobile">Mobile (I Travel)</SelectItem>
                            <SelectItem value="virtual">Virtual / Online</SelectItem>
                            <SelectItem value="hybrid">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Select value={durationMinutes.toString()} onValueChange={(v) => setDurationMinutes(parseInt(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="180">3 hours</SelectItem>
                            <SelectItem value="240">4 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pricing Model</Label>
                        <Select value={pricingModel} onValueChange={setPricingModel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <Button onClick={handleCreateService} disabled={createService.isPending}>
                        {createService.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Service & Continue
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Availability */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Set Your Availability
                </CardTitle>
                <CardDescription>
                  Choose when you're available for bookings. You can adjust this anytime.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(mySchedule?.length ?? 0) > 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Availability set</h3>
                    <p className="text-muted-foreground mt-1">
                      {mySchedule?.length} schedule{(mySchedule?.length ?? 0) > 1 ? "s" : ""} configured
                    </p>
                    <Button className="mt-4" onClick={() => setCurrentStep(4)}>
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {schedules.map((schedule, index) => (
                        <div
                          key={schedule.dayOfWeek}
                          className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                            schedule.enabled ? "bg-card" : "bg-muted/30"
                          }`}
                        >
                          <Switch
                            checked={schedule.enabled}
                            onCheckedChange={(checked) => {
                              const updated = [...schedules];
                              updated[index] = { ...updated[index], enabled: checked };
                              setSchedules(updated);
                            }}
                          />
                          <span className={`w-24 text-sm font-medium ${!schedule.enabled ? "text-muted-foreground" : ""}`}>
                            {DAY_NAMES[schedule.dayOfWeek]}
                          </span>
                          {schedule.enabled ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={schedule.startTime}
                                onChange={(e) => {
                                  const updated = [...schedules];
                                  updated[index] = { ...updated[index], startTime: e.target.value };
                                  setSchedules(updated);
                                }}
                                className="w-32"
                              />
                              <span className="text-muted-foreground">to</span>
                              <Input
                                type="time"
                                value={schedule.endTime}
                                onChange={(e) => {
                                  const updated = [...schedules];
                                  updated[index] = { ...updated[index], endTime: e.target.value };
                                  setSchedules(updated);
                                }}
                                className="w-32"
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Closed</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep(2)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <Button onClick={handleSaveAvailability} disabled={createSchedule.isPending}>
                        {createSchedule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save & Continue
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Get Paid */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Connect Your Payment Account
                </CardTitle>
                <CardDescription>
                  Set up Stripe to receive payments directly from your customers. Only a 1% platform fee applies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {existingProvider?.payoutEnabled ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Payments Connected</h3>
                    <p className="text-muted-foreground mt-1">You're all set to receive payments</p>
                    <Button className="mt-4" onClick={() => setCurrentStep(5)}>
                      Continue <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border text-center">
                        <p className="text-2xl font-bold text-green-600">1%</p>
                        <p className="text-sm text-muted-foreground">Platform fee per transaction</p>
                      </div>
                      <div className="p-4 rounded-lg border text-center">
                        <p className="text-2xl font-bold">Direct</p>
                        <p className="text-sm text-muted-foreground">Payments go to your account</p>
                      </div>
                      <div className="p-4 rounded-lg border text-center">
                        <p className="text-2xl font-bold">Secure</p>
                        <p className="text-sm text-muted-foreground">Powered by Stripe</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">How it works:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>1. Click the button below to set up your Stripe account</li>
                        <li>2. Complete the Stripe verification process</li>
                        <li>3. When customers book your services, payments go directly to you</li>
                        <li>4. SkillLink only takes a 1% platform fee</li>
                      </ul>
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(3)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setCurrentStep(5)}>
                          Skip for now
                        </Button>
                        <Button onClick={handleStripeConnect} disabled={startOnboarding.isPending}>
                          {startOnboarding.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Connect Stripe Account
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Launch */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  You're Ready to Launch!
                </CardTitle>
                <CardDescription>
                  Review your setup and start accepting bookings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Checklist */}
                <div className="space-y-3">
                  {STEPS.slice(0, 4).map((step) => {
                    const isComplete = stepComplete[step.id as keyof typeof stepComplete];
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isComplete ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-amber-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                        {!isComplete && (
                          <Button size="sm" variant="outline" onClick={() => setCurrentStep(step.id)}>
                            Complete
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Subscription Prompt */}
                <div className="p-4 rounded-lg border border-dashed bg-muted/30">
                  <div className="flex items-start gap-3">
                    <Badge className="mt-0.5">Optional</Badge>
                    <div>
                      <p className="font-medium">Upgrade Your Plan</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start with our free Starter plan. Upgrade to Professional ($29/mo) for more services, custom branding, and priority search placement.
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setLocation("/provider/subscription")}>
                        View Plans
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Launch Button */}
                <div className="text-center pt-4">
                  <Button
                    size="lg"
                    className="px-8"
                    onClick={() => {
                      toast.success("Welcome to SkillLink! Your profile is live.");
                      setLocation("/provider/dashboard");
                    }}
                  >
                    <Rocket className="h-5 w-5 mr-2" />
                    Go to My Dashboard
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can always come back to adjust your settings from the dashboard
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
