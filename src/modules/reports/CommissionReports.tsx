import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  saleCommissionService,
  referralSourceService,
  type SaleCommission,
  type CommissionStatus,
  type ReferralSourceType,
} from "@/services/commissionService";
import { formatCurrency } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Banknote, Download, CheckCircle2, XCircle } from "lucide-react";

type Row = SaleCommission & {
  sales?: {
    id: string;
    invoice_number: string | null;
    sale_date: string;
    sale_status: string;
    customers?: { id: string; name: string } | null;
  } | null;
};

const STATUS_BADGE: Record<CommissionStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  earned: "bg-blue-100 text-blue-800 border-blue-300",
  settled: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
  adjusted: "bg-purple-100 text-purple-800 border-purple-300",
};

const SOURCE_TYPES: { value: ReferralSourceType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "salesman", label: "Salesman" },
  { value: "architect", label: "Architect" },
  { value: "contractor", label: "Contractor" },
  { value: "mason", label: "Mason" },
  { value: "fitter", label: "Fitter" },
  { value: "other", label: "Other" },
];

interface Props {
  dealerId: string;
}

/**
 * Unified Commission Report.
 * Owner/admin can:
 *  - filter by status, source type, date range
 *  - export to excel
 *  - settle an "earned" commission (records cash_ledger expense + audit)
 *  - cancel a non-settled commission
 */
