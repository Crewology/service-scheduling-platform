import { Badge } from "@/components/ui/badge";

type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

interface StatusBadgeProps {
  status: BookingStatus;
}

const statusConfig: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

/**
 * Consistent status badge component
 * Used across booking lists, detail pages, and dashboards
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
