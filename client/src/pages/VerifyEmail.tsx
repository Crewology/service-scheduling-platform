import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, CheckCircle, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "gate">("loading");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    // If there's a token in the URL, verify it
    if (token) {
      const verifyEmail = async () => {
        try {
          const response = await fetch("/api/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          const data = await response.json();

          if (!response.ok) {
            setStatus("error");
            setError(data.error || "Verification failed");
            return;
          }

          setStatus("success");
          // Refresh auth state so the user is now verified
          await refresh();
        } catch {
          setStatus("error");
          setError("Something went wrong. Please try again.");
        }
      };

      verifyEmail();
    } else {
      // No token — this is the gate page for unverified users
      setStatus("gate");
    }
  }, [token]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, origin: window.location.origin }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to resend verification email");
      } else {
        toast.success("Verification email sent! Check your inbox.");
        setResendCooldown(60);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleContinueAfterVerification = () => {
    if (user?.hasSelectedRole) {
      setLocation("/dashboard");
    } else {
      setLocation("/select-role");
    }
  };

  // Show loading while checking auth state
  if (loading && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png"
              alt="OlogyCrew"
              className="h-10 mx-auto cursor-pointer"
            />
          </Link>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            {/* Token verification loading */}
            {status === "loading" && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <h2 className="text-xl font-semibold text-slate-900">Verifying your email...</h2>
                <p className="text-slate-600 text-sm">Please wait a moment.</p>
              </div>
            )}

            {/* Token verification success */}
            {status === "success" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Email Verified!</h2>
                <p className="text-slate-600 text-sm">
                  Your email has been successfully verified. You can now set up your profile and start using OlogyCrew.
                </p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 mt-4"
                  onClick={handleContinueAfterVerification}
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Token verification error */}
            {status === "error" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Verification Failed</h2>
                <p className="text-slate-600 text-sm">{error}</p>
                <div className="flex flex-col gap-2">
                  {user && !user.emailVerified && (
                    <Button
                      variant="outline"
                      onClick={handleResendVerification}
                      disabled={resending || resendCooldown > 0}
                    >
                      {resending ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                      ) : resendCooldown > 0 ? (
                        `Resend in ${resendCooldown}s`
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" /> Resend Verification Email</>
                      )}
                    </Button>
                  )}
                  <Link href="/login">
                    <Button className="bg-blue-600 hover:bg-blue-700 w-full">Go to Sign In</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Gate page — shown when user navigates here without a token (unverified user) */}
            {status === "gate" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Verify Your Email</h2>
                <p className="text-slate-600 text-sm">
                  {user?.email ? (
                    <>We sent a verification link to <strong>{user.email}</strong>. Please check your inbox (and spam folder) and click the link to verify your email address.</>
                  ) : (
                    <>Please check your inbox for the verification link and click it to verify your email address.</>
                  )}
                </p>
                <p className="text-slate-500 text-xs">
                  You must verify your email before you can set up your profile or make bookings.
                </p>

                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleResendVerification}
                    disabled={resending || resendCooldown > 0}
                  >
                    {resending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      <><RefreshCw className="w-4 h-4 mr-2" /> Resend Verification Email</>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => refresh()}
                  >
                    I've verified — check again
                  </Button>

                  <p className="text-xs text-slate-400">
                    Wrong email?{" "}
                    <a href="/api/auth/logout" className="text-blue-600 hover:underline">
                      Sign out
                    </a>{" "}
                    and create a new account.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
