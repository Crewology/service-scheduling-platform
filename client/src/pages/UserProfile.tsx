import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Mail, Phone, Shield, Calendar } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";
import { getLoginUrl } from "@/const";
import { formatDate } from "@/lib/dateUtils";

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

      <div className="container max-w-2xl py-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>{user?.name || "User"}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
                    <span className="text-xs">Member since {user?.createdAt ? formatDate(user.createdAt) : "N/A"}</span>
                  </CardDescription>
                </div>
              </div>
              {!editing && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}
