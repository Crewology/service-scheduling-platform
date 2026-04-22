import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DURATION_PRESETS } from "../../../shared/duration";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { UpgradePrompt } from "@/components/UpgradePrompt";

export default function CreateService() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  const { data: categories } = trpc.category.list.useQuery();

  const { data: mySubscription } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: !!provider,
  });

  const { data: existingServices } = trpc.service.listMine.useQuery(undefined, {
    enabled: !!provider,
  });

  const currentTier = (mySubscription?.currentTier || "free") as "free" | "basic" | "premium";
  const serviceLimit = mySubscription?.tierConfig?.limits?.maxServices || 3;
  const serviceCount = existingServices?.length || 0;
  
  const createService = trpc.service.create.useMutation({
    onSuccess: () => {
      toast.success("Service created successfully!");
      setLocation("/provider/dashboard");
    },
    onError: (error) => {
      if (error.message?.includes("plan allows up to") || error.data?.code === "FORBIDDEN") {
        setShowUpgradePrompt(true);
      } else {
        toast.error(error.message || "Failed to create service");
      }
    },
  });

  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    description: "",
    serviceType: "fixed_location" as "mobile" | "fixed_location" | "virtual",
    pricingModel: "fixed" as "fixed" | "hourly" | "package" | "custom_quote",
    basePrice: "",
    hourlyRate: "",
    packagePrice: "",
    durationMinutes: "60",
    depositRequired: false,
    depositType: "fixed" as "fixed" | "percentage",
    depositAmount: "",
    depositPercentage: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider) {
      toast.error("You must be a provider to create services");
      return;
    }

    createService.mutate({
      categoryId: parseInt(formData.categoryId),
      name: formData.name,
      description: formData.description,
      serviceType: formData.serviceType,
      pricingModel: formData.pricingModel,
      basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
      durationMinutes: parseInt(formData.durationMinutes),
      depositRequired: formData.depositRequired,
      depositType: formData.depositRequired ? formData.depositType : undefined,
      depositAmount: formData.depositRequired && formData.depositType === "fixed" 
        ? parseFloat(formData.depositAmount) 
        : undefined,
      depositPercentage: formData.depositRequired && formData.depositType === "percentage"
        ? parseFloat(formData.depositPercentage)
        : undefined,
    });
  };

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
            <CardTitle>Provider Profile Required</CardTitle>
            <CardDescription>
              You need to create a provider profile first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/provider/onboarding")} className="w-full">
              Create Provider Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-4">
        <PageHeader
          title="Create New Service"
          breadcrumbs={[{ label: "Dashboard", href: "/provider/dashboard" }, { label: "Create Service" }]}
        />
      </div>

      <div className="container py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell customers about your service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Service Category *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
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

              <div>
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic Home Cleaning"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what's included in this service..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="serviceType">Service Type *</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value: any) => setFormData({ ...formData, serviceType: value })}
                  required
                >
                  <SelectTrigger id="serviceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile">Mobile (I travel to customer)</SelectItem>
                    <SelectItem value="fixed_location">Fixed Location (Customer comes to me)</SelectItem>
                    <SelectItem value="virtual">Virtual (Online/Remote)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="duration">Duration *</Label>
                <Select value={formData.durationMinutes} onValueChange={(v) => setFormData({ ...formData, durationMinutes: v })}>
                  <SelectTrigger id="duration"><SelectValue placeholder="Select duration" /></SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map(p => (
                      <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>Set your pricing model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pricingModel">Pricing Model *</Label>
                <Select
                  value={formData.pricingModel}
                  onValueChange={(value: any) => setFormData({ ...formData, pricingModel: value })}
                  required
                >
                  <SelectTrigger id="pricingModel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="package">Package Deal</SelectItem>
                    <SelectItem value="custom_quote">Custom Quote</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pricingModel === "fixed" && (
                <div>
                  <Label htmlFor="basePrice">Base Price ($) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              {formData.pricingModel === "hourly" && (
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              )}

              {formData.pricingModel === "package" && (
                <div>
                  <Label htmlFor="packagePrice">Package Price ($) *</Label>
                  <Input
                    id="packagePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.packagePrice}
                    onChange={(e) => setFormData({ ...formData, packagePrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deposit Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit Settings</CardTitle>
              <CardDescription>Require a deposit to secure bookings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="depositRequired"
                  checked={formData.depositRequired}
                  onChange={(e) => setFormData({ ...formData, depositRequired: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="depositRequired" className="cursor-pointer">
                  Require deposit for this service
                </Label>
              </div>

              {formData.depositRequired && (
                <>
                  <div>
                    <Label htmlFor="depositType">Deposit Type</Label>
                    <Select
                      value={formData.depositType}
                      onValueChange={(value: any) => setFormData({ ...formData, depositType: value })}
                    >
                      <SelectTrigger id="depositType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.depositType === "fixed" && (
                    <div>
                      <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.depositAmount}
                        onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {formData.depositType === "percentage" && (
                    <div>
                      <Label htmlFor="depositPercentage">Deposit Percentage (%)</Label>
                      <Input
                        id="depositPercentage"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={formData.depositPercentage}
                        onChange={(e) => setFormData({ ...formData, depositPercentage: e.target.value })}
                        placeholder="50"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/provider/dashboard")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createService.isPending}
              className="flex-1"
            >
              {createService.isPending ? "Creating..." : "Create Service"}
            </Button>
          </div>
        </form>
      </div>

      {/* Upgrade Prompt Dialog */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        reason="service_limit"
        currentTier={currentTier}
        currentCount={serviceCount}
        currentLimit={serviceLimit}
      />
    </div>
  );
}
