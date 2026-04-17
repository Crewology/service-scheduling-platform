import { useViewMode } from "@/contexts/ViewModeContext";
import { Briefcase, ShoppingBag } from "lucide-react";

/**
 * A pill-style toggle that lets providers switch between
 * "Provider" (manage business) and "Customer" (browse & book) views.
 * Only renders for users who are providers.
 */
export function ViewModeSwitcher() {
  const { viewMode, setViewMode, canSwitch } = useViewMode();

  if (!canSwitch) return null;

  return (
    <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
      <button
        onClick={() => setViewMode("provider")}
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
        onClick={() => setViewMode("customer")}
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

  if (!canSwitch) return null;

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
      <button
        onClick={() => {
          setViewMode("provider");
          onSwitch?.();
        }}
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
        onClick={() => {
          setViewMode("customer");
          onSwitch?.();
        }}
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
