
-- =============================================================
-- ATOMIC BATCH ALLOCATION (sale creation / edit re-allocation)
-- =============================================================
CREATE OR REPLACE FUNCTION public.allocate_sale_batches(
  _dealer_id uuid,
  _sale_item_id uuid,
  _product_id uuid,
  _unit_type text,
  _per_box_sft numeric,
  _allocations jsonb  -- [{"batch_id":"...", "allocated_qty": N}, ...]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _alloc jsonb;
  _batch_id uuid;
  _qty numeric;
  _batch record;
  _new_box numeric;
  _new_piece numeric;
  _total_allocated numeric := 0;
BEGIN
  FOR _alloc IN SELECT * FROM jsonb_array_elements(_allocations)
  LOOP
    _batch_id := (_alloc->>'batch_id')::uuid;
    _qty := (_alloc->>'allocated_qty')::numeric;

    -- Lock the batch row to prevent concurrent deduction
    SELECT box_qty, piece_qty, sft_qty INTO _batch
    FROM public.product_batches
    WHERE id = _batch_id AND dealer_id = _dealer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch % not found for dealer %', _batch_id, _dealer_id;
    END IF;

    -- Deduct from batch
    IF _unit_type = 'box_sft' THEN
      _new_box := GREATEST(0, _batch.box_qty - _qty);
      UPDATE public.product_batches SET
        box_qty = _new_box,
        sft_qty = _new_box * COALESCE(_per_box_sft, 0),
        status = CASE WHEN _new_box <= 0 THEN 'depleted' ELSE status END
      WHERE id = _batch_id;
    ELSE
      _new_piece := GREATEST(0, _batch.piece_qty - _qty);
      UPDATE public.product_batches SET
        piece_qty = _new_piece,
        status = CASE WHEN _new_piece <= 0 THEN 'depleted' ELSE status END
      WHERE id = _batch_id;
    END IF;

    -- Create junction record
    INSERT INTO public.sale_item_batches (sale_item_id, batch_id, dealer_id, allocated_qty)
    VALUES (_sale_item_id, _batch_id, _dealer_id, _qty);

    _total_allocated := _total_allocated + _qty;
  END LOOP;

  -- Deduct from aggregate stock (locked row)
  IF _unit_type = 'box_sft' THEN
    UPDATE public.stock SET
      box_qty  = GREATEST(0, box_qty - _total_allocated),
      sft_qty  = GREATEST(0, box_qty - _total_allocated) * COALESCE(_per_box_sft, 0)
    WHERE product_id = _product_id AND dealer_id = _dealer_id;
  ELSE
    UPDATE public.stock SET
      piece_qty = GREATEST(0, piece_qty - _total_allocated)
    WHERE product_id = _product_id AND dealer_id = _dealer_id;
  END IF;

  -- Update allocated_qty on sale_item
  UPDATE public.sale_items SET allocated_qty = _total_allocated
  WHERE id = _sale_item_id;
END;
$$;

-- =============================================================
-- ATOMIC BATCH RESTORATION (sale cancel / edit reversal)
-- =============================================================
CREATE OR REPLACE FUNCTION public.restore_sale_batches(
  _sale_item_id uuid,
  _product_id uuid,
  _dealer_id uuid,
  _unit_type text,
  _per_box_sft numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _alloc record;
  _batch record;
  _new_box numeric;
  _new_piece numeric;
  _total_restored numeric := 0;
BEGIN
  -- Iterate existing allocations and restore
  FOR _alloc IN
    SELECT batch_id, allocated_qty
    FROM public.sale_item_batches
    WHERE sale_item_id = _sale_item_id AND dealer_id = _dealer_id
  LOOP
    -- Lock batch row
    SELECT box_qty, piece_qty, sft_qty INTO _batch
    FROM public.product_batches
    WHERE id = _alloc.batch_id
    FOR UPDATE;

    IF NOT FOUND THEN CONTINUE; END IF;

    IF _unit_type = 'box_sft' THEN
      _new_box := _batch.box_qty + _alloc.allocated_qty;
      UPDATE public.product_batches SET
        box_qty = _new_box,
        sft_qty = _new_box * COALESCE(_per_box_sft, 0),
        status = 'active'
      WHERE id = _alloc.batch_id;
    ELSE
      _new_piece := _batch.piece_qty + _alloc.allocated_qty;
      UPDATE public.product_batches SET
        piece_qty = _new_piece,
        status = 'active'
      WHERE id = _alloc.batch_id;
    END IF;

    _total_restored := _total_restored + _alloc.allocated_qty;
  END LOOP;

  -- Delete junction records
  DELETE FROM public.sale_item_batches
  WHERE sale_item_id = _sale_item_id AND dealer_id = _dealer_id;

  -- Restore aggregate stock
  IF _total_restored > 0 THEN
    IF _unit_type = 'box_sft' THEN
      UPDATE public.stock SET
        box_qty = box_qty + _total_restored,
        sft_qty = (box_qty + _total_restored) * COALESCE(_per_box_sft, 0)
      WHERE product_id = _product_id AND dealer_id = _dealer_id;
    ELSE
      UPDATE public.stock SET
        piece_qty = piece_qty + _total_restored
      WHERE product_id = _product_id AND dealer_id = _dealer_id;
    END IF;
  END IF;
END;
$$;

-- =============================================================
-- UNBATCHED STOCK DEDUCTION (legacy products with no batches)
-- =============================================================
CREATE OR REPLACE FUNCTION public.deduct_stock_unbatched(
  _product_id uuid,
  _dealer_id uuid,
  _unit_type text,
  _per_box_sft numeric,
  _quantity numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _unit_type = 'box_sft' THEN
    UPDATE public.stock SET
      box_qty  = GREATEST(0, box_qty - _quantity),
      sft_qty  = GREATEST(0, box_qty - _quantity) * COALESCE(_per_box_sft, 0)
    WHERE product_id = _product_id AND dealer_id = _dealer_id;
  ELSE
    UPDATE public.stock SET
      piece_qty = GREATEST(0, piece_qty - _quantity)
    WHERE product_id = _product_id AND dealer_id = _dealer_id;
  END IF;
END;
$$;
