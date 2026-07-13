import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Project } from "@/pages/Projects";
import { supabase } from "@/lib/supabase";
import { SplitPaymentForm, type SplitPayment } from "@/components/SplitPaymentForm";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<Project, "id" | "createdAt">, splitPayments?: SplitPayment[]) => Promise<void>;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    modelNo: "",
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
    if (isOpen) {
      setErrors({});
      setModelLookupMessage("");
      setAvailableChassisNumbers([]);
      setShowChassisDropdown(false);
      void updateInvoiceNumber(formData.saleType);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      void updateInvoiceNumber(formData.saleType);
    }
  }, [formData.saleType]);

  const updateInvoiceNumber = async (saleType: string) => {
    setFormData((prev) => ({ ...prev, invoiceNo: "" }));
    const invoiceNo = await getNextInvoiceNumber(saleType);
    setFormData((prev) => ({ ...prev, invoiceNo }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
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

    if (!validateForm()) {
      return;
    }

    const invoiceNo = formData.invoiceNo.trim() || await getNextInvoiceNumber(formData.saleType);
    await onCreateProject({
      modelNo: formData.modelNo,
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
      amount: parseFloat(formData.amount),
      modeOfPayment: formData.modeOfPayment,
      leadSource: formData.leadSource,
      gstNo: formData.gstNo,
      saleType: formData.saleType as "regular" | "b2b",
      invoiceNo,
      showSplitPaymentDetails,
    }, splitPayments);

    // Reset form
    setFormData({
      modelNo: "",
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
    setSplitPayments([]);
    setShowSplitPaymentDetails(false);
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
          .ilike("brand", `%${modelInput}%`);
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
            (row.brand || "").toLowerCase().includes(modelInput.toLowerCase()) &&
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
        setModelLookupMessage("No chassis numbers found for this brand in inventory.");
        setAvailableChassisNumbers([]);
        setShowChassisDropdown(false);
        return;
      }

      setAvailableChassisNumbers(chassisNumbers);
      setShowChassisDropdown(true);
      setModelLookupMessage(`Found ${chassisNumbers.length} chassis number(s) for this brand. Please select one.`);
    } catch (error) {
      console.error("Error fetching brand details from inventory:", error);
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

  if (!isOpen) return null;

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
            <h2 className="text-2xl font-bold">New sales entry</h2>
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

            {/* Chassis No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Chassis No.
              </label>
              <input
                type="text"
                name="chassisNo"
                value={formData.chassisNo}
                onChange={handleChange}
                placeholder="Enter chassis number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.chassisNo ? "border-destructive" : "border-border"
                }`}
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
  {/* Battery Warranty */}
  <div>
    <label className="block text-sm font-semibold mb-2">
      Battery warranty
    </label>

    <input
      type="text"
      name="batteryWarranty"
      value={formData.batteryWarranty}
      onChange={handleChange}
      placeholder="e.g. 24 months"
      className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
        errors.batteryWarranty
          ? "border-destructive"
          : "border-border"
      }`}
    />

    {errors.batteryWarranty && (
      <p className="text-sm text-destructive mt-1">
        {errors.batteryWarranty}
      </p>
    )}
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
                placeholder={formData.saleType === "b2b" ? "e.g. AAV/B2B/2026-27/001" : "e.g. AAV/2026-27/001"}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate based on sale type</p>
            </div>

            {/* Split Payment Section */}
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold text-sm mb-4">Payment Breakdown (Split Payments)</h3>
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
                Save sale
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

async function getNextInvoiceNumber(saleType: string): Promise<string> {
  const isB2B = saleType === "b2b";
  const invoicePrefix = isB2B ? "AAV/B2B/2026-27/" : "AAV/2026-27/";
  let maxNumericSuffix = 0;

  const addInvoiceNumber = (invoice: string | null | undefined) => {
    const sequence = extractInvoiceSequence(invoice, saleType);
    if (sequence !== null) {
      maxNumericSuffix = Math.max(maxNumericSuffix, sequence);
    }
  };

  if (supabase) {
    const typedResult = await supabase
      .from("projects")
      .select("invoice_no, sale_type")
      .eq("sale_type", saleType);

    if (!typedResult.error) {
      for (const row of typedResult.data ?? []) {
        addInvoiceNumber(row.invoice_no);
      }
    } else {
      const fallbackResult = await supabase.from("projects").select("invoice_no");
      for (const row of fallbackResult.data ?? []) {
        addInvoiceNumber(row.invoice_no);
      }
    }
  }

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("crm_invoice_settings_")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { invoiceNo?: string };
      addInvoiceNumber(parsed.invoiceNo);
    }
  } catch (error) {
    console.error("Error deriving next invoice number:", error);
  }

  return `${invoicePrefix}${(maxNumericSuffix + 1).toString().padStart(3, "0")}`;
}

function extractInvoiceSequence(invoice: string | null | undefined, saleType: string): number | null {
  const normalizedInvoice = invoice?.trim();
  if (!normalizedInvoice) return null;

  if (saleType !== "b2b" && /^\\d+$/.test(normalizedInvoice)) {
    return Number(normalizedInvoice);
  }

  const prefix = saleType === "b2b" ? "AAV/B2B/2026-27" : "AAV/2026-27";
  const match = normalizedInvoice.match(new RegExp(`^${prefix}(?:/|-)(\\d+)$`));
  return match ? Number(match[1]) : null;
}
