import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { IndianRupee } from "lucide-react";

const SARevenuePage = () => {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["sa-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, dealers(name), plans(name, price_monthly, price_yearly)")
        .order("start_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const totalMonthly = subscriptions
    .filter((s: any) => s.status === "active")
    .reduce((sum: number, s: any) => sum + (Number(s.plans?.price_monthly) || 0), 0);

  const totalYearly = subscriptions
    .filter((s: any) => s.status === "active")
    .reduce((sum: number, s: any) => sum + (Number(s.plans?.price_yearly) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revenue</h1>
        <p className="text-sm text-muted-foreground">Revenue overview based on active subscriptions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue (MRR)</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{totalMonthly.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground mt-1">From {subscriptions.filter((s: any) => s.status === "active").length} active subscriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Annual Revenue (ARR)</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">₹{totalYearly.toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Yearly</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No subscriptions</TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.dealers?.name ?? "—"}</TableCell>
                        <TableCell>{sub.plans?.name ?? "—"}</TableCell>
                        <TableCell>₹{Number(sub.plans?.price_monthly ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>₹{Number(sub.plans?.price_yearly ?? 0).toLocaleString("en-IN")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={sub.status === "active" ? "default" : sub.status === "expired" ? "destructive" : "secondary"}
                            className="capitalize text-xs"
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SARevenuePage;
