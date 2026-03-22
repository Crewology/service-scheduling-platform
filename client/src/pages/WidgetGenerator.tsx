import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";
import { Copy, Code2, ExternalLink, ArrowLeft, Palette, Layout, Zap } from "lucide-react";

type WidgetType = "service" | "provider";

export default function WidgetGenerator() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: services } = trpc.service.listMine.useQuery(undefined, {
    enabled: !!provider,
  });

  // Widget config state
  const [widgetType, setWidgetType] = useState<WidgetType>("provider");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [widgetWidth, setWidgetWidth] = useState("400");
  const [widgetHeight, setWidgetHeight] = useState("650");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [hideHeader, setHideHeader] = useState(false);
  const [borderRadius, setBorderRadius] = useState("12");

  const baseUrl = window.location.origin;

  const embedUrl = useMemo(() => {
    if (widgetType === "service" && selectedServiceId) {
      let url = `${baseUrl}/embed/book/${selectedServiceId}`;
      const params = new URLSearchParams();
      if (accentColor !== "#2563eb") params.set("accent", accentColor);
      if (hideHeader) params.set("hideHeader", "true");
      const qs = params.toString();
      return qs ? `${url}?${qs}` : url;
    }
    if (widgetType === "provider" && provider) {
      let url = `${baseUrl}/embed/provider/${provider.id}`;
      const params = new URLSearchParams();
      if (accentColor !== "#2563eb") params.set("accent", accentColor);
      if (hideHeader) params.set("hideHeader", "true");
      const qs = params.toString();
      return qs ? `${url}?${qs}` : url;
    }
    return "";
  }, [widgetType, selectedServiceId, provider, accentColor, hideHeader, baseUrl]);

  const iframeCode = useMemo(() => {
    if (!embedUrl) return "";
    return `<iframe
  src="${embedUrl}"
  width="${widgetWidth}"
  height="${widgetHeight}"
  style="border: none; border-radius: ${borderRadius}px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"
  allow="payment"
  loading="lazy"
  title="Book with ${provider?.businessName || 'OlogyCrew'}"
></iframe>`;
  }, [embedUrl, widgetWidth, widgetHeight, borderRadius, provider]);

  const popupCode = useMemo(() => {
    if (!embedUrl) return "";
    return `<!-- OlogyCrew Booking Button -->
<button
  onclick="window.open('${embedUrl}', 'OlogyCrew Booking', 'width=${widgetWidth},height=${widgetHeight},scrollbars=yes')"
  style="background: ${accentColor}; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;"
>
  Book Now
</button>`;
  }, [embedUrl, widgetWidth, widgetHeight, accentColor]);

  const directLinkCode = useMemo(() => {
    if (!embedUrl) return "";
    return `<a
  href="${embedUrl}"
  target="_blank"
  rel="noopener noreferrer"
  style="display: inline-block; background: ${accentColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;"
>
  Book Now
</a>`;
  }, [embedUrl, accentColor]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-2">Provider Access Required</h2>
          <p className="text-muted-foreground">You need a provider account to generate booking widgets.</p>
        </div>
      </div>
    );
  }

  const activeServices = (services || []).filter((s: any) => s.isActive);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/provider/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Embed Booking Widget</h1>
            <p className="text-muted-foreground text-sm">
              Add a booking calendar to your website so clients can book directly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-4">
            {/* Widget Type */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Widget Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setWidgetType("provider")}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      widgetType === "provider"
                        ? "border-blue-500 bg-blue-50"
                        : "hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-sm">All Services</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Shows all your services with a service picker
                    </p>
                  </button>
                  <button
                    onClick={() => setWidgetType("service")}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      widgetType === "service"
                        ? "border-blue-500 bg-blue-50"
                        : "hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-sm">Single Service</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Direct booking for one specific service
                    </p>
                  </button>
                </div>

                {widgetType === "service" && (
                  <div>
                    <Label className="text-xs">Select Service</Label>
                    <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose a service..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeServices.map((svc: any) => (
                          <SelectItem key={svc.id} value={svc.id.toString()}>
                            {svc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Width (px)</Label>
                    <Input
                      type="number"
                      value={widgetWidth}
                      onChange={(e) => setWidgetWidth(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height (px)</Label>
                    <Input
                      type="number"
                      value={widgetHeight}
                      onChange={(e) => setWidgetHeight(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Accent Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Border Radius (px)</Label>
                    <Input
                      type="number"
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Hide Provider Header</Label>
                    <p className="text-xs text-muted-foreground">If your site already shows your name</p>
                  </div>
                  <Switch checked={hideHeader} onCheckedChange={setHideHeader} />
                </div>
              </CardContent>
            </Card>

            {/* Embed Code */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="w-4 h-4" /> Embed Code
                </CardTitle>
                <CardDescription>Copy and paste into your website</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="iframe">
                  <TabsList className="w-full">
                    <TabsTrigger value="iframe" className="flex-1">Inline</TabsTrigger>
                    <TabsTrigger value="popup" className="flex-1">Popup</TabsTrigger>
                    <TabsTrigger value="link" className="flex-1">Link</TabsTrigger>
                  </TabsList>

                  <TabsContent value="iframe" className="mt-3">
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                        {iframeCode || "Configure your widget above to generate code"}
                      </pre>
                      {iframeCode && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(iframeCode, "Iframe code")}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Embeds the booking calendar directly in your page. Best for dedicated booking pages.
                    </p>
                  </TabsContent>

                  <TabsContent value="popup" className="mt-3">
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                        {popupCode || "Configure your widget above to generate code"}
                      </pre>
                      {popupCode && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(popupCode, "Popup code")}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Opens the booking widget in a popup window. Great for "Book Now" buttons.
                    </p>
                  </TabsContent>

                  <TabsContent value="link" className="mt-3">
                    <div className="relative">
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                        {directLinkCode || "Configure your widget above to generate code"}
                      </pre>
                      {directLinkCode && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(directLinkCode, "Link code")}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      A styled link that opens the booking page in a new tab.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Live Preview
                  </CardTitle>
                  {embedUrl && (
                    <a href={embedUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-3 h-3 mr-1" /> Open
                      </Button>
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {embedUrl ? (
                  <div className="flex justify-center">
                    <iframe
                      src={embedUrl}
                      width={Math.min(parseInt(widgetWidth) || 400, 500)}
                      height={Math.min(parseInt(widgetHeight) || 650, 700)}
                      style={{
                        border: "none",
                        borderRadius: `${borderRadius}px`,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                      title="Widget Preview"
                    />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    {widgetType === "service"
                      ? "Select a service to see the preview"
                      : "Loading preview..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p><strong>WordPress:</strong> Paste the iframe code into a Custom HTML block.</p>
                <p><strong>Squarespace:</strong> Use an Embed block and paste the code.</p>
                <p><strong>Wix:</strong> Add an HTML iframe element and paste the embed URL.</p>
                <p><strong>Social Media:</strong> Share the direct link in your bio or posts.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
