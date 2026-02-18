import SaleList from "@/modules/sales/SaleList";

// TODO: Replace with actual dealer_id from auth context
const TEMP_DEALER_ID = "00000000-0000-0000-0000-000000000000";

const SalesPage = () => (
  <div className="container mx-auto max-w-5xl p-6">
    <SaleList dealerId={TEMP_DEALER_ID} />
  </div>
);

export default SalesPage;
