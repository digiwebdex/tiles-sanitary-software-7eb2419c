import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/services/auditService";

export interface BatchInput {
  dealer_id: string;
  product_id: string;
  batch_no: string;
  lot_no?: string;
  shade_code?: string;
  caliber?: string;
  notes?: string;
}

export interface BatchStockResult {
  batch_id: string;
  is_new: boolean;
}

export interface BatchAllocation {
  batch_id: string;
  batch_no: string;
  shade_code: string | null;
  caliber: string | null;
  lot_no: string | null;
  allocated_qty: number;
}

export interface FIFOAllocationResult {
  allocations: BatchAllocation[];
  unallocated_qty: number;
  has_mixed_shade: boolean;
  has_mixed_caliber: boolean;
  shade_codes: string[];
  calibers: string[];
}

/**
 * Generate a collision-safe auto batch number.
 * Format: AUTO-YYYYMMDD-XXXXX (random 5-char alphanumeric suffix)
 */
function generateAutoBatchNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AUTO-${date}-${suffix}`;
}

/**
 * Find or create a product batch.
 * Merge rule: same product + batch_no + shade + caliber + lot + dealer → top-up existing batch.
 * Different shade/caliber/lot → new batch.
 */
export const batchService = {
  generateAutoBatchNo,

  async findOrCreateBatch(
    input: BatchInput,
    quantity: number,
    unitType: "box_sft" | "piece",
    perBoxSft: number | null
  ): Promise<BatchStockResult> {
    // Try to find existing batch with same identity (including depleted for reactivation)
    let query = supabase
      .from("product_batches")
      .select("id, box_qty, piece_qty, sft_qty, status")
      .eq("dealer_id", input.dealer_id)
      .eq("product_id", input.product_id);

    // Match shade/caliber/lot — treat null/empty as same
    if (input.shade_code?.trim()) {
      query = query.eq("shade_code", input.shade_code.trim());
    } else {
      query = query.or("shade_code.is.null,shade_code.eq.");
    }

    if (input.caliber?.trim()) {
      query = query.eq("caliber", input.caliber.trim());
    } else {
      query = query.or("caliber.is.null,caliber.eq.");
    }

    if (input.lot_no?.trim()) {
      query = query.eq("lot_no", input.lot_no.trim());
    } else {
      query = query.or("lot_no.is.null,lot_no.eq.");
    }

    // Also match batch_no for exact merge
    query = query.eq("batch_no", input.batch_no.trim());

    const { data: existing } = await query.limit(1);

    if (existing && existing.length > 0) {
      // Top-up existing batch (reactivates if depleted)
      const batch = existing[0];
      const updates = this._calcBatchQtyAdd(batch, quantity, unitType, perBoxSft);

      const { error } = await supabase
        .from("product_batches")
        .update(updates)
        .eq("id", batch.id);

      if (error) throw new Error(`Batch top-up failed: ${error.message}`);

      return { batch_id: batch.id, is_new: false };
    }

    // Create new batch
    const newBatchData: any = {
      dealer_id: input.dealer_id,
      product_id: input.product_id,
      batch_no: input.batch_no.trim(),
      lot_no: input.lot_no?.trim() || null,
      shade_code: input.shade_code?.trim() || null,
      caliber: input.caliber?.trim() || null,
      notes: input.notes?.trim() || null,
      box_qty: 0,
      piece_qty: 0,
      sft_qty: 0,
      status: "active",
    };

    if (unitType === "box_sft") {
      newBatchData.box_qty = quantity;
      newBatchData.sft_qty = quantity * (perBoxSft ?? 0);
    } else {
      newBatchData.piece_qty = quantity;
    }

    const { data: created, error: cErr } = await supabase
      .from("product_batches")
      .insert(newBatchData)
      .select("id")
      .single();

    if (cErr) throw new Error(`Batch creation failed: ${cErr.message}`);

    return { batch_id: created!.id, is_new: true };
  },

  /**
   * FIFO allocation: allocate requested qty from oldest active batches.
   * Returns allocation plan without modifying data.
   */
  async planFIFOAllocation(
    productId: string,
    dealerId: string,
    requestedQty: number,
    unitType: "box_sft" | "piece"
  ): Promise<FIFOAllocationResult> {
    const batches = await this.getActiveBatches(productId, dealerId);

    const allocations: BatchAllocation[] = [];
    let remaining = requestedQty;
    const shadeSet = new Set<string>();
    const caliberSet = new Set<string>();

    for (const batch of batches) {
      if (remaining <= 0) break;

      const availableQty = unitType === "box_sft"
        ? Number(batch.box_qty)
        : Number(batch.piece_qty);

      if (availableQty <= 0) continue;

      const allocateQty = Math.min(remaining, availableQty);
      allocations.push({
        batch_id: batch.id,
        batch_no: batch.batch_no,
        shade_code: batch.shade_code,
        caliber: batch.caliber,
        lot_no: batch.lot_no,
        allocated_qty: allocateQty,
      });

      if (batch.shade_code) shadeSet.add(batch.shade_code);
      if (batch.caliber) caliberSet.add(batch.caliber);

      remaining -= allocateQty;
    }

    return {
      allocations,
      unallocated_qty: Math.max(0, remaining),
      has_mixed_shade: shadeSet.size > 1,
      has_mixed_caliber: caliberSet.size > 1,
      shade_codes: Array.from(shadeSet),
      calibers: Array.from(caliberSet),
    };
  },

  /**
   * Execute batch allocation: deduct from product_batches and create sale_item_batches.
   */
  async executeSaleAllocation(
    saleItemId: string,
    dealerId: string,
    allocations: BatchAllocation[],
    unitType: "box_sft" | "piece",
    perBoxSft: number | null
  ): Promise<void> {
    for (const alloc of allocations) {
      // Deduct from batch
      const { data: batch } = await supabase
        .from("product_batches")
        .select("box_qty, piece_qty, sft_qty")
        .eq("id", alloc.batch_id)
        .single();

      if (!batch) continue;

      const updates = this._calcBatchQtyDeduct(batch, alloc.allocated_qty, unitType, perBoxSft);

      await supabase
        .from("product_batches")
        .update(updates)
        .eq("id", alloc.batch_id);

      // Create sale_item_batches record
      await supabase.from("sale_item_batches").insert({
        sale_item_id: saleItemId,
        batch_id: alloc.batch_id,
        dealer_id: dealerId,
        allocated_qty: alloc.allocated_qty,
      });

      // Check if depleted
      await this.checkAndMarkDepleted(alloc.batch_id);
    }
  },

  /**
   * Restore batch quantities (for sale cancellation).
   */
  async restoreBatchAllocations(saleItemId: string, unitType: "box_sft" | "piece", perBoxSft: number | null): Promise<void> {
    const { data: allocations } = await supabase
      .from("sale_item_batches")
      .select("batch_id, allocated_qty")
      .eq("sale_item_id", saleItemId);

    if (!allocations || allocations.length === 0) return;

    for (const alloc of allocations) {
      const { data: batch } = await supabase
        .from("product_batches")
        .select("box_qty, piece_qty, sft_qty")
        .eq("id", alloc.batch_id)
        .single();

      if (!batch) continue;

      const updates = this._calcBatchQtyAdd(batch, Number(alloc.allocated_qty), unitType, perBoxSft);
      await supabase
        .from("product_batches")
        .update(updates)
        .eq("id", alloc.batch_id);
    }

    // Delete the allocation records
    await supabase.from("sale_item_batches").delete().eq("sale_item_id", saleItemId);
  },

  /**
   * Get all active batches for a product, ordered oldest first (FIFO).
   */
  async getActiveBatches(productId: string, dealerId: string) {
    const { data, error } = await supabase
      .from("product_batches")
      .select("*")
      .eq("product_id", productId)
      .eq("dealer_id", dealerId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch batches: ${error.message}`);
    return data ?? [];
  },

  /**
   * Get all batches (including depleted) for a product.
   */
  async getAllBatches(productId: string, dealerId: string) {
    const { data, error } = await supabase
      .from("product_batches")
      .select("*")
      .eq("product_id", productId)
      .eq("dealer_id", dealerId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch batches: ${error.message}`);
    return data ?? [];
  },

  /**
   * Mark a batch as depleted if all quantities are zero.
   */
  async checkAndMarkDepleted(batchId: string) {
    const { data } = await supabase
      .from("product_batches")
      .select("box_qty, piece_qty, sft_qty")
      .eq("id", batchId)
      .single();

    if (!data) return;

    const totalQty = Number(data.box_qty) + Number(data.piece_qty);
    if (totalQty <= 0) {
      await supabase
        .from("product_batches")
        .update({ status: "depleted" })
        .eq("id", batchId);
    }
  },

  _calcBatchQtyAdd(
    current: { box_qty: number; piece_qty: number; sft_qty: number },
    quantity: number,
    unitType: "box_sft" | "piece",
    perBoxSft: number | null
  ) {
    if (unitType === "box_sft") {
      const newBox = Number(current.box_qty) + quantity;
      return {
        box_qty: newBox,
        sft_qty: newBox * (perBoxSft ?? 0),
        status: "active",
      };
    }
    return {
      piece_qty: Number(current.piece_qty) + quantity,
      status: "active",
    };
  },

  _calcBatchQtyDeduct(
    current: { box_qty: number; piece_qty: number; sft_qty: number },
    quantity: number,
    unitType: "box_sft" | "piece",
    perBoxSft: number | null
  ) {
    if (unitType === "box_sft") {
      const newBox = Math.max(0, Number(current.box_qty) - quantity);
      return {
        box_qty: newBox,
        sft_qty: newBox * (perBoxSft ?? 0),
      };
    }
    return {
      piece_qty: Math.max(0, Number(current.piece_qty) - quantity),
    };
  },
};
