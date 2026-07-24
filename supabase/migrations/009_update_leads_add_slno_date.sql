-- Add new columns to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Create index for date column for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_date ON public.leads(date);

-- Note: Sl.No. (serial number) is generated dynamically based on row order
-- It does not need to be stored in the database
