import PlanManagement from "@/pages/admin/PlanManagement";

const SAPlansPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plans</h1>
        <p className="text-sm text-muted-foreground">Manage subscription plans and pricing.</p>
      </div>
      <PlanManagement />
    </div>
  );
};

export default SAPlansPage;
