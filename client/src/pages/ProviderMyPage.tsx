import { useState } from "react";
import { NavHeader } from "@/components/shared/NavHeader";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShareProfile } from "@/components/ShareProfile";
import { toast } from "sonner";
import {
  Link2,
  Copy,
  ExternalLink,
  Pencil,
  Code2,
  ArrowLeft,
  Globe,
} from "lucide-react";

export default function ProviderMyPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: provider, isLoading: providerLoading } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: !!user,
  });
  const utils = trpc.useUtils();
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput, setSlugInput] = useState("");

  const generateSlug = trpc.provider.generateSlug.useMutation({
    onSuccess: (data) => {
      utils.provider.getMyProfile.invalidate();
      toast.success(`Profile URL created: /${data.slug}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateSlug = trpc.provider.updateSlug.useMutation({
    onSuccess: (data) => {
      utils.provider.getMyProfile.invalidate();
      setEditingSlug(false);
      toast.success(`Profile URL updated to /${data.slug}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isAuthenticated || providerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container max-w-4xl py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-4 bg-muted rounded w-72" />
            <div className="h-48 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container max-w-4xl py-8 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold">My Page</h1>
          <p className="text-muted-foreground mt-2">You need a provider profile to create your public page.</p>
        </div>
      </div>
    );
  }

  const profileUrl = provider.profileSlug
    ? `https://ologycrew.com/${provider.profileSlug}`
    : null;
  const shareableUrl = provider.profileSlug
    ? `https://ologycrew.com/${provider.profileSlug}`
    : null;

  const copyUrl = () => {
    if (shareableUrl) {
      navigator.clipboard.writeText(shareableUrl);
      toast.success("Profile link copied! This link shows your profile preview on social media.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">My Page</h1>
            <p className="text-muted-foreground">Manage your public profile page</p>
          </div>
        </div>

        {/* Public Profile Section */}
        {!provider.profileSlug ? (
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
        ) : (
          <>
            {/* Profile Link Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Profile Link</CardTitle>
                <CardDescription>This is your digital business card — share it everywhere</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-md px-3 py-2 text-sm font-mono truncate">
                    {profileUrl}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyUrl} title="Copy link">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Link href={`/${provider.profileSlug}`} target="_blank">
                    <Button variant="outline" size="icon" title="Preview">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                  <ShareProfile
                    url={profileUrl!}
                    title={provider.businessName}
                    description={provider.description || `Book services from ${provider.businessName} on OlogyCrew`}
                    size="icon"
                    variant="outline"
                  />
                </div>

                {editingSlug ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">https://ologycrew.com/</div>
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

                {/* Where to share suggestions */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Put this link in your:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Google Profile", "Instagram Bio", "Facebook Page", "Business Cards", "Email Signature", "QR Code"].map((place) => (
                      <span key={place} className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">{place}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What Clients See */}
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

            {/* Embed Widget Section */}
            <Card>
              <CardContent className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Code2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Embed Booking Widget</h3>
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

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">Your Profile Page</p>
                    <p className="text-xs text-muted-foreground">Your public profile link for sharing</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    const url = provider.profileSlug
                      ? `https://ologycrew.com/${provider.profileSlug}`
                      : `https://ologycrew.com/${provider.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Profile URL copied!");
                  }}>
                    <Copy className="w-3 h-3 mr-1" /> Copy URL
                  </Button>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">All Services Widget</p>
                    <p className="text-xs text-muted-foreground">Shows all your services with a picker</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`https://ologycrew.com/embed/provider/${provider.id}`);
                    toast.success("Widget URL copied!");
                  }}>
                    <Copy className="w-3 h-3 mr-1" /> Copy URL
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
