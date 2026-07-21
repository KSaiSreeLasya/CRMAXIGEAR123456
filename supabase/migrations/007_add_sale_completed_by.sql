ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sale_completed_by TEXT;
