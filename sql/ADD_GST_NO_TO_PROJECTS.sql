-- ============================================
-- ADD GST_NO COLUMN TO PROJECTS TABLE
-- ============================================
-- This migration adds support for storing customer GST number in projects table
-- The GST number will be displayed conditionally in invoice previews and downloads

ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS gst_no TEXT;

-- Create index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_projects_gst_no ON public.projects(gst_no);

-- ============================================
-- NOTES
-- ============================================
-- gst_no is optional (nullable) - it will only be displayed in invoices when it exists
-- Format: GSTIN format (e.g., 36ACJFA4386L1ZW)
-- If a project doesn't have a GST number, the field will remain NULL or empty
