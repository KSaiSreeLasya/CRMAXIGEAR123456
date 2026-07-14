-- ============================================================================
-- UPDATE: Dealer and Spares Invoice Schema to Support Bulk/Single and Custom GST
-- ============================================================================
-- This migration adds:
-- 1. 'type' column to track bulk vs single invoice items
-- 2. Support for custom GST percentages (0% and above)
-- 3. Proper item-level tracking for invoices
-- ============================================================================

-- ============================================================================
-- TABLE: dealers_invoices (Main Invoice Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dealers_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice Details
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Dealer Information
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  dealer_name VARCHAR(255) NOT NULL,
  contact_no VARCHAR(20),
  location VARCHAR(255),
  
  -- Additional Details
  purchase_order_no VARCHAR(100),
  sent_to VARCHAR(255),
  ship_to VARCHAR(255),
  mode_of_payment VARCHAR(100),
  lead_source VARCHAR(255),
  
  -- Amounts
  subtotal DECIMAL(12, 2) DEFAULT 0,
  labour_charges DECIMAL(12, 2) DEFAULT 0,
  total_gst_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  
  -- Tax Configuration
  gst_enabled BOOLEAN DEFAULT true,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  
  CONSTRAINT positive_total CHECK (total_amount >= 0)
);

-- ============================================================================
-- TABLE: dealers_invoice_items (Line Items Table with Type and Custom GST)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dealers_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.dealers_invoices(id) ON DELETE CASCADE,
  
  -- Product Information
  product_name VARCHAR(255) NOT NULL,
  product_description TEXT,
  
  -- Item Type: 'single' (qty * unit_price) or 'bulk' (total amount direct)
  item_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (item_type IN ('single', 'bulk')),
  
  -- Quantity
  quantity DECIMAL(10, 2) DEFAULT 1,
  
  -- Pricing
  unit_price DECIMAL(12, 2),  -- NULL for bulk type
  line_total DECIMAL(12, 2) NOT NULL,  -- qty * unit_price for single, direct amount for bulk
  
  -- Tax (Custom GST support: 0% and above)
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18 CHECK (gst_rate >= 0),
  gst_amount DECIMAL(12, 2) NOT NULL,
  line_amount_with_gst DECIMAL(12, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_line_total CHECK (line_total >= 0),
  CONSTRAINT valid_gst_amount CHECK (gst_amount >= 0)
);

-- ============================================================================
-- TABLE: spares_invoices (Main Spares Invoice Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.spares_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice Details
  spares_invoice_no VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  
  -- Dealer Information
  dealer_id UUID REFERENCES public.dealers(id) ON DELETE SET NULL,
  dealer_name VARCHAR(255) NOT NULL,
  contact_no VARCHAR(20),
  location VARCHAR(255),
  
  -- Additional Details
  po_number VARCHAR(100),
  sent_to VARCHAR(255),
  ship_to VARCHAR(255),
  mode_of_payment VARCHAR(100),
  lead_source VARCHAR(255),
  
  -- Amounts
  subtotal DECIMAL(12, 2) DEFAULT 0,
  labour_charges DECIMAL(12, 2) DEFAULT 0,
  gst_amount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  
  -- Tax Configuration
  gst_enabled BOOLEAN DEFAULT true,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  
  CONSTRAINT positive_total CHECK (total >= 0)
);

