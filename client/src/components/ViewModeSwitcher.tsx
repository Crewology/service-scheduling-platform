import { useViewMode } from "@/contexts/ViewModeContext";
import { Briefcase, ShoppingBag } from "lucide-react";
import { useLocation } from "wouter";

/**
 * Route pairs that should navigate when the view mode is toggled.
 * When on one of these routes and the user switches view mode,
 * they'll be navigated to the corresponding route.
 */
const ROUTE_PAIRS: Record<string, string> = {
  "/provider/subscription": "/customer/subscription",
  "/customer/subscription": "/provider/subscription",
  "/provider/billing": "/customer/billing",
  "/customer/billing": "/provider/billing",
};

/**
 * A pill-style toggle that lets providers switch between
 * "Provider" (manage business) and "Customer" (browse & book) views.
 * Only renders for users who are providers.
 */
export function ViewModeSwitcher() {
  const { viewMode, setViewMode, canSwitch } = useViewMode();
  const [location, navigate] = useLocation();

  if (!canSwitch) return null;

  const handleSwitch = (mode: "provider" | "customer") => {
    if (mode === viewMode) return;
    setViewMode(mode);
    // If on a paired route, navigate to the counterpart
    const targetRoute = ROUTE_PAIRS[location];
    if (targetRoute) {
      navigate(targetRoute);
    }
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
      <button
        onClick={() => handleSwitch("provider")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          viewMode === "provider"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
        title="Switch to Provider view — manage your business"
      >
        <Briefcase className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Provider</span>
      </button>
      <button
        onClick={() => handleSwitch("customer")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          viewMode === "customer"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
        title="Switch to Customer view — browse & book services"
      >
        <ShoppingBag className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Customer</span>
      </button>
    </div>
  );
}

/**
 * Mobile version of the view switcher — full width, larger touch targets.
 */
export function ViewModeSwitcherMobile({ onSwitch }: { onSwitch?: () => void }) {
  const { viewMode, setViewMode, canSwitch } = useViewMode();
  const [location, navigate] = useLocation();

  if (!canSwitch) return null;

  const handleSwitch = (mode: "provider" | "customer") => {
    if (mode === viewMode) return;
    setViewMode(mode);
    // If on a paired route, navigate to the counterpart
    const targetRoute = ROUTE_PAIRS[location];
    if (targetRoute) {
      navigate(targetRoute);
    }
    onSwitch?.();
  };

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
      <button
        onClick={() => handleSwitch("provider")}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === "provider"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <Briefcase className="h-4 w-4" />
        Provider
      </button>
      <button
        onClick={() => handleSwitch("customer")}
        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === "customer"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <ShoppingBag className="h-4 w-4" />
        Customer
      </button>
    </div>
  );
}
