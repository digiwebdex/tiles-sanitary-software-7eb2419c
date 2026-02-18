
-- Add missing columns to sales for payment tracking, references, and profitability
ALTER TABLE public.sales
  ADD COLUMN discount_reference TEXT,
  ADD COLUMN client_reference TEXT,
  ADD COLUMN fitter_reference TEXT,
  ADD COLUMN paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN due_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN cogs NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_box NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_sft NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN total_piece NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Add total_sft to sale_items
ALTER TABLE public.sale_items
  ADD COLUMN total_sft NUMERIC(12,2);

-- Rename sale_items columns for consistency
ALTER TABLE public.sale_items RENAME COLUMN qty TO quantity;
ALTER TABLE public.sale_items RENAME COLUMN unit_price TO sale_rate;
