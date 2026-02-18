import { z } from "zod";

export const purchaseItemSchema = z.object({
  product_id: z.string().min(1, "Product is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
  purchase_rate: z.coerce.number().min(0, "Rate must be ≥ 0"),
  offer_price: z.coerce.number().min(0).default(0),
  transport_cost: z.coerce.number().min(0).default(0),
  labor_cost: z.coerce.number().min(0).default(0),
  other_cost: z.coerce.number().min(0).default(0),
});

export const purchaseSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  invoice_number: z.string().trim().max(50).optional().or(z.literal("")),
  purchase_date: z.string().min(1, "Date is required"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
export type PurchaseItemFormValues = z.infer<typeof purchaseItemSchema>;
