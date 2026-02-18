import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Search, Calendar, Shield, Star, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: categories } = trpc.category.list.useQuery();

  const featuredCategories = categories?.slice(0, 8) || [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <a className="text-2xl font-bold gradient-text">SkillLink</a>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/browse">
                <a className="text-sm font-medium hover:text-primary transition-colors">Browse Services</a>
              </Link>
              <Link href="/how-it-works">
                <a className="text-sm font-medium hover:text-primary transition-colors">How It Works</a>
              </Link>
              <Link href="/become-provider">
                <a className="text-sm font-medium hover:text-primary transition-colors">Become a Provider</a>
              </Link>
            </nav>
            
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <Button variant="ghost">Dashboard</Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="outline">Profile</Button>
                  </Link>
                </>
              ) : (
                <>
                  <a href={getLoginUrl()}>
                    <Button variant="ghost">Sign In</Button>
                  </a>
                  <a href={getLoginUrl()}>
                    <Button>Get Started</Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance">
              Find Trusted Service Professionals{" "}
              <span className="gradient-text">Near You</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 text-balance">
              Connect with verified providers across 42+ service categories. Book instantly, pay securely, and get the job done right.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 shadow-medium rounded-lg bg-white p-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="What service do you need?"
                    className="pl-10 border-0 focus-visible:ring-0 text-lg h-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button size="lg" className="px-8">
                  Search
                </Button>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="text-sm text-muted-foreground">Popular:</span>
                {["Handyman", "Massage", "Barber", "Photography", "Cleaning"].map((service) => (
                  <Button key={service} variant="outline" size="sm" className="rounded-full">
                    {service}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose SkillLink?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The simplest way to book professional services with confidence
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary transition-colors shadow-soft">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Verified Providers</h3>
                <p className="text-muted-foreground">
                  All service providers are background-checked, licensed, and insured for your peace of mind.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-primary transition-colors shadow-soft">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Easy Booking</h3>
                <p className="text-muted-foreground">
                  Check real-time availability, book instantly, and manage everything from your dashboard.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-2 hover:border-primary transition-colors shadow-soft">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                  <Star className="h-8 w-8 text-success" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Secure Payments</h3>
                <p className="text-muted-foreground">
                  Pay securely with escrow protection. Money is only released when you're satisfied.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Explore Service Categories</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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

      {/* CTA Section for Providers */}
      <section className="py-20 gradient-primary text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Grow Your Business with SkillLink
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of service providers who trust SkillLink to manage bookings, payments, and customer relationships.
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
            
            <Link href="/become-provider">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                Become a Provider
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-xl mb-4">SkillLink</h3>
              <p className="text-sm opacity-80">
                Connecting customers with trusted service professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Customers</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/browse"><a className="hover:opacity-100">Browse Services</a></Link></li>
                <li><Link href="/how-it-works"><a className="hover:opacity-100">How It Works</a></Link></li>
                <li><Link href="/safety"><a className="hover:opacity-100">Safety & Trust</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Providers</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/become-provider"><a className="hover:opacity-100">Become a Provider</a></Link></li>
                <li><Link href="/provider-benefits"><a className="hover:opacity-100">Benefits</a></Link></li>
                <li><Link href="/provider-resources"><a className="hover:opacity-100">Resources</a></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/about"><a className="hover:opacity-100">About Us</a></Link></li>
                <li><Link href="/contact"><a className="hover:opacity-100">Contact</a></Link></li>
                <li><Link href="/terms"><a className="hover:opacity-100">Terms of Service</a></Link></li>
                <li><Link href="/privacy"><a className="hover:opacity-100">Privacy Policy</a></Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-background/20 pt-8 text-center text-sm opacity-80">
            <p>&copy; 2026 SkillLink. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
