import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit, Trash2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getEmployeeSession } from "@/lib/auth";
import DealerInvoiceContent from "@/components/DealerInvoiceContent";
import { ImportExport } from "@/components/ImportExport";
import { SplitPaymentForm, type SplitPayment } from "@/components/SplitPaymentForm";
import { PaymentHistoryDisplay } from "@/components/PaymentHistoryDisplay";

interface ProductRow {
  id?: string;
  product: string;
  productDescription: string;
  amount: number;
  unit: number;
  gstRate: number; // 5 or 18
}

interface DealerInvoiceRecord {
  id: string;
  dealerInvoiceNo: string;
  dealerName: string;
  dealerId?: string;
  contactNo: string;
  location: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  sentTo: string;
  shipTo: string;
  products: ProductRow[];
  total: number;
  labourCharges: number;
  gstEnabled: boolean;
  gstAmount: number;
  modeOfPayment: string;
  leadSource: string;
  createdAt: string;
}

const DEFAULT_PRODUCT_ROW: ProductRow = {
  id: "",
  product: "",
  productDescription: "",
  amount: 0,
  unit: 1,
  gstRate: 18,
};

interface InvoiceForm {
  dealerInvoiceNo: string;
  dealerName: string;
  contactNo: string;
  location: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  sentTo: string;
  shipTo: string;
  labourCharges: number;
  gstEnabled: boolean;
  modeOfPayment: string;
  leadSource: string;
  products: ProductRow[];
  splitPayments: SplitPayment[];
}

const createDefaultForm = (): InvoiceForm => ({
  dealerInvoiceNo: "",
  dealerName: "",
  contactNo: "",
  location: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  poNumber: "",
  sentTo: "",
  shipTo: "",
  labourCharges: 0,
  gstEnabled: true,
  modeOfPayment: "Cash",
  leadSource: "",
  products: [{ ...DEFAULT_PRODUCT_ROW, id: `product_${Date.now()}` }],
  splitPayments: [],
});

const DEFAULT_FORM = createDefaultForm();

