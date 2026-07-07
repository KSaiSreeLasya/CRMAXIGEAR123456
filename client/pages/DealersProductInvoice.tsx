import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit, Trash2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ProductInvoiceContent from "@/components/dealers/ProductInvoiceContent";
import { ImportExport } from "@/components/ImportExport";

interface DealersProductInvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_date: string;
  dealer_name: string;
  dealer_code: string;
  contact_no: string;
  location: string;
  model_no: string;
  product_description: string;
  hsn_no: string;
  no_of_vehicles: number;
  chassis_no: string;
  motor_no: string;
  battery_no: string;
  battery_capacity: string;
  battery_vehicle_specs: string;
  battery_warranty: string;
  vehicle_warranty: string;
  unit_price: number;
  amount: number;
  gst_enabled: boolean;
  gst_type: "cgst-sgst" | "igst";
  gst_amount: number;
  total_amount: number;
  mode_of_payment: string;
  payment_status: string;
  created_at: string;
}

interface InvoiceForm {
  invoice_number: string;
  invoice_date: string;
  dealer_name: string;
  dealer_code: string;
  contact_no: string;
  location: string;
  model_no: string;
  product_description: string;
  hsn_no: string;
  no_of_vehicles: number;
  chassis_no: string;
  motor_no: string;
  battery_no: string;
  battery_capacity: string;
  battery_vehicle_specs: string;
  battery_warranty: string;
  vehicle_warranty: string;
  unit_price: number;
  gst_enabled: boolean;
  gst_type: "cgst-sgst" | "igst";
  mode_of_payment: string;
}

const createDefaultForm = (): InvoiceForm => ({
  invoice_number: "",
  invoice_date: new Date().toISOString().split("T")[0],
  dealer_name: "",
  dealer_code: "",
  contact_no: "",
  location: "",
  model_no: "",
  product_description: "",
  hsn_no: "",
  no_of_vehicles: 1,
  chassis_no: "",
  motor_no: "",
  battery_no: "",
  battery_capacity: "",
  battery_vehicle_specs: "",
  battery_warranty: "",
  vehicle_warranty: "",
  unit_price: 0,
  gst_enabled: true,
  gst_type: "cgst-sgst",
  mode_of_payment: "Cash",
});

const DEFAULT_FORM = createDefaultForm();

function getNextInvoiceNumber(): string {
  const defaultInvoiceNo = "DLRPROD/2026-27/001";
  let maxInvoiceNo = defaultInvoiceNo;
  let maxNumericSuffix = 0;

  try {
    const saved = localStorage.getItem("dealers_product_invoices");
    if (saved) {
      const invoices = JSON.parse(saved) as DealersProductInvoiceRecord[];
      invoices.forEach((inv) => {
        const invoice = inv.invoice_number?.trim();
        if (!invoice) return;

        const match = invoice.match(/^(.*?)(\d+)$/);
        if (!match) return;
        const numericValue = Number(match[2]);
        if (Number.isNaN(numericValue)) return;

        if (numericValue > maxNumericSuffix) {
          maxNumericSuffix = numericValue;
          maxInvoiceNo = invoice;
        }
      });
    }
  } catch (error) {
    console.error("Error deriving next invoice number:", error);
  }

  const lastMatch = maxInvoiceNo.match(/^(.*?)(\d+)$/);
  if (!lastMatch) return defaultInvoiceNo;
  const prefix = lastMatch[1];
  const width = lastMatch[2].length;
  const nextValue = String(Number(lastMatch[2]) + 1).padStart(width, "0");
  return `${prefix}${nextValue}`;
}

