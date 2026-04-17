import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_COLORS,
  type FulfillmentStatus,
} from "@/services/backorderAllocationService";

interface FulfillmentBadgeProps {
  status: string | null | undefined;
  className?: string;
  /** Compact mode hides border for inline use. */
  compact?: boolean;
}

/**
 * Centralized badge for sale_item fulfillment status.
 * Always use this component instead of redefining labels/colors per page,
 * so status visibility stays consistent across sales, deliveries, reports.
 */
export function FulfillmentBadge({ status, className, compact }: FulfillmentBadgeProps) {
  const key = (status ?? "in_stock") as FulfillmentStatus;
  const label = FULFILLMENT_STATUS_LABELS[key] ?? key;
  const colorClass = FULFILLMENT_STATUS_COLORS[key] ?? "";
  return (
    <Badge
      variant={compact ? "secondary" : "outline"}
      className={cn("text-[10px] font-medium", colorClass, className)}
    >
      {label}
    </Badge>
  );
}

export default FulfillmentBadge;
