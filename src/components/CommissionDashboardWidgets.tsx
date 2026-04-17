import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, HandCoins, CheckCircle2, Award } from "lucide-react";
import { saleCommissionService } from "@/services/commissionService";
import { formatCurrency } from "@/lib/utils";

interface Props {
  dealerId: string;
}

/**
 * Dashboard widgets for commission liability — surfaces the
 * "what do I owe / what did I just pay" view for owner/admin.
 *
 * Renders nothing if the dealer has no commission activity at all.
 */
export function CommissionDashboardWidgets({ dealerId }: Props) {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["commission-dashboard", dealerId],
    queryFn: () => saleCommissionService.getDashboardStats(dealerId),
    enabled: !!dealerId,
    refetchInterval: 60_000,
  });

  if (!stats) return null;
  const hasActivity =
    stats.unpaidLiability > 0 ||
    stats.settledThisMonth > 0 ||
    stats.totalReferralSources > 0;
  if (!hasActivity) return null;

  const goReports = () =>
    navigate("/reports", { state: { tab: "commission-liability" } });

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
        Commission & Referrals
      </h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors border-amber-300/50"
          onClick={goReports}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Unpaid Liability
            </CardTitle>
            <HandCoins className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-amber-700">
              {formatCurrency(stats.unpaidLiability)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pending + earned (not yet settled)
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors border-blue-300/50"
          onClick={goReports}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Payable Now
            </CardTitle>
            <Banknote className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-blue-600">
              {formatCurrency(stats.payableNow)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Earned — fully delivered sales
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors border-emerald-300/50"
          onClick={goReports}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Settled This Month
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-emerald-700">
              {formatCurrency(stats.settledThisMonth)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recorded as cash-ledger expense
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={goReports}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Top Unpaid Referrer
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {stats.topSource ? (
              <>
                <p className="text-base font-bold truncate">{stats.topSource.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {stats.topSource.source_type}
                  </Badge>
                  <span className="text-xs font-semibold text-amber-700">
                    {formatCurrency(stats.topSource.amount)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No unpaid referrers</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CommissionDashboardWidgets;
