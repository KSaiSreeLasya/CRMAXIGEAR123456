-- ============================================
-- UPDATE PROJECTS TABLE FOR SPLIT PAYMENTS
-- ============================================
-- This migration adds support for split payment tracking in projects table
-- and service_invoices table, using the existing transactions and split_payments tables

-- Add mode_of_payment and lead_source to projects table if not already present
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS mode_of_payment TEXT DEFAULT 'Cash';
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Add model_no, motor_no, battery_no columns if not present
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS model_no TEXT;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS motor_no TEXT;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS battery_no TEXT;

-- Add battery and vehicle warranty/capacity columns
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS battery_warranty TEXT;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS battery_capacity TEXT;
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS vehicle_warranty TEXT;

-- ============================================
-- CREATE TRANSACTIONS TABLE (for tracking split payments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL, -- 'estimation', 'service_invoice', 'project'
  reference_id UUID NOT NULL, -- ID of the estimation/service_invoice/project
  total_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'partial', -- 'partial' or 'complete'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE SPLIT_PAYMENTS TABLE (one entry per payment method)
-- ============================================
CREATE TABLE IF NOT EXISTS public.split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  mode_of_payment TEXT NOT NULL, -- 'Cash', 'Card', 'UPI', 'Cheque', 'Other'
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_transaction_id ON public.split_payments(transaction_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.split_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if they exist) and CREATE NEW ONES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view split payments for their transactions" ON public.split_payments;
DROP POLICY IF EXISTS "Users can insert split payments for their transactions" ON public.split_payments;
DROP POLICY IF EXISTS "Users can update split payments for their transactions" ON public.split_payments;
DROP POLICY IF EXISTS "Users can delete split payments for their transactions" ON public.split_payments;

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for split_payments (via transaction ownership)
CREATE POLICY "Users can view split payments for their transactions"
  ON public.split_payments
  FOR SELECT
  USING (transaction_id IN (
    SELECT id FROM public.transactions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert split payments for their transactions"
  ON public.split_payments
  FOR INSERT
  WITH CHECK (transaction_id IN (
    SELECT id FROM public.transactions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update split payments for their transactions"
  ON public.split_payments
  FOR UPDATE
  USING (transaction_id IN (
    SELECT id FROM public.transactions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete split payments for their transactions"
  ON public.split_payments
  FOR DELETE
  USING (transaction_id IN (
    SELECT id FROM public.transactions WHERE user_id = auth.uid()
  ));

-- ============================================
-- EXAMPLE QUERIES
-- ============================================
-- Get split payments for a project:
-- SELECT sp.* FROM split_payments sp
-- JOIN transactions t ON sp.transaction_id = t.id
-- WHERE t.reference_type = 'project' AND t.reference_id = 'project_id_here';

-- Get total paid in cash for a project:
-- SELECT SUM(sp.amount) as cash_received FROM split_payments sp
-- JOIN transactions t ON sp.transaction_id = t.id
-- WHERE t.reference_type = 'project' 
--   AND t.reference_id = 'project_id_here'
--   AND sp.mode_of_payment = 'Cash';

-- Get breakdown by payment method for a project:
-- SELECT sp.mode_of_payment, SUM(sp.amount) as total_amount
-- FROM split_payments sp
-- JOIN transactions t ON sp.transaction_id = t.id
-- WHERE t.reference_type = 'project' AND t.reference_id = 'project_id_here'
-- GROUP BY sp.mode_of_payment;
