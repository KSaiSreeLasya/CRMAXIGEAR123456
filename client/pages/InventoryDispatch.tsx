import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import InventoryDispatchForm from "@/components/inventory/InventoryDispatchForm";
import InventoryTransfersList from "@/components/inventory/InventoryTransfersList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  allocateInventoryToDealer,
  fetchInventoryTransfers,
  deleteInventoryTransfer,
  updateTransferStatus,
  InventoryTransfer,
} from "@/lib/inventory-dispatch";
import { fetchDMSDealers, DMSDealer } from "@/lib/dealers";
import { supabase } from "@/lib/supabase";

interface InventoryItem {
  id: string;
  modelNo?: string;
  brand?: string;
  vehicleModel?: string;
  hsnNo?: string;
  vehicleCount?: number;
  closingStock?: number;
  motorNo?: string;
  batteryNo?: string;
  batteryModel?: string;
  manufacturerInvNo?: string;
  salesCount?: number;
  chassisNos?: string[];
  partName?: string;
  price?: number;
  qty?: number;
}

export default function InventoryDispatch() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [dealers, setDealers] = useState<DMSDealer[]>([]);
  const [dealerNameMap, setDealerNameMap] = useState<Map<string, string>>(
    new Map()
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load inventory items (vehicles + spares)
      const items: InventoryItem[] = [];

      if (supabase) {
        // Fetch ALL vehicles inventory (including those already partially/fully dispatched)
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from("inventory_items")
          .select("*")
          .order("model_no", { ascending: true });

        if (!vehiclesError && vehiclesData) {
          console.log(`Loaded ${vehiclesData.length} vehicles from database`);
          items.push(
            ...vehiclesData.map((v: any) => {
              // Parse chassis numbers from comma-separated string
              const chassisString = v.chassis_no || "";
              const chassisNos = chassisString
                .split(",")
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 0);

              return {
                id: v.id,
                modelNo: v.model_no,
                brand: v.brand,
                vehicleModel: v.vehicle_model,
                hsnNo: v.hsn_no,
                vehicleCount: v.vehicle_count,
                closingStock: v.closing_stock,
                motorNo: v.motor_no,
                batteryNo: v.battery_no,
                batteryModel: v.battery_model,
                manufacturerInvNo: v.manufacturer_inv_no,
                salesCount: v.sales_count,
                chassisNos: chassisNos,
              };
            })
          );
        } else if (vehiclesError) {
          console.error("Error fetching vehicles:", vehiclesError);
        }

        // Fetch spares inventory
        const { data: sparesData, error: sparesError } = await supabase
          .from("spares_inventory")
          .select("id, part_name, price, qty");

        if (!sparesError && sparesData) {
          items.push(
            ...sparesData.map((s: any) => ({
              id: s.id,
              partName: s.part_name,
              price: s.price,
              qty: s.qty,
              closingStock: s.qty,
            }))
          );
        }
      }

      setInventoryItems(items);
      console.log(`Total inventory items loaded for dispatch: ${items.length}`);
      console.log("Vehicle items available:", items.filter(i => i.modelNo).length);
      console.log("Spare items available:", items.filter(i => i.partName).length);

      // Load dealers
      const dealersData = await fetchDMSDealers();
      setDealers(dealersData);

      // Build dealer name map
      const nameMap = new Map(dealersData.map((d) => [d.id, d.name]));
      setDealerNameMap(nameMap);

      // Load transfers
      const transfersData = await fetchInventoryTransfers();
      setTransfers(transfersData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDispatch = async (allocation: {
    sku: string;
    productName: string;
    category: "vehicles" | "spares";
    quantity: number;
    dealerId: string;
    chassisNo?: string;
    motorNo?: string;
    batteryNo?: string;
  }) => {
    try {
      const transfer = await allocateInventoryToDealer(allocation);
      if (transfer) {
        setTransfers([transfer, ...transfers]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error dispatching inventory:", error);
      return false;
    }
  };

  const handleDeleteTransfer = async (id: string) => {
    try {
      const success = await deleteInventoryTransfer(id);
      if (success) {
        setTransfers(transfers.filter((t) => t.id !== id));
      }
      return success;
    } catch (error) {
      console.error("Error deleting transfer:", error);
      return false;
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: "Pending Acceptance" | "Accepted" | "Rejected" | "Delivered"
  ) => {
    try {
      const success = await updateTransferStatus(id, status);
      if (success) {
        setTransfers(
          transfers.map((t) => (t.id === id ? { ...t, status } : t))
        );
      }
      return success;
    } catch (error) {
      console.error("Error updating status:", error);
      return false;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Inventory Dispatch</h1>
              <p className="text-muted-foreground">
                Allocate products to dealers from the master inventory
              </p>
            </div>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Dispatch Form */}
              <InventoryDispatchForm
                inventoryItems={inventoryItems}
                onDispatch={handleDispatch}
              />

              {/* Transfers List */}
              <InventoryTransfersList
                transfers={transfers}
                dealerNames={dealerNameMap}
                onDeleteTransfer={handleDeleteTransfer}
                onUpdateStatus={handleUpdateStatus}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
