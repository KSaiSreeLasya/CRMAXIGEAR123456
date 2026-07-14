# SQL Schema Summary - Invoice Updates

## Quick Setup

Run this SQL to create/update your database schema:

```bash
# In Supabase SQL Editor, run:
-- From: sql/UPDATE_DEALERS_INVOICE_WITH_BULK_GST.sql
```

## Table Structure Overview

### dealers_invoices
Main invoice header table
```
id (UUID)
├─ invoice_number (VARCHAR, UNIQUE)
├─ invoice_date (DATE)
├─ due_date (DATE)
├─ dealer_id (UUID)
├─ dealer_name (VARCHAR)
├─ contact_no (VARCHAR)
├─ location (VARCHAR)
├─ purchase_order_no (VARCHAR)
├─ sent_to (VARCHAR)
├─ ship_to (VARCHAR)
├─ mode_of_payment (VARCHAR)
├─ lead_source (VARCHAR)
├─ subtotal (DECIMAL)
├─ labour_charges (DECIMAL)
├─ total_gst_amount (DECIMAL)
├─ total_amount (DECIMAL) ← REQUIRED
├─ gst_enabled (BOOLEAN)
├─ payment_status (VARCHAR) ← pending|paid|partial
├─ created_at (TIMESTAMP)
├─ updated_at (TIMESTAMP)
└─ is_deleted (BOOLEAN)
```

### dealers_invoice_items
Line items with bulk/single and custom GST support
```
id (UUID)
├─ invoice_id (UUID) ← FK to dealers_invoices
├─ product_name (VARCHAR) ← REQUIRED
├─ product_description (TEXT)
├─ item_type (VARCHAR) ← REQUIRED: 'single' or 'bulk'
├─ quantity (DECIMAL) ← REQUIRED (qty of items)
├─ unit_price (DECIMAL) ← NULL for bulk, required for single
├─ line_total (DECIMAL) ← REQUIRED (qty*price for single, direct amount for bulk)
├─ gst_rate (DECIMAL) ← REQUIRED: allows 0% and above
├─ gst_amount (DECIMAL) ← REQUIRED: calculated
├─ line_amount_with_gst (DECIMAL) ← REQUIRED
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

### spares_invoices
Same as dealers_invoices but for spare parts
```
id (UUID)
├─ spares_invoice_no (VARCHAR, UNIQUE)
├─ invoice_date (DATE)
├─ due_date (DATE)
├─ dealer_id (UUID)
├─ dealer_name (VARCHAR)
├─ [... same fields as dealers_invoices ...]
└─ is_deleted (BOOLEAN)
```

### spares_invoice_products
Same as dealers_invoice_items but for spare parts
```
id (UUID)
├─ spares_invoice_id (UUID) ← FK to spares_invoices
├─ product_name (VARCHAR)
├─ description (TEXT)
├─ item_type (VARCHAR) ← 'single' or 'bulk'
├─ unit_quantity (DECIMAL)
├─ unit_price (DECIMAL)
├─ line_total (DECIMAL)
├─ gst_rate (DECIMAL) ← allows 0% and above
├─ gst_amount (DECIMAL)
├─ line_amount_with_gst (DECIMAL)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

## Key SQL Examples

### Create Invoice with Items (Single Unit)
```sql
-- 1. Insert Invoice
INSERT INTO dealers_invoices (
  invoice_number, invoice_date, dealer_name,
  subtotal, total_gst_amount, total_amount, gst_enabled
) VALUES (
  'DLR/2026-27/001', '2026-07-14', 'Test Dealer',
  50000, 9000, 59000, true
) RETURNING id;
-- Store the returned id as invoice_id

-- 2. Insert Item (Single Unit Mode)
INSERT INTO dealers_invoice_items (
  invoice_id, product_name, item_type,
  quantity, unit_price, line_total,
  gst_rate, gst_amount, line_amount_with_gst
) VALUES (
  'invoice_id_here', 'Product A', 'single',
  100, 500, 50000,
  18, 9000, 59000
);
```

### Create Invoice with Items (Bulk Mode)
```sql
-- Insert Item (Bulk Mode - unit_price is NULL)
INSERT INTO dealers_invoice_items (
  invoice_id, product_name, item_type,
  quantity, unit_price, line_total,
  gst_rate, gst_amount, line_amount_with_gst
) VALUES (
  'invoice_id_here', 'Bulk Order', 'bulk',
  90, NULL, 50000,
  18, 9000, 59000
);
```

### Create Invoice with 0% GST
```sql
-- Item with no GST
INSERT INTO dealers_invoice_items (
  invoice_id, product_name, item_type,
  quantity, unit_price, line_total,
  gst_rate, gst_amount, line_amount_with_gst
) VALUES (
  'invoice_id_here', 'Tax-Free Item', 'single',
  50, 100, 5000,
  0, 0, 5000
);
```

