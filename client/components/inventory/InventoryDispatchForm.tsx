import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { fetchDMSDealers, DMSDealer } from "@/lib/dealers";

interface DetailedInventoryItem {
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

interface SelectedVehicle {
  chassisNo: string;
  motorNo: string;
  batteryNo: string;
  quantity?: number;
}

interface InventoryDispatchFormProps {
  inventoryItems: DetailedInventoryItem[];
  onDispatch: (allocation: {
    sku: string;
    productName: string;
    category: "vehicles" | "spares";
    quantity: number;
    dealerId: string;
    chassisNo?: string;
    motorNo?: string;
    batteryNo?: string;
  }) => Promise<boolean>;
}

export default function InventoryDispatchForm({
  inventoryItems,
  onDispatch,
}: InventoryDispatchFormProps) {
  const [formData, setFormData] = useState({
    productId: "",
    dealerId: "",
    category: "vehicles" as "vehicles" | "spares",
    quantity: "",
  });

  const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
  const [dealers, setDealers] = useState<DMSDealer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDealers, setIsLoadingDealers] = useState(true);
  const [showVehicleList, setShowVehicleList] = useState(false);

  useEffect(() => {
    loadDealers();
  }, []);

  useEffect(() => {
    console.log("Inventory items in form:", inventoryItems);
  }, [inventoryItems]);

  const loadDealers = async () => {
    setIsLoadingDealers(true);
    try {
      const dealersData = await fetchDMSDealers();
      setDealers(dealersData);
    } catch (error) {
      console.error("Error loading dealers:", error);
      toast.error("Failed to load dealers");
    } finally {
      setIsLoadingDealers(false);
    }
  };

  const filteredProducts = inventoryItems.filter((item) => {
    if (formData.category === "vehicles") {
      return item.modelNo && !item.partName;
    } else {
      return item.partName && !item.modelNo;
    }
  });

