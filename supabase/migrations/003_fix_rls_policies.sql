-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view split payments for their transactions" ON public.split_payments;
DROP POLICY IF EXISTS "Users can create split payments for their transactions" ON public.split_payments;
DROP POLICY IF EXISTS "Users can update split payments for their transactions" ON public.split_payments;
DROP POLICY IF EXISTS "Users can delete split payments for their transactions" ON public.split_payments;

-- Recreate RLS policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions"
  ON public.transactions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Recreate RLS policies for split_payments
CREATE POLICY "Users can view split payments for their transactions"
  ON public.split_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create split payments for their transactions"
  ON public.split_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update split payments for their transactions"
  ON public.split_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete split payments for their transactions"
  ON public.split_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = split_payments.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );
