# Invoice Bulk/Single Items & Custom GST Feature

## Overview

This feature enables dealers and warehouse staff to add invoice items in two modes:
1. **Single Unit Mode**: Traditional quantity × unit price model
2. **Bulk Mode**: Direct total amount entry (useful for large orders where only total is known)

GST is now fully customizable (0% and above), allowing tax-free items and flexible tax rates.

## Feature Details

### Item Types

#### Single Unit Mode
- **When to use**: Standard invoicing where per-unit pricing is known
- **Input fields**: Unit (Quantity) + Unit Price (₹)
- **Calculation**: `Line Total = Quantity × Unit Price`
- **Example**: 50 units @ ₹500 each = ₹25,000

#### Bulk Mode
- **When to use**: Large orders where total amount is fixed, per-unit cost unknown
- **Input fields**: Quantity + Total Amount (₹)
- **Calculation**: `Line Total = Total Amount directly`
- **Example**: 90 units, Total ₹50,000 (no per-unit price needed)

### GST Configuration

#### Custom GST Rates
- **Minimum**: 0% (tax-free items)
- **Maximum**: Any percentage (typically 0%, 5%, 12%, 18%, 28%)
- **Input type**: Custom number field with validation

#### Calculation Examples

| Item Type | Qty | Unit Price | Total Amount | GST% | Line Total | GST Amount | Total with GST |
|-----------|-----|-----------|--------|------|-----------|-----------|----------------|
| Single | 100 | 500 | - | 18 | 50,000 | 9,000 | 59,000 |
| Bulk | 90 | - | 50,000 | 18 | 50,000 | 9,000 | 59,000 |
| Single | 50 | 100 | - | 0 | 5,000 | 0 | 5,000 |
| Bulk | 200 | - | 80,000 | 5 | 80,000 | 4,000 | 84,000 |

## Database Schema

### Main Tables

