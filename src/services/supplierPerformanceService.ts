import { supabase } from "@/integrations/supabase/client";

/**
 * Supplier Performance Tracking — Batch 1 + Batch 2
 *
 * Purely DERIVED from existing tables:
 *   - purchases             → frequency, recency, spend, cadence
 *   - purchase_returns      → return rate (reliability signal)
 *   - supplier_ledger       → outstanding exposure
 *
 * No schema changes. No side effects. Read-only analytics.
 *
 * Lead-time note (Batch 2 clarification):
 *   The ERP does not capture a separate "order placed" date.
 *   We approximate "supply cadence" as the average gap between
 *   consecutive purchases. We then derive on-time vs delayed by comparing
 *   each gap against the supplier's own median cadence × 1.5 (tolerance).
 *   This is a practical reliability signal for tiles/sanitary dealers
 *   without inventing data we don't have.
 *
 * Score (0-100), explainable:
 *   start at 100, then:
 *     - subtract 2 points per 1% return rate (capped at 40)
 *     - subtract 10 points if no purchase in last 90 days
 *     - subtract 10 points if outstanding > 5x avg purchase value
 *     - subtract 10 points if delayed_pct > 30
 *   floor at 0.
 */

export type ReliabilityBand = "reliable" | "average" | "at_risk" | "inactive";

export interface SupplierPerformance {
  supplier_id: string;
  supplier_name: string;
  status: string;

  total_purchases: number;
  total_purchase_value: number;
  avg_purchase_value: number;
  last_purchase_date: string | null;
  days_since_last_purchase: number | null;

  // cadence proxy for "lead time"
  avg_days_between_purchases: number | null;
  last_gap_days: number | null;
  longest_gap_days: number | null;
  on_time_count: number;
  delayed_count: number;
  delayed_pct: number; // 0-100

  // reliability
  total_returns: number;
  total_return_value: number;
  return_rate_pct: number; // 0-100

  // exposure
  outstanding_amount: number;
  recent_purchase_value_30d: number;

  // derived
  reliability_score: number; // 0-100
  reliability_band: ReliabilityBand;
  score_factors: string[]; // explainable list of penalties applied
}

interface ListOptions {
  startDate?: string;
  endDate?: string;
}

function classify(score: number, lastPurchaseDate: string | null): ReliabilityBand {
  if (!lastPurchaseDate) return "inactive";
  const daysSince = Math.floor((Date.now() - new Date(lastPurchaseDate).getTime()) / 86_400_000);
  if (daysSince > 180) return "inactive";
  if (score >= 80) return "reliable";
  if (score >= 60) return "average";
  return "at_risk";
}

