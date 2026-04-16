import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tags, AlertTriangle, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { pricingTierReportService } from "@/services/pricingTierReportService";

interface Props { dealerId: string }

export function PricingTierDashboardWidgets({ dealerId }: Props) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["pricing-tier-dashboard", dealerId],
    queryFn: () => pricingTierReportService.dashboardStats(dealerId),
    refetchInterval: 120_000,
  });

  if (!data) return null;
  const topTiers = data.salesByTier.slice(0, 3);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-0.5">Pricing Tiers</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/settings/pricing-tiers")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Top Tier (30d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-base font-bold text-foreground truncate">{topTiers[0]?.tier_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{topTiers[0] ? formatCurrency(topTiers[0].total_sales) : "No sales"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Manual Overrides (7d)</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.overrideCount7d > 0 ? "text-warning" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">{data.overrideCount7d}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.overrideCount30d} in last 30d</p>
          </CardContent>
        </Card>

        <Card className={data.overrideImpact30d < 0 ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Override Impact (30d)</CardTitle>
            <Tags className={`h-4 w-4 ${data.overrideImpact30d < 0 ? "text-destructive" : "text-primary"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-lg font-bold ${data.overrideImpact30d < 0 ? "text-destructive" : "text-foreground"}`}>
              {data.overrideImpact30d >= 0 ? "+" : ""}{formatCurrency(data.overrideImpact30d)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">vs resolved rate</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate("/customers")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Customers w/o Tier</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-foreground">{data.customersWithoutTier}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Using default rates</p>
          </CardContent>
        </Card>
      </div>

      {topTiers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Top Tiers by Revenue (30d)
              <Badge variant="secondary" className="text-xs">{topTiers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topTiers.map((t) => (
                <div key={t.tier_id ?? "none"} className="flex items-center justify-between text-sm rounded px-2 py-1.5 hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Tags className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{t.tier_name}</span>
                    <span className="text-xs text-muted-foreground">· {t.invoice_count} invoice{t.invoice_count === 1 ? "" : "s"}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(t.total_sales)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
