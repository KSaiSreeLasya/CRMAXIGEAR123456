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
import { cn } from "@/lib/utils";

interface ProductRow {
  id?: string;
  product: string;
  productDescription: string;
  amount: number;
  unit: number;
  gstRate: number;
  type?: "single" | "bulk"; // single: unit price * qty, bulk: total amount
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

interface SparesInvoiceRecord {
  id: string;
  sparesInvoiceNo: string;
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
  type: "single",
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

function getNextSparesInvoiceNumber(): string {
  const defaultInvoiceNo = "SPARE/2026-27/001";
  let maxInvoiceNo = defaultInvoiceNo;
  let maxNumericSuffix = 0;

  try {
    const saved = localStorage.getItem("crm_spares_invoices");
    if (saved) {
      const invoices = JSON.parse(saved) as SparesInvoiceRecord[];
      invoices.forEach((inv) => {
        const invoice = inv.sparesInvoiceNo?.trim();
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
    console.error("Error deriving next spares invoice number:", error);
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
  const [sparesInvoices, setSparesInvoices] = useState<SparesInvoiceRecord[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [form, setForm] = useState<InvoiceForm>(DEFAULT_FORM);
  const [sparesForm, setSparesForm] = useState<InvoiceForm>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSparesId, setEditingSparesId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDealers, setIsLoadingDealers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sparesPreviewId, setSparesPreviewId] = useState<string | null>(null);
  const [gstType, setGstType] = useState<"igst" | "cgst-sgst">("cgst-sgst");
  const [activeTab, setActiveTab] = useState<"products" | "spares">("products");

  useEffect(() => {
    void loadInvoices();
    void loadSparesInvoices();
    void loadDealers();
  }, []);

  // Generate invoice numbers only on initial form creation, never for existing invoices
  const [hasGeneratedDealerNumber, setHasGeneratedDealerNumber] = useState(false);
  const [hasGeneratedSparesNumber, setHasGeneratedSparesNumber] = useState(false);

  useEffect(() => {
    if (!editingId && !hasGeneratedDealerNumber && form.dealerInvoiceNo === "") {
      setForm((prev) => ({
        ...prev,
        dealerInvoiceNo: getNextDealerInvoiceNumber(),
      }));
      setHasGeneratedDealerNumber(true);
    }
    if (editingId) {
      setHasGeneratedDealerNumber(true);
    }
  }, [editingId, hasGeneratedDealerNumber]);

  useEffect(() => {
    if (!editingSparesId && !hasGeneratedSparesNumber && sparesForm.dealerInvoiceNo === "") {
      setSparesForm((prev) => ({
        ...prev,
        dealerInvoiceNo: getNextSparesInvoiceNumber(),
      }));
      setHasGeneratedSparesNumber(true);
    }
    if (editingSparesId) {
      setHasGeneratedSparesNumber(true);
    }
  }, [editingSparesId, hasGeneratedSparesNumber]);

const loadInvoices = async () => {
  setIsLoading(true);

  try {
    if (!supabase) {
      const saved = localStorage.getItem("crm_dealer_invoices");
      setInvoices(saved ? JSON.parse(saved) : []);
      return;
    }

    const { data, error } = await supabase
      .from("dealers_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Supabase Data:", data);
    console.log("Supabase Error:", error);

    if (error) throw error;

    const mappedInvoices: DealerInvoiceRecord[] = await Promise.all((data || []).map(async (row: any) => {
      // Fetch invoice items for this invoice
      let products: ProductRow[] = [];
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from("dealers_invoice_items")
          .select("*")
          .eq("invoice_id", row.id);

        if (!itemsError && itemsData) {
          products = itemsData.map((item: any) => ({
            id: item.id,
            product: item.product_name || "",
            productDescription: item.product_description || "",
            amount: Number(item.unit_price || 0),
            unit: Number(item.quantity || 1),
            gstRate: Number(item.gst_rate || 18),
          }));
        }
      } catch (err) {
        console.warn("Failed to load invoice items for invoice", row.id, err);
      }

      return {
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
        products,
        total: Number(row.total_amount || 0),
        labourCharges: Number(row.labour_charges || 0),
        gstEnabled: row.gst_enabled ?? true,
        gstAmount: Number(row.total_gst_amount || 0),
        modeOfPayment: row.mode_of_payment || "",
        leadSource: row.lead_source || "",
        createdAt: row.created_at,
      };
    }));

    setInvoices(mappedInvoices);
  } catch (error) {
    console.error("Load Invoice Error:", error);
    const saved = localStorage.getItem("crm_dealer_invoices");
    setInvoices(saved ? JSON.parse(saved) : []);
  } finally {
    setIsLoading(false);
  }
};

const loadSparesInvoices = async () => {
  try {
    if (!supabase) {
      const saved = localStorage.getItem("crm_spares_invoices");
      setSparesInvoices(saved ? JSON.parse(saved) : []);
      return;
    }

    const { data, error } = await supabase
      .from("spares_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mappedInvoices: SparesInvoiceRecord[] = await Promise.all((data || []).map(async (row: any) => {
      let products: ProductRow[] = [];
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from("spares_invoice_products")
          .select("*")
          .eq("spares_invoice_id", row.id);

        if (!itemsError && itemsData) {
          products = itemsData.map((item: any) => ({
            id: item.id,
            product: item.product_name || "",
            productDescription: item.description || "",
            amount: Number(item.unit_price || 0),
            unit: Number(item.unit_quantity || 1),
            gstRate: Number(item.gst_rate || 18),
          }));
        }
      } catch (err) {
        console.warn("Failed to load spares invoice items for invoice", row.id, err);
      }

      return {
        id: row.id,
        sparesInvoiceNo: row.spares_invoice_no,
        dealerName: row.dealer_name,
        dealerId: row.dealer_id,
        contactNo: row.contact_no || "",
        location: row.location || "",
        invoiceDate: row.invoice_date,
        dueDate: row.due_date || "",
        poNumber: row.po_number || "",
        sentTo: row.sent_to || "",
        shipTo: row.ship_to || "",
        products,
        total: Number(row.total || 0),
        labourCharges: Number(row.labour_charges || 0),
        gstEnabled: row.gst_enabled ?? true,
        gstAmount: Number(row.gst_amount || 0),
        modeOfPayment: row.mode_of_payment || "",
        leadSource: row.lead_source || "",
        createdAt: row.created_at,
      };
    }));

    setSparesInvoices(mappedInvoices);
  } catch (error) {
    console.error("Load Spares Invoices Error:", error);
    const saved = localStorage.getItem("crm_spares_invoices");
    setSparesInvoices(saved ? JSON.parse(saved) : []);
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
        id: invoiceId,
      
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

      // After invoice is saved, save invoice items to dealers_invoice_items
      try {
        // Prepare items payload
        
        const items = form.products.map((p) => {
          const quantity = p.unit || 1;
          const unit_price = Number(p.amount || 0);
          const line_total = Number((unit_price * quantity).toFixed(2));
          const gst_rate = Number(p.gstRate || 18);
          const gst_amount = Math.round((line_total * gst_rate) / 100);
          const line_amount_with_gst = Number((line_total + gst_amount).toFixed(2));

          return {
            invoice_id: invoiceId,
            product_name: p.product || "",
            product_description: p.productDescription || null,
            quantity,
            unit_price,
            line_total,
            gst_rate,
            gst_amount,
            line_amount_with_gst,
          };
        });

        if (editingId) {
          // Remove old items for this invoice and re-insert
          const { error: deleteErr } = await supabase
            .from("dealers_invoice_items")
            .delete()
            .eq("invoice_id", invoiceId);
          if (deleteErr) console.warn("Failed to delete old invoice items:", deleteErr);
        }

        if (items.length > 0) {
          const { data: itemsData, error: itemsErr } = await supabase
            .from("dealers_invoice_items")
            .insert(items);
          if (itemsErr) {
            console.warn("Failed to insert invoice items:", itemsErr);
          } else {
            console.log("Inserted invoice items:", itemsData?.length);
          }
        }
      } catch (err) {
        console.error("Error saving invoice items to Supabase:", err);
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
      setHasGeneratedDealerNumber(false);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      if (supabase) {
        try {
          // Delete invoice items first
          await supabase.from("dealers_invoice_items").delete().eq("invoice_id", id);
          // Then delete the invoice
          await supabase.from("dealers_invoices").delete().eq("id", id);
        } catch (error) {
          console.warn("Supabase delete failed, using localStorage");
        }
      }

      const current = localStorage.getItem("crm_dealer_invoices");
      const invoicesList: DealerInvoiceRecord[] = current ? JSON.parse(current) : [];
      const updated = invoicesList.filter(i => i.id !== id);
      localStorage.setItem("crm_dealer_invoices", JSON.stringify(updated));

      await loadInvoices();
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

  const saveSparesInvoice = async () => {
    if (!sparesForm.dealerName || !sparesForm.dealerInvoiceNo || sparesForm.products.length === 0) {
      alert("Please fill in dealer name, invoice number, and at least one product");
      return;
    }

    setIsSaving(true);
    try {
      const { productTotal, gstAmount, total } = calculateInvoiceTotal(
        sparesForm.products,
        sparesForm.labourCharges
      );

      const invoiceId = editingSparesId || crypto.randomUUID();
      const createdAtTime = editingSparesId ? sparesInvoices.find(i => i.id === editingSparesId)?.createdAt || new Date().toISOString() : new Date().toISOString();

      const invoiceRecord = {
        id: invoiceId,
        spares_invoice_no: sparesForm.dealerInvoiceNo,
        invoice_date: sparesForm.invoiceDate,
        due_date: sparesForm.dueDate || null,
        dealer_id: null,
        dealer_name: sparesForm.dealerName,
        contact_no: sparesForm.contactNo || null,
        location: sparesForm.location || null,
        po_number: sparesForm.poNumber || null,
        sent_to: sparesForm.sentTo || null,
        ship_to: sparesForm.shipTo || null,
        mode_of_payment: sparesForm.modeOfPayment || null,
        lead_source: sparesForm.leadSource || null,
        labour_charges: sparesForm.labourCharges || 0,
        subtotal: productTotal,
        gst_enabled: sparesForm.gstEnabled,
        gst_amount: gstAmount,
        total: total,
      };

      if (supabase) {
        try {
          let result;
          if (editingSparesId) {
            result = await supabase
              .from("spares_invoices")
              .update(invoiceRecord)
              .eq("id", invoiceId)
              .select();
          } else {
            result = await supabase
              .from("spares_invoices")
              .insert([invoiceRecord])
              .select();
          }

          if (result.error) throw result.error;

          const items = sparesForm.products.map((p) => {
            const quantity = p.unit || 1;
            const unit_price = Number(p.amount || 0);
            const line_total = Number((unit_price * quantity).toFixed(2));
            const gst_rate = Number(p.gstRate || 18);
            const gst_amount = Math.round((line_total * gst_rate) / 100);

            return {
              spares_invoice_id: invoiceId,
              product_name: p.product || "",
              description: p.productDescription || null,
              unit_quantity: quantity,
              unit_price,
              gst_rate,
              line_total,
              gst_amount,
            };
          });

          if (editingSparesId) {
            const { error: deleteErr } = await supabase
              .from("spares_invoice_products")
              .delete()
              .eq("spares_invoice_id", invoiceId);
            if (deleteErr) console.warn("Failed to delete old items:", deleteErr);
          }

          if (items.length > 0) {
            const { error: itemsErr } = await supabase
              .from("spares_invoice_products")
              .insert(items);
            if (itemsErr) console.warn("Failed to insert items:", itemsErr);
          }

          alert("Spares invoice saved successfully!");
          await loadSparesInvoices();
        } catch (error) {
          console.error("Supabase Save Error:", error);
          alert(`Error: ${JSON.stringify(error)}`);
        }
      }

      const record: SparesInvoiceRecord = {
        id: invoiceId,
        sparesInvoiceNo: sparesForm.dealerInvoiceNo,
        dealerName: sparesForm.dealerName,
        contactNo: sparesForm.contactNo,
        location: sparesForm.location,
        invoiceDate: sparesForm.invoiceDate,
        dueDate: sparesForm.dueDate,
        poNumber: sparesForm.poNumber,
        sentTo: sparesForm.sentTo,
        shipTo: sparesForm.shipTo,
        products: sparesForm.products,
        total,
        labourCharges: sparesForm.labourCharges,
        gstEnabled: sparesForm.gstEnabled,
        gstAmount,
        modeOfPayment: sparesForm.modeOfPayment,
        leadSource: sparesForm.leadSource,
        createdAt: createdAtTime,
      };

      const current = localStorage.getItem("crm_spares_invoices");
      const invoicesList: SparesInvoiceRecord[] = current ? JSON.parse(current) : [];

      if (editingSparesId) {
        const idx = invoicesList.findIndex(i => i.id === editingSparesId);
        if (idx >= 0) invoicesList[idx] = record;
      } else {
        invoicesList.push(record);
      }

      localStorage.setItem("crm_spares_invoices", JSON.stringify(invoicesList));
      setSparesInvoices(invoicesList);
      setSparesForm(DEFAULT_FORM);
      setEditingSparesId(null);
      setSparesPreviewId(null);
      setHasGeneratedSparesNumber(false);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSparesInvoice = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      if (supabase) {
        try {
          // Delete spares invoice items first
          await supabase.from("spares_invoice_products").delete().eq("spares_invoice_id", id);
          // Then delete the spares invoice
          await supabase.from("spares_invoices").delete().eq("id", id);
        } catch (error) {
          console.warn("Supabase delete failed, using localStorage");
        }
      }

      const current = localStorage.getItem("crm_spares_invoices");
      const invoicesList: SparesInvoiceRecord[] = current ? JSON.parse(current) : [];
      const updated = invoicesList.filter(i => i.id !== id);
      localStorage.setItem("crm_spares_invoices", JSON.stringify(updated));
      await loadSparesInvoices();
    } catch (error) {
      console.error("Error deleting spares invoice:", error);
    }
  };

  const editSparesInvoice = (id: string) => {
    const invoice = sparesInvoices.find(i => i.id === id);
    if (invoice) {
      setSparesForm({
        dealerInvoiceNo: invoice.sparesInvoiceNo,
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
      setEditingSparesId(id);
      window.scrollTo(0, 0);
    }
  };

  const downloadSparesInvoicePDF = async (id: string) => {
    const invoice = sparesInvoices.find(i => i.id === id);
    if (!invoice) return;

    try {
      const element = document.getElementById(`spares-invoice-preview-${id}`);
      if (!element) {
        alert("Invoice preview not found. Please try again.");
        return;
      }

      const images = element.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
      });

      await Promise.all(imagePromises);
      await new Promise(resolve => setTimeout(resolve, 500));

      const html2pdf = (await import("html2pdf.js")).default;
      const options = {
        margin: 10,
        filename: `${invoice.sparesInvoiceNo}.pdf`,
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


  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dealer Invoices</h1>
              <p className="text-muted-foreground">
                Manage dealer product and spares invoices
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

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b bg-background">
            <button
              onClick={() => setActiveTab("products")}
              className={cn(
                "px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors",
                activeTab === "products"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Product Invoices
            </button>
            <button
              onClick={() => setActiveTab("spares")}
              className={cn(
                "px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors",
                activeTab === "spares"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Spares Invoices
            </button>
          </div>

          {/* PRODUCTS TAB */}
          {activeTab === "products" && (
            <>
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
              <div className="space-y-4">
                {form.products.map((product, idx) => {
                  const isBulk = product.type === "bulk";
                  const lineTotal = isBulk ? product.amount : product.amount * product.unit;
                  const gstAmount = (lineTotal * (product.gstRate || 18)) / 100;
                  const totalWithGst = lineTotal + gstAmount;

                  return (
                    <div key={product.id} className="border rounded-lg p-4 bg-card space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium">Product Name</label>
                          <input
                            type="text"
                            placeholder="Product name"
                            value={product.product}
                            onChange={(e) => {
                              const updated = [...form.products];
                              updated[idx].product = e.target.value;
                              setForm({ ...form, products: updated });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium">Description</label>
                          <input
                            type="text"
                            placeholder="Description"
                            value={product.productDescription}
                            onChange={(e) => {
                              const updated = [...form.products];
                              updated[idx].productDescription = e.target.value;
                              setForm({ ...form, products: updated });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-xs font-medium">Type</label>
                          <select
                            value={isBulk ? "bulk" : "single"}
                            onChange={(e) => {
                              const updated = [...form.products];
                              updated[idx].type = e.target.value as "single" | "bulk";
                              setForm({ ...form, products: updated });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          >
                            <option value="single">Single Unit</option>
                            <option value="bulk">Bulk</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isBulk ? (
                          <>
                            <div className="w-28">
                              <label className="text-xs font-medium">Quantity</label>
                              <input
                                type="number"
                                placeholder="Qty"
                                value={product.unit}
                                onChange={(e) => {
                                  const updated = [...form.products];
                                  updated[idx].unit = parseFloat(e.target.value) || 0;
                                  setForm({ ...form, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium">Total Amount (₹)</label>
                              <input
                                type="number"
                                placeholder="Total amount"
                                value={product.amount}
                                onChange={(e) => {
                                  const updated = [...form.products];
                                  updated[idx].amount = parseFloat(e.target.value) || 0;
                                  setForm({ ...form, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-28">
                              <label className="text-xs font-medium">Unit (Qty)</label>
                              <input
                                type="number"
                                placeholder="Qty"
                                value={product.unit}
                                onChange={(e) => {
                                  const updated = [...form.products];
                                  updated[idx].unit = parseFloat(e.target.value) || 0;
                                  setForm({ ...form, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium">Unit Price (₹)</label>
                              <input
                                type="number"
                                placeholder="Unit price"
                                value={product.amount}
                                onChange={(e) => {
                                  const updated = [...form.products];
                                  updated[idx].amount = parseFloat(e.target.value) || 0;
                                  setForm({ ...form, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                          </>
                        )}

                        <div className="w-32">
                          <label className="text-xs font-medium">GST %</label>
                          <input
                            type="number"
                            placeholder="0-100"
                            min="0"
                            value={product.gstRate !== undefined ? product.gstRate : 18}
                            onChange={(e) => {
                              const updated = [...form.products];
                              updated[idx].gstRate = parseFloat(e.target.value) ?? 18;
                              setForm({ ...form, products: updated });
                            }}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 bg-muted p-3 rounded text-sm">
                        <div>
                          <span className="font-medium">Line Total:</span>
                          <span className="ml-2">₹{lineTotal.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">GST:</span>
                          <span className="ml-2 text-blue-600">₹{gstAmount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="font-medium">With GST:</span>
                          <span className="ml-2 text-green-600">₹{totalWithGst.toFixed(2)}</span>
                        </div>
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
                            className="ml-auto"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
              <div className="bg-muted p-4 rounded-md mb-6 overflow-x-auto">
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
                          <div className="flex justify-between items-center font-semibold border-t pt-2">
                            <span className="whitespace-nowrap">TOTAL AMOUNT:</span>

                            <span
                              className="text-green-600 whitespace-nowrap flex-shrink-0"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              ₹{total.toFixed(2)}
                            </span>
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
                    setHasGeneratedDealerNumber(false);
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
                        <td className="px-3 py-3">
                          {invoice.dealerInvoiceNo}
                        </td>
                        <td className="px-3 py-3">{invoice.dealerName}</td>
                        <td className="px-3 py-3">{invoice.invoiceDate}</td>
                        <td className="px-3 py-3 font-semibold">
                          ₹{invoice.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">{invoice.modeOfPayment}</td>
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
            </>
          )}

          {/* SPARES TAB */}
          {activeTab === "spares" && (
            <>
              {/* Spares Form Section */}
              <div className="border rounded-lg p-6 bg-card">
                <h2 className="text-xl font-semibold mb-6">
                  {editingSparesId ? "Edit Spares Invoice" : "Create New Spares Invoice"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={sparesForm.dealerInvoiceNo}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, dealerInvoiceNo: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., SPARE/2026-27/001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Dealer Name
                    </label>
                    <input
                      type="text"
                      list="spares-dealer-list"
                      value={sparesForm.dealerName}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, dealerName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Select or enter dealer name"
                    />
                    <datalist id="spares-dealer-list">
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
                      value={sparesForm.contactNo}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, contactNo: e.target.value })
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
                      value={sparesForm.location}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, location: e.target.value })
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
                      value={sparesForm.invoiceDate}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, invoiceDate: e.target.value })
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
                      value={sparesForm.dueDate}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, dueDate: e.target.value })
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
                      value={sparesForm.poNumber}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, poNumber: e.target.value })
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
                      value={sparesForm.sentTo}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, sentTo: e.target.value })
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
                      value={sparesForm.shipTo}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, shipTo: e.target.value })
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
                      value={sparesForm.modeOfPayment}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, modeOfPayment: e.target.value })
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
                      value={sparesForm.leadSource}
                      onChange={(e) =>
                        setSparesForm({ ...sparesForm, leadSource: e.target.value })
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
                      value={sparesForm.labourCharges}
                      onChange={(e) =>
                        setSparesForm({
                          ...sparesForm,
                          labourCharges: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Spares Products Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Spares Products</h3>
                  <div className="space-y-4">
                    {sparesForm.products.map((product, idx) => {
                      const isBulk = product.type === "bulk";
                      const lineTotal = isBulk ? product.amount : product.amount * product.unit;
                      const gstAmount = (lineTotal * (product.gstRate || 18)) / 100;
                      const totalWithGst = lineTotal + gstAmount;

                      return (
                        <div key={product.id} className="border rounded-lg p-4 bg-card space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs font-medium">Spare Name</label>
                              <input
                                type="text"
                                placeholder="Spare name"
                                value={product.product}
                                onChange={(e) => {
                                  const updated = [...sparesForm.products];
                                  updated[idx].product = e.target.value;
                                  setSparesForm({ ...sparesForm, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium">Description</label>
                              <input
                                type="text"
                                placeholder="Description"
                                value={product.productDescription}
                                onChange={(e) => {
                                  const updated = [...sparesForm.products];
                                  updated[idx].productDescription = e.target.value;
                                  setSparesForm({ ...sparesForm, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-xs font-medium">Type</label>
                              <select
                                value={isBulk ? "bulk" : "single"}
                                onChange={(e) => {
                                  const updated = [...sparesForm.products];
                                  updated[idx].type = e.target.value as "single" | "bulk";
                                  setSparesForm({ ...sparesForm, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              >
                                <option value="single">Single Unit</option>
                                <option value="bulk">Bulk</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {isBulk ? (
                              <>
                                <div className="w-28">
                                  <label className="text-xs font-medium">Quantity</label>
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    value={product.unit}
                                    onChange={(e) => {
                                      const updated = [...sparesForm.products];
                                      updated[idx].unit = parseFloat(e.target.value) || 0;
                                      setSparesForm({ ...sparesForm, products: updated });
                                    }}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs font-medium">Total Amount (₹)</label>
                                  <input
                                    type="number"
                                    placeholder="Total amount"
                                    value={product.amount}
                                    onChange={(e) => {
                                      const updated = [...sparesForm.products];
                                      updated[idx].amount = parseFloat(e.target.value) || 0;
                                      setSparesForm({ ...sparesForm, products: updated });
                                    }}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-28">
                                  <label className="text-xs font-medium">Unit (Qty)</label>
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    value={product.unit}
                                    onChange={(e) => {
                                      const updated = [...sparesForm.products];
                                      updated[idx].unit = parseFloat(e.target.value) || 0;
                                      setSparesForm({ ...sparesForm, products: updated });
                                    }}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs font-medium">Unit Price (₹)</label>
                                  <input
                                    type="number"
                                    placeholder="Unit price"
                                    value={product.amount}
                                    onChange={(e) => {
                                      const updated = [...sparesForm.products];
                                      updated[idx].amount = parseFloat(e.target.value) || 0;
                                      setSparesForm({ ...sparesForm, products: updated });
                                    }}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                  />
                                </div>
                              </>
                            )}

                            <div className="w-32">
                              <label className="text-xs font-medium">GST %</label>
                              <input
                                type="number"
                                placeholder="0-100"
                                min="0"
                                value={product.gstRate !== undefined ? product.gstRate : 18}
                                onChange={(e) => {
                                  const updated = [...sparesForm.products];
                                  updated[idx].gstRate = parseFloat(e.target.value) ?? 18;
                                  setSparesForm({ ...sparesForm, products: updated });
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex gap-4 bg-muted p-3 rounded text-sm">
                            <div>
                              <span className="font-medium">Line Total:</span>
                              <span className="ml-2">₹{lineTotal.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="font-medium">GST:</span>
                              <span className="ml-2 text-blue-600">₹{gstAmount.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="font-medium">With GST:</span>
                              <span className="ml-2 text-green-600">₹{totalWithGst.toFixed(2)}</span>
                            </div>
                            {sparesForm.products.length > 1 && (
                              <Button
                                onClick={() => {
                                  setSparesForm({
                                    ...sparesForm,
                                    products: sparesForm.products.filter((_, i) => i !== idx),
                                  });
                                }}
                                variant="outline"
                                size="sm"
                                className="ml-auto"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => {
                      setSparesForm({
                        ...sparesForm,
                        products: [
                          ...sparesForm.products,
                          { ...DEFAULT_PRODUCT_ROW, id: `product_${Date.now()}` },
                        ],
                      });
                    }}
                    variant="outline"
                    className="mt-3 w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Spare
                  </Button>
                </div>

                {/* Spares Summary */}
                {sparesForm.products.length > 0 && (
                  <div className="bg-muted p-4 rounded-md mb-6 overflow-x-auto">
                    {(() => {
                      const { productTotal, taxableTotal, gstAmount, total, gstBreakdown, labourGst } =
                        calculateInvoiceTotal(sparesForm.products, sparesForm.labourCharges);
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Spares Total:</span>
                            <span>₹{productTotal.toFixed(2)}</span>
                          </div>
                          {sparesForm.labourCharges > 0 && (
                            <div className="flex justify-between">
                              <span>Labour Charges:</span>
                              <span>₹{sparesForm.labourCharges.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t pt-2">
                            <span>Taxable Value:</span>
                            <span>₹{taxableTotal.toFixed(2)}</span>
                          </div>
                          {sparesForm.gstEnabled && (
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
                              <div className="flex justify-between items-center font-semibold border-t pt-2">
                                <span className="whitespace-nowrap">TOTAL AMOUNT:</span>
                                <span
                                  className="text-green-600 whitespace-nowrap flex-shrink-0"
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  ₹{total.toFixed(2)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Spares Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => saveSparesInvoice()}
                    className="flex-1"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "Saving..."
                      : editingSparesId
                        ? "Update Invoice"
                        : "Create Invoice"}
                  </Button>
                  {editingSparesId && (
                    <Button
                      onClick={() => {
                        setSparesForm(DEFAULT_FORM);
                        setEditingSparesId(null);
                        setHasGeneratedSparesNumber(false);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {/* Spares Invoices List */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-6 py-3 font-semibold">
                  Saved Spares Invoices ({sparesInvoices.length})
                </div>
                {sparesInvoices.length === 0 ? (
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    No spares invoices yet. Create one above.
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
                        {sparesInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-t hover:bg-muted text-xs">
                            <td className="px-3 py-3">
                              {invoice.sparesInvoiceNo}
                            </td>
                            <td className="px-3 py-3">{invoice.dealerName}</td>
                            <td className="px-3 py-3">{invoice.invoiceDate}</td>
                            <td className="px-3 py-3 font-semibold">
                              ₹{invoice.total.toFixed(2)}
                            </td>
                            <td className="px-3 py-3">{invoice.modeOfPayment}</td>
                            <td className="px-3 py-3 flex gap-1 flex-wrap">
                              <Button
                                onClick={() => setSparesPreviewId(invoice.id)}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                              >
                                View
                              </Button>
                              <Button
                                onClick={() => editSparesInvoice(invoice.id)}
                                variant="outline"
                                size="sm"
                                className="h-7"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => deleteSparesInvoice(invoice.id)}
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

              {/* Spares Preview Modal */}
              {sparesPreviewId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
                    <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center gap-4">
                      <h2 className="text-xl font-semibold">Spares Invoice Preview</h2>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => downloadSparesInvoicePDF(sparesPreviewId)}
                          variant="outline"
                          size="sm"
                          className="flex gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </Button>
                        <Button
                          onClick={() => setSparesPreviewId(null)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-6">
                      {sparesInvoices.find((i) => i.id === sparesPreviewId) && (
                        <div id={`spares-invoice-preview-${sparesPreviewId}`}>
                          <DealerInvoiceContent
                            invoice={sparesInvoices.find((i) => i.id === sparesPreviewId)! as unknown as DealerInvoiceRecord}
                            gstType={gstType}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