#### `dealers_invoices`
```sql
CREATE TABLE dealers_invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  dealer_id UUID,
  dealer_name VARCHAR(255) NOT NULL,
  -- ... other fields
  subtotal DECIMAL(12, 2),
  labour_charges DECIMAL(12, 2),
  total_gst_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2) NOT NULL,
  gst_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `dealers_invoice_items`
```sql
CREATE TABLE dealers_invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES dealers_invoices(id) ON DELETE CASCADE,
  
  -- Product Info
  product_name VARCHAR(255) NOT NULL,
  product_description TEXT,
  
  -- Type: 'single' or 'bulk'
  item_type VARCHAR(20) NOT NULL DEFAULT 'single',
  
  -- Quantity (always required)
  quantity DECIMAL(10, 2) DEFAULT 1,
  
  -- Pricing (unit_price is NULL for bulk type)
  unit_price DECIMAL(12, 2),
  line_total DECIMAL(12, 2) NOT NULL,
  
  -- Tax (supports 0% and above)
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 18,
  gst_amount DECIMAL(12, 2) NOT NULL,
  line_amount_with_gst DECIMAL(12, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### `spares_invoices` and `spares_invoice_products`
- Same structure as dealer invoices
- Uses `spares_invoice_no` instead of `invoice_number`
- Uses `spares_invoice_products` table instead of `dealers_invoice_items`

### Key Constraints

```sql
-- GST rate validation: allows 0% and above
CONSTRAINT gst_check CHECK (gst_rate >= 0)

-- Item type validation
CONSTRAINT item_type_check CHECK (item_type IN ('single', 'bulk'))

-- Amount validation
CONSTRAINT valid_line_total CHECK (line_total >= 0)
```

## Migration Script

Run the SQL migration to update your database:

```bash
# Copy the migration file
sql/UPDATE_DEALERS_INVOICE_WITH_BULK_GST.sql

# Execute in your Supabase database via SQL Editor:
psql -h your-database-host -U postgres -d your-database -f sql/UPDATE_DEALERS_INVOICE_WITH_BULK_GST.sql
```

## Frontend Implementation

### Component Updates

#### Product Item Card Structure
```jsx
<div className="border rounded-lg p-4 bg-card space-y-3">
  {/* Type Selector */}
  <select>
    <option value="single">Single Unit</option>
    <option value="bulk">Bulk</option>
  </select>
  
  {/* Conditional Fields */}
  {isBulk ? (
    <>
      <input placeholder="Quantity" />
      <input placeholder="Total Amount" />
    </>
  ) : (
    <>
      <input placeholder="Unit (Qty)" />
      <input placeholder="Unit Price" />
    </>
  )}
  
  {/* Custom GST Input */}
  <input type="number" placeholder="0-100" min="0" />
  
  {/* Calculations Display */}
  <span>Line Total: ₹{lineTotal}</span>
  <span>GST: ₹{gstAmount}</span>
  <span>With GST: ₹{totalWithGst}</span>
</div>
```

### API Integration

#### Creating an Invoice with Items

```javascript
const invoiceRecord = {
  invoice_number: "DLR/2026-27/001",
  invoice_date: "2026-07-14",
  dealer_name: "Demo Dealer",
  subtotal: 75000,
  total_gst_amount: 13500,
  total_amount: 88500,
  gst_enabled: true
};

// Save invoice
const invoiceResult = await supabase
  .from("dealers_invoices")
  .insert([invoiceRecord])
  .select();

const invoiceId = invoiceResult.data[0].id;

// Prepare items
const items = products.map(p => {
  const isBulk = p.type === 'bulk';
  const lineTotal = isBulk ? p.amount : p.amount * p.unit;
  const gstAmount = (lineTotal * p.gstRate) / 100;
  
  return {
    invoice_id: invoiceId,
    product_name: p.product,
    product_description: p.productDescription,
    item_type: isBulk ? 'bulk' : 'single',
    quantity: p.unit,
    unit_price: isBulk ? null : p.amount,
    line_total: lineTotal,
    gst_rate: p.gstRate,
    gst_amount: gstAmount,
    line_amount_with_gst: lineTotal + gstAmount
  };
});

// Save items
await supabase
  .from("dealers_invoice_items")
  .insert(items);
```

#### Retrieving Invoice with Items

```javascript
// Fetch invoice
const invoice = await supabase
  .from("dealers_invoices")
  .select("*")
  .eq("id", invoiceId)
  .single();

// Fetch items
const { data: items } = await supabase
  .from("dealers_invoice_items")
  .select("*")
  .eq("invoice_id", invoiceId);

// Map back to ProductRow format
const products = items.map(item => ({
  id: item.id,
  product: item.product_name,
  productDescription: item.product_description,
  unit: item.quantity,
  amount: item.item_type === 'bulk' ? item.line_total : item.unit_price,
  gstRate: item.gst_rate,
  type: item.item_type
}));
```

## Validation Rules

### Item Type Specific Validations

#### Single Unit Items
- ✅ Quantity required (> 0)
- ✅ Unit Price required (≥ 0)
- ✅ Calculated: `line_total = unit_price × quantity`

#### Bulk Items
- ✅ Quantity required (> 0)
- ⛔ Unit Price optional (ignored in calculations)
- ✅ Total Amount required (> 0)
- ✅ Calculated: `line_total = total_amount`

#### GST Validation
- ✅ GST rate: 0% or above
- ✅ Supports: 0%, 5%, 12%, 18%, 28%, custom rates
- ✅ Calculation: `gst_amount = line_total × (gst_rate / 100)`

## Summary Calculations

### Invoice Totals

```
Product Total = SUM(line_total for all items)
Labour Charges = (configured separately)
Taxable Value = Product Total + Labour Charges

For each GST rate:
  Subtotal at rate X = SUM(line_total where gst_rate = X)
  GST at rate X = Subtotal at rate X × (X / 100)

Total GST = SUM(all GST amounts)
TOTAL AMOUNT = Taxable Value + Total GST
```

### Example Invoice

**Items:**
1. Single: 100 units @ ₹500 = ₹50,000 (18% GST)
2. Bulk: ₹30,000 (0% GST)
3. Labour Charges: ₹5,000 (18% GST)

**Summary:**
```
Product Total:           ₹80,000
Labour Charges:          ₹5,000
Taxable Value:           ₹85,000

GST (18%):              ₹9,900
  - Product GST 18%:    ₹9,000 (50,000 × 18%)
  - Labour GST 18%:     ₹900 (5,000 × 18%)

TOTAL AMOUNT:           ₹94,900
```

## Testing Checklist

- [ ] Create invoice with single unit items
- [ ] Create invoice with bulk items
- [ ] Create invoice with mixed items (single + bulk)
- [ ] Test 0% GST rate
- [ ] Test custom GST rate (5%, 12%, 28%)
- [ ] Verify calculations with different rates
- [ ] Edit invoice items (change type/rate)
- [ ] Delete invoice item (verify parent cascade)
- [ ] PDF generation includes new fields
- [ ] Export includes item_type and gst_rate
- [ ] Mobile view displays properly
- [ ] Spares invoices work identically

## Troubleshooting

### GST Shows as NaN
**Issue**: GST calculation returns NaN
**Solution**: Ensure `gstRate` is a number, not string. Check parseFloat() conversion.

### 0% GST Not Saving
**Issue**: Setting GST to 0% reverts to 18%
**Solution**: Use `??` operator instead of `||` to allow 0 as valid value
```javascript
// ✗ Wrong
updated[idx].gstRate = parseFloat(e.target.value) || 18;
// ✓ Correct
updated[idx].gstRate = parseFloat(e.target.value) ?? 18;
```

### Bulk Items Missing Unit Price
**Issue**: Bulk items should not require unit price
**Solution**: Make unit_price nullable in schema and allow NULL values

## Related Features

- Split Payments (combines with invoice amounts)
- PDF Generation (respects item types and custom GST)
- CSV Export (includes item_type and gst_rate columns)
- Invoice History (filters and searches by type)
