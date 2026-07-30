import { useViewMode } from "@/contexts/ViewModeContext";
import { NavHeader } from "@/components/shared/NavHeader";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import type { ReactNode } from "react";

interface ProviderOnlyGuardProps {
  children: ReactNode;
  featureName?: string;
}

/**
 * Wraps provider-only pages. When the user is in Customer view,
 * shows a friendly message instead of the page content.
 */
export function ProviderOnlyGuard({ children, featureName = "This feature" }: ProviderOnlyGuardProps) {
  const { isProviderView } = useViewMode();
  const [, setLocation] = useLocation();

  if (!isProviderView) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container max-w-lg py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Provider View Only</h2>
          <p className="text-muted-foreground mb-6">
            {featureName} is only available when viewing as a Provider.
            Switch to Provider mode from the top menu to access this page.
          </p>
          <Button onClick={() => setLocation("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
