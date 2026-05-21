-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own service invoices" ON service_invoices;
DROP POLICY IF EXISTS "Users can insert their own service invoices" ON service_invoices;
DROP POLICY IF EXISTS "Users can update their own service invoices" ON service_invoices;
DROP POLICY IF EXISTS "Users can delete their own service invoices" ON service_invoices;

-- Drop old trigger
DROP TRIGGER IF EXISTS service_invoices_update_timestamp ON service_invoices;
DROP FUNCTION IF EXISTS update_service_invoices_timestamp();

-- Drop old table
DROP TABLE IF EXISTS service_invoices;

-- Create new Service Invoices Table with updated schema
CREATE TABLE IF NOT EXISTS service_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_invoice_no VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  contact_no VARCHAR(20),
  location VARCHAR(255),
  invoice_date DATE,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  labour_charges DECIMAL(10, 2) DEFAULT 0.00,
  gst_enabled BOOLEAN DEFAULT true,
  gst_amount DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_invoices_user_id ON service_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_service_invoices_service_invoice_no ON service_invoices(service_invoice_no);
CREATE INDEX IF NOT EXISTS idx_service_invoices_created_at ON service_invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE service_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own service invoices"
  ON service_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own service invoices"
  ON service_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own service invoices"
  ON service_invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own service invoices"
  ON service_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON service_invoices TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create trigger to auto-update timestamp
CREATE OR REPLACE FUNCTION update_service_invoices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_invoices_update_timestamp
BEFORE UPDATE ON service_invoices
FOR EACH ROW
EXECUTE FUNCTION update_service_invoices_timestamp();
