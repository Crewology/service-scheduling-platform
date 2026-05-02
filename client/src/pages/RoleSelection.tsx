import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Briefcase, ArrowRight, Home } from "lucide-react";
import { toast } from "sonner";

export default function RoleSelection() {
  const { user, loading, refresh, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedRole, setSelectedRole] = useState<"customer" | "provider" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectRoleMutation = trpc.auth.selectRole.useMutation({
    onSuccess: async (data) => {
      await refresh();
      if (data.role === "provider") {
        setLocation("/provider/onboarding");
      } else {
        setLocation("/browse");
      }
      toast.success(
        data.role === "provider"
          ? "Welcome! Let's set up your provider profile."
          : "Welcome to OlogyCrew! Start browsing services."
      );
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    },
  });

  const handleSelect = (role: "customer" | "provider") => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    selectRoleMutation.mutate({ role: selectedRole });
  };

  const handleSkip = async () => {
    // Log the user out and send them to the home page
    // This prevents the RoleGuard from redirecting them back here
    try {
      await logout();
    } catch {
      // Ignore logout errors
    }
    setLocation("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/logo-navbar_38427c60.png"
          alt="OlogyCrew"
          className="h-10 mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-gray-600 mt-2 max-w-md">
          How would you like to use OlogyCrew?
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
        {/* Customer Card */}
        <Card
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
            selectedRole === "customer"
              ? "border-amber-500 bg-amber-50 shadow-lg ring-2 ring-amber-200"
              : "border-gray-200 hover:border-amber-300"
          }`}
          onClick={() => handleSelect("customer")}
        >
          <CardContent className="p-6 text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                selectedRole === "customer"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Find & Book Services
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Browse local professionals, book appointments, and manage your bookings — all in one place.
            </p>
            {selectedRole === "customer" && (
              <div className="mt-3 text-amber-600 font-medium text-sm flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Selected
              </div>
            )}
          </CardContent>
        </Card>

        {/* Provider Card */}
        <Card
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
            selectedRole === "provider"
              ? "border-amber-500 bg-amber-50 shadow-lg ring-2 ring-amber-200"
              : "border-gray-200 hover:border-amber-300"
          }`}
          onClick={() => handleSelect("provider")}
        >
          <CardContent className="p-6 text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                selectedRole === "provider"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Offer My Services
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              List your services, manage bookings, accept payments, and grow your business with OlogyCrew.
            </p>
            {selectedRole === "provider" && (
              <div className="mt-3 text-amber-600 font-medium text-sm flex items-center justify-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Selected
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Continue Button */}
      <Button
        size="lg"
        onClick={handleContinue}
        disabled={!selectedRole || isSubmitting}
        className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 text-base font-medium"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Setting up...
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>

      {/* Back to Home link — escape hatch to prevent login loop */}
      <button
        onClick={handleSkip}
        className="mt-4 text-sm text-gray-500 hover:text-amber-600 transition-colors flex items-center gap-1.5 group"
      >
        <Home className="h-3.5 w-3.5 group-hover:text-amber-600" />
        Back to Home
      </button>

      {/* Note */}
      <p className="text-xs text-gray-400 mt-6 text-center max-w-sm">
        You can always switch later or add provider services from your profile settings.
      </p>
    </div>
  );
}
