import { ImageCropper } from "@/components/ImageCropper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ProviderProfileForm {
  businessName: string;
  description: string;
  city: string;
  state: string;
  addressLine1: string;
  postalCode: string;
  serviceRadiusMiles: number;
  acceptsMobile: boolean;
  acceptsFixedLocation: boolean;
  acceptsVirtual: boolean;
}

interface ProviderBusinessProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_PROFILE_FORM: ProviderProfileForm = {
  businessName: "",
  description: "",
  city: "",
  state: "",
  addressLine1: "",
  postalCode: "",
  serviceRadiusMiles: 0,
  acceptsMobile: false,
  acceptsFixedLocation: false,
  acceptsVirtual: false,
};

function toProfileForm(provider: Record<string, unknown>): ProviderProfileForm {
  return {
    businessName: String(provider.businessName ?? ""),
    description: String(provider.description ?? ""),
    city: String(provider.city ?? ""),
    state: String(provider.state ?? ""),
    addressLine1: String(provider.addressLine1 ?? ""),
    postalCode: String(provider.postalCode ?? ""),
    serviceRadiusMiles: Number(provider.serviceRadiusMiles ?? 0),
    acceptsMobile: Boolean(provider.acceptsMobile),
    acceptsFixedLocation: Boolean(provider.acceptsFixedLocation),
    acceptsVirtual: Boolean(provider.acceptsVirtual),
  };
}

