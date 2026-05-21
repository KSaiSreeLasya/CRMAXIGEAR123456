import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Plus, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getEmployeeSession } from "@/lib/auth";

interface InventoryItem {
  id: string;
  slNo: number;
  modelNo: string;
  brand: string;
  vehicleModel: string;
  hsnNo: string;
  vehicleCount: number;
  chassisNo: string;
  motorNo: string;
  batteryNo: string;
  manufacturerInvNo: string;
  batteryModel: string;
  batteryCount: number;
  salesCount: number;
  closingStock: number;
  createdAt: string;
}

interface SpareItem {
  id: string;
  partName: string;
  price: number;
  qty: number;
  total: number;
  createdAt: string;
}


const DEFAULT_FORM = {
  slNo: "",
  modelNo: "",
  brand: "",
  vehicleModel: "",
  hsnNo: "",
  vehicleCount: "",
  chassisNo: "",
  motorNo: "",
  batteryNo: "",
  manufacturerInvNo: "",
  batteryModel: "",
  batteryCount: "",
  salesCount: "",
};

const DEFAULT_SPARE_FORM = {
  partName: "",
  price: "",
  qty: "",
};


export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [spares, setSpares] = useState<SpareItem[]>([]);
  const [spareForm, setSpareForm] = useState(DEFAULT_SPARE_FORM);
  const [editingSpareId, setEditingSpareId] = useState<string | null>(null);
  const [isLoadingSpares, setIsLoadingSpares] = useState(false);
  const [isSavingSpare, setIsSavingSpare] = useState(false);

  const employeeSession = getEmployeeSession();
  const isAdmin = !employeeSession;


  useEffect(() => {
    void loadInventory();
    void loadSpares();
  }, []);

  const persistLocal = (rows: InventoryItem[]) => {
    setItems(rows);
    localStorage.setItem("crm_inventory_items", JSON.stringify(rows));
  };

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("inventory_items")
            .select("*")
            .order("sl_no", { ascending: true });
          if (error) throw error;
          const rows: InventoryItem[] =
            data?.map((row: any) => ({
              id: row.id,
              slNo: row.sl_no,
              modelNo: row.model_no || "",
              brand: row.brand || "",
              vehicleModel: row.vehicle_model || "",
              hsnNo: row.hsn_no || "",
              vehicleCount: row.vehicle_count || 0,
              chassisNo: row.chassis_no || "",
              motorNo: row.motor_no || "",
              batteryNo: row.battery_no || "",
              manufacturerInvNo: row.manufacturer_inv_no || "",
              batteryModel: row.battery_model || "",
              batteryCount: row.battery_count || 0,
              salesCount: row.sales_count || 0,
              closingStock: row.closing_stock || 0,
              createdAt: new Date(row.created_at).toLocaleDateString(),
            })) || [];
          setItems(rows);
          return;
        } catch (supabaseError: any) {
          console.warn("Supabase inventory load failed, falling back to localStorage:", supabaseError?.message);
        }
      }
      const raw = localStorage.getItem("crm_inventory_items");
      if (raw) setItems(JSON.parse(raw));
    } catch (error) {
      console.error("Error loading inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpares = async () => {
    setIsLoadingSpares(true);
    try {
      if (supabase) {
        try {
          const { data: sparesData, error: sparesError } = await supabase
            .from("spares_inventory")
            .select("*")
            .order("created_at", { ascending: false });
          if (sparesError) throw sparesError;

          // Fetch sold units from service invoices
          const { data: invoicesData, error: invoicesError } = await supabase
            .from("service_invoices")
            .select("product, unit");

          if (invoicesError) {
            console.warn("Could not load service invoices for sold qty calculation:", invoicesError?.message);
          }

          // Calculate sold units per product
          const soldUnits: Record<string, number> = {};
          if (invoicesData) {
            invoicesData.forEach((inv: any) => {
              const product = inv.product || "";
              soldUnits[product] = (soldUnits[product] || 0) + (inv.unit || 0);
            });
          }

          const rows: SpareItem[] =
            sparesData?.map((row: any) => {
              const partName = row.part_name || "";
              const stockQty = row.qty || 0;
              const soldQty = soldUnits[partName] || 0;
              const remainingQty = Math.max(0, stockQty - soldQty);

              return {
                id: row.id,
                partName: partName,
                price: row.price || 0,
                qty: remainingQty,
                total: row.total || 0,
                createdAt: new Date(row.created_at).toLocaleDateString(),
              };
            }) || [];
          setSpares(rows);
          return;
        } catch (supabaseError: any) {
          console.warn("Supabase spares load failed (table may not exist), falling back to localStorage:", supabaseError?.message);
        }
      }
      const raw = localStorage.getItem("crm_spares_inventory");
      if (raw) setSpares(JSON.parse(raw));
    } catch (error) {
      console.error("Error loading spares from localStorage:", error);
    } finally {
      setIsLoadingSpares(false);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const vehicleCount = Number(form.vehicleCount || 0);
      const batteryCount = Number(form.batteryCount || 0);
      const salesCount = Number(form.salesCount || 0);
      const closingStock = vehicleCount - salesCount;

      const payload = {
        slNo: Number(form.slNo || 0),
        modelNo: form.modelNo.trim(),
        brand: form.brand.trim(),
        vehicleModel: form.vehicleModel.trim(),
        hsnNo: form.hsnNo.trim(),
        vehicleCount,
        chassisNo: form.chassisNo.trim(),
        motorNo: form.motorNo.trim(),
        batteryNo: form.batteryNo.trim(),
        manufacturerInvNo: form.manufacturerInvNo.trim(),
        batteryModel: form.batteryModel.trim(),
        batteryCount,
        salesCount,
        closingStock,
      };

      if (editingId) {
        if (supabase) {
          const { error } = await supabase
            .from("inventory_items")
            .update({
              sl_no: payload.slNo,
              model_no: payload.modelNo || null,
              brand: payload.brand || null,
              vehicle_model: payload.vehicleModel || null,
              hsn_no: payload.hsnNo || null,
              vehicle_count: payload.vehicleCount,
              chassis_no: payload.chassisNo || null,
              motor_no: payload.motorNo || null,
              battery_no: payload.batteryNo || null,
              manufacturer_inv_no: payload.manufacturerInvNo || null,
              battery_model: payload.batteryModel || null,
              battery_count: payload.batteryCount,
              sales_count: payload.salesCount,
              closing_stock: payload.closingStock,
            })
            .eq("id", editingId);
          if (error) throw error;
        }

        const next = items
          .map((item) => (item.id === editingId ? { ...item, ...payload } : item))
          .sort((a, b) => a.slNo - b.slNo);
        persistLocal(next);
      } else {
        if (supabase) {
          let userId: string | undefined;

          if (employeeSession) {
            userId = employeeSession.employeeId;
          } else {
            try {
              const { data: userData } = await supabase.auth.getUser();
              userId = userData.user?.id;
            } catch (err) {
              console.warn("Could not fetch Supabase user:", err);
            }
          }

          if (!userId) {
            throw new Error("User not authenticated");
          }

          try {
            const { data, error } = await supabase
              .from("inventory_items")
              .insert([
                {
                  user_id: userId,
                  sl_no: payload.slNo,
                  model_no: payload.modelNo || null,
                  brand: payload.brand || null,
                  vehicle_model: payload.vehicleModel || null,
                  hsn_no: payload.hsnNo || null,
                  vehicle_count: payload.vehicleCount,
                  chassis_no: payload.chassisNo || null,
                  motor_no: payload.motorNo || null,
                  battery_no: payload.batteryNo || null,
                  manufacturer_inv_no: payload.manufacturerInvNo || null,
                  battery_model: payload.batteryModel || null,
                  battery_count: payload.batteryCount,
                  sales_count: payload.salesCount,
                  closing_stock: payload.closingStock,
                },
              ])
              .select()
              .single();
            if (error) throw error;

            const created: InventoryItem = {
              id: data.id,
              slNo: data.sl_no,
              modelNo: data.model_no || "",
              brand: data.brand || "",
              vehicleModel: data.vehicle_model || "",
              hsnNo: data.hsn_no || "",
              vehicleCount: data.vehicle_count || 0,
              chassisNo: data.chassis_no || "",
              motorNo: data.motor_no || "",
              batteryNo: data.battery_no || "",
              manufacturerInvNo: data.manufacturer_inv_no || "",
              batteryModel: data.battery_model || "",
              batteryCount: data.battery_count || 0,
              salesCount: data.sales_count || 0,
              closingStock: data.closing_stock || 0,
              createdAt: new Date(data.created_at).toLocaleDateString(),
            };
            setItems((prev) => [...prev, created].sort((a, b) => a.slNo - b.slNo));
          } catch (supabaseError: any) {
            console.warn("Supabase insert failed, falling back to localStorage:", supabaseError?.message);
            const created: InventoryItem = {
              id: `inventory_${Date.now()}`,
              createdAt: new Date().toLocaleDateString(),
              ...payload,
            };
            persistLocal([...items, created].sort((a, b) => a.slNo - b.slNo));
          }
        } else {
          const created: InventoryItem = {
            id: `inventory_${Date.now()}`,
            createdAt: new Date().toLocaleDateString(),
            ...payload,
          };
          persistLocal([...items, created].sort((a, b) => a.slNo - b.slNo));
        }
      }

      setForm(DEFAULT_FORM);
      setEditingId(null);
    } catch (error: any) {
      console.error("Error saving inventory item:", error);
      alert(error?.message || "Failed to save inventory item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this inventory row?")) return;
    try {
      if (supabase) {
        const { error } = await supabase.from("inventory_items").delete().eq("id", id);
        if (error) throw error;
      }
      persistLocal(items.filter((item) => item.id !== id));
    } catch (error: any) {
      console.error("Error deleting inventory item:", error);
      alert(error?.message || "Failed to delete inventory item.");
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      slNo: String(item.slNo),
      modelNo: item.modelNo,
      brand: item.brand,
      vehicleModel: item.vehicleModel,
      hsnNo: item.hsnNo,
      vehicleCount: String(item.vehicleCount),
      chassisNo: item.chassisNo,
      motorNo: item.motorNo,
      batteryNo: item.batteryNo,
      manufacturerInvNo: item.manufacturerInvNo,
      batteryModel: item.batteryModel,
      batteryCount: String(item.batteryCount),
      salesCount: String(item.salesCount),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleSaveSpare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSpare(true);
    try {
      const price = isAdmin ? Number(spareForm.price || 0) : 0;
      const qty = Number(spareForm.qty || 0);
      const total = price * qty;

      const payload = {
        partName: spareForm.partName.trim(),
        price,
        qty,
        total,
      };

      if (editingSpareId) {
        if (supabase) {
          const { error } = await supabase
            .from("spares_inventory")
            .update({
              part_name: payload.partName,
              price: payload.price,
              qty: payload.qty,
            })
            .eq("id", editingSpareId);
          if (error) throw error;
        }

        const updated = spares.map((item) =>
          item.id === editingSpareId
            ? {
                ...item,
                partName: payload.partName,
                price: payload.price,
                qty: payload.qty,
                total: payload.total,
              }
            : item
        );
        setSpares(updated);
        localStorage.setItem("crm_spares_inventory", JSON.stringify(updated));
      } else {
        let created: SpareItem;
        if (supabase) {
          try {
            let userId: string | undefined;

            if (employeeSession) {
              userId = employeeSession.employeeId;
            } else {
              try {
                const { data: userData } = await supabase.auth.getUser();
                userId = userData.user?.id;
              } catch (err) {
                console.warn("Could not fetch Supabase user:", err);
              }
            }

            if (!userId) {
              throw new Error("User not authenticated");
            }

            const { data, error } = await supabase
              .from("spares_inventory")
              .insert([
                {
                  user_id: userId,
                  part_name: payload.partName,
                  price: payload.price,
                  qty: payload.qty,
                },
              ])
              .select()
              .single();
            if (error) throw error;

            created = {
              id: data.id,
              partName: data.part_name,
              price: data.price,
              qty: data.qty,
              total: data.total,
              createdAt: new Date(data.created_at).toLocaleDateString(),
            };
            setSpares((prev) => [created, ...prev]);
          } catch (supabaseError: any) {
            console.warn("Supabase insert failed, using localStorage:", supabaseError?.message);
            created = {
              id: `spare_${Date.now()}`,
              createdAt: new Date().toLocaleDateString(),
              ...payload,
            };
            const updated = [created, ...spares];
            setSpares(updated);
            localStorage.setItem("crm_spares_inventory", JSON.stringify(updated));
          }
        } else {
          created = {
            id: `spare_${Date.now()}`,
            createdAt: new Date().toLocaleDateString(),
            ...payload,
          };
          const updated = [created, ...spares];
          setSpares(updated);
          localStorage.setItem("crm_spares_inventory", JSON.stringify(updated));
        }
      }

      setSpareForm(DEFAULT_SPARE_FORM);
      setEditingSpareId(null);
    } catch (error: any) {
      console.error("Error saving spare:", error);
      alert(error?.message || "Failed to save spare.");
    } finally {
      setIsSavingSpare(false);
    }
  };

  const handleDeleteSpare = async (id: string) => {
    if (!window.confirm("Delete this spare item?")) return;
    try {
      if (supabase) {
        try {
          const { error } = await supabase.from("spares_inventory").delete().eq("id", id);
          if (error) throw error;
        } catch (supabaseError: any) {
          console.warn("Supabase delete failed, using localStorage only:", supabaseError?.message);
        }
      }
      const updated = spares.filter((item) => item.id !== id);
      setSpares(updated);
      localStorage.setItem("crm_spares_inventory", JSON.stringify(updated));
    } catch (error: any) {
      console.error("Error deleting spare:", error);
      alert(error?.message || "Failed to delete spare.");
    }
  };

  const handleEditSpare = (item: SpareItem) => {
    setEditingSpareId(item.id);
    setSpareForm({
      partName: item.partName,
      price: String(item.price),
      qty: String(item.qty),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditSpare = () => {
    setEditingSpareId(null);
    setSpareForm(DEFAULT_SPARE_FORM);
  };


  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Inventory</h1>
          <p className="text-muted-foreground">Vehicle purchase and stock tracking module.</p>
        </div>

        <Tabs defaultValue="vehicles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg">
            <TabsTrigger value="vehicles" className="data-[state=active]:bg-background">Sales Vehicles Inventory</TabsTrigger>
            <TabsTrigger value="spares" className="data-[state=active]:bg-background">Spares Inventory</TabsTrigger>
          </TabsList>

          {/* Sales Vehicles Inventory Tab */}
          <TabsContent value="vehicles" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingId ? "Edit Inventory Row" : "Add Inventory Row"}
              </h2>
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Sl.No" value={form.slNo} onChange={(e) => setForm((prev) => ({ ...prev, slNo: e.target.value }))} required />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Model No" value={form.modelNo} onChange={(e) => setForm((prev) => ({ ...prev, modelNo: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Brand" value={form.brand} onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Vehicle Model" value={form.vehicleModel} onChange={(e) => setForm((prev) => ({ ...prev, vehicleModel: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="HSN No" value={form.hsnNo} onChange={(e) => setForm((prev) => ({ ...prev, hsnNo: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" type="number" placeholder="Vehicle Count" value={form.vehicleCount} onChange={(e) => setForm((prev) => ({ ...prev, vehicleCount: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Chassis No (comma separated if many)" value={form.chassisNo} onChange={(e) => setForm((prev) => ({ ...prev, chassisNo: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Motor No" value={form.motorNo} onChange={(e) => setForm((prev) => ({ ...prev, motorNo: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Battery No" value={form.batteryNo} onChange={(e) => setForm((prev) => ({ ...prev, batteryNo: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Manufact. Inv No" value={form.manufacturerInvNo} onChange={(e) => setForm((prev) => ({ ...prev, manufacturerInvNo: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" placeholder="Battery Model (e.g. 60V-30AH)" value={form.batteryModel} onChange={(e) => setForm((prev) => ({ ...prev, batteryModel: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" type="number" placeholder="Battery Count" value={form.batteryCount} onChange={(e) => setForm((prev) => ({ ...prev, batteryCount: e.target.value }))} />
                <input className="px-4 py-2 border border-border rounded-lg bg-background" type="number" placeholder="Sales Count" value={form.salesCount} onChange={(e) => setForm((prev) => ({ ...prev, salesCount: e.target.value }))} />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Row" : "Save Row"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 hover:bg-muted/50"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Inventory Rows</h2>
              {isLoading ? (
                <p className="text-muted-foreground">Loading inventory...</p>
              ) : items.length === 0 ? (
                <p className="text-muted-foreground">No inventory rows yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left">Sl.No</th>
                        <th className="px-3 py-2 text-left">Model No</th>
                        <th className="px-3 py-2 text-left">Brand</th>
                        <th className="px-3 py-2 text-left">Vehicle Model</th>
                        <th className="px-3 py-2 text-left">HSN No</th>
                        <th className="px-3 py-2 text-left">Vehicle Count</th>
                        <th className="px-3 py-2 text-left">Chassis No</th>
                        <th className="px-3 py-2 text-left">Motor No</th>
                        <th className="px-3 py-2 text-left">Battery No</th>
                        <th className="px-3 py-2 text-left">Manufact. Inv No</th>
                        <th className="px-3 py-2 text-left">Battery Model</th>
                        <th className="px-3 py-2 text-left">Battery Count</th>
                        <th className="px-3 py-2 text-left">Sales Count</th>
                        <th className="px-3 py-2 text-left">Closing Stock</th>
                        <th className="px-3 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-border">
                          <td className="px-3 py-2">{item.slNo}</td>
                          <td className="px-3 py-2">{item.modelNo || "-"}</td>
                          <td className="px-3 py-2">{item.brand || "-"}</td>
                          <td className="px-3 py-2">{item.vehicleModel || "-"}</td>
                          <td className="px-3 py-2">{item.hsnNo || "-"}</td>
                          <td className="px-3 py-2">{item.vehicleCount}</td>
                          <td className="px-3 py-2">{item.chassisNo || "-"}</td>
                          <td className="px-3 py-2">{item.motorNo || "-"}</td>
                          <td className="px-3 py-2">{item.batteryNo || "-"}</td>
                          <td className="px-3 py-2">{item.manufacturerInvNo || "-"}</td>
                          <td className="px-3 py-2">{item.batteryModel || "-"}</td>
                          <td className="px-3 py-2">{item.batteryCount}</td>
                          <td className="px-3 py-2">{item.salesCount}</td>
                          <td className="px-3 py-2 font-semibold">{item.closingStock}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleEdit(item)}
                                className="text-primary hover:text-primary/90"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(item.id)}
                                className="inline-flex items-center gap-1 text-destructive hover:text-destructive/90"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Spares Inventory Tab */}
          <TabsContent value="spares" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingSpareId ? "Edit Spare Item" : "Add Spare Item"}
              </h2>
              <form onSubmit={handleSaveSpare} className={`grid gap-4 ${isAdmin ? "grid-cols-1 md:grid-cols-5" : "grid-cols-1 md:grid-cols-2"}`}>
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Part Name"
                  value={spareForm.partName}
                  onChange={(e) => setSpareForm((prev) => ({ ...prev, partName: e.target.value }))}
                  required
                />
                {isAdmin && (
                  <input
                    className="px-4 py-2 border border-border rounded-lg bg-background"
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    value={spareForm.price}
                    onChange={(e) => setSpareForm((prev) => ({ ...prev, price: e.target.value }))}
                    required
                  />
                )}
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Quantity"
                  type="number"
                  value={spareForm.qty}
                  onChange={(e) => setSpareForm((prev) => ({ ...prev, qty: e.target.value }))}
                  required
                />
                {isAdmin && (
                  <div className="px-4 py-2 border border-border rounded-lg bg-muted flex items-center">
                    <span className="text-sm font-medium">Total: ₹{(parseFloat(spareForm.price) * parseInt(spareForm.qty) || 0).toFixed(2)}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSavingSpare}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSavingSpare ? "Saving..." : editingSpareId ? "Update Spare" : "Save Spare"}
                </button>
                {editingSpareId && (
                  <button
                    type="button"
                    onClick={cancelEditSpare}
                    className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 hover:bg-muted/50"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Spares Inventory</h2>
                <p className="text-xs text-muted-foreground">Quantity shown is remaining stock (after deducting sold units from service invoices)</p>
              </div>
              {isLoadingSpares ? (
                <p className="text-muted-foreground">Loading spares...</p>
              ) : spares.length === 0 ? (
                <p className="text-muted-foreground">No spares yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm ${isAdmin ? "min-w-[800px]" : "min-w-[600px]"}`}>
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left">Part Name</th>
                        {isAdmin && <th className="px-4 py-2 text-right">Price</th>}
                        <th className="px-4 py-2 text-right">Quantity</th>
                        {isAdmin && <th className="px-4 py-2 text-right">Total</th>}
                        {isAdmin && <th className="px-4 py-2 text-left">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {spares.map((spare) => (
                        <tr key={spare.id} className="border-b border-border">
                          <td className="px-4 py-2">{spare.partName}</td>
                          {isAdmin && <td className="px-4 py-2 text-right font-semibold">₹{spare.price.toFixed(2)}</td>}
                          <td className="px-4 py-2 text-right">{spare.qty}</td>
                          {isAdmin && <td className="px-4 py-2 text-right font-semibold">₹{spare.total.toFixed(2)}</td>}
                          {isAdmin && (
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleEditSpare(spare)}
                                  className="inline-flex items-center gap-1 text-primary hover:text-primary/90"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteSpare(spare.id)}
                                  className="inline-flex items-center gap-1 text-destructive hover:text-destructive/90"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}
