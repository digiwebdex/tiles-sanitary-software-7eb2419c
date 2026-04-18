import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { listPortalSales, type PortalSale } from "@/services/portalService";
import { PortalListSkeleton } from "./PortalLayout";
import PortalRequestDialog from "./PortalRequestDialog";
import { Download, RefreshCw, ShoppingBag } from "lucide-react";

const fmtBDT = (n: number) =>
  `৳${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PortalOrdersPage() {
  const { context } = usePortalAuth();
  const customerId = context?.customer_id ?? "";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [onlyDue, setOnlyDue] = useState<string>("all");
  const [reorderSale, setReorderSale] = useState<PortalSale | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "sales", customerId],
    queryFn: () => listPortalSales(customerId),
    enabled: !!customerId,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      if (status !== "all" && s.sale_status !== status) return false;
      if (from && s.sale_date && s.sale_date < from) return false;
      if (to && s.sale_date && s.sale_date > to) return false;
      if (onlyDue === "due" && (s.due_amount ?? 0) <= 0) return false;
      if (onlyDue === "settled" && (s.due_amount ?? 0) > 0) return false;
      if (!q) return true;
      return (s.invoice_number ?? "").toLowerCase().includes(q);
    });
  }, [data, search, status, from, to, onlyDue]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>My Orders</CardTitle>
        <div className="flex gap-2 flex-wrap pt-2">
          <Input
            placeholder="Search invoice no…"
            className="h-8 w-[180px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={onlyDue} onValueChange={setOnlyDue}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All balances</SelectItem>
              <SelectItem value="due">With balance</SelectItem>
              <SelectItem value="settled">Fully settled</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="h-8 w-[150px]"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <Input
            type="date"
            className="h-8 w-[150px]"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PortalListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {(data ?? []).length === 0
                ? "No orders yet. Once your dealer creates an invoice, it'll appear here."
                : "No orders match the current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.invoice_number ?? s.id.slice(0, 8)}</TableCell>
                    <TableCell>{s.sale_date}</TableCell>
                    <TableCell>
                      <Badge variant={s.sale_status === "paid" ? "default" : "secondary"}>
                        {s.sale_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtBDT(s.total_amount)}</TableCell>
                    <TableCell className="text-right">{fmtBDT(s.paid_amount ?? 0)}</TableCell>
                    <TableCell className={`text-right ${(s.due_amount ?? 0) > 0 ? "text-destructive font-semibold" : ""}`}>
                      {fmtBDT(s.due_amount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="ghost" title="Download invoice">
                          <Link to={`/portal/invoice/${s.id}`}>
                            <Download className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Request reorder"
                          onClick={() => setReorderSale(s)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {reorderSale && (
        <PortalRequestDialog
          open={!!reorderSale}
          onOpenChange={(o) => !o && setReorderSale(null)}
          requestType="reorder"
          sourceSaleId={reorderSale.id}
          prefillFromSale
        />
      )}
    </Card>
  );
}