export function CommissionLiabilityReport({ dealerId }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions();

  const [status, setStatus] = useState<CommissionStatus | "all">("earned");
  const [sourceType, setSourceType] = useState<ReferralSourceType | "all">("all");
  const [referralId, setReferralId] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [settleOpen, setSettleOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<Row | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");

  const { data: refSources = [] } = useQuery({
    queryKey: ["referral-sources-for-report", dealerId],
    queryFn: () => referralSourceService.list(dealerId),
    enabled: !!dealerId,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["commission-list", dealerId, status, sourceType, referralId, from, to],
    queryFn: () =>
      saleCommissionService.list(dealerId, {
        status,
        sourceType: sourceType === "all" ? undefined : sourceType,
        referralSourceId: referralId === "all" ? undefined : referralId,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      }) as Promise<Row[]>,
    enabled: !!dealerId,
  });

  const totals = rows.reduce(
    (acc, r) => {
      const calc = Number(r.calculated_commission_amount) || 0;
      const settled = Number(r.settled_amount) || 0;
      acc.gross += calc;
      if (r.status === "settled") acc.settled += settled;
      if (r.status === "pending" || r.status === "earned") acc.unpaid += calc;
      if (r.status === "earned") acc.payable += calc;
      return acc;
    },
    { gross: 0, settled: 0, unpaid: 0, payable: 0 },
  );

  const settleMut = useMutation({
    mutationFn: (input: { id: string; amount: number; note: string }) =>
      saleCommissionService.settle({
        commission_id: input.id,
        dealer_id: dealerId,
        settled_amount: input.amount,
        settled_by: user?.id ?? null,
        note: input.note || null,
      }),
    onSuccess: () => {
      toast.success("Commission settled and recorded in cash ledger");
      queryClient.invalidateQueries({ queryKey: ["commission-list"] });
      queryClient.invalidateQueries({ queryKey: ["commission-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sale-commission"] });
      setSettleOpen(false);
      setActiveRow(null);
      setSettleAmount("");
      setSettleNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) =>
      saleCommissionService.cancel(id, dealerId, "Cancelled from report"),
    onSuccess: () => {
      toast.success("Commission cancelled");
      queryClient.invalidateQueries({ queryKey: ["commission-list"] });
      queryClient.invalidateQueries({ queryKey: ["commission-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSettleOpen = (row: Row) => {
    setActiveRow(row);
    setSettleAmount(String(Number(row.calculated_commission_amount) || 0));
    setSettleNote("");
    setSettleOpen(true);
  };

  const handleExport = () => {
    if (rows.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    exportToExcel(
      rows.map((r) => ({
        Date: r.sales?.sale_date ?? r.created_at.slice(0, 10),
        Invoice: r.sales?.invoice_number ?? "—",
        Customer: r.sales?.customers?.name ?? "—",
        Referrer: r.referral_sources?.name ?? "—",
        Type: r.referral_sources?.source_type ?? "—",
        "Commission Type": r.commission_type === "percent"
          ? `${r.commission_value}%`
          : "Fixed",
        "Base Amount": Number(r.commission_base_amount),
        Commission: Number(r.calculated_commission_amount),
        Status: r.status,
        Settled: Number(r.settled_amount) || 0,
        "Settled At": r.settled_at ? r.settled_at.slice(0, 10) : "",
      })),
      `commissions-${status}-${new Date().toISOString().slice(0, 10)}`,
    );
  };

  if (!permissions.canViewFinancialDashboard) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          You do not have permission to view commission reports.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Total in view</p>
            <p className="text-lg font-bold">{formatCurrency(totals.gross)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-300/50">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Payable now (earned)</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.payable)}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-300/50">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Unpaid liability</p>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totals.unpaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-300/50">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Settled (in view)</p>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totals.settled)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              Commission Report
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending (awaiting delivery)</SelectItem>
                  <SelectItem value="earned">Earned (payable)</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Source type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Referrer</Label>
              <Select value={referralId} onValueChange={setReferralId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All referrers</SelectItem>
                  {refSources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No commissions match the current filters.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.sales?.sale_date ?? r.created_at.slice(0, 10)}</TableCell>
                    <TableCell
                      className="font-mono text-xs cursor-pointer hover:underline text-primary"
                      onClick={() => r.sales?.id && navigate(`/sales/${r.sales.id}/invoice`)}
                    >
                      {r.sales?.invoice_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">{r.sales?.customers?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{r.referral_sources?.name ?? "—"}</div>
                      {r.referral_sources?.source_type && (
                        <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">
                          {r.referral_sources.source_type}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.commission_type === "percent" ? `${r.commission_value}%` : "Fixed"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrency(Number(r.commission_base_amount))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {formatCurrency(Number(r.calculated_commission_amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </Badge>
                      {r.status === "settled" && r.settled_at && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {r.settled_at.slice(0, 10)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "earned" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSettleOpen(r)}
                          className="h-7 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark Settled
                        </Button>
                      )}
                      {(r.status === "pending" || r.status === "earned") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Cancel this commission?")) cancelMut.mutate(r.id);
                          }}
                          className="h-7 text-xs ml-1 text-muted-foreground hover:text-destructive"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Settle dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Commission Settled</DialogTitle>
          </DialogHeader>
          {activeRow && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-xs">
                <div><span className="text-muted-foreground">Referrer: </span><span className="font-medium">{activeRow.referral_sources?.name}</span></div>
                <div><span className="text-muted-foreground">Invoice: </span><span className="font-mono">{activeRow.sales?.invoice_number ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Calculated: </span><span className="font-semibold">{formatCurrency(Number(activeRow.calculated_commission_amount))}</span></div>
              </div>
              <div>
                <Label className="text-xs">Settled amount (BDT)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Recorded as a cash-ledger expense referencing this commission.
                </p>
              </div>
              <div>
                <Label className="text-xs">Note (optional)</Label>
                <Textarea
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  rows={2}
                  placeholder="e.g. paid in cash, receipt #123"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                activeRow &&
                settleMut.mutate({
                  id: activeRow.id,
                  amount: Number(settleAmount),
                  note: settleNote,
                })
              }
              disabled={settleMut.isPending || !settleAmount}
            >
              {settleMut.isPending ? "Settling…" : "Confirm & Record Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Compact "by source" rollup — sums unsettled commission per referrer. */
export function CommissionBySourceReport({ dealerId }: Props) {
  const { data: rows = [] } = useQuery({
    queryKey: ["commission-by-source", dealerId],
    queryFn: () => saleCommissionService.list(dealerId),
    enabled: !!dealerId,
  });

  const grouped = new Map<
    string,
    {
      name: string;
      type: string;
      pending: number;
      earned: number;
      settled: number;
      saleCount: number;
    }
  >();
  for (const r of rows as Row[]) {
    const id = r.referral_source_id;
    const cur = grouped.get(id) ?? {
      name: r.referral_sources?.name ?? "—",
      type: r.referral_sources?.source_type ?? "—",
      pending: 0,
      earned: 0,
      settled: 0,
      saleCount: 0,
    };
    const calc = Number(r.calculated_commission_amount) || 0;
    if (r.status === "pending") cur.pending += calc;
    else if (r.status === "earned") cur.earned += calc;
    else if (r.status === "settled") cur.settled += Number(r.settled_amount) || 0;
    cur.saleCount += 1;
    grouped.set(id, cur);
  }

  const list = [...grouped.values()].sort(
    (a, b) => b.earned + b.pending - (a.earned + a.pending),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Commission by Referral Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="text-right">Settled</TableHead>
                <TableHead className="text-right">Unpaid Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No commissions recorded yet.</TableCell></TableRow>
              ) : list.map((g, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-xs">{g.name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{g.type}</Badge></TableCell>
                  <TableCell className="text-right text-xs">{g.saleCount}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-amber-700">{formatCurrency(g.pending)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-blue-700">{formatCurrency(g.earned)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-emerald-700">{formatCurrency(g.settled)}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(g.pending + g.earned)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
