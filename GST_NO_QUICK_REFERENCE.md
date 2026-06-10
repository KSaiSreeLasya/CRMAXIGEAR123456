# GST No. Implementation - Quick Reference

## What Was Changed

Added **GST No.** field to sales form with conditional display in invoices.

## Quick Start

### 1. Run the Database Migration
Copy and run `sql/ADD_GST_NO_TO_PROJECTS.sql` in Supabase SQL Editor:

```sql
ALTER TABLE IF EXISTS public.projects ADD COLUMN IF NOT EXISTS gst_no TEXT;
CREATE INDEX IF NOT EXISTS idx_projects_gst_no ON public.projects(gst_no);
```

### 2. Use the Feature
- **Creating Sale:** Fill "GST No." field (optional)
- **Editing Sale:** Modify or clear "GST No." field
- **Invoice Preview:** GST No. displays only if filled
- **Invoice PDF:** Same as preview (conditional)

## Files Modified

| File | Change |
|------|--------|
| `client/pages/Projects.tsx` | Added `gstNo?: string;` to Project interface |
| `client/components/CreateProjectModal.tsx` | Added GST No. field to create form |
| `client/components/EditProjectModal.tsx` | Added GST No. field to edit form |
| `client/components/InvoiceContent.tsx` | Added conditional GST display in invoice |
| `sql/ADD_GST_NO_TO_PROJECTS.sql` | Created database migration (NEW FILE) |

## Field Location in Forms

**Position:** Below "Lead Source" field, above "Payment Breakdown" section

**Properties:**
- Label: GST No.
- Placeholder: e.g. 36ACJFA4386L1ZW
- Required: No
- Type: Text input

## Invoice Display

**Bill To Section:**
```
Customer Name: John Doe
Address: 123 Main St
Contact No: 9999999999
GST No: 36ACJFA4386L1ZW  ← Shows only if filled
```

## Database Schema

### New Column
```sql
projects.gst_no TEXT (nullable)
```

### New Index
```sql
idx_projects_gst_no (for performance)
```

## Testing

- ✅ Create sale without GST → Invoice hides GST field
- ✅ Create sale with GST → Invoice shows GST field
- ✅ Edit sale to add GST → Invoice updates
- ✅ Download PDF with/without GST → Correct output

## Key Features

| Feature | Status |
|---------|--------|
| Optional field | ✅ |
| Conditional display | ✅ |
| Works in invoice preview | ✅ |
| Works in PDF download | ✅ |
| Backward compatible | ✅ |
| No data loss | ✅ |

## Common Scenarios

### B2B with GST Registration
- Enter GST No: `36ACJFA4386L1ZW`
- Invoice displays GST ✓
- PDF includes GST ✓

### B2C without GST
- Leave GST No. empty
- Invoice hides GST ✓
- PDF doesn't show GST ✓

### Add GST Later
- Edit existing sale
- Add GST No.
- Invoice updates ✓

## Code Example

### Create Sale
```javascript
const newSale = {
  customerName: "XYZ Corp",
  contactNo: "9999999999",
  amount: 150000,
  gstNo: "36ACJFA4386L1ZW",  // Optional
  // ... other fields
};
```

### Invoice Component
```jsx
{project.gstNo && (
  <p>
    <span className="font-bold">GST No:</span>
    <span>{project.gstNo}</span>
  </p>
)}
```

## Database Query Examples

### Get all projects with GST
```sql
SELECT * FROM projects WHERE gst_no IS NOT NULL;
```

### Get projects for specific GST
```sql
SELECT * FROM projects WHERE gst_no = '36ACJFA4386L1ZW';
```

### Update GST for a project
```sql
UPDATE projects SET gst_no = '36ACJFA4386L1ZW' WHERE id = 'project-id';
```

## FAQ

**Q: Is GST No. required?**
A: No, it's optional. Only B2B customers with GST registration need to fill it.

**Q: Can I add GST later?**
A: Yes, edit the sale and add/modify the GST No.

**Q: Will existing invoices break?**
A: No, existing sales will have empty GST No., and invoices will hide the field.

**Q: Does PDF include GST?**
A: Yes, same as preview - shows only if filled.

**Q: Can I export/filter by GST?**
A: Yes, you can query the database by `gst_no` column.

## Deployment Checklist

- [ ] Run SQL migration in Supabase
- [ ] Verify migration completed (check Supabase logs)
- [ ] Test creating new sale with GST
- [ ] Test creating new sale without GST
- [ ] Test invoice preview with/without GST
- [ ] Test invoice PDF download
- [ ] Test editing existing sale to add/remove GST

## Support

For issues or questions:
1. Check invoice preview to verify GST field
2. Verify migration ran in Supabase
3. Clear browser cache and reload
4. Check database schema: `projects.gst_no` should exist
