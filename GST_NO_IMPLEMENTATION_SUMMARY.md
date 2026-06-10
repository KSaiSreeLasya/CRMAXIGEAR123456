# GST No. Field Implementation Summary

## Overview
Added GST No. (GSTIN) field to the sales form with conditional display in invoice preview and download functionality. The field is optional and only displays in invoices when a value exists.

## Changes Made

### 1. **Frontend Components**

#### A. Data Model (`client/pages/Projects.tsx`)
- Added optional `gstNo?: string;` field to the `Project` interface
- This allows the interface to accept the GST number from the database

#### B. Sales Form - Create Modal (`client/components/CreateProjectModal.tsx`)
**Added:**
- `gstNo: ""` field to the form state
- GST No. input field in the form UI
- Passed `gstNo` to the form submission handler

**Location in form:** Below "Lead Source" field, before "Payment Breakdown" section

#### C. Sales Form - Edit Modal (`client/components/EditProjectModal.tsx`)
**Added:**
- `gstNo: ""` field to the form state
- GST No. input field in the form UI
- Passed `gstNo` to the form submission handler
- Form loads existing GST No. when editing a project

**Location in form:** Below "Lead Source" field, before "Payment Breakdown" section

#### D. Invoice Preview (`client/components/InvoiceContent.tsx`)
**Added:**
- Conditional display of GST No. in the "Bill To" section
- Only renders if `project.gstNo` exists (truthy check)
- Format: `GST No: [value]`

**Location in invoice:** In the customer details box, after "Contact No"

### 2. **Database Schema**

#### SQL Migration: `sql/ADD_GST_NO_TO_PROJECTS.sql`

```sql
-- Add optional gst_no column to projects table
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS gst_no TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_gst_no ON public.projects(gst_no);
```

**Column Details:**
- **Column Name:** `gst_no`
- **Type:** `TEXT` (supports variable-length strings)
- **Nullable:** Yes (optional field)
- **Example Value:** `36ACJFA4386L1ZW`

## How It Works

### 1. **Creating a New Sale**
1. User clicks "Add Sale Entry"
2. Fills in all required fields including the new "GST No." field (optional)
3. Submits the form
4. Data is saved to the database with `gst_no` value

### 2. **Editing a Sale**
1. User clicks "Edit" on an existing sale
2. All fields including GST No. are pre-populated
3. User can modify the GST No. or leave it empty
4. Changes are saved to the database

### 3. **Invoice Preview**
1. User navigates to the invoice preview page
2. If GST No. exists in the project:
   - It displays in the "Bill To" section below contact number
3. If GST No. doesn't exist:
   - The field is not rendered (hidden)

### 4. **Invoice Download (PDF)**
1. When downloading as PDF, the invoice content is captured
2. The GST No. field is included only if it exists
3. PDF maintains the same conditional display as preview

## Field Specifications

| Property | Value |
|----------|-------|
| **Label** | GST No. |
| **Type** | Text Input |
| **Required** | No (optional) |
| **Placeholder** | e.g. 36ACJFA4386L1ZW |
| **Database Column** | `gst_no` |
| **Database Type** | TEXT |
| **Display in Invoice** | Conditional (only if exists) |

## Testing Checklist

- [ ] Create a new sale without GST No. → Invoice should not display GST field
- [ ] Create a new sale with GST No. → Invoice should display GST field
- [ ] Edit existing sale to add GST No. → Invoice should update
- [ ] Edit existing sale to remove GST No. → Invoice should hide the field
- [ ] Download invoice PDF with GST No. → PDF should include GST
- [ ] Download invoice PDF without GST No. → PDF should not show GST field

## Database Migration Steps

1. **Development (using Supabase Console):**
   - Copy the SQL from `sql/ADD_GST_NO_TO_PROJECTS.sql`
   - Go to Supabase Dashboard → SQL Editor
   - Paste and run the migration script

2. **Production:**
   - Same process in production Supabase database
   - The migration is idempotent (safe to run multiple times)
   - Existing projects will have `NULL` for `gst_no`

## Files Modified

1. `client/pages/Projects.tsx` - Updated Project interface
2. `client/components/CreateProjectModal.tsx` - Added GST No. field to create form
3. `client/components/EditProjectModal.tsx` - Added GST No. field to edit form
4. `client/components/InvoiceContent.tsx` - Added conditional GST No. display in invoice
5. `sql/ADD_GST_NO_TO_PROJECTS.sql` - Created new SQL migration file

## Files Created

1. `sql/ADD_GST_NO_TO_PROJECTS.sql` - Database migration

## Backward Compatibility

- The implementation is fully backward compatible
- Existing projects will have `gst_no = NULL` (no GST number)
- No existing data is affected
- Existing invoices without GST will render correctly (field is simply hidden)

## Future Enhancements

- GST validation (check GSTIN format)
- GST-based filtering/search
- GST exemption indicators
- Integration with GST APIs (if needed)

## Notes

- GST No. is displayed exactly as entered (no formatting applied)
- The field is optional for all sales (not enforced as required)
- If needed to make it required, validation can be added in form validation logic
- The conditional rendering uses simple truthiness check: `if (project.gstNo)`
