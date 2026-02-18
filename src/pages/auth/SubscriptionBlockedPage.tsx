import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, ShieldOff, Clock } from "lucide-react";

const SubscriptionBlockedPage = () => {
  const { accessLevel, subscription, signOut } = useAuth();

  const isGrace = accessLevel === "grace";
  const isReadonly = accessLevel === "readonly";

  let graceRemaining = "";
  if (isGrace && subscription?.end_date) {
    const graceEnd = new Date(subscription.end_date);
    graceEnd.setDate(graceEnd.getDate() + 3);
    const diffMs = graceEnd.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    graceRemaining = `${diffDays} day${diffDays !== 1 ? "s" : ""} remaining`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {isReadonly ? (
            <ShieldOff className="mx-auto h-12 w-12 text-destructive mb-2" />
          ) : isGrace ? (
            <Clock className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
          ) : (
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-2" />
          )}
          <CardTitle className="text-xl">
            {isReadonly
              ? "Read-Only Mode"
              : isGrace
              ? "Subscription Expired — Grace Period"
              : "Subscription Required"}
          </CardTitle>
          <CardDescription>
            {isReadonly
              ? "Your grace period has ended. You can only view the Dashboard and Reports."
              : isGrace
              ? "Your subscription has expired. You have limited time to renew."
              : "Your subscription is inactive. Please contact your administrator to renew."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGrace && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-400">
              <Clock className="mr-1 h-3 w-3" /> {graceRemaining}
            </Badge>
          )}

          <p className="text-sm text-muted-foreground">
            Contact your dealer admin or super admin to renew the subscription.
          </p>

          <Button variant="outline" onClick={signOut} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionBlockedPage;
