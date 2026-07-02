import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { fetchDMSDealers, DMSDealer } from "@/lib/dealers";

interface InventoryItem {
  id: string;
  modelNo: string;
  brand: string;
  vehicleCount: number;
  closingStock: number;
  partName?: string;
}

interface InventoryDispatchFormProps {
  inventoryItems: InventoryItem[];
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
    quantity: "",
    dealerId: "",
    category: "vehicles" as "vehicles" | "spares",
    chassisNo: "",
    motorNo: "",
    batteryNo: "",
  });

  const [dealers, setDealers] = useState<DMSDealer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDealers, setIsLoadingDealers] = useState(true);

  useEffect(() => {
    loadDealers();
  }, []);

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
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!formData.productId) {
      toast.error("Please select a product");
      return false;
    }
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return false;
    }
    if (!formData.dealerId) {
      toast.error("Please select a dealer");
      return false;
    }

    const quantity = Number(formData.quantity);
    const available = selectedProduct?.closingStock || 0;

    if (quantity > available) {
      toast.error(`Available stock is ${available} units only`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const success = await onDispatch({
        sku: selectedProduct?.modelNo || selectedProduct?.partName || "N/A",
        productName: selectedProduct?.modelNo || selectedProduct?.partName || "Unknown Product",
        category: formData.category,
        quantity: Number(formData.quantity),
        dealerId: formData.dealerId,
        chassisNo: formData.chassisNo || undefined,
        motorNo: formData.motorNo || undefined,
        batteryNo: formData.batteryNo || undefined,
      });

      if (success) {
        setFormData({
          productId: "",
          quantity: "",
          dealerId: "",
          category: "vehicles",
          chassisNo: "",
          motorNo: "",
          batteryNo: "",
        });
        toast.success("Shipment dispatched successfully");
      } else {
        toast.error("Failed to dispatch shipment");
      }
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
              Select Product *
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
                  {item.modelNo || item.partName} (Stock: {item.closingStock || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
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

          {/* Dealer Selection */}
          <div>
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

          {/* Vehicle-specific fields */}
          {isVehicleCategory && (
            <>
              <div>
                <label htmlFor="chassisNo" className="block text-sm font-medium mb-2">
                  Chassis No
                </label>
                <input
                  id="chassisNo"
                  type="text"
                  name="chassisNo"
                  value={formData.chassisNo}
                  onChange={handleInputChange}
                  placeholder="e.g., AXGV-2024-001"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="motorNo" className="block text-sm font-medium mb-2">
                  Motor No
                </label>
                <input
                  id="motorNo"
                  type="text"
                  name="motorNo"
                  value={formData.motorNo}
                  onChange={handleInputChange}
                  placeholder="e.g., MTR-2024-001"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="batteryNo" className="block text-sm font-medium mb-2">
                  Battery No
                </label>
                <input
                  id="batteryNo"
                  type="text"
                  name="batteryNo"
                  value={formData.batteryNo}
                  onChange={handleInputChange}
                  placeholder="e.g., BAT-2024-001"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        {selectedProduct && formData.dealerId && formData.quantity && (
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
                <p className="font-medium">{formData.quantity} units</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dealer</p>
                <p className="font-medium">
                  {dealers.find((d) => d.id === formData.dealerId)?.name}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium text-yellow-600">Pending Acceptance</p>
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
