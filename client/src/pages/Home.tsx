import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Calendar, Shield, Star, ArrowRight, CheckCircle2, User, Gift, Trophy, TrendingUp, Users, Award, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { NavHeader } from "@/components/shared/NavHeader";






export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  // Capture customer referral code from URL (?ref=CODE) and store in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("customer_referral_code", refCode.toUpperCase().trim());
      // Clean the URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);
  const { data: categories } = trpc.category.list.useQuery();


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
      <section className="py-8 sm:py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-blue-600"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        <div className="container relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Ready to Grow Your Business?
              </h2>
              <p className="text-sm sm:text-base opacity-90 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Flexible scheduling</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Secure payments</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Build your reputation</span>
              </p>
            </div>
            <div className="flex-shrink-0">
              {isAuthenticated && myProviderProfile ? (
                <Link href="/provider/dashboard">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-black/20 px-8">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link href="/pricing">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-black/20 px-8 animate-pulse hover:animate-none">
                    Become a Provider
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}
