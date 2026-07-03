# Quick Start Guide - CRM Integration

## 🚀 Getting Started in 5 Steps

### Step 1: Verify Supabase Credentials
Open `.env` file and ensure these are set:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 2: Navigate to Dealers Module
Go to: `http://localhost:8080/dealers`

### Step 3: Click "Dealer Audit" Tab
The new audit dashboard is the default first tab.

### Step 4: Select a Dealer
Choose from the dropdown menu to load that dealer's data.

### Step 5: Start Auditing
- Review compliance documents in tabbed interface
- Check live inventory stock
- Browse sales ledger
- Track service records
- Download invoices as needed

---

## 📊 Features at a Glance

| Feature | Location | Purpose |
|---------|----------|---------|
| **Dealer Selection** | Top card | Choose which dealer to audit |
| **Compliance Docs** | Card with tabs | View PAN, GST, Shop, Trade licenses |
| **Inventory** | Live Stock card | See current product stock levels |
| **Sales** | Sales Ledger card | Review customer transactions |
| **Services** | Service Jobs card | Track repair and maintenance work |
| **Download Invoice** | Each sale/service | Export as HTML, print to PDF |

---

## 🔧 Customization Guide

### Change Company Name in Invoices
**File:** `client/lib/invoice-generator.ts` (Line 54)

Find:
```typescript
<div class="invoice-title">AXIGEAR ELECTRIC</div>
```

Replace with your company name:
```typescript
<div class="invoice-title">YOUR_COMPANY_NAME</div>
```

### Change GSTIN
**File:** `client/lib/invoice-generator.ts` (Line 56)

Find:
```typescript
<div>GSTIN: 27AAACA9999A1Z1</div>
```

Replace with your GSTIN:
```typescript
<div>GSTIN: YOUR_GSTIN_HERE</div>
```

### Adjust Invoice Colors
Change the green color (#065f46) in invoice-generator.ts to your brand color.

---

## 📱 Component Overview

```
/dealers Route
├── DealerAuditDashboard (New)
│   ├── Dealer Dropdown Selection
│   ├── Compliance Document Tabs
│   │   ├── PAN Card Preview
│   │   ├── GST Certificate Preview
│   │   ├── Shop License Preview
│   │   └── Trade License Preview
│   ├── Inventory Stock Table
│   ├── Sales Ledger Cards
│   │   └── Download Invoice Button
│   └── Service Records Cards
│       └── Download Invoice Button
├── Manage Dealers Tab (Original)
└── Products Tab (Original)
```

---

## 🔌 Database Requirements

Your Supabase must have these tables:

### ✅ Required Tables
- `dms_dealers` - Dealer information with document fields
- `dms_inventory_items` - Product stock tracking
- `dms_sales` - Sales transactions
- `dms_sale_items` - Individual items in sales
- `dms_service_invoices` - Service/repair jobs
- `dms_service_invoice_items` - Items in service invoices

### ❌ If Tables Don't Exist
1. Create them in Supabase with the schema provided
2. Add sample data for testing
3. Reload the page - data will appear

---

## 🎯 Common Tasks

### Download an Invoice
1. Go to Sales Ledger or Service Records section
2. Find the transaction you want
3. Click "Download" button
4. File `Tax_Invoice_XXXX.html` downloads
5. Open in browser to view/print

### Print Invoice to PDF
1. After downloading HTML invoice
2. Open file in browser
3. Press `Ctrl+P` (or `Cmd+P`)
4. Select "Save as PDF"
5. Choose location and save

### View Compliance Documents
1. Select a dealer
2. Go to "Compliance Documents" section
3. Click tabs: PAN Card, GST Cert, Shop License, Trade License
4. Click "Download" to get the file

### Check Live Inventory
1. Select a dealer
2. Scroll to "Live Inventory Stock"
3. See all products with quantities and values
4. Table shows: Name, Quantity, Unit Price, Total Value

---

## ⚙️ Technical Stack Used

- **Frontend Framework:** React 18 + TypeScript
- **UI Components:** Radix UI + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **API:** Supabase JavaScript Client
- **Icons:** Lucide React
- **State Management:** React Hooks

---

## 🐛 Troubleshooting

### "Dealer dropdown is empty"
→ Check if `dms_dealers` table exists in Supabase
→ Verify Supabase credentials in `.env`

### "No data after selecting dealer"
→ Ensure the selected dealer has records in related tables
→ Check browser console for error messages

### "Documents won't preview"
→ Verify documents are stored as base64 in the database
→ Check if file is PDF or image format

### "Download button does nothing"
→ Check if invoice has required fields (invoice_no, customer_name, total_amount)
→ Open browser console for error messages

---

## 📈 Performance Tips

- The hook fetches all data in **parallel** for speed
- Data is **cached** in component state
- **Lazy loading** prevents unnecessary API calls
- Components **clean up** on unmount to prevent memory leaks

---

## 🔐 Security Notes

- Credentials are in `.env` (never commit this)
- Only anon key needed for read operations
- Supabase RLS (Row Level Security) recommended for production
- Download happens client-side (no server needed)

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `client/hooks/use-live-dealer-network.ts` | Data fetching hook |
| `client/components/DocumentPreviewer.tsx` | Document preview component |
| `client/lib/invoice-generator.ts` | Invoice generation utility |
| `client/components/DealerAuditDashboard.tsx` | Main audit interface |
| `client/pages/Dealers.tsx` | Updated dealers page |

---

## 🚢 Deployment Notes

All new code is:
- ✅ TypeScript typed
- ✅ Production-ready
- ✅ No external API calls (only Supabase)
- ✅ Client-side rendering only
- ✅ No breaking changes to existing code

Simply deploy normally - no special configuration needed!

---

## 📞 Support

For issues or questions:
1. Check `.env` setup first
2. Verify Supabase table schema
3. Check browser console for errors
4. Review IMPLEMENTATION_SUMMARY.md for technical details

---

**Last Updated:** July 3, 2026
**Version:** 1.0 (Production Ready)
