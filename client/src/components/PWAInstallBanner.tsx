import { useState, useEffect } from "react";
import { usePWAInstallContext } from "@/contexts/PWAInstallContext";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PWAInstallBanner() {
  const { isInstalled, triggerInstall } = usePWAInstallContext();
  const [dismissed, setDismissed] = useState(false);

  // Check if user previously dismissed
  useEffect(() => {
    const dismissedAt = localStorage.getItem("pwa-install-dismissed-v2");
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
    localStorage.setItem("pwa-install-dismissed-v2", Date.now().toString());
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) return null;

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
              Add to your home screen for the best experience
            </p>
            <Button
              size="sm"
              className="mt-2 text-xs h-7"
              onClick={triggerInstall}
            >
              <Download className="h-3 w-3 mr-1" />
              Install App
            </Button>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
