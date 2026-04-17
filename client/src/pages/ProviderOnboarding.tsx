import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useProtectedPage } from "@/hooks/useProtectedPage";
import { trpc } from "@/lib/trpc";
import { formatDuration, DURATION_PRESETS } from "../../../shared/duration";
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
  TrendingUp,
  Calendar,
  Shield,
  Star,
  Users,
  Zap,
  ArrowRight,
} from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquareQuote, HelpCircle, ChevronDown } from "lucide-react";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {DURATION_PRESETS.map(p => (
                    <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
// ============================================================================
// WHY BECOME A PROVIDER — LANDING SECTION
// ============================================================================
function WhyBecomeProvider({ onGetStarted }: { onGetStarted: () => void }) {
  const benefits = [
    {
      icon: DollarSign,
      title: "Earn on Your Terms",
      description: "Set your own prices, choose your services, and get paid securely through Stripe. No hidden fees — just a simple 1% platform fee.",
    },
    {
      icon: Calendar,
      title: "Manage Your Schedule",
      description: "Full control over your availability with weekly schedules, date overrides, and automatic double-booking prevention.",
    },
    {
      icon: Users,
      title: "Reach New Customers",
      description: "Get discovered by customers searching across 42+ service categories. Your public profile showcases your work and reviews.",
    },
    {
      icon: Zap,
      title: "Instant Booking Tools",
      description: "Embeddable booking widgets, shareable links, and a mini-website — let customers book you from anywhere on the web.",
    },
    {
      icon: TrendingUp,
      title: "Grow with Analytics",
      description: "Track booking trends, revenue, customer retention, and top services with built-in analytics on your dashboard.",
    },
    {
      icon: Shield,
      title: "Built-In Trust & Safety",
      description: "Verified provider badges, customer reviews, secure payments, and automated refund policies protect you and your customers.",
    },
  ];

  const steps = [
    { number: "1", title: "Create Your Profile", desc: "Add your photo, business name, and location in under 2 minutes." },
    { number: "2", title: "Choose Your Categories", desc: "Select from 42+ service categories that match your skills." },
    { number: "3", title: "Add Your Services", desc: "List your services with pricing, duration, and descriptions." },
    { number: "4", title: "Start Getting Booked", desc: "Connect Stripe, go live, and start accepting bookings today." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-transparent" />
        <div className="container max-w-5xl py-16 sm:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium">
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              Join OlogyCrew as a Provider
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Turn Your Skills Into a
              <span className="text-primary block sm:inline"> Thriving Business</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
              OlogyCrew gives you everything you need to offer your services, manage bookings, 
              and get paid — all in one place. No upfront costs, no commitments.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Button size="lg" className="text-base px-8" onClick={onGetStarted}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground">
                Setup takes less than 5 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Why Providers Choose OlogyCrew</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Everything you need to run your service business, built into one platform.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card key={benefit.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">Get Started in 4 Simple Steps</h2>
            <p className="text-muted-foreground mt-2">
              From sign-up to your first booking — it's that easy.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <div key={step.number} className="flex gap-4 p-5 rounded-xl bg-card border hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold">What Providers Are Saying</h2>
            <p className="text-muted-foreground mt-2">
              Hear from service professionals who grew their business with OlogyCrew.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Marcus T.",
                role: "Mobile Barber",
                quote: "I went from 5 clients a week to over 20 in my first month. The booking system handles everything so I can focus on cutting hair.",
                rating: 5,
              },
              {
                name: "Jasmine R.",
                role: "Massage Therapist",
                quote: "The scheduling tools are a game-changer. Clients book directly, I get reminders, and payments land in my account automatically.",
                rating: 5,
              },
              {
                name: "David K.",
                role: "Handyman Services",
                quote: "I love that I can set my own prices and availability. The 1% fee is nothing compared to what other platforms charge. Highly recommend.",
                rating: 5,
              },
            ].map((testimonial) => (
              <Card key={testimonial.name} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold">42+</div>
              <div className="text-sm opacity-80 mt-1">Service Categories</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">0%</div>
              <div className="text-sm opacity-80 mt-1">Upfront Cost</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">1%</div>
              <div className="text-sm opacity-80 mt-1">Platform Fee</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">
                <Star className="h-8 w-8 sm:h-10 sm:w-10 inline" />
              </div>
              <div className="text-sm opacity-80 mt-1">Verified Reviews</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mt-2">
              Everything you need to know before getting started.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="cost">
              <AccordionTrigger className="text-left text-base">
                How much does it cost to become a provider?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Signing up is completely free. There are no monthly fees, no subscription charges, and no upfront costs. We only charge a simple 1% platform fee on each completed transaction, so you only pay when you earn.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="payouts">
              <AccordionTrigger className="text-left text-base">
                How and when do I get paid?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Payments are processed securely through Stripe. Once a customer completes a booking, funds are deposited directly into your connected bank account. Standard Stripe payouts typically arrive within 2 business days.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancellation">
              <AccordionTrigger className="text-left text-base">
                What happens if a customer cancels?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                You set your own cancellation policy during onboarding. Options include flexible (full refund up to 24 hours before), moderate (50% refund up to 48 hours before), or strict (no refund within 7 days). Cancellations and refunds are handled automatically based on your chosen policy.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="categories">
              <AccordionTrigger className="text-left text-base">
                Can I offer services in multiple categories?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Absolutely! You can select as many categories as you like during onboarding and add services under each one. Whether you're a barber who also does mobile detailing, or a photographer who offers event planning, OlogyCrew supports multi-category providers.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="schedule">
              <AccordionTrigger className="text-left text-base">
                How does scheduling work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                You set your weekly availability with specific time slots for each day. You can also add date-specific overrides for holidays or special hours. The system automatically prevents double-bookings and sends reminders to both you and your customers 24 hours before each appointment.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mobile">
              <AccordionTrigger className="text-left text-base">
                Can I offer both mobile and in-location services?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Yes! Each service can be set as fixed-location (customers come to you), mobile (you go to the customer), or both. You can set different pricing for mobile vs. in-location services and define your service radius for mobile bookings.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="verification">
              <AccordionTrigger className="text-left text-base">
                How do I get verified?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                Complete your profile, add services, connect Stripe for payments, and maintain a good review rating. Verified providers get a badge on their profile, higher search visibility, and increased trust from potential customers.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Refer a Provider */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <div className="container max-w-4xl">
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-3 px-3 py-1 text-sm">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Referral Program
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold">Know a Great Provider? Refer Them!</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Earn credits when you refer other service professionals to OlogyCrew. The more providers you bring, the more you earn.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-1">Share Your Link</h3>
                <p className="text-sm text-muted-foreground">Get your unique referral link from your dashboard and share it with fellow professionals.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-1">They Sign Up</h3>
                <p className="text-sm text-muted-foreground">When your referral creates their provider profile and completes their first booking, you both earn rewards.</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold mb-1">Earn Credits</h3>
                <p className="text-sm text-muted-foreground">Get discount credits on your next bookings. No limit on how many providers you can refer!</p>
              </CardContent>
            </Card>
          </div>
          <div className="text-center">
            <Button variant="outline" size="lg" className="text-base" onClick={onGetStarted}>
              Join & Start Referring
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to Grow Your Business?</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            Join OlogyCrew today and start reaching new customers. 
            No contracts, no monthly fees — just a simple 1% per transaction.
          </p>
          <Button size="lg" className="mt-6 text-base px-8" onClick={onGetStarted}>
            Create Your Provider Profile
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// MAIN ONBOARDING COMPONENT
// ============================================================================
export default function ProviderOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const step = parseInt(params.get("step") || "1", 10);
    return step >= 1 && step <= 4 ? step : 1;
  });
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Capture referral code from URL and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("provider_referral_code", refCode.toUpperCase().trim());
      // Clean the URL without losing other params
      params.delete("ref");
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

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
      utils.auth.me.invalidate(); // Refresh user role so NavHeader shows Dashboard link
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

  const validateReferralMutation = trpc.referral.validate.useMutation();
  const applyReferralMutation = trpc.referral.applyCode.useMutation({
    onSuccess: () => {
      toast.success("Referral code applied! You and your referrer will both earn credits.");
    },
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

    // Track provider referral if one was captured
    const refCode = localStorage.getItem("provider_referral_code");
    if (refCode) {
      try {
        const validation = await validateReferralMutation.mutateAsync({ code: refCode });
        if (validation.valid && validation.referralCodeId && validation.referrerId) {
          await applyReferralMutation.mutateAsync({
            referralCodeId: validation.referralCodeId,
            referrerId: validation.referrerId,
          });
        }
        localStorage.removeItem("provider_referral_code");
      } catch {
        // Referral tracking is best-effort, don't block onboarding
        localStorage.removeItem("provider_referral_code");
      }
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

  // Show landing page for new users who haven't started onboarding yet
  if (!existingProvider && !showOnboarding) {
    return <WhyBecomeProvider onGetStarted={() => setShowOnboarding(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container max-w-4xl py-8">
        {/* Header with overall progress */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Set Up Your Provider Profile</h1>
          <p className="text-muted-foreground mt-2">
            Show the world everything you can do — add all your skills and services
          </p>
          {/* Overall completion percentage */}
          <div className="mt-4 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold text-primary">
                {Math.round((Object.values(stepComplete).filter(Boolean).length / 4) * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(Object.values(stepComplete).filter(Boolean).length / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 sm:mb-10 px-0 sm:px-4 overflow-x-auto">
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
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {step.description}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-4 sm:w-8 md:w-16 h-0.5 mx-0.5 sm:mx-1 shrink-0 ${isComplete ? "bg-green-500" : "bg-muted"}`} />
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
                                      <Clock className="h-3 w-3" /> {formatDuration(service.durationMinutes)}
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
