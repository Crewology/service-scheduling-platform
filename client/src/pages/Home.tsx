import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Calendar, Shield, Star, ArrowRight, CheckCircle2, MapPin, User, Gift, Trophy, TrendingUp, Users, Award, ShieldCheck, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
import { NavHeader } from "@/components/shared/NavHeader";
import { OfficialBadge } from "@/components/OfficialBadge";
import { usePWAInstallContext } from "@/contexts/PWAInstallContext";
import { TrustBadge } from "@/components/TrustBadge";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { data: categories } = trpc.category.list.useQuery();
  const { isInstalled: pwaInstalled, triggerInstall: pwaInstall } = usePWAInstallContext();
  const { data: featuredProviders } = trpc.provider.listFeatured.useQuery();
  const { data: spotlightProviders } = trpc.provider.getSpotlightProviders.useQuery();
  const autoplayPlugin = useMemo(() => Autoplay({ delay: 5000, stopOnInteraction: true }), []);
  const { data: myProviderProfile } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const featuredCategories = categories?.slice(0, 8) || [];

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      setLocation("/search");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavHeader />

      {/* Hero Section */}
      <section className="py-12 sm:py-16 md:py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-6 text-balance">
              Find Trusted Service Professionals{" "}
              <span className="gradient-text">Near You</span>
            </h1>
            <p className="text-base sm:text-lg md:text-2xl text-muted-foreground mb-8 md:mb-10 text-balance">
              Connect with skilled providers across 42+ service categories. Book instantly, pay securely, and get the job done right.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-2 shadow-medium rounded-lg bg-white p-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="What service do you need?"
                    className="pl-10 border-0 focus-visible:ring-0 text-base sm:text-lg h-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button size="lg" className="px-8 w-full sm:w-auto" onClick={handleSearch}>
                  Search
                </Button>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="text-sm text-muted-foreground">Popular:</span>
                {["Handyman", "Massage", "Barber", "Photography", "Cleaning"].map((service) => (
                  <Link key={service} href={`/search?q=${encodeURIComponent(service)}`}>
                    <Button variant="outline" size="sm" className="rounded-full">
                      {service}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white">
        <div className="container">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">Why Choose OlogyCrew?</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              The simplest way to book professional services with confidence
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary transition-colors shadow-soft">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3">Trust-Rated Providers</h3>
                <p className="text-muted-foreground">
                  Every provider earns trust badges based on completed bookings, customer reviews, and profile quality — so you can book with confidence.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700"><TrendingUp className="h-3 w-3" /> Rising</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700"><ShieldCheck className="h-3 w-3" /> Trusted</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700"><Trophy className="h-3 w-3" /> Top Pro</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-primary transition-colors shadow-soft">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3">Easy Booking</h3>
                <p className="text-muted-foreground">
                  Check real-time availability, book instantly, and manage everything from your dashboard.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-primary transition-colors shadow-soft">
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                  <Star className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3">Secure Payments</h3>
                <p className="text-muted-foreground">
                  Pay securely with escrow protection. Money is only released when you're satisfied.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Provider Spotlight Section */}
      {spotlightProviders && spotlightProviders.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/80">
          <div className="container">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <Trophy className="h-4 w-4" />
                Weekly Spotlight
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">Top-Rated Professionals</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Providers who have earned the highest trust scores through exceptional service
              </p>
            </div>

            <Carousel
              opts={{ align: "start", loop: true }}
              plugins={[autoplayPlugin]}
              className="w-full max-w-6xl mx-auto"
            >
              <CarouselContent className="-ml-4">
                {spotlightProviders.map((provider: any) => (
                  <CarouselItem key={provider.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <Link href={`/p/${provider.slug || provider.profileSlug}`}>
                      <Card className="hover:shadow-lg transition-all cursor-pointer group h-full border-2 border-transparent hover:border-amber-200 bg-white">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            {provider.profilePhotoUrl ? (
                              <img
                                src={provider.profilePhotoUrl}
                                alt={provider.businessName}
                                className="w-16 h-16 rounded-full object-cover border-2 border-amber-200 shadow-sm"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shadow-sm">
                                <User className="w-8 h-8 text-amber-600" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                                  {provider.businessName}
                                </h3>
                                {provider.isOfficial && <OfficialBadge size="sm" showLabel={false} />}
                              </div>
                              {provider.city && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {provider.city}{provider.state ? `, ${provider.state}` : ""}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Trust Badge */}
                          <div className="mb-3">
                            <TrustBadge level={provider.trustLevel} size="md" showLabel showTooltip />
                          </div>

                          {/* Rating & Stats */}
                          <div className="flex items-center gap-3 mb-3">
                            {parseFloat(provider.averageRating || "0") > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                <span className="font-semibold text-sm">
                                  {parseFloat(provider.averageRating).toFixed(1)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({provider.totalReviews})
                                </span>
                              </div>
                            )}
                            {provider.totalBookings > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                {provider.totalBookings} jobs
                              </div>
                            )}
                          </div>

                          {/* Categories */}
                          {provider.categories && provider.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {provider.categories.slice(0, 3).map((cat: any) => (
                                <Badge key={cat.id} variant="secondary" className="text-[10px] px-2 py-0.5">
                                  {cat.name}
                                </Badge>
                              ))}
                              {provider.categories.length > 3 && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                  +{provider.categories.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-4 md:-left-6" />
              <CarouselNext className="-right-4 md:-right-6" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">Explore Service Categories</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse our 42+ professional service categories
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {featuredCategories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="hover:shadow-medium transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          
          <div className="text-center">
            <Link href="/browse">
              <Button size="lg" variant="outline">
                View All Categories
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Providers Section */}
      {featuredProviders && featuredProviders.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">Featured Providers</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Top-rated professionals ready to serve you
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {featuredProviders.map((provider: any) => (
                <Link key={provider.id} href={`/p/${provider.slug || provider.profileSlug}`}>
                  <Card className="hover:shadow-medium transition-all cursor-pointer group h-full">
                    <CardContent className="p-6">
                      {/* Provider Avatar */}
                      <div className="flex items-center gap-3 mb-4">
                        {provider.profilePhotoUrl ? (
                          <img
                            src={provider.profilePhotoUrl}
                            alt={provider.businessName}
                            className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-7 h-7 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                              {provider.businessName}
                            </h3>
                            {provider.isOfficial && <OfficialBadge size="sm" showLabel={false} />}
                          </div>
                          {provider.city && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {provider.city}{provider.state ? `, ${provider.state}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Rating */}
                      {parseFloat(provider.averageRating || "0") > 0 && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-sm">
                            {parseFloat(provider.averageRating).toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({provider.totalReviews} review{provider.totalReviews !== 1 ? "s" : ""})
                          </span>
                        </div>
                      )}

                      {/* Categories */}
                      {provider.categories && provider.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {provider.categories.slice(0, 3).map((cat: any) => (
                            <Badge key={cat.id} variant="secondary" className="text-[10px] px-2 py-0.5">
                              {cat.name}
                            </Badge>
                          ))}
                          {provider.categories.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              +{provider.categories.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Link href="/browse">
                <Button size="lg" variant="outline">
                  View All Providers
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Refer & Earn Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <Gift className="h-4 w-4" />
                Referral Program
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4">Refer & Earn Rewards</h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Share OlogyCrew with friends and service providers. Earn credits toward your next booking with every successful referral.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-xl p-6 shadow-soft text-center">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  Get your unique referral link and share it with friends, family, or fellow professionals.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-soft text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">They Sign Up & Book</h3>
                <p className="text-sm text-muted-foreground">
                  When your referral joins and completes their first booking, you both earn rewards.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-soft text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Earn & Level Up</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock higher reward tiers as you refer more people — from Bronze (10%) to Platinum (25%).
                </p>
              </div>
            </div>

            {/* Tier Preview */}
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-soft mb-8">
              <h3 className="font-bold text-lg mb-4 text-center">Reward Tiers</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-700">10%</div>
                  <div className="text-sm font-semibold text-orange-600">Bronze</div>
                  <div className="text-xs text-muted-foreground mt-1">0–5 referrals</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-300">
                  <div className="text-2xl font-bold text-slate-600">15%</div>
                  <div className="text-sm font-semibold text-slate-500">Silver</div>
                  <div className="text-xs text-muted-foreground mt-1">6–10 referrals</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-300">
                  <div className="text-2xl font-bold text-yellow-700">20%</div>
                  <div className="text-sm font-semibold text-yellow-600">Gold</div>
                  <div className="text-xs text-muted-foreground mt-1">11–25 referrals</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-violet-50 border border-violet-300">
                  <div className="text-2xl font-bold text-violet-700">25%</div>
                  <div className="text-sm font-semibold text-violet-600">Platinum</div>
                  <div className="text-xs text-muted-foreground mt-1">26+ referrals</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link href="/referral-program">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                  <Gift className="mr-2 h-5 w-5" />
                  Learn More & Start Earning
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section for Providers */}
      <section className="py-12 sm:py-16 md:py-20 gradient-primary text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">
              Grow Your Business with OlogyCrew
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-8 opacity-90">
              Join thousands of service providers who trust OlogyCrew to manage bookings, payments, and customer relationships.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <h4 className="font-semibold mb-1">Flexible Scheduling</h4>
                  <p className="text-sm opacity-80">Set your own hours and availability</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <h4 className="font-semibold mb-1">Secure Payments</h4>
                  <p className="text-sm opacity-80">Get paid automatically after each job</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <h4 className="font-semibold mb-1">Build Your Reputation</h4>
                  <p className="text-sm opacity-80">Collect reviews and grow your business</p>
                </div>
              </div>
            </div>
            
            {isAuthenticated && myProviderProfile ? (
              <Link href="/provider/dashboard">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/provider/onboarding">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                  Become a Provider
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div>
              <h3 className="font-bold text-xl mb-4">OlogyCrew</h3>
              <p className="text-sm opacity-80">
                Connecting customers with trusted service professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Customers</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/browse" className="hover:opacity-100">Browse Services</Link></li>
                <li><Link href="/search" className="hover:opacity-100">Search</Link></li>
                <li><Link href="/my-bookings" className="hover:opacity-100">My Bookings</Link></li>
                <li><Link href="/referrals" className="hover:opacity-100">Referral Program</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Providers</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/provider/dashboard" className="hover:opacity-100">Provider Dashboard</Link></li>
                <li><Link href="/provider/services/new" className="hover:opacity-100">Add Service</Link></li>
                <li><Link href="/provider/availability" className="hover:opacity-100">Manage Availability</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/pricing" className="hover:opacity-100">Plans & Pricing</Link></li>
                <li><Link href="/referral-program" className="hover:opacity-100">Referral Program</Link></li>
                <li><Link href="/help" className="hover:opacity-100">Help Center</Link></li>
                <li><Link href="/help#contact" className="hover:opacity-100">Contact Support</Link></li>
                <li><Link href="/terms" className="hover:opacity-100">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:opacity-100">Privacy Policy</Link></li>
                {!pwaInstalled && (
                  <li>
                    <button
                      onClick={pwaInstall}
                      className="hover:opacity-100 inline-flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Install App
                    </button>
                  </li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 pt-8 text-center text-sm opacity-80">
            <p>&copy; 2026 OlogyCrew. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
