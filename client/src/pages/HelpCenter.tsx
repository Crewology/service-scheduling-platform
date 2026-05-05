import { useState, useMemo } from "react";
import { Link } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

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
          "Sign up for OlogyCrew by clicking the \"Sign In\" button in the top navigation. After your first login, you'll be asked to choose your role — Customer (looking to book services) or Provider (offering services). Don't worry, this isn't permanent! Customers can become providers later from their profile page, and providers can always browse and book services too. Once you've selected your role, you'll be taken to your personalized experience.",
      },
      {
        title: "Switching Between Customer & Provider Views",
        content:
          "OlogyCrew is built around the \"Work, Live, Play\" concept — providers are people too, and they can also book services as customers. If you're a provider, you'll see a toggle switch in the navigation bar that lets you flip between Provider view (manage your business, dashboard, bookings received) and Customer view (browse services, make bookings, leave reviews). The platform automatically switches your view based on where you navigate — for example, visiting your Dashboard switches to Provider view, while browsing services switches to Customer view.",
      },
      {
        title: "Browsing & Searching Services",
        content:
          "Use the \"Browse Services\" link in the navigation to explore all 42+ service categories — from Barber Shops and Massage Therapists to DJ & Music Services and Cybersecurity. You can also use the search bar on the homepage or the dedicated Search page to find specific services by keyword and location. Use the X buttons on search fields to quickly clear your filters. Each category page shows all available providers and their services.",
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
          "When you book a service, the provider receives a notification and can confirm, reschedule, or discuss details with you via messaging. Booking statuses include: Pending (awaiting provider confirmation), Confirmed (provider accepted), In Progress (service started), Completed (service finished), and Cancelled. View all your bookings from the \"My Bookings\" page. If you're also a provider, you'll see two tabs: \"Bookings I Made\" (services you booked as a customer) and \"Bookings I Received\" (bookings from your customers).",
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
        title: "Understanding Time Slot Availability",
        content:
          "When you select a date to book a service, you'll see available time slots displayed as buttons. Slots that are already booked or overlap with existing bookings are grayed out and cannot be selected — this prevents double-bookings and ensures the provider is available when you arrive. If all slots on a particular day are grayed out, the provider is fully booked for that date. Try selecting a different day or check back later for cancellations.",
      },
      {
        title: "Booking Group Classes",
        content:
          "Some services are offered as group classes — such as fitness classes, dance lessons, or workshops. When browsing a group class, you'll see how many spots are remaining for each time slot (e.g., \"3 spots left\"). You can book as long as spots are available. Once all spots are filled, that time slot becomes unavailable. Group classes are a great way to enjoy services at a lower per-person cost while meeting others with similar interests.",
      },
      {
        title: "Joining a Waitlist",
        content:
          "When a group class time slot is completely full, you'll see a \"Notify Me\" button instead of the regular booking button. Tap it to join the waitlist for that specific date and time. If someone cancels their booking, you'll automatically receive a notification letting you know a spot has opened up. You can then book the newly available slot before anyone else. To manage your waitlist entries, visit the My Waitlist page from the navigation menu.",
        link: "/my-waitlist",
        linkText: "View My Waitlist",
      },
      {
        title: "Managing Your Waitlist",
        content:
          "Your My Waitlist page shows all the group classes you're waiting for, organized into three sections: 'Spots Available' (a spot just opened — book now!), 'Waiting' (still full, you'll be notified when a spot opens), and 'Past' (expired or already booked). You can leave a waitlist at any time by clicking the remove button. When a spot opens, you'll receive both an in-app notification and an email so you never miss your chance to book.",
        link: "/my-waitlist",
        linkText: "View My Waitlist",
      },
      {
        title: "Booking Analytics",
        content:
          "Business-tier customers have access to a detailed analytics dashboard showing spending trends, booking history, category breakdowns, and top providers. You can also export your booking history as CSV, JSON, or a branded PDF report with charts.",
        link: "/analytics",
        linkText: "View Analytics",
      },
      {
        title: "Becoming a Provider",
        content:
          "Want to offer your own services? You don't need a separate account. Visit your Profile page and you'll see a \"Become a Provider\" card that walks you through the process. Click \"Get Started\" to begin the provider onboarding wizard. Once complete, you'll have access to both customer and provider features — book services and offer your own, all from one account.",
        link: "/profile",
        linkText: "View Profile",
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
          "There are two ways to become a provider: (1) Choose \"Provider\" when you first sign up and see the role selection screen, or (2) Click \"Become a Provider\" from your profile page if you initially signed up as a customer. Either way, you'll enter the onboarding wizard — a simple 5-step process:\n\n1. Profile — Set up your business profile with a description, location, and contact info\n2. Skills — Choose your service categories from our 42+ options\n3. Services — Add your services with pricing and duration\n4. Your Plan — Choose your subscription tier (Starter, Professional, or Business) or start a free 14-day Professional trial\n5. Get Paid — Connect your Stripe account to receive payments\n\nYour dashboard shows a checklist of what's complete.",
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
        title: "Blocking Time on Your Calendar",
        content:
          "Need to take time off for a vacation, personal appointment, or just a break? Use the \"Block Time\" button on your Provider Calendar to block off specific dates or time ranges. Blocked time appears in gray on your calendar with a ban icon, and customers won't be able to book during those times. You can block a full day or just specific hours (e.g., block 12:00–2:00 PM for lunch). To quickly block a date, double-click it on the calendar. View and manage all your upcoming blocked dates in the sidebar, where you can also delete blocks you no longer need.",
        link: "/provider/calendar",
        linkText: "View Calendar",
      },
      {
        title: "Understanding Your Calendar Colors",
        content:
          "Your Provider Calendar uses color-coding to help you see your schedule at a glance:\n\n• Blue — Confirmed bookings\n• Amber/Yellow — Pending bookings (awaiting your confirmation)\n• Purple — In-progress bookings (service currently happening)\n• Green — Completed bookings\n• Red — Cancelled bookings\n• Gray — Blocked time (personal time, vacations)\n\nClick on any booking or blocked time entry to see full details. The calendar supports both month and week views — use the toggle at the top to switch between them.",
        link: "/provider/calendar",
        linkText: "View Calendar",
      },
      {
        title: "Creating Group Class Services",
        content:
          "If you offer group services like fitness classes, dance lessons, or workshops, you can enable the \"Group Class\" option when creating or editing a service. Toggle on \"This is a group class\" and set the maximum number of participants (e.g., 10 for a yoga class, 20 for a workshop). Customers will see how many spots are remaining when they book. Once all spots are filled for a time slot, it automatically becomes unavailable. This is perfect for categories like Fitness Classes & Trainers, Dance Lessons & Instructors, and similar group-based services.",
      },
      {
        title: "Viewing Your Waitlist",
        content:
          "When your group classes are full, customers can join a waitlist for specific time slots. You can view all waitlist entries from the Waitlist section in your Provider Dashboard. Entries are grouped by service and date, showing each customer's name, position in line, and status. When a booking is cancelled, the next person on the waitlist is automatically notified that a spot has opened. You can also manually remove entries if needed. A healthy waitlist is a great sign — it means demand for your classes is high!",
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
          "Every provider gets a public profile page that customers can view. It shows your services, reviews, portfolio, availability, and business information. Professional and Business subscribers can customize their profile URL slug for a more professional look (e.g., /p/your-business-name). When you share your profile link on social media (Facebook, Twitter/X, LinkedIn, etc.), a rich preview card is automatically generated with your business name, description, and photo — making your profile look professional and clickable.",
      },
      {
        title: "Provider & Customer View Switcher",
        content:
          "As a provider, you can also browse and book services as a customer. Use the toggle in the navigation bar to switch between Provider view and Customer view. In Provider view, you see your dashboard, received bookings, and business tools. In Customer view, you see the regular browsing experience, your made bookings, and saved providers. The platform remembers your preference and auto-switches based on where you navigate.",
      },
      {
        title: "Promo Codes & Widgets",
        content:
          "Create promo codes to offer discounts and attract new customers. You can also generate embeddable booking widgets to add to your own website or social media, letting customers book directly from anywhere.",
        link: "/provider/promo-codes",
        linkText: "Manage Promo Codes",
      },
      {
        title: "Trust Badges & Reputation",
        content:
          "OlogyCrew uses an automated Trust Score system to help customers identify reliable providers. Your trust level is calculated from five factors:\n\n\u2022 Profile Completeness (25%) \u2014 Photo, bio, contact info, and business details\n\u2022 Stripe Verification (20%) \u2014 Having a connected and verified Stripe account\n\u2022 Booking History (25%) \u2014 Number of completed bookings and completion rate\n\u2022 Customer Reviews (20%) \u2014 Average rating and number of reviews\n\u2022 Account Age (10%) \u2014 How long you've been on the platform\n\nBased on your score, you earn one of four trust levels:\n\u2022 New \u2014 Just getting started (score 0-29)\n\u2022 Rising \u2014 Building your reputation (score 30-59)\n\u2022 Trusted \u2014 Established provider (score 60-84)\n\u2022 Top Pro \u2014 Elite provider status (score 85-100)\n\nYour trust badge appears on your profile and in search results. Higher trust levels rank you higher in search. Check your Trust Score breakdown and improvement tips on your Provider Dashboard.",
        link: "/provider/dashboard",
        linkText: "View Your Trust Score",
      },
      {
        title: "14-Day Professional Trial",
        content:
             "New providers can start a free 14-day Professional trial — no credit card required. During the trial, you get access to all Professional features: up to 10 services, 3 photos per service, custom profile URL slug, priority search placement, and analytics dashboard. Start your trial during onboarding (Step 4: Your Plan) or from the Subscription Management page.\n\nYou'll receive email notifications at key milestones: 7 days remaining, 3 days remaining, 1 day remaining, and when the trial expires. If you don't upgrade before the trial ends, your account automatically reverts to the free Starter tier. You can upgrade to Professional ($12/mo) or Business ($20/mo) at any time — save up to 20% with annual billing.",
        link: "/provider/subscription",
        linkText: "Manage Subscription",
      },
      {
        title: "Service & Photo Limits",
        content:
          "Each subscription tier has different limits for services and photos:\n\n• Starter (Free) — Up to 3 services, 1 photo per service\n• Professional ($12/mo) — Up to 10 services, 3 photos per service\n• Business ($20/mo) — Unlimited services, 5 photos per service\n\nWhen you reach your tier's limit, you'll see an upgrade prompt with a comparison of what each tier offers. You can upgrade at any time from the Subscription Management page. If you're on a trial and it expires, your services remain but you won't be able to add new ones beyond the Starter limit.",
        link: "/provider/subscription",
        linkText: "Upgrade Your Plan",
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
          "Providers can choose from three subscription tiers:\n\n• Starter (Free) — Up to 3 services, 1 photo per service, basic profile, standard search placement\n\n• Professional ($12/mo or $10.08/mo billed annually) — Up to 10 services, 3 photos per service, custom URL slug, priority search placement, analytics dashboard\n\n• Business ($20/mo or $16.00/mo billed annually) — Unlimited services, 5 photos per service, featured listing badge, top search placement, full analytics, custom branding, priority support\n\nSave up to 20% by choosing annual billing (16% off Professional, 20% off Business)! Use the Monthly/Annual toggle on the pricing page to compare. New providers can start a free 14-day Professional trial — no credit card required — to experience all Professional features before committing.",
        link: "/provider/subscription",
        linkText: "Manage Subscription",
      },
      {
        title: "Customer Subscription Plans",
        content:
          "Customers can optionally upgrade for enhanced features:\n\n• Free — Save up to 5 providers, book any service, message providers, leave reviews, quote requests\n\n• Pro ($12/mo or $120.96/yr) — Save up to 50 providers, priority booking, provider folders\n\n• Business ($20/mo or $192.00/yr) — Unlimited saves, bulk quote requests, booking analytics & exports, dedicated support",
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
          "Access your profile from the user menu in the top-right corner. Update your name, profile photo, phone number, and other details. Your profile page includes a completion indicator that shows your progress — a checklist highlights which fields still need attention (name, email, phone, photo). Once your profile is 100% complete, the indicator disappears. A complete profile helps providers communicate with you and improves your booking experience.",
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
      {
        title: "Installing OlogyCrew on Your Device",
        content:
          "OlogyCrew can be installed as an app on your phone, tablet, or computer for a faster, native-like experience without the browser bar.\n\n• iPhone (Safari only): Open OlogyCrew in Safari, tap the Share button (square with upward arrow) at the bottom, scroll down and tap 'Add to Home Screen', then tap 'Add'. Note: this only works in Safari — not Chrome or other browsers on iPhone.\n\n• Android (Chrome): Open in Chrome. You may see an automatic install banner — tap Install. If not, tap the three-dot menu (⋮) and select 'Install app' or 'Add to Home screen'.\n\n• Desktop (Chrome/Edge): Click the 'Install App' button in the banner at the bottom of the page, or find it in the footer or your user menu dropdown.\n\nOnce installed, OlogyCrew opens in its own window and works just like a native app. You can always find the 'Install App' link in the footer or user menu if you dismissed the banner.",
      },
      {
        title: "Navigation & Getting Around",
        content:
          "Every page on OlogyCrew includes a navigation header and breadcrumbs so you always know where you are and can easily get back. Use the back button at the top of any detail page to return to the previous screen. The navigation bar provides quick access to your bookings, messages, notifications, and profile from anywhere on the platform.",
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
      "Browse or search for the service you need, select a provider, choose your preferred date and time from their available slots, add any special instructions, and confirm your booking. You'll be guided through secure payment via Stripe. Note: grayed-out time slots are already booked or unavailable — only highlighted slots can be selected.",
    category: "Bookings",
  },
  {
    question: "What are group classes and how do I book one?",
    answer:
      "Some services are offered as group classes (e.g., fitness classes, dance lessons, workshops). When viewing a group class, you'll see how many spots are remaining for each time slot — for example, '3 spots left'. You can book as long as there are spots available. Once all spots are filled, that time slot becomes unavailable. Group classes are a great way to enjoy services at a lower per-person cost.",
    category: "Bookings",
  },
  {
    question: "Why are some time slots grayed out?",
    answer:
      "Grayed-out time slots indicate that the provider is unavailable during that time. This could be because: (1) another customer has already booked that slot, (2) the provider has blocked off that time for personal reasons, or (3) the time slot overlaps with an existing booking. Only available (highlighted) slots can be selected for booking.",
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
      "There are two ways: (1) When you first sign up, choose \"Provider\" on the role selection screen, or (2) If you already have a customer account, go to your Profile page and click the \"Become a Provider\" card. Either way, you'll enter the 5-step onboarding wizard: set up your business profile, choose your service categories, add services with pricing, select your subscription plan (or start a free 14-day Professional trial), and connect Stripe for payments. The entire process takes about 10 minutes.",
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
      "First, contact the provider directly through the booking's messaging thread to try to resolve the issue. If you can't reach a resolution, contact our support team by calling (678) 525-0891 or using the contact form on this page and we'll help mediate.",
    category: "General",
  },
  {
    question: "Can I offer services in multiple categories?",
    answer:
      "Absolutely! During onboarding, you can select as many categories as apply to your business. For example, a salon could offer services under both \"In-Salon Services\" and \"Locks & Twist Hairstyles\" categories.",
    category: "Providers",
  },
  {
    question: "How do I offer group classes as a provider?",
    answer:
      "When creating or editing a service, toggle on 'This is a group class' and set the maximum number of participants. For example, set it to 10 for a yoga class or 20 for a workshop. Customers will see how many spots remain for each time slot. Once all spots are filled, the slot automatically closes. This is ideal for categories like Fitness Classes & Trainers, Dance Lessons & Instructors, and similar group-based services.",
    category: "Providers",
  },
  {
    question: "How do I block off time on my calendar?",
    answer:
      "Go to your Provider Calendar and click the 'Block Time' button. Select the date(s) and optionally set specific start/end times (or block the full day). Blocked time appears in gray on your calendar and prevents customers from booking during those times. You can also double-click any date on the calendar to quickly block it. To remove a block, find it in the 'Upcoming Blocked Dates' sidebar and click the delete button.",
    category: "Providers",
  },
  {
    question: "What do the colors on my provider calendar mean?",
    answer:
      "Your calendar uses color-coding: Blue = Confirmed bookings, Amber/Yellow = Pending bookings, Purple = In-progress, Green = Completed, Red = Cancelled, Gray = Blocked time (personal time off). Click any entry to see full details.",
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
      "OlogyCrew is a Progressive Web App (PWA) that you can install directly to your device's home screen for a native app-like experience — no app store needed! On iPhone: open the site in Safari, tap the Share button (square with arrow), then tap 'Add to Home Screen'. On Android: open in Chrome and tap 'Install App' from the menu, or look for the install banner. On Desktop: click the 'Install App' button in the banner or find it in the footer/user menu. Once installed, OlogyCrew opens in its own window without the browser bar, just like a native app.",
    category: "General",
  },
  {
    question: "How do I install OlogyCrew on my iPhone?",
    answer:
      "Apple requires a specific process to add web apps to your iPhone: (1) Open OlogyCrew in Safari — this only works in Safari, not Chrome or other browsers. (2) Tap the Share button at the bottom of the screen (the square with an upward arrow). (3) Scroll down and tap 'Add to Home Screen'. (4) Tap 'Add' in the top right. The app will appear on your home screen and open without the Safari browser bar. You can also find the 'Install App' link in the footer or user menu at any time.",
    category: "General",
  },
  {
    question: "How do I install OlogyCrew on my Android device?",
    answer:
      "On Android, open OlogyCrew in Chrome. You may see an automatic 'Add to Home Screen' banner — just tap Install. If no banner appears, tap the three-dot menu (⋮) in the top right corner and select 'Install app' or 'Add to Home screen'. The app will install and appear on your home screen as a standalone app. Samsung Internet and Firefox also support installation through their respective menus.",
    category: "General",
  },
  {
    question: "How do I get more visibility as a provider?",
    answer:
      "Your visibility is determined by your Trust Score and subscription tier. Build your Trust Score by completing your profile, uploading quality portfolio photos, connecting Stripe, earning positive reviews, and completing bookings. Higher trust levels (Rising, Trusted, Top Pro) rank you higher in search results. Upgrading to Professional or Business adds a tier boost to your search ranking. The combination of trust score and subscription tier determines your final placement.",
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
  {
    question: "How do I switch between customer and provider mode?",
    answer:
      "If you're a provider, you'll see a toggle switch in the navigation bar that lets you flip between Provider view and Customer view. Provider view shows your dashboard, received bookings, and business tools. Customer view shows the regular browsing experience and your made bookings. The platform also auto-switches based on where you navigate.",
    category: "General",
  },
  {
    question: "I signed up as a customer but want to be a provider — how do I switch?",
    answer:
      "Go to your Profile page and you'll see a \"Become a Provider\" card. Click \"Get Started\" to begin the provider onboarding wizard. Once complete, you'll have access to both customer and provider features from the same account — no need to create a new one.",
    category: "Providers",
  },
  {
    question: "Can I book services as a provider?",
    answer:
      "Absolutely! OlogyCrew is built around the \"Work, Live, Play\" concept — providers are people too. Use the view switcher in the navigation bar to switch to Customer view, and you can browse, book, and review services just like any other customer. Your bookings as a customer are kept separate from the bookings you receive as a provider.",
    category: "Providers",
  },
  {
    question: "What is the profile completion indicator?",
    answer:
      "Your Profile page shows a progress bar and checklist highlighting which fields still need attention (name, email, phone number, profile photo). Once all fields are filled in, the indicator disappears. A complete profile helps providers communicate with you and improves your overall experience.",
    category: "General",
  },
  {
    question: "What are Trust Badges and how do I earn one?",
    answer:
      "Trust Badges are automatically earned based on your Trust Score, which is calculated from your profile completeness, Stripe verification, booking history, customer reviews, and account age. There are four levels: New (0-29), Rising (30-59), Trusted (60-84), and Top Pro (85-100). Your badge appears on your profile and in search results. Higher trust levels also rank you higher in search. Check your Trust Score breakdown and improvement tips on your Provider Dashboard.",
    category: "Providers",
  },
  {
    question: "What is the 14-day Professional trial?",
    answer:
      "New providers can try the Professional tier free for 14 days — no credit card required. You get access to all Professional features including up to 10 services, 3 photos per service, custom URL slug, and priority search placement. Start your trial during onboarding or from the Subscription Management page. You'll receive email reminders at 7, 3, and 1 day before expiry. If you don't upgrade, your account reverts to the free Starter tier.",
    category: "Providers",
  },
  {
    question: "Can I save money with annual billing?",
    answer:
      "Yes! Both provider and customer subscriptions offer annual billing at a discount. Professional saves 16% ($10.08/mo billed annually at $120.96/year instead of $12/mo). Business saves 20% ($16.00/mo billed annually at $192.00/year instead of $20/mo). Use the Monthly/Annual toggle on the pricing or subscription page to compare and switch.",
    category: "Payments",
  },
  {
    question: "What happens when I reach my service or photo limit?",
    answer:
      "Each subscription tier has limits on how many services and photos you can add. When you reach your limit, you'll see an upgrade prompt showing what each tier offers. Your existing services and photos are never deleted — you just can't add new ones beyond your tier's limit until you upgrade. Starter allows 3 services (1 photo each), Professional allows 10 services (3 photos each), and Business offers unlimited services (5 photos each).",
    category: "Providers",
  },
  {
    question: "How does search ranking work?",
    answer:
      "Search results are ranked by a combination of your Trust Score and subscription tier. Your Trust Score is the primary factor — providers with higher trust levels appear first. Subscription tier provides a secondary boost: Business gets the highest boost, Professional gets a moderate boost, and Starter gets no boost. This means a Trusted provider on the free plan can still rank above a New provider on a paid plan, keeping the system merit-based.",
    category: "Providers",
  },
  {
    question: "How do I join a waitlist for a full group class?",
    answer:
      "When a group class time slot is completely full, you'll see a 'Notify Me' button instead of the regular booking button. Tap it to join the waitlist for that specific date and time. You'll be automatically notified when a spot opens up due to a cancellation. Visit the My Waitlist page from the navigation menu to see all your waitlist entries and their status.",
    category: "Bookings",
  },
  {
    question: "How will I be notified when a waitlist spot opens?",
    answer:
      "When someone cancels their booking for a group class you're on the waitlist for, you'll receive both an in-app notification (bell icon) and an email letting you know a spot is available. Act quickly — spots are first-come, first-served once they open up. Your My Waitlist page will also update to show 'Spot Available' status for that entry.",
    category: "Bookings",
  },
  {
    question: "How do I see who's on my waitlist? (Providers)",
    answer:
      "Go to your Provider Dashboard and look for the Waitlist section. You'll see all customers waiting for your group classes, organized by service and date. Each entry shows the customer's name, their position in line, the date/time they're waiting for, and their current status. When a booking is cancelled, the system automatically notifies the next person in line.",
    category: "Providers",
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

// ─── Contact Form Component ──────────────────────────────────────────────────

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState<number | null>(null);

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setRefId(data.id);
      toast.success("Message sent! We'll get back to you soon.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submitMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      category: category as "general" | "booking" | "payment" | "provider" | "technical" | "other",
      message: message.trim(),
    });
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setSubject("");
    setCategory("general");
    setMessage("");
    setSubmitted(false);
    setRefId(null);
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Message Sent Successfully!</h3>
          <p className="text-green-700 mb-1">
            Thank you for reaching out. We've received your message and will respond within 24-48 hours.
          </p>
          {refId && (
            <p className="text-sm text-green-600 mb-4">Reference #: {refId}</p>
          )}
          <p className="text-sm text-muted-foreground mb-6">
            A confirmation email has been sent to your inbox.
          </p>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <Send className="h-4 w-4" />
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Send Us a Message
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Fill out the form below and we'll get back to you as soon as possible. All fields marked with * are required.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Your Name *</Label>
              <Input
                id="contact-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email Address *</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={320}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject *</Label>
              <Input
                id="contact-subject"
                placeholder="How can we help?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="contact-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Inquiry</SelectItem>
                  <SelectItem value="booking">Booking Issue</SelectItem>
                  <SelectItem value="payment">Payment & Billing</SelectItem>
                  <SelectItem value="provider">Provider Support</SelectItem>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-message">Message *</Label>
            <Textarea
              id="contact-message"
              placeholder="Please describe your issue or question in detail. Include any relevant booking numbers, dates, or screenshots if applicable."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/5000 characters
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full sm:w-auto gap-2"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

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
      <NavHeader />
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

          {/* Contact Form */}
          <ContactForm />

          {/* Direct Contact Info */}
          <div className="mt-6 grid grid-cols-1 gap-4">
            <Card className="border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Phone Support</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Call us during business hours for urgent matters.
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
