import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";
import { pricingTierReportService } from "@/services/pricingTierReportService";

interface Props { dealerId: string }

const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export function PriceTierListReport({ dealerId }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report-tier-list", dealerId],
    queryFn: () => pricingTierReportService.tierList(dealerId),
  });
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Price Tier List</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(
          rows.map((r) => ({ tier: r.tier_name, status: r.status, products: r.product_count, customers: r.customer_count })),
          [
            { header: "Tier", key: "tier" },
            { header: "Status", key: "status" },
            { header: "Products", key: "products" },
            { header: "Customers", key: "customers" },
          ],
          "price-tier-list",
        )}><Download className="h-4 w-4 mr-1" />Export</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Products with Tier Rate</TableHead>
                <TableHead className="text-right">Customers Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No tiers yet</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.tier_id}>
                  <TableCell className="font-medium">{r.tier_name}{r.is_default && <Badge variant="outline" className="ml-2 text-[10px]">Default</Badge>}</TableCell>
                  <TableCell><Badge variant={r.status === "active" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{r.product_count}</TableCell>
                  <TableCell className="text-right">{r.customer_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomersByTierReport({ dealerId }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report-customers-by-tier", dealerId],
    queryFn: () => pricingTierReportService.customersByTier(dealerId),
  });
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Customers by Tier</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(
          rows.map((r) => ({ customer: r.customer_name, type: r.customer_type, tier: r.tier_name ?? "—", sales: r.total_sales, quoted: r.total_quoted })),
          [
            { header: "Customer", key: "customer" },
            { header: "Type", key: "type" },
            { header: "Tier", key: "tier" },
            { header: "Total Sales", key: "sales", format: "currency" },
            { header: "Total Quoted", key: "quoted", format: "currency" },
          ],
          "customers-by-tier",
        )}><Download className="h-4 w-4 mr-1" />Export</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead><TableHead>Type</TableHead><TableHead>Tier</TableHead>
              <TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Quoted</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No customers</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.customer_id}>
                  <TableCell className="font-medium">{r.customer_name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{r.customer_type}</Badge></TableCell>
                  <TableCell>{r.tier_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.total_sales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.total_quoted)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesByTierReport({ dealerId }: Props) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report-sales-by-tier", dealerId, from, to],
    queryFn: () => pricingTierReportService.salesByTier(dealerId, from, to),
  });
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Sales by Tier</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(
          rows.map((r) => ({ tier: r.tier_name, invoices: r.invoice_count, sales: r.total_sales, avg: r.avg_ticket })),
          [
            { header: "Tier", key: "tier" },
            { header: "Invoices", key: "invoices" },
            { header: "Total Sales", key: "sales", format: "currency" },
            { header: "Avg Ticket", key: "avg", format: "currency" },
          ],
          "sales-by-tier",
        )}><Download className="h-4 w-4 mr-1" />Export</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tier</TableHead><TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Total Sales</TableHead><TableHead className="text-right">Avg Ticket</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No sales in period</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.tier_id ?? "none"}>
                  <TableCell className="font-medium">{r.tier_name}</TableCell>
                  <TableCell className="text-right">{r.invoice_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.total_sales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.avg_ticket)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function QuotedValueByTierReport({ dealerId }: Props) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report-quoted-by-tier", dealerId, from, to],
    queryFn: () => pricingTierReportService.quotedValueByTier(dealerId, from, to),
  });
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Quoted Value by Tier</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(
          rows.map((r) => ({ tier: r.tier_name, quotes: r.quote_count, quoted: r.total_quoted, converted: r.converted_value })),
          [
            { header: "Tier", key: "tier" },
            { header: "Quotes", key: "quotes" },
            { header: "Total Quoted", key: "quoted", format: "currency" },
            { header: "Converted Value", key: "converted", format: "currency" },
          ],
          "quoted-by-tier",
        )}><Download className="h-4 w-4 mr-1" />Export</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tier</TableHead><TableHead className="text-right">Quotes</TableHead>
              <TableHead className="text-right">Total Quoted</TableHead><TableHead className="text-right">Converted</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No quotations in period</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.tier_id ?? "none"}>
                  <TableCell className="font-medium">{r.tier_name}</TableCell>
                  <TableCell className="text-right">{r.quote_count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.total_quoted)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.converted_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function ManualOverrideFrequencyReport({ dealerId }: Props) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["report-manual-overrides", dealerId, from, to],
    queryFn: () => pricingTierReportService.manualOverrides(dealerId, from, to),
  });
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Manual Override Frequency</CardTitle>
        <Button variant="outline" size="sm" onClick={() => exportToExcel(
          rows.map((r) => ({ user: r.user_name, customer: r.customer_name, product: r.product_name, count: r.override_count, impact: r.total_impact })),
          [
            { header: "User", key: "user" },
            { header: "Customer", key: "customer" },
            { header: "Product", key: "product" },
            { header: "Overrides", key: "count" },
            { header: "Total Impact", key: "impact", format: "currency" },
          ],
          "manual-overrides",
        )}><Download className="h-4 w-4 mr-1" />Export</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-xs text-muted-foreground">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div><label className="text-xs text-muted-foreground">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>User</TableHead><TableHead>Customer</TableHead><TableHead>Product</TableHead>
              <TableHead className="text-right">Overrides</TableHead><TableHead className="text-right">Impact</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No manual overrides in period</TableCell></TableRow>
              ) : rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell>{r.product_name}</TableCell>
                  <TableCell className="text-right">{r.override_count}</TableCell>
                  <TableCell className={`text-right font-semibold ${r.total_impact < 0 ? "text-destructive" : "text-primary"}`}>
                    {r.total_impact >= 0 ? "+" : ""}{formatCurrency(r.total_impact)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
