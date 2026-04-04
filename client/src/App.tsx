import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import CategoryDetail from "./pages/CategoryDetail";
import ProviderDashboard from "./pages/ProviderDashboard";
import CreateService from "./pages/CreateService";
import ManageAvailability from "./pages/ManageAvailability";
import ServiceDetail from "./pages/ServiceDetail";
import BookingConfirmation from "./pages/BookingConfirmation";
import MyBookings from "./pages/MyBookings";
import Messages from "./pages/Messages";
import Search from "./pages/Search";
import AdminDashboard from "./pages/AdminDashboard";
import SubmitReview from "./pages/SubmitReview";
import ProviderReviews from "./pages/ProviderReviews";
import UserProfile from "./pages/UserProfile";
import PublicProviderProfile from "./pages/PublicProviderProfile";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import ProviderOnboarding from "./pages/ProviderOnboarding";
import Notifications from "./pages/Notifications";
import NotificationSettings from "./pages/NotificationSettings";
import Unsubscribe from "./pages/Unsubscribe";
import EmbedBooking from "./pages/EmbedBooking";
import WidgetGenerator from "./pages/WidgetGenerator";
import PromoCodes from "./pages/PromoCodes";
import BookingDetail from "./pages/BookingDetail";
import Referrals from "./pages/Referrals";
import SavedProviders from "./pages/SavedProviders";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/browse" component={Browse} />
      <Route path="/search" component={Search} />
      <Route path="/category/:slug" component={CategoryDetail} />
      <Route path="/provider/dashboard" component={ProviderDashboard} />
      <Route path="/provider/services/new" component={CreateService} />
      <Route path="/provider/availability" component={ManageAvailability} />
      <Route path="/service/:id" component={ServiceDetail} />
      <Route path="/booking/:id" component={BookingConfirmation} />
      <Route path="/my-bookings" component={MyBookings} />
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
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