export function ProviderBusinessProfileDialog({ open, onOpenChange }: ProviderBusinessProfileDialogProps) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ProviderProfileForm>(EMPTY_PROFILE_FORM);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const initializedForOpen = useRef(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const profileQuery = trpc.provider.getMyProfile.useQuery(undefined, { enabled: open });

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false;
      setCropperOpen(false);
      setCropSource(null);
      return;
    }

    if (profileQuery.data && !initializedForOpen.current) {
      setForm(toProfileForm(profileQuery.data as Record<string, unknown>));
      initializedForOpen.current = true;
    }
  }, [open, profileQuery.data]);

  const updateProvider = trpc.provider.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provider.getMyProfile.invalidate(),
        utils.providerOverview.get.invalidate(),
      ]);
      toast.success("Profile updated");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message || "Failed to update profile"),
  });

  const uploadProfilePhoto = trpc.provider.uploadProfilePhoto.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provider.getMyProfile.invalidate(),
        utils.providerOverview.get.invalidate(),
        utils.auth.me.invalidate(),
      ]);
      setCropperOpen(false);
      setCropSource(null);
      toast.success("Profile photo updated!");
    },
    onError: (error) => toast.error(error.message || "Failed to upload photo"),
  });

  const removeProfilePhoto = trpc.provider.removeProfilePhoto.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.provider.getMyProfile.invalidate(),
        utils.providerOverview.get.invalidate(),
        utils.auth.me.invalidate(),
      ]);
      toast.success("Profile photo removed");
    },
    onError: (error) => toast.error(error.message || "Failed to remove photo"),
  });

  const uploadBusinessLogo = trpc.provider.uploadBusinessLogo.useMutation({
    onSuccess: async () => {
      await utils.provider.getMyProfile.invalidate();
      toast.success("Business logo updated!");
    },
    onError: (error) => toast.error(error.message || "Failed to upload logo"),
  });

  const removeBusinessLogo = trpc.provider.removeBusinessLogo.useMutation({
    onSuccess: async () => {
      await utils.provider.getMyProfile.invalidate();
      toast.success("Business logo removed");
    },
    onError: (error) => toast.error(error.message || "Failed to remove logo"),
  });

  function handleProfilePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
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
      setCropSource(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  }

  function handleLogoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      if (!base64) {
        toast.error("Failed to read logo file");
        return;
      }
      uploadBusinessLogo.mutate({ photoData: base64, contentType: file.type });
    };
    reader.readAsDataURL(file);
  }

  const provider = profileQuery.data;
  const profileBusy = updateProvider.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen && profileBusy) return;
        onOpenChange(nextOpen);
      }}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-5 sm:w-full sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Business Profile</DialogTitle>
            <DialogDescription>Update your business information</DialogDescription>
          </DialogHeader>

          {profileQuery.isLoading || (provider && !initializedForOpen.current) ? (
            <div className="flex min-h-56 items-center justify-center" role="status" aria-label="Loading business profile">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : profileQuery.error || !provider ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              We couldn’t load your business profile. Close this window and try again.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                    {provider.profilePhotoUrl ? (
                      <img src={provider.profilePhotoUrl} alt="Current profile" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => profilePhotoInputRef.current?.click()}>
                      Change Photo
                    </Button>
                    {provider.profilePhotoUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeProfilePhoto.mutate()}
                        disabled={removeProfilePhoto.isPending}
                      >
                        {removeProfilePhoto.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Choose profile photo"
                    onChange={handleProfilePhotoSelect}
                  />
                </div>

                <div>
                  <Label>Business Logo</Label>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Displayed on your invoices for a branded, professional look. Recommended: square image, under 2MB.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {provider.businessLogoUrl ? (
                        <img src={provider.businessLogoUrl} alt="Business logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No logo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadBusinessLogo.isPending}>
                        {uploadBusinessLogo.isPending ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Uploading...</> : "Upload Logo"}
                      </Button>
                      {provider.businessLogoUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeBusinessLogo.mutate()}
                          disabled={removeBusinessLogo.isPending}
                        >
                          {removeBusinessLogo.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
                        </Button>
                      ) : null}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-label="Choose business logo"
                      onChange={handleLogoSelect}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="provider-business-name">Business Name</Label>
                  <Input id="provider-business-name" value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} />
                </div>
                <div>
                  <Label htmlFor="provider-description">Bio / Description</Label>
                  <Textarea
                    id="provider-description"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={4}
                    placeholder="Tell customers about your experience, skills, and what makes your services unique..."
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="provider-city">City</Label>
                    <Input id="provider-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="provider-state">State</Label>
                    <Input id="provider-state" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="provider-address">Address</Label>
                    <Input id="provider-address" value={form.addressLine1} onChange={(event) => setForm({ ...form, addressLine1: event.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="provider-postal-code">Postal Code</Label>
                    <Input id="provider-postal-code" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="provider-service-radius">Service Radius (miles)</Label>
                  <Input
                    id="provider-service-radius"
                    type="number"
                    min={0}
                    value={form.serviceRadiusMiles}
                    onChange={(event) => setForm({ ...form, serviceRadiusMiles: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })}
                  />
                </div>
                <fieldset>
                  <legend className="sr-only">Service delivery options</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.acceptsMobile} onChange={(event) => setForm({ ...form, acceptsMobile: event.target.checked })} />
                      Mobile
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.acceptsFixedLocation} onChange={(event) => setForm({ ...form, acceptsFixedLocation: event.target.checked })} />
                      Fixed Location
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.acceptsVirtual} onChange={(event) => setForm({ ...form, acceptsVirtual: event.target.checked })} />
                      Virtual
                    </label>
                  </div>
                </fieldset>
              </div>

              <DialogFooter className="mt-5 gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={profileBusy}>Cancel</Button>
                <Button onClick={() => updateProvider.mutate(form)} disabled={profileBusy}>
                  {profileBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImageCropper
        open={cropperOpen}
        imageSrc={cropSource}
        onClose={() => {
          setCropperOpen(false);
          setCropSource(null);
        }}
        onCropComplete={(croppedBase64, contentType) => {
          uploadProfilePhoto.mutate({
            photoData: croppedBase64,
            contentType: contentType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          });
        }}
        isUploading={uploadProfilePhoto.isPending}
      />
    </>
  );
}
