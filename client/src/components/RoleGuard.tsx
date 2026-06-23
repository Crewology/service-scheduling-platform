import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * RoleGuard wraps the app router and redirects authenticated users:
 * 1. If email is not verified → redirect to /verify-email
 * 2. If role not selected → redirect to /select-role
 * 
 * Only redirects when the user tries to access protected pages
 * (dashboard, bookings, messages, etc.).
 * 
 * Public pages are always accessible regardless of verification or role status.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if (location === "/verify-email") return;
    if (location === "/select-role") return;

    // Pages that are always accessible (even without verification or role selection)
    const publicPaths = [
      "/",
      "/browse",
      "/search",
      "/plans",
      "/pricing",
      "/embed/",
      "/privacy",
      "/terms",
      "/help",
      "/unsubscribe/",
      "/p/",
      "/category/",
      "/service/",
      "/referral-program",
      "/contact",
      "/about",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
    ];

    // Check exact match for "/" and prefix match for others
    if (location === "/") return;
    if (publicPaths.some(p => p !== "/" && location.startsWith(p))) return;

    // First gate: redirect unverified email users to verify-email page
    if (!user.emailVerified) {
      setLocation("/verify-email");
      return;
    }

    // Second gate: redirect if user hasn't selected a role yet
    if (user.hasSelectedRole === false) {
      setLocation("/select-role");
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  return <>{children}</>;
}
