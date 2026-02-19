import DealerManagement from "@/pages/admin/DealerManagement";

const SADealersPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dealers</h1>
        <p className="text-sm text-muted-foreground">Create, edit, and manage dealer accounts.</p>
      </div>
      <DealerManagement />
    </div>
  );
};

export default SADealersPage;
