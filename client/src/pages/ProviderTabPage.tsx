import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Wrapper pages that redirect to /provider/dashboard?tab=<tab>
 * This gives each provider feature its own clean URL while reusing the dashboard.
 * The ProviderDashboard already reads ?tab= from the URL to set the active tab.
 */

export function ProviderBookings() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/provider/dashboard?tab=bookings", { replace: true });
  }, [setLocation]);
  return null;
}

export function ProviderServices() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/provider/dashboard?tab=services", { replace: true });
  }, [setLocation]);
  return null;
}

export function ProviderAnalytics() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/provider/dashboard?tab=analytics", { replace: true });
  }, [setLocation]);
  return null;
}

export function ProviderPayouts() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/provider/dashboard?tab=finances", { replace: true });
  }, [setLocation]);
  return null;
}

export function ProviderPortfolio() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/provider/dashboard?tab=services", { replace: true });
  }, [setLocation]);
  return null;
}

export function ProviderQuotes() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/provider/dashboard?tab=bookings", { replace: true });
  }, [setLocation]);
  return null;
}

