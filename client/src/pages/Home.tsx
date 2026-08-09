import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search, Calendar, Star, ArrowRight, CheckCircle2, User, Gift, Trophy, TrendingUp, Users, Award, ShieldCheck, Sparkles, MapPin, Globe, CreditCard, FileText, Clock, UserCheck, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { NavHeader } from "@/components/shared/NavHeader";
import LoggedInHome from "@/pages/LoggedInHome";

// Category emoji map for visual pop
const CATEGORY_ICONS: Record<number, string> = {
  15: "🎬", 170: "💈", 7: "✂️", 126: "🔒", 195: "💃", 202: "🔨",
  23: "🦷", 20: "🎵", 22: "🚛", 177: "🎉", 196: "👁️", 178: "💰",
  109: "🏋️", 9: "🔧", 193: "🧘", 188: "🧹", 200: "⚡",
  179: "🏠", 171: "💇", 174: "🚗", 176: "🔩", 111: "🔗", 10: "💆",
  168: "🚙", 169: "🛠️", 199: "🎪", 158: "🎯", 73: "🍽️", 12: "💪",
  11: "🐾", 17: "📸", 148: "💦", 26: "📅", 8: "💅", 194: "☀️",
  198: "💻", 19: "🎥", 155: "📱", 201: "🖥️", 205: "🌐", 211: "🔧",
  212: "⚡", 213: "❄️", 214: "🪚", 215: "🏠", 216: "📣", 210: "🕉️", 218: "🌱",
  219: "🧮", 220: "⚖️", 221: "🍴",
};

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
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);
  const { data: categories } = trpc.category.list.useQuery();

  const { data: myProviderProfile } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Show Launchpad for logged-in users
  if (isAuthenticated && user) {
    return <LoggedInHome />;
  }

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
      <section className="py-14 sm:py-20 md:py-32 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        <div className="container">
          <div className="max-w-4xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
              <Globe className="h-4 w-4" />
              The digital home for your business
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-6 text-balance text-white">
              Your Business.{" "}
              <span className="text-blue-300">Your Customers.</span>{" "}
              <span className="text-emerald-300">Your Money.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-2xl text-white/70 mb-8 md:mb-10 text-balance max-w-3xl mx-auto">
              Get discovered. Build your profile. Get booked. Get paid. Send invoices. Manage your time. Keep your customers.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-2 shadow-2xl rounded-lg bg-white p-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="What service do you need?"
                    className="pl-10 border-0 focus-visible:ring-0 text-base sm:text-lg h-12 text-slate-900"
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
                <span className="text-sm text-white/60">Popular:</span>
                {["Handyman", "Massage", "Barber", "Photography", "Cleaning"].map((service) => (
                  <Link key={service} href={`/search?q=${encodeURIComponent(service)}`}>
                    <Button variant="outline" size="sm" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                      {service}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "One Place" Value Proposition Section */}
      <section className="py-14 sm:py-16 md:py-24 bg-white">
        <div className="container">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Why are you sending your customers all over the internet?</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Stop juggling Google, Calendly, Stripe, QuickBooks, and a dozen other tools. Put the entire business relationship in one place.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Your Profile</h3>
                <p className="text-sm text-muted-foreground">A professional page that works like a digital business card</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Your Services</h3>
                <p className="text-sm text-muted-foreground">List what you offer with pricing, duration, and descriptions</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Your Availability</h3>
                <p className="text-sm text-muted-foreground">Set your schedule and let customers book open slots</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Your Bookings</h3>
                <p className="text-sm text-muted-foreground">Manage appointments, confirmations, and follow-ups</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Your Payments</h3>
                <p className="text-sm text-muted-foreground">Get paid securely — money goes straight to your bank</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Your Invoices</h3>
                <p className="text-sm text-muted-foreground">Send branded invoices and track payment status</p>
              </div>
            </div>
          </div>

          {/* Profile URL callout */}
          <div className="mt-12 max-w-3xl mx-auto text-center">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6 sm:p-8 border border-slate-200">
              <h3 className="text-lg sm:text-xl font-bold mb-2">Your OlogyCrew URL becomes the front door</h3>
              <p className="text-sm text-muted-foreground mb-4">Put it in your Google profile, Instagram bio, business cards, email signature, or QR code</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <div className="bg-white rounded-lg px-4 py-2.5 border border-slate-200 font-mono text-sm sm:text-base text-slate-700 shadow-sm">
                  ologycrew.com/<span className="text-blue-600 font-semibold">YourBusinessName</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">See → Learn → Book → Pay → Receive invoice → Contact → Return</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table Section */}
      <section className="py-14 sm:py-16 md:py-20 bg-slate-50">
        <div className="container">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Everything in one place</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Other platforms give you a piece. OlogyCrew gives you the whole picture.
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-soft">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left p-4 font-semibold">Platform</th>
                  <th className="text-left p-4 font-semibold">What it does</th>
                  <th className="text-left p-4 font-semibold">What you get</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">Google</td>
                  <td className="p-4 text-muted-foreground">Discovery</td>
                  <td className="p-4 text-muted-foreground">A listing</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="p-4 font-medium text-slate-700">Yelp</td>
                  <td className="p-4 text-muted-foreground">Discovery + Reviews</td>
                  <td className="p-4 text-muted-foreground">A listing</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium text-slate-700">Calendly</td>
                  <td className="p-4 text-muted-foreground">Scheduling</td>
                  <td className="p-4 text-muted-foreground">A scheduling page</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <td className="p-4 font-medium text-slate-700">Stripe / Square</td>
                  <td className="p-4 text-muted-foreground">Payments</td>
                  <td className="p-4 text-muted-foreground">Payment infrastructure</td>
                </tr>
                <tr className="bg-blue-50 border-2 border-blue-200">
                  <td className="p-4 font-bold text-blue-900">OlogyCrew</td>
                  <td className="p-4 font-medium text-blue-800">Discovery + Profile + Booking + Payments + Invoicing</td>
                  <td className="p-4 font-bold text-blue-900">A business presence and operating system</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* No Gatekeeping Philosophy Section */}
      <section className="py-14 sm:py-16 md:py-20 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                  <ShieldCheck className="h-4 w-4" />
                  No Gatekeeping
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                  OlogyCrew isn't here to become your business. We're here to help you build yours.
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg">
                  We provide the infrastructure. You own the relationship.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-red-500 font-bold text-lg mt-0.5">✕</span>
                  <p className="font-medium text-red-900 text-sm">We don't make you pay to be visible</p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-red-500 font-bold text-lg mt-0.5">✕</span>
                  <p className="font-medium text-red-900 text-sm">We don't make you buy leads</p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-red-500 font-bold text-lg mt-0.5">✕</span>
                  <p className="font-medium text-red-900 text-sm">We don't make you compete for placement</p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-red-500 font-bold text-lg mt-0.5">✕</span>
                  <p className="font-medium text-red-900 text-sm">We don't make you surrender the customer relationship</p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <p className="font-medium text-emerald-900 text-sm">We give you the tools to manage the relationship yourself</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Explore 48+ Service Categories</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Find professionals across every industry — from audio engineers to wellness coaches
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {featuredCategories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="hover:shadow-medium transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
                      <span className="text-2xl">{CATEGORY_ICONS[category.id] || "📋"}</span>
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
      <FeaturedProviders />

      {/* Refer & Earn Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
                <Gift className="h-4 w-4" />
                Referral Program
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Refer & Earn Rewards</h2>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
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
      <section className="py-10 sm:py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-blue-600"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Ready to build your digital home?
            </h2>
            <p className="text-base sm:text-lg opacity-90 mb-6">
              Join thousands of service professionals who manage their entire business on OlogyCrew
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated && myProviderProfile ? (
                <Link href="/provider/dashboard">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-black/20 px-8">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg shadow-black/20 px-8">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/browse">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 hover:text-white px-8">
                      Browse Services
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Featured Providers section — shows providers with active homepage_feature promotions */
function FeaturedProviders() {
  const { data: featured } = trpc.promotion.getActiveForDisplay.useQuery({ tier: "homepage_feature" });
  if (!featured || featured.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="container">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Featured Professionals
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">Top-Rated & Promoted</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover hand-picked service professionals ready to help you today
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.slice(0, 6).map((item: any) => (
            <Link key={item.promotion.id} href={item.provider.profileSlug ? `/${item.provider.profileSlug}` : `/provider/${item.provider.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.provider.profilePhotoUrl ? (
                        <img src={item.provider.profilePhotoUrl} alt={item.provider.businessName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                        {item.provider.businessName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {item.provider.city && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {item.provider.city}{item.provider.state ? `, ${item.provider.state}` : ""}
                          </span>
                        )}
                        {parseFloat(item.provider.averageRating || "0") > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {parseFloat(item.provider.averageRating).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-1">{item.promotion.headline}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.promotion.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
