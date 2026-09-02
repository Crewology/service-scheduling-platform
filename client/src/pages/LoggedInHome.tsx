import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { useViewMode } from "@/contexts/ViewModeContext";
import { trpc } from "@/lib/trpc";
import CustomerWorkspaceHome from "@/pages/CustomerWorkspaceHome";
import ProviderWorkspaceOverview from "@/pages/ProviderWorkspaceOverview";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LoggedInHome() {
  const { user } = useAuth();
  const { isProviderView, isAdmin } = useViewMode();
  const [, setLocation] = useLocation();

  const { data: onboardingStatus, isLoading: onboardingLoading } = trpc.provider.getOnboardingStatus.useQuery(undefined, {
    enabled: isProviderView && user?.role === "provider" && !isAdmin,
  });

  useEffect(() => {
    if (isProviderView && user?.role === "provider" && !isAdmin && onboardingStatus && !onboardingStatus.steps1to4Complete) {
      setLocation("/provider/onboarding");
    }
  }, [isProviderView, user?.role, isAdmin, onboardingStatus, setLocation]);

  const clearPendingPlan = trpc.auth.clearPendingPlan.useMutation();
  const customerStartTrial = trpc.customerSubscription.startTrial.useMutation({
    onSuccess: () => {
      localStorage.removeItem("ologycrew_selected_plan");
      try { clearPendingPlan.mutate(); } catch {}
    },
  });

  useEffect(() => {
    if (!user || user.role === "provider" || isAdmin) return;
    const pendingTier = (user as any).pendingPlanTier;
    const pendingAudience = (user as any).pendingPlanAudience;
    if (pendingTier && pendingAudience === "customer") {
      if (pendingTier === "pro" || pendingTier === "business") {
        customerStartTrial.mutate({ tier: pendingTier });
      } else {
        clearPendingPlan.mutate();
        localStorage.removeItem("ologycrew_selected_plan");
      }
      return;
    }

    const stored = localStorage.getItem("ologycrew_selected_plan");
    if (!stored) return;
    try {
      const plan = JSON.parse(stored);
      if (plan.audience === "customer" && (plan.tier === "pro" || plan.tier === "business")) {
        customerStartTrial.mutate({ tier: plan.tier });
      } else {
        localStorage.removeItem("ologycrew_selected_plan");
      }
    } catch {
      localStorage.removeItem("ologycrew_selected_plan");
    }
  }, [user]);

  if (isProviderView && user?.role === "provider" && !isAdmin && onboardingLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <NavHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (isProviderView && user?.role === "provider" && !isAdmin && onboardingStatus && !onboardingStatus.steps1to4Complete) {
    return null;
  }

  if (isProviderView) {
    return (
      <div className="min-h-screen bg-[#f7faff]">
        <NavHeader />
        <ProviderWorkspaceOverview />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faff]">
      <NavHeader />
      <CustomerWorkspaceHome />
    </div>
  );
}
