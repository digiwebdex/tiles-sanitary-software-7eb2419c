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
import { listPortalQuotations } from "@/services/portalService";
import { PortalListSkeleton } from "./PortalLayout";
import PortalRequestDialog from "./PortalRequestDialog";
import { Download, FileText, Plus } from "lucide-react";

const fmtBDT = (n: number) =>
  `৳${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface QuotationRow {
  id: string;
  quotation_no: string;
  revision_no: number;
  quote_date: string;
  valid_until: string;
  status: string;
  total_amount: number;
}

export default function PortalQuotationsPage() {
  const { context } = usePortalAuth();
  const customerId = context?.customer_id ?? "";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [requestOpen, setRequestOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["portal", "quotations", customerId],
    queryFn: () => listPortalQuotations(customerId),
    enabled: !!customerId,
  });

  const filtered = useMemo<QuotationRow[]>(() => {
    const rows = (data ?? []) as QuotationRow[];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (from && r.quote_date && r.quote_date < from) return false;
      if (to && r.quote_date && r.quote_date > to) return false;
      if (!q) return true;
      return (r.quotation_no ?? "").toLowerCase().includes(q);
    });
  }, [data, search, status, from, to]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>My Quotations</CardTitle>
          <Button size="sm" onClick={() => setRequestOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Request quote
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap pt-2">
          <Input
            placeholder="Search quotation no…"
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
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
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {(data ?? []).length === 0
                ? "No quotations yet. Request a quote and your dealer will share one."
                : "No quotations match the current filters."}
            </p>
            {(data ?? []).length === 0 && (
              <Button variant="outline" size="sm" onClick={() => setRequestOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Request a quote
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">
                      {q.quotation_no}
                      {q.revision_no > 1 && (
                        <span className="text-xs text-muted-foreground"> · rev {q.revision_no}</span>
                      )}
                    </TableCell>
                    <TableCell>{q.quote_date}</TableCell>
                    <TableCell>{q.valid_until}</TableCell>
                    <TableCell>
                      <Badge variant={q.status === "active" ? "default" : "secondary"}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtBDT(q.total_amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost" title="Download quotation">
                        <Link to={`/portal/quotation/${q.id}`}>
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <PortalRequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        requestType="quote"
      />
    </Card>
  );
}
