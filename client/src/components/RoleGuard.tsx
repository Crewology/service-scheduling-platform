import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

/**
 * RoleGuard wraps the app router and redirects authenticated users
 * who haven't selected a role yet to the /select-role page.
 * 
 * Skips redirect for:
 * - Unauthenticated users (they can browse freely)
 * - Users already on /select-role
 * - Users who have already selected a role (hasSelectedRole === true)
 * - Public pages like /embed/*, /p/*, /privacy, /terms, etc.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user) return;
    if (location === "/select-role") return;

    // Don't redirect on public/embed pages
    const publicPaths = ["/embed/", "/privacy", "/terms", "/help", "/unsubscribe/", "/p/"];
    if (publicPaths.some(p => location.startsWith(p))) return;

    // Redirect if user hasn't selected a role yet
    if (user.hasSelectedRole === false) {
      setLocation("/select-role");
    }
  }, [loading, isAuthenticated, user, location, setLocation]);

  return <>{children}</>;
}
