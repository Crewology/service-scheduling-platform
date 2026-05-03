import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { X, Share, Plus, ArrowUp } from "lucide-react";

interface PWAInstallContextType {
  /** True if the native Chrome/Edge install prompt is available */
  canInstall: boolean;
  /** True if the app is already running in standalone mode */
  isInstalled: boolean;
  /** True if the device is iOS (Safari) */
  isIOS: boolean;
  /** Trigger the install flow — opens iOS guide or Chrome native prompt */
  triggerInstall: () => void;
}

const PWAInstallContext = createContext<PWAInstallContextType | null>(null);

export function usePWAInstallContext() {
  const ctx = useContext(PWAInstallContext);
  if (!ctx) throw new Error("usePWAInstallContext must be used within PWAInstallProvider");
  return ctx;
}

export function PWAInstallProvider({ children }: { children: ReactNode }) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const triggerInstall = useCallback(async () => {
    if (isInstalled) return;

    if (isIOS) {
      // iOS: show the manual instructions overlay
      setShowIOSGuide(true);
    } else if (canInstall) {
      // Chrome/Edge: trigger native install prompt
      await promptInstall();
    } else {
      // Fallback: show iOS-style instructions (works for any browser without native prompt)
      setShowIOSGuide(true);
    }
  }, [isInstalled, isIOS, canInstall, promptInstall]);

  return (
    <PWAInstallContext.Provider value={{ canInstall, isInstalled, isIOS, triggerInstall }}>
      {children}

      {/* Global iOS/fallback instruction overlay */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-md p-6 pb-8 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-gray-900">Install OlogyCrew</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Follow these steps to add OlogyCrew to your home screen:
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                  1
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Tap the{" "}
                  </span>
                  <Share className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-700">
                    Share button in Safari
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                  2
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Scroll down and tap{" "}
                  </span>
                  <Plus className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Add to Home Screen
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-full h-8 w-8 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                  3
                </div>
                <span className="text-sm text-gray-700">
                  Tap <span className="font-medium">Add</span> in the top right to confirm
                </span>
              </div>
            </div>

            {/* Arrow pointing down to Safari toolbar */}
            <div className="flex justify-center mt-6 mb-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <ArrowUp className="h-4 w-4 rotate-180 animate-bounce" />
                <span>Look for the Share button in your Safari toolbar below</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              variant="outline"
              onClick={() => setShowIOSGuide(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </PWAInstallContext.Provider>
  );
}
