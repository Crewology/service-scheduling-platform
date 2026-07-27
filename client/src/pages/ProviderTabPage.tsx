import ProviderDashboard from "./ProviderDashboard";

/**
 * Standalone provider pages that render the ProviderDashboard
 * with a specific tab pre-selected and chrome (stats, tab bars, etc.) hidden.
 * Each page has its own clean URL and shows only the relevant tab content.
 */

export function ProviderBookings() {
  return <ProviderDashboard initialTab="bookings" hideChrome={true} />;
}

export function ProviderServices() {
  return <ProviderDashboard initialTab="services" hideChrome={true} />;
}

export function ProviderAnalytics() {
  return <ProviderDashboard initialTab="analytics" hideChrome={true} />;
}

export function ProviderPayouts() {
  return <ProviderDashboard initialTab="finances" hideChrome={true} />;
}

export function ProviderPortfolio() {
  return <ProviderDashboard initialTab="services" hideChrome={true} />;
}

export function ProviderQuotes() {
  return <ProviderDashboard initialTab="bookings" hideChrome={true} />;
}
