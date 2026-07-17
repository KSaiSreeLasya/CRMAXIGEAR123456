import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Project } from "@/pages/Projects";
import { supabase } from "@/lib/supabase";
import { SplitPaymentForm, type SplitPayment } from "@/components/SplitPaymentForm";
import { getSplitPaymentsByReference } from "@/lib/transactions";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (id: string, project: Omit<Project, "id" | "createdAt">) => Promise<void>;
  project: Project | null;
}

export default function EditProjectModal({
  isOpen,
  onClose,
  onUpdateProject,
  project,
}: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    modelNo: "",
    brand: "",
    vehicleModel: "",
    colour: "",
    customerName: "",
    contactNo: "",
    location: "",
    productDescription: "",
    hsnNo: "",
    chassisNo: "",
    motorNo: "",
    batteryNo: "",
    batteryWarranty: "",
    batteryCapacity: "",
    vehicleWarranty: "",
    invoiceDate: "",
    amount: "",
    modeOfPayment: "Cash",
    leadSource: "",
    gstNo: "",
    saleType: "regular",
    invoiceNo: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetchingModelData, setIsFetchingModelData] = useState(false);
  const [modelLookupMessage, setModelLookupMessage] = useState("");
  const [availableChassisNumbers, setAvailableChassisNumbers] = useState<string[]>([]);
  const [showChassisDropdown, setShowChassisDropdown] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [showSplitPaymentDetails, setShowSplitPaymentDetails] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        modelNo: project.modelNo || "",
        brand: project.brand || "",
        vehicleModel: project.vehicleModel || "",
        colour: project.colour || "",
        customerName: project.customerName,
        contactNo: project.contactNo,
        location: project.location,
        productDescription: project.productDescription,
        hsnNo: project.hsnNo,
        chassisNo: project.chassisNo,
        motorNo: project.motorNo || "",
        batteryNo: project.batteryNo || "",
        batteryWarranty: project.batteryWarranty || "",
        batteryCapacity: project.batteryCapacity || "",
        vehicleWarranty: project.vehicleWarranty || "",
        invoiceDate: project.invoiceDate || "",
        amount: project.amount.toString(),
        modeOfPayment: project.modeOfPayment || "Cash",
        leadSource: project.leadSource || "",
        gstNo: project.gstNo || "",
        saleType: project.saleType || "regular",
        invoiceNo: project.invoiceNo || "",
      });
      setShowSplitPaymentDetails(project.showSplitPaymentDetails ?? false);

      // Load fresh split payments from database
      loadSplitPayments();
    }
  }, [project, isOpen]);

  const loadSplitPayments = async () => {
    if (!project) return;
    try {
      const payments = await getSplitPaymentsByReference("project", project.id);
      setSplitPayments(payments);
    } catch (error) {
      console.error("Failed to load split payments:", error);
      setSplitPayments(project?.splitPayments || []);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (name === "modelNo") {
      setModelLookupMessage("");
      if (value.trim().length >= 2) {
        void handleModelLookup(value);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = "Contact number is required";
    }
    if (!formData.productDescription.trim()) {
      newErrors.productDescription = "Product description is required";
    }
    if (!formData.invoiceDate.trim()) {
      newErrors.invoiceDate = "Invoice date is required";
    }
    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(parseFloat(formData.amount))) {
      newErrors.amount = "Amount must be a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !project) {
      return;
    }

    await onUpdateProject(project.id, {
      modelNo: formData.modelNo,
      brand: formData.brand,
      vehicleModel: formData.vehicleModel,
      colour: formData.colour,
      customerName: formData.customerName,
      contactNo: formData.contactNo,
      location: formData.location,
      productDescription: formData.productDescription,
      hsnNo: formData.hsnNo,
      chassisNo: formData.chassisNo,
      motorNo: formData.motorNo,
      batteryNo: formData.batteryNo,
      batteryWarranty: formData.batteryWarranty,
      batteryCapacity: formData.batteryCapacity,
      vehicleWarranty: formData.vehicleWarranty,
      invoiceDate: formData.invoiceDate,
      deliveryDate: project.deliveryDate,
      amount: parseFloat(formData.amount),
      modeOfPayment: formData.modeOfPayment,
      leadSource: formData.leadSource,
      gstNo: formData.gstNo,
      saleType: formData.saleType as "regular" | "b2b",
      invoiceNo: formData.invoiceNo,
      splitPayments: splitPayments,
      showSplitPaymentDetails,
    });

    onClose();
  };

  const handleModelLookup = async (modelNoInput?: string) => {
    const modelInput = (modelNoInput ?? formData.modelNo).trim();
    if (!modelInput) {
      setAvailableChassisNumbers([]);
      setShowChassisDropdown(false);
      return;
    }
    setIsFetchingModelData(true);
    setModelLookupMessage("");
    try {
      let chassisNumbers: string[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("chassis_no")
          .ilike("vehicle_model", `%${modelInput}%`);
        if (error) throw error;
        const uniqueChassis = new Set<string>();
        data?.forEach((row: any) => {
          if (row.chassis_no) {
            // Split comma-separated chassis numbers into individual items
            const parts = row.chassis_no.split(",").map((s: string) => s.trim()).filter((s: string) => s);
            parts.forEach((part: string) => uniqueChassis.add(part));
          }
        });
        chassisNumbers = Array.from(uniqueChassis).sort();
      } else {
        const raw = localStorage.getItem("crm_inventory_items");
        const list = raw ? JSON.parse(raw) : [];
        const uniqueChassis = new Set<string>();
        list.forEach((row: any) => {
          if (
            (row.vehicleModel || "").toLowerCase().includes(modelInput.toLowerCase()) &&
            row.chassisNo
          ) {
            // Split comma-separated chassis numbers into individual items
            const parts = row.chassisNo.split(",").map((s: string) => s.trim()).filter((s: string) => s);
            parts.forEach((part: string) => uniqueChassis.add(part));
          }
        });
        chassisNumbers = Array.from(uniqueChassis).sort();
      }

      if (chassisNumbers.length === 0) {
        setModelLookupMessage("No chassis numbers found for this vehicle model in inventory.");
        setAvailableChassisNumbers([]);
        setShowChassisDropdown(false);
        return;
      }

      setAvailableChassisNumbers(chassisNumbers);
      setShowChassisDropdown(true);
      setModelLookupMessage(`Found ${chassisNumbers.length} chassis number(s) for this vehicle model. Please select one.`);
    } catch (error) {
      console.error("Error fetching vehicle model details from inventory:", error);
      setModelLookupMessage("Failed to fetch chassis numbers.");
      setAvailableChassisNumbers([]);
      setShowChassisDropdown(false);
    } finally {
      setIsFetchingModelData(false);
    }
  };

  const handleChassisSelect = (chassisNo: string) => {
    setFormData((prev) => ({
      ...prev,
      chassisNo,
    }));
    setShowChassisDropdown(false);
  };

  if (!isOpen || !project) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg border border-border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Edit sales entry</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Sale Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">Sale Type *</label>
              <select
                name="saleType"
                value={formData.saleType}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary border-border"
              >
                <option value="regular">Regular Sale</option>
                <option value="b2b">B2B Sale</option>
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-semibold mb-2">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Enter brand name"
                className="w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary border-border"
              />
            </div>

            {/* Vehicle Model */}
            <div>
              <label className="block text-sm font-semibold mb-2">Vehicle Model</label>
              <input
                type="text"
                name="vehicleModel"
                value={formData.vehicleModel}
                onChange={handleChange}
                placeholder="Enter vehicle model"
                className="w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary border-border"
              />
            </div>

            {/* Colour */}
            <div>
              <label className="block text-sm font-semibold mb-2">Colour</label>
              <input
                type="text"
                name="colour"
                value={formData.colour}
                onChange={handleChange}
                placeholder="Enter colour"
                className="w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary border-border"
              />
            </div>

            {/* Model No */}
            <div>
              <label className="block text-sm font-semibold mb-2">Model No.</label>
              <input
                type="text"
                name="modelNo"
                value={formData.modelNo}
                onChange={handleChange}
                onBlur={() => void handleModelLookup()}
                placeholder="Enter model number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.modelNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.modelNo && <p className="text-sm text-destructive mt-1">{errors.modelNo}</p>}
              {isFetchingModelData && (
                <p className="text-xs text-muted-foreground mt-1">Fetching chassis numbers from inventory...</p>
              )}
              {!isFetchingModelData && modelLookupMessage && (
                <p className="text-xs text-muted-foreground mt-1">{modelLookupMessage}</p>
              )}
            </div>

            {/* Chassis Dropdown */}
            {showChassisDropdown && availableChassisNumbers.length > 0 && (
              <div>
                <label className="block text-sm font-semibold mb-2">Select Chassis No. from inventory</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                  {availableChassisNumbers.map((chassis) => (
                    <button
                      key={chassis}
                      type="button"
                      onClick={() => handleChassisSelect(chassis)}
                      className="text-left px-3 py-2 rounded hover:bg-muted transition-colors border border-border"
                    >
                      {chassis}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Enter customer name"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.customerName ? "border-destructive" : "border-border"
                }`}
              />
              {errors.customerName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Contact No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Contact No *
              </label>
              <input
                type="tel"
                name="contactNo"
                value={formData.contactNo}
                onChange={handleChange}
                placeholder="Enter contact number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.contactNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.contactNo && (
                <p className="text-sm text-destructive mt-1">
                  {errors.contactNo}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter location"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.location ? "border-destructive" : "border-border"
                }`}
              />
              {errors.location && (
                <p className="text-sm text-destructive mt-1">
                  {errors.location}
                </p>
              )}
            </div>

            {/* Product Description */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Product Description *
              </label>
              <textarea
                name="productDescription"
                value={formData.productDescription}
                onChange={handleChange}
                placeholder="Enter product description"
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                  errors.productDescription
                    ? "border-destructive"
                    : "border-border"
                }`}
              />
              {errors.productDescription && (
                <p className="text-sm text-destructive mt-1">
                  {errors.productDescription}
                </p>
              )}
            </div>

            {/* HSN No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                HSN No.
              </label>
              <input
                type="text"
                name="hsnNo"
                value={formData.hsnNo}
                onChange={handleChange}
                placeholder="Enter HSN number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.hsnNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.hsnNo && (
                <p className="text-sm text-destructive mt-1">{errors.hsnNo}</p>
              )}
            </div>

            {/* Chassis No - Read Only (Auto-populated from Vehicle Model selection) */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Chassis No. <span className="text-xs text-muted-foreground">(auto-populated)</span>
              </label>
              <input
                type="text"
                name="chassisNo"
                value={formData.chassisNo}
                readOnly
                placeholder="Select a vehicle model above to populate"
                className="w-full px-4 py-2 border rounded-lg bg-muted text-muted-foreground cursor-not-allowed focus:outline-none border-border"
              />
              {errors.chassisNo && (
                <p className="text-sm text-destructive mt-1">{errors.chassisNo}</p>
              )}
            </div>

            {/* Motor No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Motor No.
              </label>
              <input
                type="text"
                name="motorNo"
                value={formData.motorNo}
                onChange={handleChange}
                placeholder="Enter motor number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.motorNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.motorNo && (
                <p className="text-sm text-destructive mt-1">{errors.motorNo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Battery No.
              </label>
              <input
                type="text"
                name="batteryNo"
                value={formData.batteryNo}
                onChange={handleChange}
                placeholder="Enter battery number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.batteryNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.batteryNo && (
                <p className="text-sm text-destructive mt-1">{errors.batteryNo}</p>
              )}
            </div>

            <p className="text-sm font-semibold text-muted-foreground pt-2 border-t border-border">
              Battery &amp; vehicle specifications
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Battery warranty</label>
                <input
                  type="text"
                  name="batteryWarranty"
                  value={formData.batteryWarranty}
                  onChange={handleChange}
                  placeholder="e.g. 24 months"
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Battery capacity</label>
                <input
                  type="text"
                  name="batteryCapacity"
                  value={formData.batteryCapacity}
                  onChange={handleChange}
                  placeholder="e.g. 3.5 kWh"
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2">Vehicle warranty</label>
                <input
                  type="text"
                  name="vehicleWarranty"
                  value={formData.vehicleWarranty}
                  onChange={handleChange}
                  placeholder="e.g. 36 months"
                  className="w-full px-4 py-2 border rounded-lg bg-background border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Invoice Date *
              </label>
              <input
                type="date"
                name="invoiceDate"
                value={formData.invoiceDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.invoiceDate ? "border-destructive" : "border-border"
                }`}
              />
              {errors.invoiceDate && (
                <p className="text-sm text-destructive mt-1">{errors.invoiceDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.amount ? "border-destructive" : "border-border"
                }`}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Mode of Payment</label>
                <select
                  name="modeOfPayment"
                  value={formData.modeOfPayment}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bajaj">Bajaj</option>
                  <option value="NEFT">NEFT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Lead Source</label>
                <input
                  type="text"
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleChange}
                  placeholder="e.g. Direct Walk-in, Referral"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">GST No.</label>
              <input
                type="text"
                name="gstNo"
                value={formData.gstNo}
                onChange={handleChange}
                placeholder="e.g. 36ACJFA4386L1ZW"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Invoice No.</label>
              <input
                type="text"
                name="invoiceNo"
                value={formData.invoiceNo}
                onChange={handleChange}
                placeholder={formData.saleType === "b2b" ? "e.g. AAV/B2B/2026-27-001" : "e.g. AAV/2026-27-001"}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Update invoice number if needed</p>
            </div>

            {/* Split Payment Section */}
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold text-sm mb-4">Payment Breakdown (Split Payments)</h3>
              {splitPayments.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  Loaded {splitPayments.length} payment(s) from database
                </div>
              )}
              <SplitPaymentForm
                totalAmount={parseFloat(formData.amount as string) || 0}
                initialPayments={splitPayments}
                onPaymentsChange={(payments) => setSplitPayments(payments)}
              />
            </div>

            {/* Display Split Payment Details Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-border">
              <input
                type="checkbox"
                id="showSplitPaymentDetails"
                checked={showSplitPaymentDetails}
                onChange={(e) => setShowSplitPaymentDetails(e.target.checked)}
                className="w-4 h-4 border border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="showSplitPaymentDetails" className="text-sm font-medium text-gray-700 cursor-pointer">
                Display split payment details in invoice (e.g., "Cash: ₹30,000, UPI: ₹30,000")
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 justify-end pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                Update sale
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