export default function DealersProductInvoice() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<DealersProductInvoiceRecord[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [form, setForm] = useState<InvoiceForm>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    void loadInvoices();
    void loadDealers();
  }, []);

  useEffect(() => {
    if (!editingId && form.invoice_number === "") {
      setForm((prev) => ({
        ...prev,
        invoice_number: getNextInvoiceNumber(),
      }));
    }
  }, [editingId, form.invoice_number]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data } = await supabase
            .from("dealers_product_invoices")
            .select("*");
          if (data) {
            setInvoices(data);
            return;
          }
        } catch (error) {
          console.warn("Supabase fetch failed, using localStorage");
        }
      }

      const saved = localStorage.getItem("dealers_product_invoices");
      setInvoices(saved ? JSON.parse(saved) : []);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDealers = async () => {
    try {
      if (supabase) {
        try {
          const { data } = await supabase.from("dealers").select("*");
          if (data) {
            setDealers(data);
            return;
          }
        } catch (error) {
          console.warn("Supabase dealers fetch failed, using localStorage");
        }
      }

      const saved = localStorage.getItem("crm_dealers");
      setDealers(saved ? JSON.parse(saved) : []);
    } catch (error) {
      console.error("Error loading dealers:", error);
    }
  };

  const calculateInvoiceTotal = (unitPrice: number, quantity: number, gstEnabled: boolean) => {
    const amount = unitPrice * quantity;
    const gstAmount = gstEnabled ? Math.round(amount * 0.10) : 0;
    return { amount, gstAmount, total: amount + gstAmount };
  };

  const saveInvoice = async () => {
    if (!form.dealer_name || !form.invoice_number || !form.model_no) {
      alert("Please fill in dealer name, invoice number, and model number");
      return;
    }

    setIsSaving(true);
    try {
      const { amount, gstAmount, total } = calculateInvoiceTotal(
        form.unit_price,
        form.no_of_vehicles,
        form.gst_enabled
      );

      const record: DealersProductInvoiceRecord = {
        id: editingId || `dinv_${Date.now()}`,
        invoice_number: form.invoice_number,
        invoice_date: form.invoice_date,
        dealer_name: form.dealer_name,
        dealer_code: form.dealer_code,
        contact_no: form.contact_no,
        location: form.location,
        model_no: form.model_no,
        product_description: form.product_description,
        hsn_no: form.hsn_no,
        no_of_vehicles: form.no_of_vehicles,
        chassis_no: form.chassis_no,
        motor_no: form.motor_no,
        battery_no: form.battery_no,
        battery_capacity: form.battery_capacity,
        battery_vehicle_specs: form.battery_vehicle_specs,
        battery_warranty: form.battery_warranty,
        vehicle_warranty: form.vehicle_warranty,
        unit_price: form.unit_price,
        amount,
        gst_enabled: form.gst_enabled,
        gst_type: form.gst_type,
        gst_amount: gstAmount,
        total_amount: total,
        mode_of_payment: form.mode_of_payment,
        payment_status: "pending",
        created_at: editingId
          ? invoices.find((i) => i.id === editingId)?.created_at || new Date().toISOString()
          : new Date().toISOString(),
      };

      if (supabase && !isLoading) {
        try {
          if (editingId) {
            await supabase
              .from("dealers_product_invoices")
              .update(record)
              .eq("id", editingId);
          } else {
            await supabase
              .from("dealers_product_invoices")
              .insert([record]);
          }
        } catch (error) {
          console.warn("Supabase save failed, using localStorage");
        }
      }

      const current = localStorage.getItem("dealers_product_invoices");
      const invoicesList: DealersProductInvoiceRecord[] = current ? JSON.parse(current) : [];

      if (editingId) {
        const idx = invoicesList.findIndex((i) => i.id === editingId);
        if (idx >= 0) invoicesList[idx] = record;
      } else {
        invoicesList.push(record);
      }

      localStorage.setItem("dealers_product_invoices", JSON.stringify(invoicesList));

      setInvoices(invoicesList);
      setForm(DEFAULT_FORM);
      setEditingId(null);
      setPreviewId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      if (supabase) {
        try {
          await supabase.from("dealers_product_invoices").delete().eq("id", id);
        } catch (error) {
          console.warn("Supabase delete failed, using localStorage");
        }
      }

      const current = localStorage.getItem("dealers_product_invoices");
      const invoicesList: DealersProductInvoiceRecord[] = current ? JSON.parse(current) : [];
      const updated = invoicesList.filter((i) => i.id !== id);
      localStorage.setItem("dealers_product_invoices", JSON.stringify(updated));

      setInvoices(updated);
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  const editInvoice = (id: string) => {
    const invoice = invoices.find((i) => i.id === id);
    if (invoice) {
      setForm({
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        dealer_name: invoice.dealer_name,
        dealer_code: invoice.dealer_code,
        contact_no: invoice.contact_no,
        location: invoice.location,
        model_no: invoice.model_no,
        product_description: invoice.product_description,
        hsn_no: invoice.hsn_no,
        no_of_vehicles: invoice.no_of_vehicles,
        chassis_no: invoice.chassis_no,
        motor_no: invoice.motor_no,
        battery_no: invoice.battery_no,
        battery_capacity: invoice.battery_capacity,
        battery_vehicle_specs: invoice.battery_vehicle_specs,
        battery_warranty: invoice.battery_warranty,
        vehicle_warranty: invoice.vehicle_warranty,
        unit_price: invoice.unit_price,
        gst_enabled: invoice.gst_enabled,
        gst_type: invoice.gst_type,
        mode_of_payment: invoice.mode_of_payment,
      });
      setEditingId(id);
      window.scrollTo(0, 0);
    }
  };

  const downloadPDF = async (id: string) => {
    const invoice = invoices.find((i) => i.id === id);
    if (!invoice) return;

    try {
      const element = document.getElementById(`invoice-preview-${id}`);
      if (!element) return;

      const html2pdf = (await import("html2pdf.js")).default;
      const pdf = html2pdf();
      pdf.from(element).save(`${invoice.invoice_number}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Unable to download PDF");
    }
  };

  const handleImport = async (data: Record<string, any>[]) => {
    const imported = data.map((row: any) => ({
      ...row,
      id: `dinv_${Date.now()}_${Math.random()}`,
      created_at: new Date().toISOString(),
    }));

    const current = localStorage.getItem("dealers_product_invoices");
    const invoicesList: DealersProductInvoiceRecord[] = current ? JSON.parse(current) : [];
    const updated = [...invoicesList, ...imported];
    localStorage.setItem("dealers_product_invoices", JSON.stringify(updated));

    setInvoices(updated);
    alert(`Imported ${imported.length} invoices`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dealers Product Invoices</h1>
              <p className="text-muted-foreground">
                Manage dealer product proforma invoices
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

          {/* Form Section */}
          <div className="border rounded-lg p-6 bg-card">
            <h2 className="text-xl font-semibold mb-6">
              {editingId ? "Edit Invoice" : "Create New Invoice"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={form.invoice_number}
                  onChange={(e) =>
                    setForm({ ...form, invoice_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., DLRPROD/2026-27/001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) =>
                    setForm({ ...form, invoice_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Dealer Name
                </label>
                <input
                  type="text"
                  list="dealer-list"
                  value={form.dealer_name}
                  onChange={(e) =>
                    setForm({ ...form, dealer_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Select or enter dealer name"
                />
                <datalist id="dealer-list">
                  {dealers.map((dealer) => (
                    <option key={dealer.id} value={dealer.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Dealer Code
                </label>
                <input
                  type="text"
                  value={form.dealer_code}
                  onChange={(e) =>
                    setForm({ ...form, dealer_code: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Dealer code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contact No
                </label>
                <input
                  type="tel"
                  value={form.contact_no}
                  onChange={(e) =>
                    setForm({ ...form, contact_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Model No
                </label>
                <input
                  type="text"
                  value={form.model_no}
                  onChange={(e) =>
                    setForm({ ...form, model_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Model number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Product Description
                </label>
                <input
                  type="text"
                  value={form.product_description}
                  onChange={(e) =>
                    setForm({ ...form, product_description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Product description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  HSN No
                </label>
                <input
                  type="text"
                  value={form.hsn_no}
                  onChange={(e) =>
                    setForm({ ...form, hsn_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="HSN number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  No. of Vehicles
                </label>
                <input
                  type="number"
                  value={form.no_of_vehicles}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      no_of_vehicles: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Number of vehicles"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Chassis No
                </label>
                <input
                  type="text"
                  value={form.chassis_no}
                  onChange={(e) =>
                    setForm({ ...form, chassis_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Chassis number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Motor No
                </label>
                <input
                  type="text"
                  value={form.motor_no}
                  onChange={(e) =>
                    setForm({ ...form, motor_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Motor number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Battery No
                </label>
                <input
                  type="text"
                  value={form.battery_no}
                  onChange={(e) =>
                    setForm({ ...form, battery_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Battery number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Battery Capacity
                </label>
                <input
                  type="text"
                  value={form.battery_capacity}
                  onChange={(e) =>
                    setForm({ ...form, battery_capacity: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Battery capacity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Battery & Vehicle Specs
                </label>
                <input
                  type="text"
                  value={form.battery_vehicle_specs}
                  onChange={(e) =>
                    setForm({ ...form, battery_vehicle_specs: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Specifications"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Battery Warranty
                </label>
                <input
                  type="text"
                  value={form.battery_warranty}
                  onChange={(e) =>
                    setForm({ ...form, battery_warranty: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Battery warranty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Vehicle Warranty
                </label>
                <input
                  type="text"
                  value={form.vehicle_warranty}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_warranty: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Vehicle warranty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Unit Price
                </label>
                <input
                  type="number"
                  value={form.unit_price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unit_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mode of Payment
                </label>
                <select
                  value={form.mode_of_payment}
                  onChange={(e) =>
                    setForm({ ...form, mode_of_payment: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Bank Transfer</option>
                  <option>Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  GST Type
                </label>
                <select
                  value={form.gst_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gst_type: e.target.value as "cgst-sgst" | "igst",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="cgst-sgst">CGST-SGST</option>
                  <option value="igst">IGST</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="gst-enabled"
                  checked={form.gst_enabled}
                  onChange={(e) =>
                    setForm({ ...form, gst_enabled: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <label htmlFor="gst-enabled" className="text-sm font-medium">
                  Enable GST (18%)
                </label>
              </div>
            </div>

            {/* Summary */}
            {form.unit_price > 0 && (
              <div className="bg-muted p-4 rounded-md mb-6">
                {(() => {
                  const { amount, gstAmount, total } = calculateInvoiceTotal(
                    form.unit_price,
                    form.no_of_vehicles,
                    form.gst_enabled
                  );
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span>₹{amount.toFixed(2)}</span>
                      </div>
                      {form.gst_enabled && (
                        <>
                          <div className="flex justify-between">
                            <span>GST (18%):</span>
                            <span>₹{gstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>Total:</span>
                            <span>₹{total.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => saveInvoice()}
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Update Invoice"
                    : "Create Invoice"}
              </Button>
              {editingId && (
                <Button
                  onClick={() => {
                    setForm(DEFAULT_FORM);
                    setEditingId(null);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Import/Export */}
          <div className="flex gap-2">
            <ImportExport
              data={invoices}
              onImport={handleImport}
              dataType="dealers_product_invoices"
              exportHeaders={["invoice_number", "invoice_date", "dealer_name", "model_no", "total_amount", "mode_of_payment"]}
              filename="dealers-product-invoices"
              title="Dealers Product Invoices"
              showCsvExport={true}
              showPdfExport={false}
            />
          </div>

          {/* Invoices List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted px-6 py-3 font-semibold">
              Saved Invoices ({invoices.length})
            </div>
            {invoices.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No invoices yet. Create one above.
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full text-sm">
                  <thead className="border-t border-b bg-muted">
                    <tr>
                      <th className="text-left px-3 py-3 font-medium text-xs">
                        Invoice #
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-xs">
                        Dealer
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-xs">
                        Model No
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-xs">Date</th>
                      <th className="text-left px-3 py-3 font-medium text-xs">Amount</th>
                      <th className="text-left px-3 py-3 font-medium text-xs">
                        Payment
                      </th>
                      <th className="text-left px-3 py-3 font-medium text-xs">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t hover:bg-muted text-xs">
                        <td className="px-3 py-3">{invoice.invoice_number}</td>
                        <td className="px-3 py-3">{invoice.dealer_name}</td>
                        <td className="px-3 py-3">{invoice.model_no}</td>
                        <td className="px-3 py-3">{invoice.invoice_date}</td>
                        <td className="px-3 py-3 font-semibold">
                          ₹{invoice.total_amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">{invoice.mode_of_payment}</td>
                        <td className="px-3 py-3 flex gap-1 flex-wrap">
                          <Button
                            onClick={() => setPreviewId(invoice.id)}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => editInvoice(invoice.id)}
                            variant="outline"
                            size="sm"
                            className="h-7"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => downloadPDF(invoice.id)}
                            variant="outline"
                            size="sm"
                            className="h-7"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => deleteInvoice(invoice.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 h-7"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Preview Modal */}
          {previewId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Invoice Preview</h2>
                  <Button
                    onClick={() => setPreviewId(null)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-6">
                  {invoices.find((i) => i.id === previewId) && (
                    <div id={`invoice-preview-${previewId}`}>
                      <ProductInvoiceContent
                        product={{
                          id: previewId,
                          model_no: invoices.find((i) => i.id === previewId)?.model_no || "",
                          dealer_name: invoices.find((i) => i.id === previewId)?.dealer_name || "",
                          dealer_code: invoices.find((i) => i.id === previewId)?.dealer_code || "",
                          contact_no: invoices.find((i) => i.id === previewId)?.contact_no || "",
                          location: invoices.find((i) => i.id === previewId)?.location || "",
                          product_description: invoices.find((i) => i.id === previewId)?.product_description || "",
                          hsn_no: invoices.find((i) => i.id === previewId)?.hsn_no || "",
                          no_of_vehicles: invoices.find((i) => i.id === previewId)?.no_of_vehicles || 0,
                          chassis_no: invoices.find((i) => i.id === previewId)?.chassis_no || "",
                          motor_no: invoices.find((i) => i.id === previewId)?.motor_no || "",
                          battery_no: invoices.find((i) => i.id === previewId)?.battery_no || "",
                          battery_vehicle_specs: invoices.find((i) => i.id === previewId)?.battery_vehicle_specs || "",
                          battery_warranty: invoices.find((i) => i.id === previewId)?.battery_warranty || "",
                          battery_capacity: invoices.find((i) => i.id === previewId)?.battery_capacity || "",
                          vehicle_warranty: invoices.find((i) => i.id === previewId)?.vehicle_warranty || "",
                          invoice_date: invoices.find((i) => i.id === previewId)?.invoice_date || "",
                          amount: invoices.find((i) => i.id === previewId)?.amount || 0,
                          mode_of_payment: invoices.find((i) => i.id === previewId)?.mode_of_payment || "",
                        }}
                        gstType={
                          invoices.find((i) => i.id === previewId)?.gst_type || "cgst-sgst"
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
