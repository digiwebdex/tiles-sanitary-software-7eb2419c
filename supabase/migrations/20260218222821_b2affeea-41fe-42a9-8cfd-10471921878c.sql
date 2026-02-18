
-- Add missing columns to purchase_items for landed cost calculation
ALTER TABLE public.purchase_items
  ADD COLUMN offer_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN transport_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN labor_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN other_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN landed_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_sft NUMERIC(12,2);

-- Rename qty to be more explicit and add unit tracking
ALTER TABLE public.purchase_items
  RENAME COLUMN qty TO quantity;

ALTER TABLE public.purchase_items
  RENAME COLUMN unit_price TO purchase_rate;
