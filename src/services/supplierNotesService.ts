import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "./auditService";

/**
 * Supplier Notes (Batch 3).
 * Owner/admin internal performance notes — advisory only,
 * never affects reliability scoring. Audit-trailed on create/update/delete.
 */

export interface SupplierNote {
  id: string;
  dealer_id: string;
  supplier_id: string;
  note: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const supplierNotesService = {
  async list(dealerId: string, supplierId: string): Promise<SupplierNote[]> {
    const { data, error } = await supabase
      .from("supplier_notes")
      .select("*")
      .eq("dealer_id", dealerId)
      .eq("supplier_id", supplierId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SupplierNote[];
  },

  async create(input: { dealerId: string; supplierId: string; note: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const trimmed = input.note.trim();
    if (!trimmed) throw new Error("Note cannot be empty");
    if (trimmed.length > 2000) throw new Error("Note must be under 2000 characters");

    const { data, error } = await supabase
      .from("supplier_notes")
      .insert([{
        dealer_id: input.dealerId,
        supplier_id: input.supplierId,
        note: trimmed,
        created_by: userId,
        updated_by: userId,
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      dealer_id: input.dealerId,
      action: "create",
      table_name: "supplier_notes",
      record_id: data.id,
      new_data: { supplier_id: input.supplierId, note: trimmed },
    });
    return data as SupplierNote;
  },

  async update(id: string, input: { dealerId: string; note: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const trimmed = input.note.trim();
    if (!trimmed) throw new Error("Note cannot be empty");
    if (trimmed.length > 2000) throw new Error("Note must be under 2000 characters");

    const { data: existing } = await supabase
      .from("supplier_notes")
      .select("note")
      .eq("id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("supplier_notes")
      .update({ note: trimmed, updated_by: userId })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await logAudit({
      dealer_id: input.dealerId,
      action: "update",
      table_name: "supplier_notes",
      record_id: id,
      old_data: existing ? { note: existing.note } : null,
      new_data: { note: trimmed },
    });
    return data as SupplierNote;
  },

  async delete(id: string, dealerId: string) {
    const { data: existing } = await supabase
      .from("supplier_notes")
      .select("note, supplier_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("supplier_notes")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);

    await logAudit({
      dealer_id: dealerId,
      action: "delete",
      table_name: "supplier_notes",
      record_id: id,
      old_data: existing ?? null,
    });
  },
};
