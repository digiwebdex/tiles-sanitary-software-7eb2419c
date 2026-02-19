import DealerUsersOverview from "@/pages/admin/DealerUsersOverview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SASystemPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System</h1>
        <p className="text-sm text-muted-foreground">System overview and user management.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Platform</span>
            <Badge variant="outline">SaaS ERP</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Environment</span>
            <Badge variant={import.meta.env.PROD ? "default" : "secondary"}>
              {import.meta.env.PROD ? "Production" : "Development"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <DealerUsersOverview />
    </div>
  );
};

export default SASystemPage;
