import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, CreditCard, CalendarPlus } from "lucide-react";

const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: any; description?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

const SADashboardPage = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["sa-dashboard-stats"],
    queryFn: async () => {
      const [dealersRes, usersRes, plansRes, subsRes] = await Promise.all([
        supabase.from("dealers").select("id, status", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }).not("dealer_id", "is", null),
        supabase.from("plans").select("id", { count: "exact" }),
        supabase.from("subscriptions").select("id, status", { count: "exact" }),
      ]);

      const activeSubs = subsRes.data?.filter((s: any) => s.status === "active").length ?? 0;
      const activeDealers = dealersRes.data?.filter((d: any) => d.status === "active" || !d.status).length ?? 0;

      return {
        totalDealers: dealersRes.count ?? 0,
        activeDealers,
        totalUsers: usersRes.count ?? 0,
        totalPlans: plansRes.count ?? 0,
        totalSubs: subsRes.count ?? 0,
        activeSubs,
      };
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading dashboard…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your SaaS ERP platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Dealers" value={stats?.totalDealers ?? 0} icon={Store} description={`${stats?.activeDealers ?? 0} active`} />
        <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} description="Across all dealers" />
        <StatCard title="Plans" value={stats?.totalPlans ?? 0} icon={CreditCard} />
        <StatCard title="Subscriptions" value={stats?.totalSubs ?? 0} icon={CalendarPlus} description={`${stats?.activeSubs ?? 0} active`} />
      </div>
    </div>
  );
};

export default SADashboardPage;
