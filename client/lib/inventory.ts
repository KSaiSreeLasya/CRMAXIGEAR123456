import { supabase } from "./supabase";

interface InventoryItem {
  id: string;
  vehicle_count: number;
  sales_count: number;
  closing_stock: number;
  chassis_no: string;
  model_no: string;
}

export async function deductInventoryForSale(
  modelNo: string,
  chassisNo: string
): Promise<void> {
  if (!modelNo || !chassisNo) return;

  try {
    if (!supabase) {
      // Handle localStorage fallback
      const raw = localStorage.getItem("crm_inventory_items");
      if (!raw) return;

      const items = JSON.parse(raw);
      const itemIndex = items.findIndex((item: any) =>
        (item.modelNo || "").toLowerCase().includes(modelNo.toLowerCase())
      );

      if (itemIndex === -1) return;

      const item = items[itemIndex];
      const chassisArray = item.chassisNo
        ? item.chassisNo.split(",").map((c: string) => c.trim())
        : [];

      const filteredChassis = chassisArray.filter(
        (c: string) => c.toLowerCase() !== chassisNo.toLowerCase()
      );

      items[itemIndex] = {
        ...item,
        salesCount: (item.salesCount || 0) + 1,
        chassisNo: filteredChassis.join(", "),
        closingStock: item.vehicleCount - ((item.salesCount || 0) + 1),
      };

      localStorage.setItem("crm_inventory_items", JSON.stringify(items));
      return;
    }

    // Fetch inventory item by model_no
    const { data: inventoryData, error: fetchError } = await supabase
      .from("inventory_items")
      .select("id, vehicle_count, sales_count, closing_stock, chassis_no, model_no")
      .ilike("model_no", `%${modelNo}%`)
      .single();

    if (fetchError || !inventoryData) {
      console.warn(
        "Could not find inventory item for model:",
        modelNo,
        fetchError?.message
      );
      return;
    }

    const item = inventoryData as InventoryItem;
    const chassisArray = item.chassis_no
      ? item.chassis_no.split(",").map((c) => c.trim())
      : [];

    const filteredChassis = chassisArray.filter(
      (c) => c.toLowerCase() !== chassisNo.toLowerCase()
    );

    const newSalesCount = (item.sales_count || 0) + 1;
    const newClosingStock = item.vehicle_count - newSalesCount;

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        sales_count: newSalesCount,
        chassis_no: filteredChassis.length > 0 ? filteredChassis.join(", ") : null,
        closing_stock: newClosingStock,
      })
      .eq("id", item.id);

    if (updateError) {
      console.error("Error updating inventory for sale:", updateError.message);
    }
  } catch (error) {
    console.error("Error in deductInventoryForSale:", error);
  }
}

export async function restoreInventoryForDeletedSale(
  modelNo: string,
  chassisNo: string
): Promise<void> {
  if (!modelNo || !chassisNo) return;

  try {
    if (!supabase) {
      const raw = localStorage.getItem("crm_inventory_items");
      if (!raw) return;

      const items = JSON.parse(raw);
      const itemIndex = items.findIndex((item: any) =>
        (item.modelNo || "").toLowerCase().includes(modelNo.toLowerCase())
      );

      if (itemIndex === -1) return;

      const item = items[itemIndex];
      const chassisArray = item.chassisNo
        ? item.chassisNo.split(",").map((c: string) => c.trim())
        : [];

      if (!chassisArray.includes(chassisNo)) {
        chassisArray.push(chassisNo);
      }

      items[itemIndex] = {
        ...item,
        salesCount: Math.max(0, (item.salesCount || 0) - 1),
        chassisNo: chassisArray.join(", "),
        closingStock: item.vehicleCount - Math.max(0, (item.salesCount || 0) - 1),
      };

      localStorage.setItem("crm_inventory_items", JSON.stringify(items));
      return;
    }

    const { data: inventoryData, error: fetchError } = await supabase
      .from("inventory_items")
      .select("id, vehicle_count, sales_count, closing_stock, chassis_no, model_no")
      .ilike("model_no", `%${modelNo}%`)
      .single();

    if (fetchError || !inventoryData) {
      console.warn("Could not find inventory item for restoration:", modelNo);
      return;
    }

    const item = inventoryData as InventoryItem;
    const chassisArray = item.chassis_no
      ? item.chassis_no.split(",").map((c) => c.trim())
      : [];

    if (!chassisArray.includes(chassisNo)) {
      chassisArray.push(chassisNo);
    }

    const newSalesCount = Math.max(0, (item.sales_count || 0) - 1);
    const newClosingStock = item.vehicle_count - newSalesCount;

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        sales_count: newSalesCount,
        chassis_no: chassisArray.length > 0 ? chassisArray.join(", ") : null,
        closing_stock: newClosingStock,
      })
      .eq("id", item.id);

    if (updateError) {
      console.error("Error restoring inventory:", updateError.message);
    }
  } catch (error) {
    console.error("Error in restoreInventoryForDeletedSale:", error);
  }
}
