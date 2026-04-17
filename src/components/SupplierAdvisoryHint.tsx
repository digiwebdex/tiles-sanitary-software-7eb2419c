import { useQuery } from "@tanstack/react-query";
import { supplierPerformanceService } from "@/services/supplierPerformanceService";
import { formatCurrency } from "@/lib/utils";
import { ReliabilityBadge } from "@/modules/reports/SupplierPerformanceReports";
import { Clock, AlertTriangle, Wallet, Info } from "lucide-react";

interface Props {
  dealerId: string;
  supplierId: string;
}

/**
 * Compact advisory hint shown during purchase creation when a supplier
 * is selected. Read-only / advisory only — never blocks the purchase.
 */
export function SupplierAdvisoryHint({ dealerId, supplierId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["supplier-advisory", dealerId, supplierId],
    queryFn: () => supplierPerformanceService.getForSupplier(dealerId, supplierId),
    enabled: !!dealerId && !!supplierId,
    staleTime: 60_000,
  });

  if (!supplierId) return null;
  if (isLoading) return null;
  if (!data || data.total_purchases === 0) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5" />
        First purchase for this supplier — performance metrics will start tracking now.
      </div>
    );
  }

  const cadenceText =
    data.avg_days_between_purchases !== null
      ? `~${data.avg_days_between_purchases}d avg gap`
      : "first repeat purchase";

  return (
    <div className="mt-3 rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ReliabilityBadge band={data.reliability_band} />
          <span className="text-xs text-muted-foreground">
            Score <span className="font-semibold text-foreground">{data.reliability_score}</span>/100
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground italic">Advisory only · won't block purchase</span>
      </div>
      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <Hint
          icon={<Clock className="h-3 w-3" />}
          label="Cadence"
          value={cadenceText}
          sub={data.last_purchase_date ? `Last: ${data.last_purchase_date}` : undefined}
        />
        <Hint
          icon={<AlertTriangle className="h-3 w-3" />}
          label="Return Rate"
          value={`${data.return_rate_pct.toFixed(2)}%`}
          danger={data.return_rate_pct > 5}
        />
        <Hint
          icon={<Wallet className="h-3 w-3" />}
          label="Outstanding"
          value={formatCurrency(data.outstanding_amount)}
          danger={
            data.outstanding_amount > data.avg_purchase_value * 5 && data.avg_purchase_value > 0
          }
        />
        <Hint
          icon={<Clock className="h-3 w-3" />}
          label="Delayed"
          value={`${data.delayed_pct}%`}
          sub={`${data.delayed_count}/${data.delayed_count + data.on_time_count} gaps`}
          danger={data.delayed_pct > 30}
        />
      </div>
      {data.score_factors.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Score factors: {data.score_factors.join(" · ")}
        </p>
      )}
    </div>
  );
}

function Hint({
  icon,
  label,
  value,
  sub,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-sm bg-background/60 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className={`text-xs font-semibold mt-0.5 ${danger ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default SupplierAdvisoryHint;
