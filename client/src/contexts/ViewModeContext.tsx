import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export type ViewMode = "customer" | "provider";

interface ViewModeContextValue {
  /** Current active view mode */
  viewMode: ViewMode;
  /** Toggle between customer and provider views */
  toggleViewMode: () => void;
  /** Set a specific view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Whether the user can switch views (only providers can) */
  canSwitch: boolean;
  /** Whether the user is currently in provider view */
  isProviderView: boolean;
  /** Whether the user is currently in customer view */
  isCustomerView: boolean;
}

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

const STORAGE_KEY = "ologycrew-view-mode";

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isProvider = user?.role === "provider";

  // Initialize from localStorage, defaulting to provider view for providers
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "customer";
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "customer" || stored === "provider") return stored;
    return "customer"; // Default, will be updated when user loads
  });

  // When user loads/changes, set appropriate default
  useEffect(() => {
    if (!user) return;
    if (isProvider) {
      // If provider and no stored preference, default to provider view
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setViewModeState("provider");
        localStorage.setItem(STORAGE_KEY, "provider");
      }
    } else {
      // Non-providers always see customer view
      setViewModeState("customer");
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user, isProvider]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === "provider" ? "customer" : "provider");
  }, [viewMode, setViewMode]);

  const value: ViewModeContextValue = {
    viewMode: isProvider ? viewMode : "customer",
    toggleViewMode,
    setViewMode,
    canSwitch: !!isProvider,
    isProviderView: isProvider && viewMode === "provider",
    isCustomerView: !isProvider || viewMode === "customer",
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error("useViewMode must be used within a ViewModeProvider");
  }
  return ctx;
}
