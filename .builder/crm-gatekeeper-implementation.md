# CRM Gatekeeper Implementation

## Overview
The CRM now acts as a **gatekeeper** for incoming dealer shipments, providing managers with a centralized interface to review, accept, or reject products returning from dealers.

## Architecture

### Step A: Incoming Dispatch Dashboard

**Location:** `client/pages/Inventory.tsx` → "Incoming Shipments" Tab

**Component:** `client/components/inventory/IncomingDealerShipments.tsx`

**Query Logic:**
```typescript
// Fetches transfers where:
// - receiver_id IS NULL (means destination is HQ/master warehouse)
// - status = 'Pending Return Acceptance' (awaiting HQ decision)
const { data } = await supabase
  .from("dms_inventory_transfers")
  .select("*")
  .is("receiver_id", null)
  .eq("status", "Pending Return Acceptance")
  .order("created_at", { ascending: false });
```

**Table Display Shows:**
- Transfer ID (unique identifier)
- Dealer Name (sender field)
- Product Name
- Quantity received
- Category (vehicles or spares)
- Serial Numbers (Chassis No, Motor No, Battery No)
- Date transferred

### Step B: Acceptance/Rejection Handlers

#### **Accept Flow (handleAccept)**

When manager clicks "Accept":

1. **Update Master Warehouse Stock:**
   - **For Vehicles:** Increase `inventory_items.vehicle_count` by the received quantity
     - Recalculate `closing_stock = vehicle_count - sales_count`
   - **For Spares:** Increase `spares_inventory.qty` by the received quantity

2. **Mark Transfer Complete:**
   - Update `dms_inventory_transfers.status` → `"Accepted by HQ"`
   - This status change triggers automatic stock deduction on the Dealer Portal side
   - Frees up the "Transit Lock" on dealer inventory

3. **User Feedback:**
   - Toast notification confirms shipment accepted
   - Table refreshes to remove accepted item

#### **Reject Flow (handleReject)**

When manager clicks "Reject":

1. **Mark as Rejected:**
   - Update `dms_inventory_transfers.status` → `"Rejected by HQ"`

2. **Dealer Portal Response:**
   - Status change automatically releases the "Transit Lock"
   - Items return to active dealer inventory counts

3. **User Feedback:**
   - Toast confirms rejection
   - Table refreshes to remove rejected item

## Database Schema Requirements

### Required Tables:

#### `dms_inventory_transfers`
```sql
- id (UUID primary key)
- sku (text) - product SKU
- name (text) - product name
- category (enum: 'vehicles' | 'spares')
- quantity (integer)
- sender (text) - dealer name
- receiver_id (UUID nullable) - null = HQ, otherwise dealer
- status (text) - "Pending Return Acceptance", "Accepted by HQ", "Rejected by HQ"
- date (date)
- chassis_no (text, optional)
- motor_no (text, optional)
- battery_no (text, optional)
- created_at (timestamp)
```

#### `inventory_items`
```sql
- id (UUID primary key)
- model_no (text)
- vehicle_count (integer)
- sales_count (integer)
- closing_stock (integer)
```

#### `spares_inventory`
```sql
- id (UUID primary key)
- part_name (text)
- qty (integer)
```

## User Journey

### CRM Manager Workflow:

1. **Login to CRM Dashboard**
   - See gatekeeper notification: "Visit INVENTORY module → 'Incoming Shipments' tab"

2. **Navigate to Inventory**
   - Click INVENTORY module on dashboard
   - Default opens "Sales Vehicles Inventory" tab

3. **Switch to Incoming Shipments Tab**
   - Click "Incoming Shipments" tab
   - View all pending returns from dealers

4. **Review Shipment Details**
   - See dealer name, product details, quantities, serial numbers
   - Verify physical receipt matches database record

5. **Accept or Reject**
   - **Accept Button:** Master warehouse stock increases immediately
   - **Reject Button:** Items released back to dealer inventory

6. **Confirmation**
   - Toast notification confirms action
   - Table updates in real-time

## Features

✅ **Real-time Data Sync:** Pulls from Supabase dms_inventory_transfers table
✅ **Dual Action Handlers:** Accept or Reject with single click
✅ **Automatic Stock Updates:** Vehicle and spare inventory updated immediately
✅ **Serial Number Tracking:** Displays Chassis/Motor/Battery numbers
✅ **Error Handling:** Gracefully handles missing inventory items
✅ **User Feedback:** Toast notifications for all actions
✅ **Empty State:** Clear message when no pending shipments

## Integration Points

### Dashboard (client/pages/Dashboard.tsx)
- Removed analytics cards
- Added gatekeeper notification banner
- Direct link to Inventory module

### Inventory Page (client/pages/Inventory.tsx)
- Already structured with 3 tabs
- "Incoming Shipments" tab imports IncomingDealerShipments component
- Seamless integration with existing inventory management

### Supabase Configuration
- Uses configured VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- All queries filtered for HQ (receiver_id is null)
- Real-time sync with toast notifications

## Files Modified

1. **client/pages/Dashboard.tsx**
   - Removed stat cards analytics
   - Added gatekeeper notification banner
   - Kept module grid for navigation

2. **client/pages/Inventory.tsx**
   - Already imports IncomingDealerShipments component
   - Tab structure properly configured

3. **client/components/inventory/IncomingDealerShipments.tsx**
   - Full implementation with query, display, and action handlers
   - No changes needed

## Error Handling

- Missing Supabase connection: Shows warning, disables functionality
- Missing inventory item: Accepts shipment but shows warning message
- Database update failures: Logs error, shows toast notification
- Network errors: Caught and displayed as toast

## Future Enhancements

- [ ] Bulk accept/reject functionality
- [ ] Barcode scanning for quick acceptance
- [ ] Photo upload for receipt verification
- [ ] Audit trail/history view
- [ ] Notifications to dealer on acceptance/rejection
- [ ] Export accepted/rejected shipments report
