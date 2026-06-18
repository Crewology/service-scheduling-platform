import { useEffect } from "react";
import { useSearch } from "wouter";
import { getLoginUrl } from "@/const";

/**
 * /signup route handler — redirects to the login/signup flow.
 * Preserves the ?ref= referral code parameter in localStorage so it can be
 * applied after the user completes sign-up.
 */
export default function Signup() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const refCode = params.get("ref");

  useEffect(() => {
    // Store the referral code so it persists through the OAuth redirect
    if (refCode) {
      localStorage.setItem("referralCode", refCode);
    }
    // Redirect to the OAuth login/signup flow
    window.location.href = getLoginUrl();
  }, [refCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to sign up...</p>
      </div>
    </div>
  );
}