### Fetch Invoice with Items
```sql
SELECT 
  i.*,
  json_agg(
    json_build_object(
      'id', items.id,
      'product_name', items.product_name,
      'item_type', items.item_type,
      'quantity', items.quantity,
      'unit_price', items.unit_price,
      'line_total', items.line_total,
      'gst_rate', items.gst_rate,
      'gst_amount', items.gst_amount,
      'line_amount_with_gst', items.line_amount_with_gst
    )
  ) as items
FROM dealers_invoices i
LEFT JOIN dealers_invoice_items items ON i.id = items.invoice_id
WHERE i.id = 'invoice_id_here'
GROUP BY i.id;
```

### Calculate Invoice Totals
```sql
SELECT
  i.id,
  i.invoice_number,
  SUM(items.line_total) as product_total,
  i.labour_charges,
  SUM(items.line_total) + COALESCE(i.labour_charges, 0) as taxable_value,
  SUM(items.gst_amount) as total_gst,
  SUM(items.line_amount_with_gst) as total_with_gst
FROM dealers_invoices i
LEFT JOIN dealers_invoice_items items ON i.id = items.invoice_id
WHERE i.is_deleted = false
GROUP BY i.id, i.invoice_number, i.labour_charges;
```

### Get Invoice Summary by GST Rate
```sql
SELECT
  gst_rate,
  COUNT(*) as item_count,
  SUM(line_total) as subtotal,
  SUM(gst_amount) as gst_total,
  SUM(line_amount_with_gst) as total_with_gst
FROM dealers_invoice_items
WHERE invoice_id = 'invoice_id_here'
GROUP BY gst_rate
ORDER BY gst_rate;
```

### Update Item Type or GST Rate
```sql
UPDATE dealers_invoice_items
SET
  item_type = 'bulk',
  unit_price = NULL,
  line_total = 50000,
  gst_rate = 0,
  gst_amount = 0,
  line_amount_with_gst = 50000
WHERE id = 'item_id_here';
```

### Delete Invoice (Soft Delete)
```sql
UPDATE dealers_invoices
SET is_deleted = true
WHERE id = 'invoice_id_here';
-- Items cascade delete via foreign key
```

### Get Active Invoices
```sql
SELECT * FROM active_dealers_invoices
WHERE dealer_name LIKE '%search%'
ORDER BY invoice_date DESC
LIMIT 50;
```

## Validation Constraints

```sql
-- GST rate must be 0 or above (allows tax-free items)
CHECK (gst_rate >= 0)

-- Item type is either single or bulk
CHECK (item_type IN ('single', 'bulk'))

-- Amounts must be non-negative
CHECK (line_total >= 0)
CHECK (gst_amount >= 0)
CHECK (total_amount >= 0)

-- Payment status limited to specific values
CHECK (payment_status IN ('pending', 'paid', 'partial'))
```

## Indexes Created

```sql
-- Performance indexes
idx_dealers_invoices_invoice_date
idx_dealers_invoices_dealer_id
idx_dealers_invoices_created_at
idx_dealers_invoices_deleted
idx_dealers_invoices_invoice_no

idx_dealers_invoice_items_invoice_id
idx_dealers_invoice_items_item_type

-- Same indexes for spares invoices
```

## Row Level Security (RLS)

All tables have RLS enabled with policies allowing authenticated users to:
- SELECT (read all records)
- INSERT (create new records)
- UPDATE (modify records)
- DELETE (delete records)

Adjust policies based on your authentication model.

## TypeScript Types

```typescript
interface ProductRow {
  id?: string;
  product: string;
  productDescription: string;
  amount: number;
  unit: number;
  gstRate: number;
  type?: "single" | "bulk"; // NEW
}

interface DealerInvoiceRecord {
  id: string;
  dealerInvoiceNo: string;
  dealerName: string;
  dealerId?: string;
  contactNo: string;
  location: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  sentTo: string;
  shipTo: string;
  products: ProductRow[];
  total: number;
  labourCharges: number;
  gstEnabled: boolean;
  gstAmount: number;
  modeOfPayment: string;
  leadSource: string;
  createdAt: string;
}
```

## Migration Checklist

- [ ] Backup existing database
- [ ] Run migration SQL: `sql/UPDATE_DEALERS_INVOICE_WITH_BULK_GST.sql`
- [ ] Verify tables created: `dealers_invoices`, `dealers_invoice_items`, `spares_invoices`, `spares_invoice_products`
- [ ] Verify indexes created
- [ ] Test create invoice with items
- [ ] Test 0% GST
- [ ] Test bulk vs single items
- [ ] Verify RLS policies
- [ ] Test PDF generation
- [ ] Test CSV export with new columns
