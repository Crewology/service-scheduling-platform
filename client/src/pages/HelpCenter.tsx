import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Search,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  Briefcase,
  CreditCard,
  Settings,
  HelpCircle,
  Mail,
  Phone,
  ArrowRight,
  Calendar,
  MessageSquare,
  Star,
  Heart,
  FileText,
  Shield,
  Clock,
  DollarSign,
  UserPlus,
  Palette,
  BarChart3,
  Gift,
  Bell,
  MapPin,
  Camera,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Help Content Data ────────────────────────────────────────────────────────

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  articles: {
    title: string;
    content: string;
    link?: string;
    linkText?: string;
  }[];
}

const guideSections: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <BookOpen className="h-5 w-5" />,
    description: "New to OlogyCrew? Start here to learn the basics.",
    articles: [
      {
        title: "Creating Your Account",
        content:
          "Sign up for OlogyCrew by clicking the \"Sign In\" button in the top navigation. You'll be guided through a quick registration process. Once signed in, you can immediately start browsing services, saving providers, and making bookings. Your account works for both booking services (as a customer) and offering services (as a provider).",
      },
      {
        title: "Browsing & Searching Services",
        content:
          "Use the \"Browse Services\" link in the navigation to explore all 42+ service categories — from Barber Shops and Massage Therapists to DJ & Music Services and Cybersecurity. You can also use the search bar on the homepage or the dedicated Search page to find specific services by keyword. Each category page shows all available providers and their services.",
        link: "/browse",
        linkText: "Browse Services",
      },
      {
        title: "Making Your First Booking",
        content:
          "Find a service you need, click on it to view details including pricing, duration, and availability. Select your preferred date and time slot, add any notes for the provider, and confirm your booking. You'll receive a confirmation with all the details. The provider will then confirm or suggest an alternative time.",
      },
      {
        title: "Understanding the Platform",
        content:
          "OlogyCrew connects customers with trusted service professionals across dozens of categories. Providers set their own services, pricing, and availability. Customers can browse, book, message providers, request quotes, and leave reviews. Payments are processed securely through Stripe, and both parties receive notifications at every step.",
      },
    ],
  },
  {
    id: "for-customers",
    title: "For Customers",
    icon: <Users className="h-5 w-5" />,
    description: "Everything you need to know about booking and managing services.",
    articles: [
      {
        title: "How Bookings Work",
        content:
          "When you book a service, the provider receives a notification and can confirm, reschedule, or discuss details with you via messaging. Booking statuses include: Pending (awaiting provider confirmation), Confirmed (provider accepted), In Progress (service started), Completed (service finished), and Cancelled. You can view all your bookings from the \"My Bookings\" page.",
        link: "/my-bookings",
        linkText: "View My Bookings",
      },
      {
        title: "Messaging Providers",
        content:
          "Each booking has a built-in messaging thread where you can communicate directly with your provider. Discuss details, share photos, ask questions, or coordinate logistics — all in one place. You'll receive real-time notifications when you get a new message. Access your conversations from the \"Messages\" icon in the navigation bar.",
      },
      {
        title: "Requesting Quotes",
        content:
          "Not sure about pricing? Send a quote request to any provider describing what you need, your preferred dates, and budget. Providers will respond with a custom quote. You can compare quotes from multiple providers before deciding. Business-tier customers can send bulk quote requests to multiple providers at once from the Saved Providers page.",
        link: "/my-quotes",
        linkText: "View My Quotes",
      },
      {
        title: "Saving Favorite Providers",
        content:
          "Found a provider you love? Click the heart icon on their profile or service to save them. Organize saved providers into folders for easy access. Free accounts can save up to 10 providers, Pro up to 50, and Business subscribers get unlimited saves.",
        link: "/saved-providers",
        linkText: "View Saved Providers",
      },
      {
        title: "Leaving Reviews",
        content:
          "After a completed booking, you'll be prompted to leave a review. Rate your experience from 1 to 5 stars and write a detailed review to help other customers. Your reviews help providers build their reputation and help the community make informed decisions.",
      },
      {
        title: "Cancelling a Booking",
        content:
          "You can cancel a booking from the booking detail page. Please note that cancellation policies vary by provider — some may have cancellation fees or time restrictions. Check the provider's cancellation policy before booking. If you need to reschedule instead, contact the provider through messaging first.",
      },
      {
        title: "Booking Analytics",
        content:
          "Business-tier customers have access to a detailed analytics dashboard showing spending trends, booking history, category breakdowns, and top providers. You can also export your booking history as CSV, JSON, or a branded PDF report with charts.",
        link: "/analytics",
        linkText: "View Analytics",
      },
    ],
  },
  {
    id: "for-providers",
    title: "For Providers",
    icon: <Briefcase className="h-5 w-5" />,
    description: "Set up your business and start accepting bookings.",
    articles: [
      {
        title: "Provider Onboarding",
        content:
          "Getting started as a provider is a simple 4-step process: (1) Choose your service categories from our 42+ options, (2) Set up your business profile with a description, location, and contact info, (3) Add your services with pricing and duration, and (4) Upload portfolio photos to showcase your work. The onboarding wizard guides you through each step, and your dashboard shows a checklist of what's complete.",
        link: "/provider/onboarding",
        linkText: "Start Onboarding",
      },
      {
        title: "Managing Your Services",
        content:
          "From your Provider Dashboard, you can add, edit, or remove services at any time. Each service includes a name, description, category, pricing (fixed, hourly, or custom), duration, and location type (mobile, in-shop, or virtual). Starter accounts can list up to 3 services, Professional up to 10, and Business gets unlimited listings.",
      },
      {
        title: "Setting Your Availability",
        content:
          "Set your weekly availability schedule so customers know when you're available. You can set different hours for each day of the week, block off specific dates, and manage your calendar from the Provider Calendar page. Customers can only book during your available time slots.",
        link: "/provider/availability",
        linkText: "Manage Availability",
      },
      {
        title: "Handling Bookings",
        content:
          "When a customer books your service, you'll receive a notification. From your dashboard, you can confirm the booking, start the service when it's time, and mark it as completed when finished. You can also cancel if needed (though this affects your rating). Each booking has a messaging thread for coordinating with the customer.",
      },
      {
        title: "Responding to Quote Requests",
        content:
          "Customers may send you quote requests for custom work. You'll see these on your dashboard under the Quotes tab. Review the request details and respond with your pricing, estimated timeline, and any notes. Quick responses improve your chances of winning the job.",
      },
      {
        title: "Building Your Portfolio",
        content:
          "Showcase your best work by uploading photos to your portfolio from the Provider Dashboard. You can add single photos or before/after comparisons. A strong portfolio helps attract more customers and build trust.",
      },
      {
        title: "Your Public Profile",
        content:
          "Every provider gets a public profile page that customers can view. It shows your services, reviews, portfolio, availability, and business information. Professional and Business subscribers can customize their profile URL slug for a more professional look (e.g., /p/your-business-name).",
      },
      {
        title: "Promo Codes & Widgets",
        content:
          "Create promo codes to offer discounts and attract new customers. You can also generate embeddable booking widgets to add to your own website or social media, letting customers book directly from anywhere.",
        link: "/provider/promo-codes",
        linkText: "Manage Promo Codes",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & Billing",
    icon: <CreditCard className="h-5 w-5" />,
    description: "How payments, subscriptions, and billing work.",
    articles: [
      {
        title: "How Payments Work",
        content:
          "All payments on OlogyCrew are processed securely through Stripe. When you book a service, you'll be redirected to a secure Stripe checkout page to complete payment. Your payment information is never stored on our servers — Stripe handles all sensitive data with bank-level encryption.",
      },
      {
        title: "Platform Fees",
        content:
          "OlogyCrew charges a small 1% platform fee on each booking transaction. This fee is included in the total amount shown at checkout. There are no hidden fees — what you see is what you pay.",
      },
      {
        title: "Provider Subscription Plans",
        content:
          "Providers can choose from three subscription tiers:\n\n• Starter (Free) — Up to 3 services, 2 photos per service, basic profile, standard search placement\n\n• Professional ($19.99/mo or $191.88/yr) — Up to 10 services, 5 photos, custom URL slug, priority search, analytics dashboard\n\n• Business ($49.99/mo or $479.88/yr) — Unlimited services, featured listing badge, top search placement, full analytics, custom branding, priority support",
        link: "/provider/subscription",
        linkText: "Manage Subscription",
      },
      {
        title: "Customer Subscription Plans",
        content:
          "Customers can optionally upgrade for enhanced features:\n\n• Free — Save up to 10 providers, book any service, message providers, leave reviews, quote requests\n\n• Pro ($9.99/mo or $95.88/yr) — Save up to 50 providers, priority booking, provider folders\n\n• Business ($24.99/mo or $239.88/yr) — Unlimited saves, bulk quote requests, booking analytics & exports, dedicated support",
        link: "/pricing",
        linkText: "View Pricing",
      },
      {
        title: "Refunds & Cancellations",
        content:
          "Refund policies depend on the provider's cancellation terms and the booking status. If a booking is cancelled before the provider confirms, a full refund is typically issued. For confirmed bookings, the provider's cancellation policy applies. If you have a dispute, contact the provider through messaging first, then reach out to our support team if needed.",
      },
      {
        title: "Using Promo Codes",
        content:
          "Providers may offer promo codes for discounts on their services. Enter the promo code during checkout to apply the discount. Promo codes may have expiration dates, usage limits, or minimum booking requirements — check the terms when applying.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: <Settings className="h-5 w-5" />,
    description: "Manage your profile, notifications, and preferences.",
    articles: [
      {
        title: "Your Profile",
        content:
          "Access your profile from the user menu in the top-right corner. Update your name, profile photo, and other details. Your profile information is used for bookings and communications with providers.",
        link: "/profile",
        linkText: "Edit Profile",
      },
      {
        title: "Notification Settings",
        content:
          "OlogyCrew sends notifications for booking updates, new messages, quote responses, and more. You receive real-time in-app notifications (shown in the bell icon), plus email and SMS alerts. Customize which notifications you receive from the Notification Settings page.",
        link: "/notification-settings",
        linkText: "Notification Settings",
      },
      {
        title: "Referral Program",
        content:
          "Earn rewards by referring friends to OlogyCrew! Share your unique referral code or link, and when someone signs up and completes their first booking, both of you receive a reward. Track your referrals and earnings from the Referrals page.",
        link: "/referrals",
        linkText: "View Referrals",
      },
      {
        title: "Privacy & Security",
        content:
          "We take your privacy seriously. Your personal information is protected and never shared without your consent. Payments are processed through Stripe's secure infrastructure. Review our Privacy Policy and Terms of Service for full details.",
        link: "/privacy",
        linkText: "Privacy Policy",
      },
    ],
  },
];

const faqItems: FAQItem[] = [
  {
    question: "Is it free to create an account?",
    answer:
      "Yes! Creating an account is completely free for both customers and providers. Customers can browse, book, and message providers on the free plan. Providers can list up to 3 services on the free Starter plan. Optional paid subscriptions unlock additional features.",
    category: "General",
  },
  {
    question: "How do I book a service?",
    answer:
      "Browse or search for the service you need, select a provider, choose your preferred date and time from their available slots, add any special instructions, and confirm your booking. You'll be guided through secure payment via Stripe.",
    category: "Bookings",
  },
  {
    question: "Can I cancel or reschedule a booking?",
    answer:
      "Yes. You can cancel from the booking detail page. To reschedule, contact the provider through the booking's messaging thread to agree on a new time. Cancellation policies vary by provider, so check their terms before booking.",
    category: "Bookings",
  },
  {
    question: "How do I become a service provider?",
    answer:
      "After signing in, go to the Provider Onboarding page. You'll choose your service categories, set up your business profile, add services with pricing, and upload portfolio photos. The entire process takes about 10 minutes.",
    category: "Providers",
  },
  {
    question: "What service categories are available?",
    answer:
      "OlogyCrew supports 42+ service categories including Barber Shop, Salon, Massage Therapist, Personal Trainer, Handyman, Photography, DJ & Music, Event Planning, Home Cleaning, Auto Detailing, Tech Support, Cybersecurity, Dance Lessons, Pet Care, and many more.",
    category: "General",
  },
  {
    question: "How are payments processed?",
    answer:
      "All payments are processed securely through Stripe. Your card information is never stored on our servers. OlogyCrew charges a 1% platform fee on each transaction, which is included in the total shown at checkout.",
    category: "Payments",
  },
  {
    question: "What if I have a problem with a service?",
    answer:
      "First, contact the provider directly through the booking's messaging thread to try to resolve the issue. If you can't reach a resolution, contact our support team at garychisolm30@gmail.com or call (678) 525-0891 and we'll help mediate.",
    category: "General",
  },
  {
    question: "Can I offer services in multiple categories?",
    answer:
      "Absolutely! During onboarding, you can select as many categories as apply to your business. For example, a salon could offer services under both \"In-Salon Services\" and \"Locks & Twist Hairstyles\" categories.",
    category: "Providers",
  },
  {
    question: "How do quote requests work?",
    answer:
      "Customers can send quote requests describing what they need, their preferred dates, and budget. Providers receive the request and respond with custom pricing. Customers can compare quotes from multiple providers before deciding. Business-tier customers can send bulk quotes to multiple providers at once.",
    category: "Bookings",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "OlogyCrew is a fully responsive web application that works great on mobile browsers — no app download needed. Simply visit the site on your phone's browser and you'll get the full experience optimized for your screen size.",
    category: "General",
  },
  {
    question: "How do I get more visibility as a provider?",
    answer:
      "Upgrade to a Professional or Business subscription for priority search placement and featured listing badges. Also, complete your profile fully, upload quality portfolio photos, respond quickly to bookings and quotes, and earn positive reviews — all of these improve your visibility.",
    category: "Providers",
  },
  {
    question: "Can I embed a booking widget on my own website?",
    answer:
      "Yes! Providers can generate embeddable booking widgets from the Widget Generator page on their dashboard. Copy the embed code and paste it into your website to let customers book directly from your site.",
    category: "Providers",
  },
  {
    question: "What types of bookings are supported?",
    answer:
      "OlogyCrew supports single bookings, multi-day bookings (for projects spanning multiple days), and recurring bookings (weekly, bi-weekly, or monthly sessions). The booking type depends on what the provider has configured for each service.",
    category: "Bookings",
  },
  {
    question: "How do notifications work?",
    answer:
      "You'll receive real-time in-app notifications (shown in the bell icon in the navigation bar) for booking updates, new messages, and quote responses. You also receive email notifications. Providers on the Business plan also get SMS alerts. You can customize your notification preferences in Settings.",
    category: "General",
  },
  {
    question: "Do providers set their own prices?",
    answer:
      "Yes, providers have full control over their pricing. They can set fixed prices, hourly rates, or custom pricing for each service. Some providers also offer deposits or payment plans for larger bookings.",
    category: "Payments",
  },
];

// ─── FAQ Accordion Item ───────────────────────────────────────────────────────

function FAQAccordionItem({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 px-1 text-left hover:text-primary transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium pr-4">{item.question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 px-1 text-sm text-muted-foreground leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

// ─── Guide Section Component ──────────────────────────────────────────────────

function GuideSectionCard({ section }: { section: GuideSection }) {
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);

  return (
    <Card id={section.id}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {section.icon}
          </div>
          <div>
            <CardTitle className="text-xl">{section.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {section.description}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {section.articles.map((article, idx) => (
          <div key={idx} className="border border-border rounded-lg">
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors rounded-lg"
              onClick={() =>
                setExpandedArticle(expandedArticle === idx ? null : idx)
              }
            >
              <span className="font-medium text-sm pr-4">{article.title}</span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  expandedArticle === idx ? "rotate-90" : ""
                }`}
              />
            </button>
            {expandedArticle === idx && (
              <div className="px-4 pb-4">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {article.content}
                </p>
                {article.link && (
                  <Link href={article.link}>
                    <Button variant="link" size="sm" className="mt-2 px-0 h-auto">
                      {article.linkText} <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Quick Links ──────────────────────────────────────────────────────────────

const quickLinks = [
  { icon: <Calendar className="h-5 w-5" />, label: "My Bookings", href: "/my-bookings" },
  { icon: <MessageSquare className="h-5 w-5" />, label: "Messages", href: "/my-bookings" },
  { icon: <Heart className="h-5 w-5" />, label: "Saved Providers", href: "/saved-providers" },
  { icon: <FileText className="h-5 w-5" />, label: "My Quotes", href: "/my-quotes" },
  { icon: <Star className="h-5 w-5" />, label: "Browse Services", href: "/browse" },
  { icon: <Bell className="h-5 w-5" />, label: "Notifications", href: "/notification-settings" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Filter FAQ items based on search and category
  const filteredFAQ = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Filter guide sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery) return guideSections;
    const q = searchQuery.toLowerCase();
    return guideSections
      .map((section) => ({
        ...section,
        articles: section.articles.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.articles.length > 0);
  }, [searchQuery]);

  const faqCategories = ["all", "General", "Bookings", "Providers", "Payments"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Hero Section */}
      <div className="bg-primary/5 border-b">
        <div className="container max-w-5xl py-10 md:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              How can we help you?
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
              Find answers to common questions, learn how to use OlogyCrew, and get
              the most out of the platform.
            </p>
            {/* Search */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for help articles, FAQs, or topics..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-8 md:py-12 space-y-10 md:space-y-14">
        {/* Quick Links */}
        {!searchQuery && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {quickLinks.map((link) => (
                <Link key={link.href + link.label} href={link.href}>
                  <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="flex flex-col items-center justify-center py-4 px-2 text-center gap-2">
                      <div className="text-primary">{link.icon}</div>
                      <span className="text-xs font-medium">{link.label}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section Navigation (when not searching) */}
        {!searchQuery && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Browse by Topic</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {guideSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(section.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="flex items-start gap-3 py-4">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                        {section.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{section.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {section.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Guide Sections */}
        <div className="space-y-8">
          {searchQuery && filteredSections.length === 0 && filteredFAQ.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                We couldn't find anything matching "{searchQuery}". Try a different search term or browse the topics below.
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          )}

          {filteredSections.map((section) => (
            <GuideSectionCard key={section.id} section={section} />
          ))}
        </div>

        {/* FAQ Section */}
        <div id="faq">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Quick answers to the most common questions
              </p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {faqCategories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="capitalize"
              >
                {cat === "all" ? "All Topics" : cat}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="py-2">
              {filteredFAQ.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No FAQs match your current filters. Try adjusting your search or category.
                </div>
              ) : (
                filteredFAQ.map((item, idx) => (
                  <FAQAccordionItem key={idx} item={item} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact & Support Section */}
        <div id="contact">
          <h2 className="text-2xl font-bold mb-6">Still Need Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Email Support</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Send us an email and we'll get back to you as soon as possible. Include your booking number if applicable.
                    </p>
                    <a
                      href="mailto:garychisolm30@gmail.com"
                      className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
                    >
                      garychisolm30@gmail.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Phone Support</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Call us during business hours for immediate assistance with urgent matters.
                    </p>
                    <a
                      href="tel:+16785250891"
                      className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
                    >
                      (678) 525-0891
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Resources */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/terms">
              <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-3 py-4">
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Terms of Service</p>
                    <p className="text-xs text-muted-foreground">Platform rules & policies</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/privacy">
              <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-3 py-4">
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground">How we protect your data</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/browse">
              <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                <CardContent className="flex items-center gap-3 py-4">
                  <Star className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Browse Services</p>
                    <p className="text-xs text-muted-foreground">Explore 42+ categories</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
