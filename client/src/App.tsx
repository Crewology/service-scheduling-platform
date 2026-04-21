import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { OfflineBanner } from "./components/OfflineBanner";
import { RoleGuard } from "./components/RoleGuard";

// ─── Page Loading Fallback ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// ─── Lazy Page Imports (Route-Based Code Splitting) ──────────────────────────
// Each page is loaded on-demand when the user navigates to its route.
// This splits the 2.8MB monolithic bundle into ~40 smaller chunks.

// Core pages (high traffic — loaded first by users)
const Home = lazy(() => import("./pages/Home"));
const Browse = lazy(() => import("./pages/Browse"));
const Search = lazy(() => import("./pages/Search"));
const CategoryDetail = lazy(() => import("./pages/CategoryDetail"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const PublicProviderProfile = lazy(() => import("./pages/PublicProviderProfile"));

// Auth & onboarding
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const ProviderOnboarding = lazy(() => import("./pages/ProviderOnboarding"));

// Booking flow
const BookingConfirmation = lazy(() => import("./pages/BookingConfirmation"));
const BookingDetail = lazy(() => import("./pages/BookingDetail"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const MyQuotes = lazy(() => import("./pages/MyQuotes"));

// Messaging
const Conversations = lazy(() => import("./pages/Conversations"));
const Messages = lazy(() => import("./pages/Messages"));

// Provider dashboard & tools
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const CreateService = lazy(() => import("./pages/CreateService"));
const ManageAvailability = lazy(() => import("./pages/ManageAvailability"));
const ProviderCalendar = lazy(() => import("./pages/ProviderCalendar"));
const ProviderReviews = lazy(() => import("./pages/ProviderReviews"));
const WidgetGenerator = lazy(() => import("./pages/WidgetGenerator"));
const PromoCodes = lazy(() => import("./pages/PromoCodes"));
const BookingAnalytics = lazy(() => import("./pages/BookingAnalytics"));

// User features
const UserProfile = lazy(() => import("./pages/UserProfile"));
const SubscriptionManagement = lazy(() => import("./pages/SubscriptionManagement"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Referrals = lazy(() => import("./pages/Referrals"));
const SavedProviders = lazy(() => import("./pages/SavedProviders"));
const CustomerPricing = lazy(() => import("./pages/CustomerPricing"));

// Reviews
const SubmitReview = lazy(() => import("./pages/SubmitReview"));

// Embed / external
const EmbedBooking = lazy(() => import("./pages/EmbedBooking"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));

// Static / info pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));

// Admin
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// Not Found (keep static — it's tiny and used as fallback)
const NotFound = lazy(() => import("./pages/NotFound"));

// ─── Router ──────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/select-role" component={RoleSelection} />
        <Route path="/" component={Home} />
        <Route path="/browse" component={Browse} />
        <Route path="/search" component={Search} />
        <Route path="/category/:slug" component={CategoryDetail} />
        <Route path="/provider/dashboard" component={ProviderDashboard} />
        <Route path="/provider/services/new" component={CreateService} />
        <Route path="/provider/availability" component={ManageAvailability} />
        <Route path="/provider/calendar" component={ProviderCalendar} />
        <Route path="/service/:id" component={ServiceDetail} />
        <Route path="/booking/:id" component={BookingConfirmation} />
        <Route path="/my-bookings" component={MyBookings} />
        <Route path="/messages" component={Conversations} />
        <Route path="/messages/:bookingId" component={Messages} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/booking/:id/review" component={SubmitReview} />
        <Route path="/provider/reviews" component={ProviderReviews} />
        <Route path="/profile" component={UserProfile} />
        <Route path="/p/:slug" component={PublicProviderProfile} />
        <Route path="/provider/subscription" component={SubscriptionManagement} />
        <Route path="/provider/onboarding" component={ProviderOnboarding} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/notification-settings" component={NotificationSettings} />
        <Route path="/unsubscribe/:token" component={Unsubscribe} />
        <Route path="/embed/book/:serviceId" component={EmbedBooking} />
        <Route path="/embed/provider/:providerId" component={EmbedBooking} />
        <Route path="/provider/widgets" component={WidgetGenerator} />
        <Route path="/provider/promo-codes" component={PromoCodes} />
        <Route path="/booking/:id/detail" component={BookingDetail} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/saved-providers" component={SavedProviders} />
        <Route path="/my-quotes" component={MyQuotes} />
        <Route path="/pricing" component={CustomerPricing} />
        <Route path="/analytics" component={BookingAnalytics} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/help" component={HelpCenter} />
        <Route path="/referral-program" component={ReferralProgram} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OfflineBanner />
          <RoleGuard>
            <Router />
          </RoleGuard>
          <PWAInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
