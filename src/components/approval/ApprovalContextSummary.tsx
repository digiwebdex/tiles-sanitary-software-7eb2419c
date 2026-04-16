import { formatCurrency } from "@/lib/utils";
import type { ApprovalContextData } from "@/services/approvalService";

interface Props {
  context: ApprovalContextData;
  compact?: boolean;
}

/**
 * Renders an approval request's context as a readable summary.
 * Shared by ApprovalRequestDialog (requester) and ApprovalDecisionDialog (approver).
 */
export function ApprovalContextSummary({ context, compact }: Props) {
  const rows: { label: string; value: React.ReactNode }[] = [];

  if (context.customer_name) rows.push({ label: "Customer", value: context.customer_name });

  if (context.shortage_qty != null)
    rows.push({ label: "Stock Shortage", value: `${context.shortage_qty} units` });

  if (context.mixed_shades?.length)
    rows.push({ label: "Mixed Shades", value: context.mixed_shades.join(", ") });

  if (context.mixed_calibers?.length)
    rows.push({ label: "Mixed Calibers", value: context.mixed_calibers.join(", ") });

  if (context.discount_pct != null)
    rows.push({ label: "Discount", value: `${context.discount_pct}%` });

  if (context.discount_amount != null)
    rows.push({ label: "Discount Amount", value: formatCurrency(context.discount_amount) });

  // Pricing-tier override details
  if (context.original_resolved_rate != null && context.final_rate != null) {
    rows.push({ label: "Original Resolved Rate", value: formatCurrency(context.original_resolved_rate) });
    rows.push({ label: "Final Entered Rate", value: formatCurrency(context.final_rate) });
    const diff = Number(context.final_rate) - Number(context.original_resolved_rate);
    const diffPct =
      Number(context.original_resolved_rate) > 0
        ? (diff / Number(context.original_resolved_rate)) * 100
        : 0;
    rows.push({
      label: "Variance",
      value: (
        <span className={diff < 0 ? "text-destructive" : "text-primary"}>
          {diff >= 0 ? "+" : ""}
          {formatCurrency(diff)} ({diffPct >= 0 ? "+" : ""}
          {diffPct.toFixed(2)}%)
        </span>
      ),
    });
  }

  if (context.rate_source_before)
    rows.push({ label: "Rate Source (before)", value: String(context.rate_source_before) });

  if (context.tier_name)
    rows.push({ label: "Tier", value: String(context.tier_name) });

  if (context.outstanding != null && context.credit_limit != null)
    rows.push({
      label: "Credit Status",
      value: (
        <span>
          Outstanding {formatCurrency(context.outstanding)} / Limit{" "}
          {formatCurrency(context.credit_limit)}
        </span>
      ),
    });

  if (context.overdue_days != null)
    rows.push({ label: "Overdue Days", value: `${context.overdue_days} days` });

  if (context.adjustment_type)
    rows.push({ label: "Adjustment", value: `${context.adjustment_type} ${context.adjustment_qty ?? ""}` });

  if (context.product_name)
    rows.push({ label: "Product", value: context.product_name });

  if (context.sale_invoice_no)
    rows.push({ label: "Invoice", value: context.sale_invoice_no });

  if (context.sale_total != null)
    rows.push({ label: "Sale Total", value: formatCurrency(context.sale_total) });

  return (
    <div className={`rounded-md bg-muted/50 p-3 text-sm space-y-1 ${compact ? "text-xs" : ""}`}>
      {rows.map((r, i) => (
        <p key={i}>
          <span className="font-medium">{r.label}:</span>{" "}
          <span className="text-muted-foreground">{r.value}</span>
        </p>
      ))}

      {context.items && context.items.length > 0 && (
        <div className="pt-1">
          <span className="font-medium">Items:</span>
          <ul className="list-disc list-inside ml-2 mt-0.5">
            {context.items.map((item, i) => (
              <li key={i} className="text-muted-foreground">
                {item.product_name ?? item.product_id}: {item.quantity} units
                {item.sale_rate ? ` @ ${formatCurrency(item.sale_rate)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
