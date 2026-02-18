import PurchaseList from "@/modules/purchases/PurchaseList";

// TODO: Replace with actual dealer_id from auth context
const TEMP_DEALER_ID = "00000000-0000-0000-0000-000000000000";

const PurchasesPage = () => (
  <div className="container mx-auto max-w-5xl p-6">
    <PurchaseList dealerId={TEMP_DEALER_ID} />
  </div>
);

export default PurchasesPage;
