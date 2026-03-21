import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, Clock, ArrowLeft, CheckCircle, Shield } from "lucide-react";

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return `$${num.toFixed(2)}`;
}

export default function PublicProviderProfile() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = trpc.provider.getBySlug.useQuery(
    { slug: params.slug || "" },
    { enabled: !!params.slug }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Provider Not Found</h1>
        <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
        <Link href="/">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Button>
        </Link>
      </div>
    );
  }

  const { provider, services, reviews } = data;
  const avgRating = parseFloat(provider.averageRating || "0");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container max-w-5xl py-12">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to SkillLink
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
              {provider.businessName.charAt(0)}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground">{provider.businessName}</h1>
                {provider.verificationStatus === "verified" && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </Badge>
                )}
              </div>

              {provider.description && (
                <p className="text-muted-foreground mt-2 max-w-2xl">{provider.description}</p>
              )}

              <div className="flex items-center gap-4 mt-4 flex-wrap text-sm text-muted-foreground">
                {(provider.city || provider.state) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {[provider.city, provider.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {avgRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {avgRating.toFixed(1)} ({provider.totalReviews} reviews)
                  </span>
                )}
                {provider.totalBookings > 0 && (
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    {provider.totalBookings} bookings completed
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {provider.acceptsMobile && <Badge variant="outline">Mobile Service</Badge>}
                {provider.acceptsFixedLocation && <Badge variant="outline">In-Shop</Badge>}
                {provider.acceptsVirtual && <Badge variant="outline">Virtual</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Services Column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Services</h2>
              {services.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No services listed yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <Link key={service.id} href={`/service/${service.id}`}>
                      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                        <CardContent className="p-5">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground">{service.name}</h3>
                              {service.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                {service.durationMinutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {service.durationMinutes} min
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {service.serviceType.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-semibold text-foreground">
                                {service.pricingModel === "fixed" && formatCurrency(service.basePrice)}
                                {service.pricingModel === "hourly" && `${formatCurrency(service.hourlyRate)}/hr`}
                                {service.pricingModel === "package" && formatCurrency(service.basePrice)}
                                {service.pricingModel === "custom_quote" && "Get Quote"}
                              </div>
                              {service.depositRequired && (
                                <div className="text-xs text-muted-foreground mt-1">Deposit required</div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Reviews</h2>
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.reviewText && (
                          <p className="text-sm text-foreground">{review.reviewText}</p>
                        )}
                        {review.responseText && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/20">
                            <p className="text-xs font-medium text-primary mb-1">Provider Response</p>
                            <p className="text-sm text-muted-foreground">{review.responseText}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact & Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/browse">
                  <Button className="w-full">Browse & Book Services</Button>
                </Link>
                <Separator />
                <div className="text-sm text-muted-foreground space-y-2">
                  {provider.yearsInBusiness && (
                    <p>{provider.yearsInBusiness}+ years in business</p>
                  )}
                  {provider.serviceRadiusMiles && (
                    <p>Service area: {provider.serviceRadiusMiles} mile radius</p>
                  )}
                  {provider.insuranceVerified && (
                    <p className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" /> Insurance verified
                    </p>
                  )}
                  {provider.backgroundCheckVerified && (
                    <p className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" /> Background check verified
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>Business type: {provider.businessType.replace("_", " ")}</p>
                {provider.licenseNumber && <p>License: {provider.licenseNumber}</p>}
                <p>Member since {new Date(provider.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t mt-12">
        <div className="container max-w-5xl py-6 text-center text-sm text-muted-foreground">
          Powered by <Link href="/"><span className="text-primary hover:underline">SkillLink</span></Link> — Your service, your business, your way.
        </div>
      </div>
    </div>
  );
}
