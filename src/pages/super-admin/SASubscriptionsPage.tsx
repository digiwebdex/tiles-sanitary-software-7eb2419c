import SubscriptionManagement from "@/pages/admin/SubscriptionManagement";

const SASubscriptionsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">Assign plans, activate, and extend subscriptions.</p>
      </div>
      <SubscriptionManagement />
    </div>
  );
};

export default SASubscriptionsPage;
