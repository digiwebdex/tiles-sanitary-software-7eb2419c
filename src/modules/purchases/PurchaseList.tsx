import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { purchaseService } from "@/services/purchaseService";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye } from "lucide-react";

interface PurchaseListProps {
  dealerId: string;
}

const PurchaseList = ({ dealerId }: PurchaseListProps) => {
  const navigate = useNavigate();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases", dealerId],
    queryFn: () => purchaseService.list(dealerId),
    enabled: !!dealerId,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
        <Button onClick={() => navigate("/purchases/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Purchase
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : purchases.length === 0 ? (
        <p className="text-muted-foreground">No purchases found.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{p.purchase_date}</TableCell>
                  <TableCell>{p.invoice_number || "—"}</TableCell>
                  <TableCell>{p.suppliers?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">₹{Number(p.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => navigate(`/purchases/${p.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default PurchaseList;
