import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { OfflineBanner } from "./components/OfflineBanner";
import { RoleGuard } from "./components/RoleGuard";

// ─── Page Imports ───────────────────────────────────────────────────────────

// Core pages
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Search from "./pages/Search";
import CategoryDetail from "./pages/CategoryDetail";
import ServiceDetail from "./pages/ServiceDetail";
import PublicProviderProfile from "./pages/PublicProviderProfile";

// Auth & onboarding
import RoleSelection from "./pages/RoleSelection";
import ProviderOnboarding from "./pages/ProviderOnboarding";

// Booking flow
import BookingConfirmation from "./pages/BookingConfirmation";
import BookingDetail from "./pages/BookingDetail";
import MyBookings from "./pages/MyBookings";
import MyQuotes from "./pages/MyQuotes";

// Messaging
import Conversations from "./pages/Conversations";
import Messages from "./pages/Messages";

// Provider dashboard & tools
import ProviderDashboard from "./pages/ProviderDashboard";
import CreateService from "./pages/CreateService";
import ManageAvailability from "./pages/ManageAvailability";
import ProviderCalendar from "./pages/ProviderCalendar";
import ProviderReviews from "./pages/ProviderReviews";
import WidgetGenerator from "./pages/WidgetGenerator";
import PromoCodes from "./pages/PromoCodes";
import BookingAnalytics from "./pages/BookingAnalytics";

// User features
import UserProfile from "./pages/UserProfile";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import Referrals from "./pages/Referrals";
import SavedProviders from "./pages/SavedProviders";
import CustomerPricing from "./pages/CustomerPricing";

// Reviews
import SubmitReview from "./pages/SubmitReview";

// Embed / external
import EmbedBooking from "./pages/EmbedBooking";
import Unsubscribe from "./pages/Unsubscribe";

// Static / info pages
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import ReferralProgram from "./pages/ReferralProgram";

// Admin
import AdminDashboard from "./pages/AdminDashboard";
import EmailPreview from "./pages/EmailPreview";

// Not Found
import NotFound from "./pages/NotFound";

// ─── Router ──────────────────────────────────────────────────────────────────
function Router() {
  return (
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
      <Route path="/admin/email-preview" component={EmailPreview} />
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
