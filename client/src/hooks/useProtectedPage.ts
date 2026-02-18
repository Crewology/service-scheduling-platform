import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";

/**
 * Custom hook for protected pages
 * Automatically redirects to login if user is not authenticated
 * Eliminates duplicate auth checking across pages
 */
export function useProtectedPage() {
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  return {
    user,
    isAuthenticated,
    loading,
  };
}
