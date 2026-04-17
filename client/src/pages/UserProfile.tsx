import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Mail, Phone, Shield, Camera, Loader2, CheckCircle2, Circle, ArrowRight, Briefcase } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import { getLoginUrl } from "@/const";
import { formatDate } from "@/lib/dateUtils";
import { useLocation } from "wouter";

// Profile completion fields definition
interface CompletionField {
  key: string;
  label: string;
  check: (user: any) => boolean;
  hint: string;
}

const COMPLETION_FIELDS: CompletionField[] = [
  { key: "name", label: "Full name", check: (u) => !!(u?.firstName && u?.lastName), hint: "Add your first and last name" },
  { key: "email", label: "Email address", check: (u) => !!u?.email, hint: "Add your email address" },
  { key: "phone", label: "Phone number", check: (u) => !!u?.phone, hint: "Add your phone number" },
  { key: "photo", label: "Profile photo", check: (u) => !!u?.profilePhotoUrl, hint: "Upload a profile photo" },
];

function ProfileCompletionCard({ user, onEditClick }: { user: any; onEditClick: () => void }) {
  const completedCount = COMPLETION_FIELDS.filter((f) => f.check(user)).length;
  const totalCount = COMPLETION_FIELDS.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  if (isComplete) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Complete Your Profile</h3>
          <span className="text-sm font-medium text-primary">{percentage}%</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {/* Checklist */}
        <div className="space-y-2">
          {COMPLETION_FIELDS.map((field) => {
            const done = field.check(user);
            return (
              <div key={field.key} className="flex items-center gap-2 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={done ? "text-muted-foreground line-through" : ""}>{field.label}</span>
                {!done && (
                  <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">— {field.hint}</span>
                )}
              </div>
            );
          })}
        </div>
        {completedCount < totalCount && (
          <Button size="sm" className="mt-4 w-full sm:w-auto" onClick={onEditClick}>
            Complete Profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function BecomeProviderCard() {
  const [, navigate] = useLocation();

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
            <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base mb-1">Become a Service Provider</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start offering your services on OlogyCrew. Set up your provider profile, list your services, and begin accepting bookings from customers.
            </p>
            <Button
              onClick={() => navigate("/provider/onboarding")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserProfile() {
  const { user, isAuthenticated, loading } = useAuth();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      setEditing(false);
      toast.success("Profile updated successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadPhoto = trpc.provider.uploadProfilePhoto.useMutation({
    onSuccess: (result) => {
      utils.auth.me.invalidate();
      toast.success("Profile photo updated!");
    },
    onError: (err) => toast.error(err.message || "Failed to upload photo"),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      uploadPhoto.mutate({
        photoData: base64,
        contentType: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isCustomer = user?.role === "customer";

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

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container max-w-2xl py-8 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">My Profile</h1>

        {/* Profile Completion Indicator */}
        <ProfileCompletionCard user={user} onEditClick={() => setEditing(true)} />

        {/* Main Profile Card */}
        <Card>
          <CardHeader className="space-y-4">
            {/* Profile info row */}
            <div className="flex items-center gap-4">
              {/* Profile Photo with Upload */}
              <div className="relative group shrink-0">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {user?.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                {/* Camera overlay on hover/tap */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadPhoto.isPending}
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadPhoto.isPending ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate">{user?.name || "User"}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize shrink-0">{user?.role}</Badge>
                  <span className="text-xs">Member since {user?.createdAt ? formatDate(user.createdAt) : "N/A"}</span>
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap photo to change it
                </p>
              </div>
            </div>
            {/* Edit button on its own row for clean mobile layout */}
            {!editing && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input 
                      value={form.firstName} 
                      onChange={e => setForm({ ...form, firstName: e.target.value })} 
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input 
                      value={form.lastName} 
                      onChange={e => setForm({ ...form, lastName: e.target.value })} 
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={form.phone} 
                    onChange={e => setForm({ ...form, phone: e.target.value })} 
                    placeholder="Phone number"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => updateProfile.mutate(form)} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 py-3 border-b">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{user?.firstName || user?.name || "Not set"} {user?.lastName || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-b">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-b">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{user?.phone || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Become a Provider CTA — only for customers */}
        {isCustomer && <BecomeProviderCard />}
      </div>
    </div>
  );
}
