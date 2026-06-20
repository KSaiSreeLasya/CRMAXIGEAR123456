-- Create deliveries table
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(255) NOT NULL,
  deliverables TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on project_name for faster queries
CREATE INDEX IF NOT EXISTS idx_deliveries_project_name 
ON public.deliveries(project_name);

-- Create index on delivery_date for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_deliveries_delivery_date 
ON public.deliveries(delivery_date);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_deliveries_status 
ON public.deliveries(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at 
ON public.deliveries(created_at);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to select
CREATE POLICY "allow_select_deliveries" ON public.deliveries
  FOR SELECT
  USING (true);

-- Create policy for authenticated users to insert
CREATE POLICY "allow_insert_deliveries" ON public.deliveries
  FOR INSERT
  WITH CHECK (true);

-- Create policy for authenticated users to update
CREATE POLICY "allow_update_deliveries" ON public.deliveries
  FOR UPDATE
  USING (true);

-- Create policy for authenticated users to delete
CREATE POLICY "allow_delete_deliveries" ON public.deliveries
  FOR DELETE
  USING (true);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deliveries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_deliveries_timestamp();
