import { useAuth } from "@/contexts/AuthContext";
import OwnerDashboard from "@/modules/dashboard/OwnerDashboard";

const Index = () => {
  const { profile } = useAuth();
  const dealerId = profile?.dealer_id;

  if (!dealerId) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <p className="text-muted-foreground">No dealer assigned to your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <OwnerDashboard dealerId={dealerId} />
    </div>
  );
};

export default Index;
