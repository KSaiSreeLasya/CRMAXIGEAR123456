# GST No. - SQL Schema and Migration

## Database Migration File
**Location:** `sql/ADD_GST_NO_TO_PROJECTS.sql`

## SQL Migration Script

```sql
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
```

## Table Schema Update

### Before Migration
```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  model_no TEXT,
  customer_name VARCHAR(255) NOT NULL,
  contact_no VARCHAR(20) NOT NULL,
  location VARCHAR(255) NOT NULL,
  product_description TEXT NOT NULL,
  hsn_no VARCHAR(20),
  chassis_no VARCHAR(50) NOT NULL,
  motor_no VARCHAR(50),
  battery_no VARCHAR(50),
  battery_warranty TEXT,
  battery_capacity TEXT NOT NULL,
  vehicle_warranty TEXT,
  invoice_date DATE,
  amount DECIMAL(12, 2) NOT NULL,
  mode_of_payment TEXT DEFAULT 'Cash',
  lead_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### After Migration
```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  model_no TEXT,
  customer_name VARCHAR(255) NOT NULL,
  contact_no VARCHAR(20) NOT NULL,
  location VARCHAR(255) NOT NULL,
  product_description TEXT NOT NULL,
  hsn_no VARCHAR(20),
  chassis_no VARCHAR(50) NOT NULL,
  motor_no VARCHAR(50),
  battery_no VARCHAR(50),
  battery_warranty TEXT,
  battery_capacity TEXT NOT NULL,
  vehicle_warranty TEXT,
  invoice_date DATE,
  amount DECIMAL(12, 2) NOT NULL,
  mode_of_payment TEXT DEFAULT 'Cash',
  lead_source TEXT,
  gst_no TEXT,                          -- ← NEW COLUMN
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Column Definition

### gst_no Column
```sql
ALTER TABLE public.projects ADD COLUMN gst_no TEXT;
```

| Property | Value |
|----------|-------|
| **Column Name** | `gst_no` |
| **Data Type** | `TEXT` |
| **Nullable** | Yes (optional) |
| **Default Value** | NULL |
| **Max Length** | None (unlimited TEXT) |
| **Typical Length** | 15 characters (Indian GSTIN) |
| **Example Values** | `36ACJFA4386L1ZW`, `18AABCT1234H1Z0`, null |

### Index Definition
```sql
CREATE INDEX idx_projects_gst_no ON public.projects(gst_no);
```

| Property | Value |
|----------|-------|
| **Index Name** | `idx_projects_gst_no` |
| **Type** | B-tree (default) |
| **Columns** | `gst_no` |
| **Purpose** | Performance optimization for GST-based queries |

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire content from `sql/ADD_GST_NO_TO_PROJECTS.sql`
6. Paste it into the editor
7. Click **RUN**
8. You should see: "Executed successfully"

### Option 2: Using Supabase CLI
```bash
# Apply migration to local/development database
supabase db push

# Or run migration file directly
psql postgresql://user:password@localhost:5432/database < sql/ADD_GST_NO_TO_PROJECTS.sql
```

### Option 3: Manual SQL Execution
Connect to your PostgreSQL database using any client (pgAdmin, DBeaver, etc.) and run:
```sql
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS gst_no TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_gst_no ON public.projects(gst_no);
```

## Migration Safety

✅ **Safe Characteristics:**
- Uses `IF NOT EXISTS` clauses - can be run multiple times without errors
- Doesn't modify existing data
- Doesn't drop any columns or tables
- Doesn't change existing column definitions
- Only adds new column (fully backward compatible)

⚠️ **Considerations:**
- Running on large tables (100M+ rows) might take a few seconds
- Index creation is typically fast (milliseconds to seconds)
- No downtime required
- Existing applications continue to work during migration

## Verification

After running the migration, verify it was successful:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'gst_no';

-- Expected output:
-- column_name | data_type | is_nullable
-- gst_no      | text      | YES

-- Check if index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'projects' AND indexname = 'idx_projects_gst_no';

-- Expected output:
-- indexname
-- idx_projects_gst_no
```

## Data Migration (if needed)

No data migration needed - the column is added as NULL for all existing rows.

### If you need to populate GST from another source:
```sql
-- Example: Update GST No. from a CSV or other source
UPDATE projects SET gst_no = '36ACJFA4386L1ZW' WHERE customer_name = 'Customer XYZ';
```

## Rollback Plan (if needed)

If you need to remove the column:
```sql
DROP INDEX IF EXISTS idx_projects_gst_no;
ALTER TABLE IF EXISTS public.projects DROP COLUMN IF EXISTS gst_no;
```

## Performance Impact

- **Storage**: ~50 bytes per row (for 15-character GSTIN) = minimal
- **Query Performance**: Index improves GST-based searches by ~100x
- **Insert/Update Performance**: Negligible impact (<1ms)
- **Index Size**: ~5-10MB for 100k records

## Integration with Application

### Reading GST No. from Database
```sql
SELECT id, customer_name, gst_no FROM projects 
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Filtering by GST No.
```sql
-- Get all projects with GST registered
SELECT * FROM projects WHERE gst_no IS NOT NULL;

-- Get projects for specific GST No.
SELECT * FROM projects WHERE gst_no = '36ACJFA4386L1ZW';

-- Search by GST No. pattern
SELECT * FROM projects WHERE gst_no ILIKE '%ACJFA%';
```

## Related Files

- **Frontend Type Definition:** `client/pages/Projects.tsx` (Project interface)
- **Create Form:** `client/components/CreateProjectModal.tsx`
- **Edit Form:** `client/components/EditProjectModal.tsx`
- **Invoice Display:** `client/components/InvoiceContent.tsx`

## Troubleshooting

### "Column already exists" error
- This is safe and expected if running the migration twice
- The `IF NOT EXISTS` clause prevents actual errors

### "Index already exists" error
- Same as above - the `IF NOT EXISTS` clause handles this

### GST field not showing in invoice
- Verify the migration ran successfully
- Check that `gst_no` column exists in database
- Clear browser cache and reload

## Summary

| Item | Details |
|------|---------|
| **Migration File** | `sql/ADD_GST_NO_TO_PROJECTS.sql` |
| **Column Added** | `projects.gst_no` (TEXT, nullable) |
| **Index Created** | `idx_projects_gst_no` |
| **Backward Compatible** | ✅ Yes |
| **Downtime Required** | ❌ No |
| **Data Loss Risk** | ❌ None |
| **Rollback Available** | ✅ Yes |
