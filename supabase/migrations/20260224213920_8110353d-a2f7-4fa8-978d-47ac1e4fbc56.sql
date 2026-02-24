-- Add sanitary-specific fields to products table
ALTER TABLE public.products
  ADD COLUMN material text,
  ADD COLUMN weight text,
  ADD COLUMN warranty text;