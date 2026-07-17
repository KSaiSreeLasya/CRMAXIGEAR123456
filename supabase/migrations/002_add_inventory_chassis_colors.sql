-- Adds a per-chassis colour mapping without changing existing inventory rows.
ALTER TABLE IF EXISTS public.inventory_items
  ADD COLUMN IF NOT EXISTS chassis_colors jsonb;
