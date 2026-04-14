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

/**
 * Find or create a product batch.
 * Merge rule: same product + shade + caliber + lot + dealer → top-up existing batch.
 * Different shade/caliber/lot → new batch.
 */
export const batchService = {
  async findOrCreateBatch(
    input: BatchInput,
    quantity: number,
    unitType: "box_sft" | "piece",
    perBoxSft: number | null
  ): Promise<BatchStockResult> {
    // Try to find existing active batch with same identity
    let query = supabase
      .from("product_batches")
      .select("id, box_qty, piece_qty, sft_qty")
      .eq("dealer_id", input.dealer_id)
      .eq("product_id", input.product_id)
      .eq("status", "active");

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
      // Top-up existing batch
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
};
