import { useState, useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Download, X, Share, Plus } from "lucide-react";

export function PWAInstallBanner() {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Check if user previously dismissed
  useEffect(() => {
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const daysSince =
        (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSince < 7) {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      handleDismiss();
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) return null;

  // Show iOS-specific guide
  if (isIOS) {
    return (
      <>
        {/* Floating install hint for iOS */}
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">
                  Install OlogyCrew
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add to your home screen for the best experience
                </p>
                <Button
                  size="sm"
                  className="mt-2 text-xs h-7"
                  onClick={() => setShowIOSGuide(true)}
                >
                  Show Me How
                </Button>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* iOS instruction overlay */}
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
                <h3 className="font-semibold text-lg">Install OlogyCrew</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                    Tap <span className="font-medium">Add</span> to confirm
                  </span>
                </div>
              </div>
              <Button
                className="w-full mt-6"
                variant="outline"
                onClick={() => {
                  setShowIOSGuide(false);
                  handleDismiss();
                }}
              >
                Got it
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Show install banner for Chrome/Edge/etc.
  if (!canInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-lg p-2 shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">
              Install OlogyCrew
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Get quick access from your home screen
            </p>
            <Button
              size="sm"
              className="mt-2 text-xs h-7"
              onClick={handleInstall}
            >
              <Download className="h-3 w-3 mr-1" />
              Install App
            </Button>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
