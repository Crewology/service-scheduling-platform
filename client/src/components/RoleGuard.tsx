import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * RoleGuard wraps the app router and redirects authenticated users
 * who haven't selected a role yet to the /select-role page.
 * 
 * Only redirects when the user tries to access protected pages
 * (dashboard, bookings, messages, etc.) without having selected a role.
 * 
 * Public pages are always accessible, even for authenticated users
 * who haven't selected a role yet.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if (location === "/select-role") return;

    // Pages that are always accessible (even without role selection)
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
      "/contact",
      "/about",
    ];

    // Check exact match for "/" and prefix match for others
    if (location === "/") return;
    if (publicPaths.some(p => p !== "/" && location.startsWith(p))) return;

    // Redirect if user hasn't selected a role yet and is on a protected page
    if (user.hasSelectedRole === false) {
      setLocation("/select-role");
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  return <>{children}</>;
}