function computeScore(args: {
  returnRatePct: number;
  daysSinceLast: number | null;
  outstanding: number;
  avgPurchaseValue: number;
  delayedPct: number;
}): { score: number; factors: string[] } {
  let score = 100;
  const factors: string[] = [];
  const returnPenalty = Math.min(40, args.returnRatePct * 2);
  if (returnPenalty > 0) {
    score -= returnPenalty;
    factors.push(`-${Math.round(returnPenalty)} from ${args.returnRatePct.toFixed(1)}% return rate`);
  }
  if (args.daysSinceLast !== null && args.daysSinceLast > 90) {
    score -= 10;
    factors.push(`-10 inactive ${args.daysSinceLast}d`);
  }
  if (args.avgPurchaseValue > 0 && args.outstanding > args.avgPurchaseValue * 5) {
    score -= 10;
    factors.push(`-10 high outstanding exposure`);
  }
  if (args.delayedPct > 30) {
    score -= 10;
    factors.push(`-10 ${args.delayedPct.toFixed(0)}% delayed cadence`);
  }
  return { score: Math.max(0, Math.round(score)), factors };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export const supplierPerformanceService = {
  /**
   * Returns performance metrics for every supplier of the dealer.
   */
  async list(dealerId: string, opts: ListOptions = {}): Promise<SupplierPerformance[]> {
    const [supRes, purRes, retRes, ledRes] = await Promise.all([
      supabase
        .from("suppliers")
        .select("id, name, status")
        .eq("dealer_id", dealerId),
      (() => {
        let q = supabase
          .from("purchases")
          .select("id, supplier_id, purchase_date, total_amount")
          .eq("dealer_id", dealerId);
        if (opts.startDate) q = q.gte("purchase_date", opts.startDate);
        if (opts.endDate) q = q.lte("purchase_date", opts.endDate);
        return q;
      })(),
      (() => {
        let q = supabase
          .from("purchase_returns")
          .select("id, supplier_id, return_date, total_amount, status")
          .eq("dealer_id", dealerId);
        if (opts.startDate) q = q.gte("return_date", opts.startDate);
        if (opts.endDate) q = q.lte("return_date", opts.endDate);
        return q;
      })(),
      supabase
        .from("supplier_ledger")
        .select("supplier_id, amount, type")
        .eq("dealer_id", dealerId),
    ]);

    if (supRes.error) throw new Error(supRes.error.message);
    if (purRes.error) throw new Error(purRes.error.message);
    if (retRes.error) throw new Error(retRes.error.message);
    if (ledRes.error) throw new Error(ledRes.error.message);

    const suppliers = supRes.data ?? [];
    const purchases = purRes.data ?? [];
    const returns = (retRes.data ?? []).filter((r) => r.status !== "cancelled");
    const ledger = ledRes.data ?? [];

    // Index by supplier
    const purBySup = new Map<string, { date: string; amount: number }[]>();
    for (const p of purchases) {
      if (!p.supplier_id) continue;
      const arr = purBySup.get(p.supplier_id) ?? [];
      arr.push({ date: p.purchase_date, amount: Number(p.total_amount) });
      purBySup.set(p.supplier_id, arr);
    }

    const retBySup = new Map<string, { count: number; total: number }>();
    for (const r of returns) {
      if (!r.supplier_id) continue;
      const cur = retBySup.get(r.supplier_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(r.total_amount ?? 0);
      retBySup.set(r.supplier_id, cur);
    }

    // Outstanding
    const outBySup = new Map<string, number>();
    for (const e of ledger) {
      if (!e.supplier_id) continue;
      const amt = Number(e.amount);
      const cur = outBySup.get(e.supplier_id) ?? 0;
      const t = (e.type ?? "").toLowerCase();
      if (t === "purchase" || t === "opening" || t === "adjustment") {
        outBySup.set(e.supplier_id, cur + amt);
      } else if (t === "payment" || t === "return" || t === "refund") {
        outBySup.set(e.supplier_id, cur - amt);
      } else {
        outBySup.set(e.supplier_id, cur);
      }
    }

    const today = Date.now();
    const thirtyDaysAgo = today - 30 * 86_400_000;

    return suppliers.map<SupplierPerformance>((s) => {
      const pList = (purBySup.get(s.id) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
      const totalPurchases = pList.length;
      const totalPurchaseValue = pList.reduce((sum, p) => sum + p.amount, 0);
      const avgPurchaseValue = totalPurchases > 0 ? totalPurchaseValue / totalPurchases : 0;
      const lastPurchase = pList.length > 0 ? pList[pList.length - 1].date : null;
      const daysSinceLast = lastPurchase
        ? Math.floor((today - new Date(lastPurchase).getTime()) / 86_400_000)
        : null;

      const recentValue30d = pList
        .filter((p) => new Date(p.date).getTime() >= thirtyDaysAgo)
        .reduce((sum, p) => sum + p.amount, 0);

      // Cadence + delay analysis
      let avgGap: number | null = null;
      let lastGap: number | null = null;
      let longestGap: number | null = null;
      let onTime = 0;
      let delayed = 0;
      let delayedPct = 0;

      if (pList.length >= 2) {
        const gaps: number[] = [];
        for (let i = 1; i < pList.length; i++) {
          const d = (new Date(pList[i].date).getTime() - new Date(pList[i - 1].date).getTime()) / 86_400_000;
          if (d >= 0) gaps.push(d);
        }
        if (gaps.length > 0) {
          avgGap = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
          lastGap = Math.round(gaps[gaps.length - 1]);
          longestGap = Math.round(Math.max(...gaps));
          // Delayed = gap > median × 1.5 (supplier's own tolerance)
          const med = median(gaps);
          const tolerance = Math.max(med * 1.5, med + 7); // at least 7d slack
          for (const g of gaps) {
            if (g > tolerance) delayed += 1;
            else onTime += 1;
          }
          delayedPct = gaps.length > 0 ? Math.round((delayed / gaps.length) * 100) : 0;
        }
      }

      const retInfo = retBySup.get(s.id) ?? { count: 0, total: 0 };
      const returnRatePct =
        totalPurchaseValue > 0
          ? Math.round((retInfo.total / totalPurchaseValue) * 10_000) / 100
          : 0;

      const outstanding = Math.max(0, Math.round((outBySup.get(s.id) ?? 0) * 100) / 100);

      const { score, factors } = computeScore({
        returnRatePct,
        daysSinceLast,
        outstanding,
        avgPurchaseValue,
        delayedPct,
      });

      return {
        supplier_id: s.id,
        supplier_name: s.name,
        status: s.status,
        total_purchases: totalPurchases,
        total_purchase_value: Math.round(totalPurchaseValue * 100) / 100,
        avg_purchase_value: Math.round(avgPurchaseValue * 100) / 100,
        last_purchase_date: lastPurchase,
        days_since_last_purchase: daysSinceLast,
        avg_days_between_purchases: avgGap,
        last_gap_days: lastGap,
        longest_gap_days: longestGap,
        on_time_count: onTime,
        delayed_count: delayed,
        delayed_pct: delayedPct,
        total_returns: retInfo.count,
        total_return_value: Math.round(retInfo.total * 100) / 100,
        return_rate_pct: returnRatePct,
        outstanding_amount: outstanding,
        recent_purchase_value_30d: Math.round(recentValue30d * 100) / 100,
        reliability_score: score,
        reliability_band: classify(score, lastPurchase),
        score_factors: factors,
      };
    });
  },

  /**
   * Performance for a single supplier (used in supplier detail page).
   */
  async getForSupplier(dealerId: string, supplierId: string): Promise<SupplierPerformance | null> {
    const all = await this.list(dealerId);
    return all.find((s) => s.supplier_id === supplierId) ?? null;
  },

  /**
   * Compact dashboard rollup — top reliable, at-risk, high-outstanding,
   * high-return.
   */
  async getDashboardStats(dealerId: string) {
    const all = await this.list(dealerId);
    const active = all.filter((s) => s.total_purchases > 0);

    const topReliable = active
      .filter((s) => s.reliability_band === "reliable")
      .sort((a, b) => b.reliability_score - a.reliability_score || b.total_purchase_value - a.total_purchase_value)
      .slice(0, 5);

    const atRisk = active
      .filter((s) => s.reliability_band === "at_risk")
      .sort((a, b) => a.reliability_score - b.reliability_score)
      .slice(0, 5);

    const highOutstanding = active
      .filter((s) => s.outstanding_amount > 0)
      .sort((a, b) => b.outstanding_amount - a.outstanding_amount)
      .slice(0, 5);

    const highReturn = active
      .filter((s) => s.return_rate_pct >= 5)
      .sort((a, b) => b.return_rate_pct - a.return_rate_pct)
      .slice(0, 5);

    const delayedCount = active.filter(
      (s) => s.days_since_last_purchase !== null && s.days_since_last_purchase > 90,
    ).length;

    return {
      totalSuppliers: all.length,
      activeSuppliers: active.length,
      reliableCount: active.filter((s) => s.reliability_band === "reliable").length,
      atRiskCount: atRisk.length,
      delayedCount,
      highReturnCount: highReturn.length,
      totalOutstanding:
        Math.round(active.reduce((sum, s) => sum + s.outstanding_amount, 0) * 100) / 100,
      topReliable,
      atRisk,
      highOutstanding,
      highReturn,
    };
  },
};