function getNextDealerInvoiceNumber(): string {
  const defaultInvoiceNo = "DLR/2026-27/001";
  let maxInvoiceNo = defaultInvoiceNo;
  let maxNumericSuffix = 0;

  try {
    const saved = localStorage.getItem("crm_dealer_invoices");
    if (saved) {
      const invoices = JSON.parse(saved) as DealerInvoiceRecord[];
      invoices.forEach((inv) => {
        const invoice = inv.dealerInvoiceNo?.trim();
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
    console.error("Error deriving next dealer invoice number:", error);
  }

  const lastMatch = maxInvoiceNo.match(/^(.*?)(\d+)$/);
  if (!lastMatch) return defaultInvoiceNo;
  const prefix = lastMatch[1];
  const width = lastMatch[2].length;
  const nextValue = String(Number(lastMatch[2]) + 1).padStart(width, "0");
  return `${prefix}${nextValue}`;
}

export default function DealerInvoice() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<DealerInvoiceRecord[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [form, setForm] = useState<InvoiceForm>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDealers, setIsLoadingDealers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [gstType, setGstType] = useState<"igst" | "cgst-sgst">("cgst-sgst");

  useEffect(() => {
    void loadInvoices();
    void loadDealers();
    if (!editingId) {
      setForm((prev) => ({
        ...prev,
        dealerInvoiceNo: getNextDealerInvoiceNumber(),
      }));
    }
  }, [editingId]);

const loadInvoices = async () => {
  setIsLoading(true);

  try {
    if (!supabase) {
      console.error("Supabase client not initialized");
      return;
    }

    const { data, error } = await supabase
      .from("dealers_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Supabase Data:", data);
    console.log("Supabase Error:", error);

    if (error) throw error;

    const mappedInvoices: DealerInvoiceRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      dealerInvoiceNo: row.invoice_number,
      dealerName: row.dealer_name,
      dealerId: row.dealer_id,
      contactNo: row.contact_no || "",
      location: row.location || "",
      invoiceDate: row.invoice_date,
      dueDate: row.due_date || "",
      poNumber: row.purchase_order_no || "",
      sentTo: row.sent_to || "",
      shipTo: row.ship_to || "",
      products: [],
      total: Number(row.total_amount || 0),
      labourCharges: Number(row.labour_charges || 0),
      gstEnabled: row.gst_enabled ?? true,
      gstAmount: Number(row.total_gst_amount || 0),
      modeOfPayment: row.mode_of_payment || "",
      leadSource: row.lead_source || "",
      createdAt: row.created_at,
    }));

    setInvoices(mappedInvoices);
  } catch (error) {
    console.error("Load Invoice Error:", error);
  } finally {
    setIsLoading(false);
  }
};


  const loadDealers = async () => {
    setIsLoadingDealers(true);
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
    } finally {
      setIsLoadingDealers(false);
    }
  };

  const calculateInvoiceTotal = (products: ProductRow[], labour: number) => {
    const productTotal = products.reduce(
      (sum, row) => sum + (row.amount * row.unit),
      0
    );
    const taxableTotal = productTotal + labour;

    // Calculate GST per product
    let totalGst = 0;
    const gstBreakdown: { rate: number; amount: number }[] = [];

    products.forEach((product) => {
      const productLineTotal = product.amount * product.unit;
      const rate = product.gstRate || 18;
      const gstRate = rate / 100;
      const gstAmount = Math.round(productLineTotal * gstRate);
      totalGst += gstAmount;
      gstBreakdown.push({ rate, amount: gstAmount });
    });

    // Add labour GST if applicable
    const labourGstRate = 0.18; // Default to 18% for labour
    const labourGst = labour > 0 ? Math.round(labour * labourGstRate) : 0;
    totalGst += labourGst;

    return { productTotal, taxableTotal, gstAmount: totalGst, total: taxableTotal + totalGst, gstBreakdown, labourGst };
  };

  const saveInvoice = async (finalSplitPayments: SplitPayment[] = []) => {
    if (!form.dealerName || !form.dealerInvoiceNo || form.products.length === 0) {
      alert("Please fill in dealer name, invoice number, and at least one product");
      return;
    }

    setIsSaving(true);
    try {
      const { productTotal, taxableTotal: _taxableTotal, gstAmount, total } = calculateInvoiceTotal(
        form.products,
        form.labourCharges
      );

      const invoiceId = editingId || crypto.randomUUID();
      const createdAtTime = editingId ? invoices.find(i => i.id === editingId)?.createdAt || new Date().toISOString() : new Date().toISOString();

      const invoiceRecord = {
      
        invoice_number: form.dealerInvoiceNo,
        invoice_date: form.invoiceDate,
        due_date: form.dueDate || null,
        dealer_id: null,
        dealer_name: form.dealerName,
        contact_no: form.contactNo || null,
        location: form.location || null,
        purchase_order_no: form.poNumber || null,
        sent_to: form.sentTo || null,
        ship_to: form.shipTo || null,
        mode_of_payment: form.modeOfPayment || null,
        lead_source: form.leadSource || null,
        labour_charges: form.labourCharges || 0,
        subtotal: productTotal,
        gst_enabled: form.gstEnabled,
        total_gst_amount: gstAmount,
        total_amount: total,
        payment_status: "pending",
        
        
        is_deleted: false,
      };

      if (supabase) {
      try {
      let result;


      if (editingId) {
        result = await supabase
          .from("dealers_invoices")
          .update(invoiceRecord)
          .eq("id", invoiceId)
          .select();
      }
      else {
        result = await supabase
          .from("dealers_invoices")
          .insert([invoiceRecord])
          .select();
}

      console.log("Insert/Update Result:", result.data);
      console.log("Insert/Update Error:", result.error);

      if (result.error) {
        throw result.error;
}

      alert("Invoice saved to Supabase successfully!");

      await loadInvoices();


}     catch (error) {
      console.error("Supabase Save Error:", error);
      alert(`Supabase Error: ${JSON.stringify(error)}`);
}
}



      // Always update localStorage
      const record: DealerInvoiceRecord = {
        id: invoiceId,
        dealerInvoiceNo: form.dealerInvoiceNo,
        dealerName: form.dealerName,
        contactNo: form.contactNo,
        location: form.location,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        poNumber: form.poNumber,
        sentTo: form.sentTo,
        shipTo: form.shipTo,
        products: form.products,
        total,
        labourCharges: form.labourCharges,
        gstEnabled: form.gstEnabled,
        gstAmount,
        modeOfPayment: form.modeOfPayment,
        leadSource: form.leadSource,
        createdAt: createdAtTime,
      };

      const current = localStorage.getItem("crm_dealer_invoices");
      const invoicesList: DealerInvoiceRecord[] = current ? JSON.parse(current) : [];

      if (editingId) {
        const idx = invoicesList.findIndex(i => i.id === editingId);
        if (idx >= 0) invoicesList[idx] = record;
      } else {
        invoicesList.push(record);
      }

      localStorage.setItem("crm_dealer_invoices", JSON.stringify(invoicesList));

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
          await supabase.from("dealers_invoices").delete().eq("id", id);
        } catch (error) {
          console.warn("Supabase delete failed, using localStorage");
        }
      }

      const current = localStorage.getItem("crm_dealer_invoices");
      const invoicesList: DealerInvoiceRecord[] = current ? JSON.parse(current) : [];
      const updated = invoicesList.filter(i => i.id !== id);
      localStorage.setItem("crm_dealer_invoices", JSON.stringify(updated));

      setInvoices(updated);
    } catch (error) {
      console.error("Error deleting invoice:", error);
    }
  };

  const editInvoice = (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
      setForm({
        dealerInvoiceNo: invoice.dealerInvoiceNo,
        dealerName: invoice.dealerName,
        contactNo: invoice.contactNo,
        location: invoice.location,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate || "",
        poNumber: invoice.poNumber || "",
        sentTo: invoice.sentTo || "",
        shipTo: invoice.shipTo || "",
        products: invoice.products,
        labourCharges: invoice.labourCharges,
        gstEnabled: invoice.gstEnabled,
        modeOfPayment: invoice.modeOfPayment,
        leadSource: invoice.leadSource,
        splitPayments: [],
      });
      setEditingId(id);
      window.scrollTo(0, 0);
    }
  };

  const downloadPDF = async (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    try {
      const element = document.getElementById(`invoice-preview-${id}`);
      if (!element) {
        alert("Invoice preview not found. Please try again.");
        return;
      }

      // Wait for all images to load before generating PDF
      const images = element.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Still proceed if image fails
          }
        });
      });

      await Promise.all(imagePromises);

      // Add a small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const html2pdf = (await import("html2pdf.js")).default;
      const options = {
        margin: 10,
        filename: `${invoice.dealerInvoiceNo}.pdf`,
        image: { type: "png", quality: 0.98 },
        html2canvas: { scale: 2, allowTaint: true, useCORS: true },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      };

      html2pdf().set(options).from(element).save();
      alert("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Unable to download PDF. Please check browser console.");
    }
  };

  const handleImport = async (data: Record<string, any>[]) => {
    const imported = data.map((row: any) => ({
      ...row,
      id: `dealer_inv_${Date.now()}_${Math.random()}`,
      createdAt: new Date().toISOString(),
    }));

    const current = localStorage.getItem("crm_dealer_invoices");
    const invoicesList: DealerInvoiceRecord[] = current ? JSON.parse(current) : [];
    const updated = [...invoicesList, ...imported];
    localStorage.setItem("crm_dealer_invoices", JSON.stringify(updated));

    setInvoices(updated);
    alert(`Imported ${imported.length} invoices`);
  };


  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dealer Invoices</h1>
              <p className="text-muted-foreground">
                Manage dealer product invoices with multiple items
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
                  value={form.dealerInvoiceNo}
                  onChange={(e) =>
                    setForm({ ...form, dealerInvoiceNo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., DLR/2026-27/001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Dealer Name
                </label>
                <input
                  type="text"
                  list="dealer-list"
                  value={form.dealerName}
                  onChange={(e) =>
                    setForm({ ...form, dealerName: e.target.value })
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
                  Contact No
                </label>
                <input
                  type="tel"
                  value={form.contactNo}
                  onChange={(e) =>
                    setForm({ ...form, contactNo: e.target.value })
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
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) =>
                    setForm({ ...form, invoiceDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  P.O.# (Purchase Order Number)
                </label>
                <input
                  type="text"
                  value={form.poNumber}
                  onChange={(e) =>
                    setForm({ ...form, poNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., PO-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Sent To
                </label>
                <input
                  type="text"
                  value={form.sentTo}
                  onChange={(e) =>
                    setForm({ ...form, sentTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ship To
                </label>
                <input
                  type="text"
                  value={form.shipTo}
                  onChange={(e) =>
                    setForm({ ...form, shipTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Shipping address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mode of Payment
                </label>
                <select
                  value={form.modeOfPayment}
                  onChange={(e) =>
                    setForm({ ...form, modeOfPayment: e.target.value })
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
                  Lead Source
                </label>
                <input
                  type="text"
                  value={form.leadSource}
                  onChange={(e) =>
                    setForm({ ...form, leadSource: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Lead source"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Labour Charges
                </label>
                <input
                  type="number"
                  value={form.labourCharges}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      labourCharges: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Products Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Products</h3>
              <div className="mb-2 flex gap-2 items-center text-xs font-semibold text-gray-600 px-2">
                <div className="flex-1">Product</div>
                <div className="flex-1">Description</div>
                <div className="w-20 text-right">Unit</div>
                <div className="w-24 text-right">Amount</div>
                <div className="w-20 text-center">GST Rate</div>
                <div className="w-20 text-right">Total</div>
                <div className="w-20 text-right">GST Amt</div>
              </div>
              <div className="space-y-3">
                {form.products.map((product, idx) => (
                  <div key={product.id} className="flex gap-2 items-end">
                    <input
                      type="text"
                      placeholder="Product name"
                      value={product.product}
                      onChange={(e) => {
                        const updated = [...form.products];
                        updated[idx].product = e.target.value;
                        setForm({ ...form, products: updated });
                      }}
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={product.productDescription}
                      onChange={(e) => {
                        const updated = [...form.products];
                        updated[idx].productDescription = e.target.value;
                        setForm({ ...form, products: updated });
                      }}
                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Unit"
                      value={product.unit}
                      onChange={(e) => {
                        const updated = [...form.products];
                        updated[idx].unit = parseFloat(e.target.value) || 0;
                        setForm({ ...form, products: updated });
                      }}
                      className="w-20 px-3 py-2 border rounded-md text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={product.amount}
                      onChange={(e) => {
                        const updated = [...form.products];
                        updated[idx].amount = parseFloat(e.target.value) || 0;
                        setForm({ ...form, products: updated });
                      }}
                      className="w-24 px-3 py-2 border rounded-md text-sm"
                    />
                    <select
                      value={product.gstRate || 18}
                      onChange={(e) => {
                        const updated = [...form.products];
                        updated[idx].gstRate = parseFloat(e.target.value);
                        setForm({ ...form, products: updated });
                      }}
                      className="w-20 px-3 py-2 border rounded-md text-sm"
                      title="GST Rate"
                    >
                      <option value="5">GST 5%</option>
                      <option value="18">GST 18%</option>
                    </select>
                    <span className="w-20 px-3 py-2 text-sm font-medium text-right">
                      ₹{((product.amount * product.unit) + ((product.amount * product.unit * (product.gstRate || 18)) / 100)).toFixed(2)}
                    </span>
                    <span className="w-20 px-3 py-2 text-sm font-medium text-right text-blue-600">
                      ₹{((product.amount * product.unit * (product.gstRate || 18)) / 100).toFixed(2)}
                    </span>
                    {form.products.length > 1 && (
                      <Button
                        onClick={() => {
                          setForm({
                            ...form,
                            products: form.products.filter((_, i) => i !== idx),
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => {
                  setForm({
                    ...form,
                    products: [
                      ...form.products,
                      { ...DEFAULT_PRODUCT_ROW, id: `product_${Date.now()}` },
                    ],
                  });
                }}
                variant="outline"
                className="mt-3 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            {/* Summary */}
            {form.products.length > 0 && (
              <div className="bg-muted p-4 rounded-md mb-6">
                {(() => {
                  const { productTotal, taxableTotal, gstAmount, total, gstBreakdown, labourGst } =
                    calculateInvoiceTotal(form.products, form.labourCharges);
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Product Total:</span>
                        <span>₹{productTotal.toFixed(2)}</span>
                      </div>
                      {form.labourCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Labour Charges:</span>
                          <span>₹{form.labourCharges.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span>Taxable Value:</span>
                        <span>₹{taxableTotal.toFixed(2)}</span>
                      </div>
                      {form.gstEnabled && (
                        <>
                          <div className="space-y-1 pl-4">
                            {gstBreakdown?.map((breakdown, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>GST ({breakdown.rate}%):</span>
                                <span>₹{breakdown.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            {labourGst > 0 && (
                              <div className="flex justify-between text-xs">
                                <span>Labour GST (18%):</span>
                                <span>₹{labourGst.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>TOTAL AMOUNT:</span>
                            <span className="text-green-600">₹{total.toFixed(2)}</span>
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
              dataType="service_invoices"
              exportHeaders={["dealerInvoiceNo", "dealerName", "contactNo", "location", "invoiceDate", "total", "modeOfPayment"]}
              filename="dealer-invoices"
              title="Dealer Invoices"
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-t border-b bg-muted">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">
                        Invoice #
                      </th>
                      <th className="text-left px-6 py-3 font-medium">
                        Dealer
                      </th>
                      <th className="text-left px-6 py-3 font-medium">Date</th>
                      <th className="text-left px-6 py-3 font-medium">Amount</th>
                      <th className="text-left px-6 py-3 font-medium">
                        Payment
                      </th>
                      <th className="text-left px-6 py-3 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t hover:bg-muted">
                        <td className="px-6 py-3">
                          {invoice.dealerInvoiceNo}
                        </td>
                        <td className="px-6 py-3">{invoice.dealerName}</td>
                        <td className="px-6 py-3">{invoice.invoiceDate}</td>
                        <td className="px-6 py-3 font-semibold">
                          ₹{invoice.total.toFixed(2)}
                        </td>
                        <td className="px-6 py-3">{invoice.modeOfPayment}</td>
                        <td className="px-6 py-3 flex gap-2">
                          <Button
                            onClick={() => setPreviewId(invoice.id)}
                            variant="outline"
                            size="sm"
                          >
                            Preview
                          </Button>
                          <Button
                            onClick={() => editInvoice(invoice.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deleteInvoice(invoice.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
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
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center gap-4">
                  <h2 className="text-xl font-semibold">Invoice Preview</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadPDF(previewId)}
                      variant="outline"
                      size="sm"
                      className="flex gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => setPreviewId(null)}
                      variant="ghost"
                      size="sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  {invoices.find((i) => i.id === previewId) && (
                    <div id={`invoice-preview-${previewId}`}>
                      <DealerInvoiceContent
                        invoice={invoices.find((i) => i.id === previewId)!}
                        gstType={gstType}
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