-- ============================================================================
-- TABLE: spares_invoice_products (Line Items Table with Type and Custom GST)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.spares_invoice_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spares_invoice_id UUID NOT NULL REFERENCES public.spares_invoices(id) ON DELETE CASCADE,
  
  -- Product Information
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Item Type: 'single' (qty * unit_price) or 'bulk' (total amount direct)
  item_type VARCHAR(20) NOT NULL DEFAULT 'single' CHECK (item_type IN ('single', 'bulk')),
  
  -- Quantity
  unit_quantity DECIMAL(10, 2) DEFAULT 1,
  
  -- Pricing
  unit_price DECIMAL(12, 2),  -- NULL for bulk type
  line_total DECIMAL(12, 2) NOT NULL,  -- qty * unit_price for single, direct amount for bulk
  
  -- Tax (Custom GST support: 0% and above)
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18 CHECK (gst_rate >= 0),
  gst_amount DECIMAL(12, 2) NOT NULL,
  line_amount_with_gst DECIMAL(12, 2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_line_total CHECK (line_total >= 0),
  CONSTRAINT valid_gst_amount CHECK (gst_amount >= 0)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Dealer Invoices Indexes
CREATE INDEX IF NOT EXISTS idx_dealers_invoices_invoice_date ON public.dealers_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_dealers_invoices_dealer_id ON public.dealers_invoices(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealers_invoices_created_at ON public.dealers_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealers_invoices_deleted ON public.dealers_invoices(is_deleted) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_dealers_invoices_invoice_no ON public.dealers_invoices(invoice_number);

-- Dealer Invoice Items Indexes
CREATE INDEX IF NOT EXISTS idx_dealers_invoice_items_invoice_id ON public.dealers_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dealers_invoice_items_item_type ON public.dealers_invoice_items(item_type);

-- Spares Invoices Indexes
CREATE INDEX IF NOT EXISTS idx_spares_invoices_invoice_date ON public.spares_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_spares_invoices_dealer_id ON public.spares_invoices(dealer_id);
CREATE INDEX IF NOT EXISTS idx_spares_invoices_created_at ON public.spares_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spares_invoices_deleted ON public.spares_invoices(is_deleted) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_spares_invoices_invoice_no ON public.spares_invoices(spares_invoice_no);

-- Spares Invoice Products Indexes
CREATE INDEX IF NOT EXISTS idx_spares_invoice_products_invoice_id ON public.spares_invoice_products(spares_invoice_id);
CREATE INDEX IF NOT EXISTS idx_spares_invoice_products_item_type ON public.spares_invoice_products(item_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.dealers_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spares_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spares_invoice_products ENABLE ROW LEVEL SECURITY;

-- Dealer Invoices RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.dealers_invoices
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.dealers_invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.dealers_invoices
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.dealers_invoices
  FOR DELETE USING (true);

-- Dealer Invoice Items RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.dealers_invoice_items
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.dealers_invoice_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.dealers_invoice_items
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.dealers_invoice_items
  FOR DELETE USING (true);

-- Spares Invoices RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.spares_invoices
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.spares_invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.spares_invoices
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.spares_invoices
  FOR DELETE USING (true);

-- Spares Invoice Products RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.spares_invoice_products
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.spares_invoice_products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.spares_invoice_products
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON public.spares_invoice_products
  FOR DELETE USING (true);

-- ============================================================================
-- VIEWS
-- ============================================================================
-- Active Dealer Invoices View
CREATE OR REPLACE VIEW public.active_dealers_invoices AS
SELECT * FROM public.dealers_invoices
WHERE is_deleted = false
ORDER BY invoice_date DESC;

-- Active Spares Invoices View
CREATE OR REPLACE VIEW public.active_spares_invoices AS
SELECT * FROM public.spares_invoices
WHERE is_deleted = false
ORDER BY invoice_date DESC;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================
-- Calculate line total based on item type
CREATE OR REPLACE FUNCTION public.calculate_dealer_invoice_item_total(
  p_item_type VARCHAR,
  p_unit_price DECIMAL,
  p_quantity DECIMAL,
  p_direct_amount DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  IF p_item_type = 'bulk' THEN
    RETURN p_direct_amount;
  ELSE
    RETURN COALESCE(p_unit_price, 0) * COALESCE(p_quantity, 1);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate GST amount
CREATE OR REPLACE FUNCTION public.calculate_gst_amount(
  p_line_total DECIMAL,
  p_gst_rate DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((p_line_total * COALESCE(p_gst_rate, 0)) / 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS FOR TIMESTAMP UPDATES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_dealers_invoices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dealers_invoices_updated_at
BEFORE UPDATE ON public.dealers_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_dealers_invoices_timestamp();

CREATE TRIGGER dealers_invoice_items_updated_at
BEFORE UPDATE ON public.dealers_invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.update_dealers_invoices_timestamp();

CREATE TRIGGER spares_invoices_updated_at
BEFORE UPDATE ON public.spares_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_dealers_invoices_timestamp();

CREATE TRIGGER spares_invoice_products_updated_at
BEFORE UPDATE ON public.spares_invoice_products
FOR EACH ROW
EXECUTE FUNCTION public.update_dealers_invoices_timestamp();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.dealers_invoices IS 'Main table for dealer product invoices with support for multiple line items';
COMMENT ON TABLE public.dealers_invoice_items IS 'Line items for dealer invoices supporting single (qty*price) and bulk (direct amount) modes with custom GST';
COMMENT ON TABLE public.spares_invoices IS 'Main table for dealer spares invoices with support for multiple line items';
COMMENT ON TABLE public.spares_invoice_products IS 'Line items for spares invoices supporting single (qty*price) and bulk (direct amount) modes with custom GST';

COMMENT ON COLUMN public.dealers_invoice_items.item_type IS 'Type of invoice item: single (qty * unit_price) or bulk (direct total amount)';
COMMENT ON COLUMN public.dealers_invoice_items.gst_rate IS 'GST percentage rate (0 or above). Allows 0% GST for non-taxable items';

COMMENT ON COLUMN public.spares_invoice_products.item_type IS 'Type of invoice item: single (qty * unit_price) or bulk (direct total amount)';
COMMENT ON COLUMN public.spares_invoice_products.gst_rate IS 'GST percentage rate (0 or above). Allows 0% GST for non-taxable items';

-- ============================================================================
-- SAMPLE DATA STRUCTURE (for reference)
-- ============================================================================
/*
-- Example 1: Single Unit Invoice Item
INSERT INTO public.dealers_invoice_items (
  invoice_id, product_name, product_description,
  item_type, quantity, unit_price,
  line_total, gst_rate, gst_amount, line_amount_with_gst
) VALUES (
  'invoice-id-here', 'Product A', 'Description',
  'single', 100, 500,
  50000, 18, 9000, 59000
);

-- Example 2: Bulk Invoice Item
INSERT INTO public.dealers_invoice_items (
  invoice_id, product_name, product_description,
  item_type, quantity, unit_price,
  line_total, gst_rate, gst_amount, line_amount_with_gst
) VALUES (
  'invoice-id-here', 'Bulk Order', 'Large batch',
  'bulk', 90, NULL,
  50000, 18, 9000, 59000
);

-- Example 3: Zero GST Item
INSERT INTO public.dealers_invoice_items (
  invoice_id, product_name, product_description,
  item_type, quantity, unit_price,
  line_total, gst_rate, gst_amount, line_amount_with_gst
) VALUES (
  'invoice-id-here', 'Exempt Item', 'No tax item',
  'single', 10, 100,
  1000, 0, 0, 1000
);
*/