  const selectedProduct = filteredProducts.find(
    (item) => item.id === formData.productId
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "category") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        productId: "",
      }));
      setSelectedVehicles([]);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleVehicleSelection = (vehicle: SelectedVehicle) => {
    setSelectedVehicles((prev) => {
      const exists = prev.find(
        (v) => v.chassisNo === vehicle.chassisNo && v.motorNo === vehicle.motorNo
      );
      if (exists) {
        return prev.filter(
          (v) => !(v.chassisNo === vehicle.chassisNo && v.motorNo === vehicle.motorNo)
        );
      } else {
        return [...prev, { ...vehicle, quantity: vehicle.quantity || 1 }];
      }
    });
  };

  const updateVehicleQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setSelectedVehicles((prev) => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      return updated;
    });
  };

  const validateForm = () => {
    if (!formData.productId) {
      toast.error("Please select a product");
      return false;
    }
    if (formData.category === "vehicles") {
      if (selectedVehicles.length === 0) {
        toast.error("Please select at least one vehicle");
        return false;
      }
    } else {
      if (!formData.quantity || Number(formData.quantity) <= 0) {
        toast.error("Please enter a valid quantity");
        return false;
      }
    }
    if (!formData.dealerId) {
      toast.error("Please select a dealer");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (formData.category === "vehicles") {
        // Dispatch each selected vehicle with its quantity
        for (const vehicle of selectedVehicles) {
          const qty = vehicle.quantity || 1;
          const success = await onDispatch({
            sku: selectedProduct?.modelNo || "N/A",
            productName: selectedProduct?.modelNo || "Unknown Product",
            category: "vehicles",
            quantity: qty,
            dealerId: formData.dealerId,
            chassisNo: vehicle.chassisNo,
            motorNo: vehicle.motorNo,
            batteryNo: vehicle.batteryNo,
          });

          if (!success) {
            toast.error(`Failed to dispatch vehicle with chassis ${vehicle.chassisNo}`);
            setIsLoading(false);
            return;
          }
        }
        const totalQty = selectedVehicles.reduce((sum, v) => sum + (v.quantity || 1), 0);
        toast.success(`${totalQty} vehicle(s) from ${selectedVehicles.length} line(s) dispatched successfully`);
      } else {
        // Spares dispatch
        const success = await onDispatch({
          sku: selectedProduct?.partName || "N/A",
          productName: selectedProduct?.partName || "Unknown Product",
          category: "spares",
          quantity: Number(formData.quantity),
          dealerId: formData.dealerId,
        });

        if (success) {
          toast.success("Shipment dispatched successfully");
        } else {
          toast.error("Failed to dispatch shipment");
        }
      }

      // Reset form
      setFormData({
        productId: "",
        quantity: "",
        dealerId: "",
        category: "vehicles",
      });
      setSelectedVehicles([]);
    } catch (error) {
      console.error("Error dispatching inventory:", error);
      toast.error("Failed to dispatch shipment");
    } finally {
      setIsLoading(false);
    }
  };

  const isVehicleCategory = formData.category === "vehicles";

  return (
    <div className="bg-background rounded-lg border border-border p-6">
      <h2 className="text-xl font-semibold mb-6">Create Shipment</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category Selection */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-2">
              Product Category *
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="vehicles">Vehicles</option>
              <option value="spares">Spares</option>
            </select>
          </div>

          {/* Product Selection */}
          <div>
            <label htmlFor="productId" className="block text-sm font-medium mb-2">
              Select Product * ({filteredProducts.length} available)
            </label>
            <select
              id="productId"
              name="productId"
              value={formData.productId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">-- Select a {formData.category === "vehicles" ? "vehicle" : "spare"} --</option>
              {filteredProducts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.modelNo || item.partName} | {item.brand} | {item.closingStock || 0} in stock
                </option>
              ))}
            </select>
          </div>

          {/* Dealer Selection */}
          <div className="md:col-span-2">
            <label htmlFor="dealerId" className="block text-sm font-medium mb-2">
              Target Dealer *
            </label>
            {isLoadingDealers ? (
              <div className="px-4 py-2 border border-border rounded-lg bg-muted text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading dealers...
              </div>
            ) : (
              <select
                id="dealerId"
                name="dealerId"
                value={formData.dealerId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select a dealer --</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.name} ({dealer.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vehicle Selection Section */}
          {isVehicleCategory && selectedProduct && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Select Unsold Vehicles to Dispatch * ({selectedVehicles.length} selected of {selectedProduct.closingStock || 0} available)
              </label>
              
              {/* Product Details Header */}
              <div className="mb-4 p-4 bg-muted rounded-lg border border-border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground font-semibold">Model</p>
                    <p>{selectedProduct.modelNo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Brand</p>
                    <p>{selectedProduct.brand}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">Vehicle Model</p>
                    <p>{selectedProduct.vehicleModel || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-semibold">HSN No</p>
                    <p className="text-xs font-mono">{selectedProduct.hsnNo || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle List */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowVehicleList(!showVehicleList)}
                  className="w-full px-4 py-3 bg-muted hover:bg-muted/80 flex items-center justify-between font-medium transition-colors"
                >
                  <span>
                    {selectedVehicles.length > 0
                      ? `${selectedVehicles.length} vehicle(s) selected`
                      : `Click to select from ${selectedProduct.closingStock || 0} unsold vehicles`}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showVehicleList ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showVehicleList && (
                  <div className="max-h-96 overflow-y-auto border-t border-border bg-background">
                    {selectedProduct.chassisNos && selectedProduct.chassisNos.length > 0 ? (
                      <div className="p-4 space-y-3">
                        {selectedProduct.chassisNos.map((chassis, idx) => {
                          const vehicle = {
                            chassisNo: chassis,
                            motorNo: selectedProduct.motorNo || `MTR-${idx + 1}`,
                            batteryNo: selectedProduct.batteryNo || `BAT-${idx + 1}`,
                          };
                          const isSelected = selectedVehicles.some(
                            (v) =>
                              v.chassisNo === vehicle.chassisNo &&
                              v.motorNo === vehicle.motorNo
                          );
                          return (
                            <label
                              key={idx}
                              className={`flex items-start gap-3 p-3 rounded border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700"
                                  : "bg-background border-border hover:bg-muted/50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleVehicleSelection(vehicle)}
                                className="mt-1"
                              />
                              <div className="flex-1 text-sm space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">Chassis</p>
                                    <p className="font-mono text-xs">{chassis}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">Motor</p>
                                    <p className="font-mono text-xs">{vehicle.motorNo}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground">Battery</p>
                                    <p className="font-mono text-xs">{vehicle.batteryNo}</p>
                                  </div>
                                  {selectedProduct.batteryModel && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground">Battery Model</p>
                                      <p className="text-xs">{selectedProduct.batteryModel}</p>
                                    </div>
                                  )}
                                </div>
                                {selectedProduct.manufacturerInvNo && (
                                  <div className="pt-1">
                                    <p className="text-xs font-semibold text-muted-foreground">Manufacturer Inv No</p>
                                    <p className="font-mono text-xs">{selectedProduct.manufacturerInvNo}</p>
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No unsold vehicles available for this product
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedVehicles.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <h4 className="font-semibold text-sm mb-2 text-green-900 dark:text-green-100">
                    Selected Vehicles ({selectedVehicles.length}):
                  </h4>
                  <div className="space-y-3">
                    {selectedVehicles.map((v, idx) => (
                      <div key={idx} className="text-xs text-green-800 dark:text-green-200 p-3 bg-white dark:bg-green-950/40 rounded">
                        <div className="font-mono space-y-1 mb-2">
                          <p><span className="font-semibold">Chassis:</span> {v.chassisNo}</p>
                          <p><span className="font-semibold">Motor:</span> {v.motorNo}</p>
                          <p><span className="font-semibold">Battery:</span> {v.batteryNo}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="font-semibold text-xs">Qty to dispatch:</label>
                          <input
                            type="number"
                            min="1"
                            value={v.quantity || 1}
                            onChange={(e) => updateVehicleQuantity(idx, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 border border-green-300 dark:border-green-700 rounded text-xs font-medium bg-white dark:bg-green-950/60 text-green-900 dark:text-green-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Spares Quantity */}
          {!isVehicleCategory && selectedProduct && (
            <div className="md:col-span-2">
              <label htmlFor="quantity" className="block text-sm font-medium mb-2">
                Quantity *
              </label>
              <div className="flex gap-2">
                <input
                  id="quantity"
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="Enter quantity"
                  min="1"
                  max={selectedProduct.closingStock}
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {selectedProduct && (
                  <div className="px-4 py-2 border border-border rounded-lg bg-muted flex items-center text-sm">
                    <span className="font-medium">
                      Available: {selectedProduct.closingStock || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedProduct && formData.dealerId && (isVehicleCategory ? selectedVehicles.length > 0 : formData.quantity) && (
          <div className="bg-muted p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-3">Shipment Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Product</p>
                <p className="font-medium">
                  {selectedProduct.modelNo || selectedProduct.partName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="font-medium">
                  {isVehicleCategory
                    ? selectedVehicles.reduce((sum, v) => sum + (v.quantity || 1), 0)
                    : formData.quantity} units
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Dealer</p>
                <p className="font-medium">
                  {dealers.find((d) => d.id === formData.dealerId)?.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium text-yellow-600 dark:text-yellow-500">Pending</p>
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || isLoadingDealers}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? "Dispatching..." : "Dispatch Shipment"}
        </Button>
      </form>
    </div>
  );
}
