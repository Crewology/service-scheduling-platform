import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export function TermsUpdateBanner() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const markedNotice = useRef<number | null>(null);
  const utils = trpc.useUtils();
  const { data } = trpc.terms.pendingNotice.useQuery(undefined, { enabled: isAuthenticated });
  const markShown = trpc.terms.markShown.useMutation();
  const acknowledge = trpc.terms.acknowledge.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.terms.pendingNotice.invalidate(),
        utils.notification.unreadCount.invalidate(),
        utils.notification.list.invalidate(),
      ]);
      toast.success("Terms update acknowledged");
    },
    onError: (error) => toast.error("Could not acknowledge the Terms update", { description: error.message }),
  });

  useEffect(() => {
    if (!data || markedNotice.current === data.noticeId) return;
    markedNotice.current = data.noticeId;
    markShown.mutate({ noticeId: data.noticeId });
  }, [data?.noticeId]);

  if (!data || location.startsWith("/login") || location.startsWith("/signup")) return null;

  const effectiveDate = new Date(data.version.effectiveAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const termsHref = `/terms?version=${encodeURIComponent(data.version.version)}`;

  return (
    <div className="relative z-50 border-b border-blue-200 bg-[#eaf5fb] text-[#123f63]" role="status" aria-label="Terms of Use update">
      <div className="container flex max-w-7xl flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
          <p className="text-xs leading-5 sm:text-sm"><strong>Our Terms of Use are changing.</strong> Review version {data.version.version} before it takes effect on {effectiveDate}.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-6 sm:pl-0">
          <Button asChild variant="outline" size="sm" className="h-8 border-blue-300 bg-white text-[#123f63] hover:bg-blue-50"><Link href={termsHref}>Review Terms</Link></Button>
          {data.version.acceptanceMode === "notice" ? <Button size="sm" className="h-8 bg-[#176f9e] hover:bg-[#125f89]" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate({ noticeId: data.noticeId })}>{acknowledge.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}Acknowledge</Button> : null}
        </div>
      </div>
    </div>
  );
}
