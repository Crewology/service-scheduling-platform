import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { NavHeader } from "@/components/shared/NavHeader";

function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { level: 2, label: "Fair", color: "bg-orange-500" };
    if (score <= 4) return { level: 3, label: "Good", color: "bg-yellow-500" };
    return { level: 4, label: "Strong", color: "bg-green-500" };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= strength.level ? strength.color : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${
        strength.level <= 1 ? "text-red-600" :
        strength.level === 2 ? "text-orange-600" :
        strength.level === 3 ? "text-yellow-600" :
        "text-green-600"
      }`}>
        {strength.label}
      </p>
    </div>
  );
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Reset failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <NavHeader />
        <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6 space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-slate-900">Invalid Reset Link</h2>
              <p className="text-slate-600 text-sm">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button className="bg-blue-600 hover:bg-blue-700">Request New Link</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    );
  }

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <NavHeader />
      <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-3xl font-bold text-slate-900 cursor-pointer">OlogyCrew</h1>
          </Link>
          <p className="text-slate-600 mt-2">Set your new password</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6 space-y-6">
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-900">Password Reset!</h2>
                <p className="text-slate-600 text-sm">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>
                <Link href="/login">
                  <Button className="bg-blue-600 hover:bg-blue-700 mt-4">
                    Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        required
                        autoComplete="new-password"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-11"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <div className={`flex items-center gap-1 text-xs ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                        {passwordsMatch ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>

                <div className="text-center">
                  <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
    </div>
      </div>
    </div>
  );
}
