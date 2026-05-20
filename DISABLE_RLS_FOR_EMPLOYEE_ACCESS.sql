-- Disable RLS policies to allow employee (non-auth) access to CRM data
-- Run this in Supabase SQL Editor

-- Disable RLS on tables that should be accessible to all employees
ALTER TABLE IF EXISTS public.estimations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spares_inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_invoices DISABLE ROW LEVEL SECURITY;

-- Note: attendance and employee_monthly_payroll can remain restricted if they have proper RLS
-- or disable them as well if needed:
-- ALTER TABLE IF EXISTS public.attendance DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.employee_monthly_payroll DISABLE ROW LEVEL SECURITY;
