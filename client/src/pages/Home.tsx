import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import LoggedInHome from "@/pages/LoggedInHome";
import PublicHomepageConceptThree from "@/pages/PublicHomepageConceptThree";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  // Preserve referral attribution when a visitor enters from a shared link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("customer_referral_code", refCode.toUpperCase().trim());
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  // Signed-in providers/customers keep their existing workspace homepage.
  if (isAuthenticated && user) return <LoggedInHome />;
  return <PublicHomepageConceptThree />;
}
