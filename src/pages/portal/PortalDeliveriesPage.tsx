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
import { listPortalDeliveries } from "@/services/portalService";
import { PortalListSkeleton } from "./PortalLayout";
import { Download, MessageCircle, Truck } from "lucide-react";

export default function PortalDeliveriesPage() {
  const { context } = usePortalAuth();
  const customerId = context?.customer_id ?? "";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "deliveries", customerId],
    queryFn: () => listPortalDeliveries(customerId),
    enabled: !!customerId,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((d) => {
      if (status !== "all" && (d.status ?? "pending") !== status) return false;
      if (from && d.delivery_date && d.delivery_date < from) return false;
      if (to && d.delivery_date && d.delivery_date > to) return false;
      if (!q) return true;
      return (
        (d.delivery_no ?? "").toLowerCase().includes(q) ||
        (d.invoice_number ?? "").toLowerCase().includes(q) ||
        (d.receiver_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, status, from, to]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>My Deliveries</CardTitle>
        <div className="flex gap-2 flex-wrap pt-2">
          <Input
            placeholder="Search delivery / invoice / receiver…"
            className="h-8 w-[240px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_transit">In transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
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
            <Truck className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {(data ?? []).length === 0
                ? "No deliveries yet. Updates will appear here when your dealer dispatches items."
                : "No deliveries match the current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery No.</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.delivery_no ?? d.id.slice(0, 8)}</TableCell>
                    <TableCell>{d.invoice_number ?? "—"}</TableCell>
                    <TableCell>{d.delivery_date}</TableCell>
                    <TableCell>{d.receiver_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={d.status === "delivered" ? "default" : "secondary"}>
                          {d.status ?? "pending"}
                        </Badge>
                        {d.status === "delivered" && (
                          <span title="Delivery update sent">
                            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {d.challan_id && (
                          <Button asChild size="sm" variant="ghost" title="Download challan">
                            <Link to={`/portal/challan/${d.challan_id}`}>
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {d.sale_id && (
                          <Button asChild size="sm" variant="ghost" title="Download invoice">
                            <Link to={`/portal/invoice/${d.sale_id}`}>
                              <Download className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
