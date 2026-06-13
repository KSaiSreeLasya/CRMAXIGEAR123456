-- Drop the existing constraint if it exists
ALTER TABLE public.transactions 
DROP CONSTRAINT IF EXISTS transactions_reference_type_reference_id_key;

-- Alter the reference_id column to accept TEXT instead of UUID
ALTER TABLE public.transactions 
ALTER COLUMN reference_id TYPE TEXT;

-- Re-add the unique constraint
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_reference_type_reference_id_key UNIQUE(reference_type, reference_id);

-- Update the split_payments table to use TEXT for payment_date instead of DATE if needed
-- (allowing both DATE and TEXT formats)
-- This is optional if your code passes both date strings and actual dates

-- Ensure the split_payments table has the correct structure
-- Add a text field if it doesn't exist for flexible date handling
ALTER TABLE public.split_payments
ALTER COLUMN payment_date TYPE TEXT;
