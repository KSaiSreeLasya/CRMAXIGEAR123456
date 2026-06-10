# GST No. Field Locations

## 1. Sales Form - New Entry (Create)

```
┌─────────────────────────────────────┐
│  New sales entry                    │
├─────────────────────────────────────┤
│ Model No.          [____________]   │
│ Customer Name*     [____________]   │
│ Contact No*        [____________]   │
│ Location           [____________]   │
│ Product Desc*      [____________]   │
│ HSN No.            [____________]   │
│ Chassis No.        [____________]   │
│ Motor No.          [____________]   │
│ Battery No.        [____________]   │
│ Battery warranty   [____________]   │
│ Battery capacity*  [____________]   │
│ Vehicle warranty   [____________]   │
│ Invoice Date*      [____________]   │
│ Amount*            [____________]   │
│ Mode of Payment    [Dropdown____]   │
│ Lead Source        [____________]   │
│ GST No.            [____________]   │ ← NEW FIELD
│ Payment Breakdown  [Section_____]   │
│ [Cancel] [Create]                   │
└─────────────────────────────────────┘
```

## 2. Sales Form - Edit Entry

Same layout as Create - GST No. field appears below Lead Source

```
┌─────────────────────────────────────┐
│  Edit sales entry                   │
├─────────────────────────────────────┤
│ ...previous fields...               │
│ Lead Source        [____________]   │
│ GST No.            [____________]   │ ← NEW FIELD
│ Payment Breakdown  [Section_____]   │
│ [Cancel] [Update]                   │
└─────────────────────────────────────┘
```

## 3. Invoice Preview - Bill To Section

**When GST No. exists:**
```
┌─────────────────────────────────────┐
│ Bill To:                            │
│                                     │
│ Customer Name: John Doe             │
│ Address: 123 Main St, City          │
│ Contact No: 9999999999              │
│ GST No: 36ACJFA4386L1ZW             │ ← DISPLAYED
│                                     │
└─────────────────────────────────────┘
```

**When GST No. does NOT exist:**
```
┌─────────────────────────────────────┐
│ Bill To:                            │
│                                     │
│ Customer Name: John Doe             │
│ Address: 123 Main St, City          │
│ Contact No: 9999999999              │
│                                     │ ← GST field hidden
│                                     │
└─────────────────────────────────────┘
```

## 4. Invoice PDF Download

- If GST No. exists: Included in the PDF output
- If GST No. does NOT exist: Field is omitted from PDF (same as preview)

## Input Field Specifications

**GST No. Input Field:**
- **Label:** GST No.
- **Type:** Text input
- **Placeholder:** e.g. 36ACJFA4386L1ZW
- **Required:** No (optional)
- **Max Length:** No specific limit (typically 15 chars for Indian GSTIN)
- **Position:** After "Lead Source" field, before "Payment Breakdown" section

## Invoice Display Position

**In Invoice Preview:**
- **Section:** "Bill To" box
- **Order:** After "Contact No", before any other details
- **Visibility:** Only when value exists (conditional rendering)
- **Format:** Bold label followed by the GST number

## Code Implementation Details

### Form Field (React)
```jsx
<div>
  <label className="block text-sm font-semibold mb-2">GST No.</label>
  <input
    type="text"
    name="gstNo"
    value={formData.gstNo}
    onChange={handleChange}
    placeholder="e.g. 36ACJFA4386L1ZW"
    className="w-full px-4 py-2 border border-border rounded-lg bg-background..."
  />
</div>
```

### Invoice Display (React)
```jsx
{project.gstNo && (
  <p>
    <span className="font-bold text-gray-800">GST No:</span>
    <span className="text-gray-700">{project.gstNo}</span>
  </p>
)}
```

## Summary

| Aspect | Details |
|--------|---------|
| **Form Position** | Below "Lead Source", above "Payment Breakdown" |
| **Field Type** | Optional text input |
| **Invoice Display** | Conditional (only if filled) |
| **PDF Download** | Same as invoice preview (conditional) |
| **Database** | TEXT column `gst_no` in `projects` table |

## Example Scenarios

### Scenario 1: B2B Sale with GST
- User enters GST No: `36ACJFA4386L1ZW`
- Invoice displays GST field ✓
- PDF includes GST field ✓

### Scenario 2: Direct B2C Sale without GST
- User leaves GST No empty
- Invoice hides GST field ✓
- PDF doesn't include GST field ✓

### Scenario 3: Adding GST Later
- Sale created without GST
- Invoice hides GST field
- User edits sale and adds GST
- Invoice updates to show GST field ✓
