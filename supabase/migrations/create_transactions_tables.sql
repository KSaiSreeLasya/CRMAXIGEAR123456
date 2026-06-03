-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('project', 'estimation', 'service_invoice')),
  reference_id UUID NOT NULL,
  total_amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'partial' CHECK (status IN ('partial', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reference_type, reference_id)
);

-- Create split_payments table
CREATE TABLE IF NOT EXISTS split_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  mode_of_payment TEXT NOT NULL,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for transactions: users can only see their own transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy for split_payments: allow access through transaction_id foreign key
DROP POLICY IF EXISTS "Users can view split payments for their transactions" ON split_payments;
CREATE POLICY "Users can view split payments for their transactions"
  ON split_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert split payments for their transactions" ON split_payments;
CREATE POLICY "Users can insert split payments for their transactions"
  ON split_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete split payments for their transactions" ON split_payments;
CREATE POLICY "Users can delete split payments for their transactions"
  ON split_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_split_payments_transaction_id ON split_payments(transaction_id);
