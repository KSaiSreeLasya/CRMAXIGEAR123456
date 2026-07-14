-- Allows 0% GST on existing dealer and spares invoice items.
-- Run this migration once in Supabase SQL Editor.

ALTER TABLE public.dealers_invoice_items
  ALTER COLUMN gst_rate SET DEFAULT 18,
  DROP CONSTRAINT IF EXISTS dealers_invoice_items_gst_rate_check;

ALTER TABLE public.dealers_invoice_items
  ADD CONSTRAINT dealers_invoice_items_gst_rate_check
  CHECK (gst_rate >= 0 AND gst_rate <= 100);

ALTER TABLE public.spares_invoice_products
  ALTER COLUMN gst_rate SET DEFAULT 18,
  DROP CONSTRAINT IF EXISTS spares_invoice_products_gst_rate_check;

ALTER TABLE public.spares_invoice_products
  ADD CONSTRAINT spares_invoice_products_gst_rate_check
  CHECK (gst_rate >= 0 AND gst_rate <= 100);

CREATE OR REPLACE FUNCTION public.calculate_gst_amount(
  p_line_total DECIMAL,
  p_gst_rate DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((COALESCE(p_line_total, 0) * COALESCE(p_gst_rate, 0)) / 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
