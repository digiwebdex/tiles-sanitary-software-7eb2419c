import SalesReturnList from "@/modules/sales-returns/SalesReturnList";

const TEMP_DEALER_ID = "00000000-0000-0000-0000-000000000000";

const SalesReturnsPage = () => (
  <div className="container mx-auto max-w-5xl p-6">
    <SalesReturnList dealerId={TEMP_DEALER_ID} />
  </div>
);

export default SalesReturnsPage;
