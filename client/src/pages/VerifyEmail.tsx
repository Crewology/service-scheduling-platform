import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid or missing verification token");
      return;
    }

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
      } catch {
        setStatus("error");
        setError("Something went wrong. Please try again.");
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-slate-900 cursor-pointer">OlogyCrew</h1>
          </Link>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            {status === "loading" && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <h2 className="text-xl font-semibold text-slate-900">Verifying your email...</h2>
                <p className="text-slate-600 text-sm">Please wait a moment.</p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Email Verified!</h2>
                <p className="text-slate-600 text-sm">
                  Your email has been successfully verified. You can now enjoy all features of OlogyCrew.
                </p>
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 mt-4">
                    Continue to Sign In
                  </Button>
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Verification Failed</h2>
                <p className="text-slate-600 text-sm">{error}</p>
                <div className="flex flex-col gap-2">
                  <Link href="/login">
                    <Button className="bg-blue-600 hover:bg-blue-700">Go to Sign In</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
