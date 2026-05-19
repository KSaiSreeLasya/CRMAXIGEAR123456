import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ServiceInvoiceContent from "@/components/ServiceInvoiceContent";

interface ServiceInvoiceRecord {
  id: string;
  serviceInvoiceNo: string;
  customerName: string;
  contactNo: string;
  location: string;
  product: string;
  productDescription: string;
  invoiceDate: string;
  amount: number;
  unit: number;
  total: number;
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
  serviceInvoiceNo: "",
  customerName: "",
  contactNo: "",
  location: "",
  product: "",
  productDescription: "",
  invoiceDate: "",
  amount: "",
  unit: "",
  total: "",
};

function getNextServiceInvoiceNumber(): string {
  const defaultInvoiceNo = "SRV/2026-27/001";
  let maxInvoiceNo = defaultInvoiceNo;
  let maxNumericSuffix = 0;

  try {
    const saved = localStorage.getItem("crm_service_invoices");
    if (saved) {
      const invoices = JSON.parse(saved) as ServiceInvoiceRecord[];
      invoices.forEach((inv) => {
        const invoice = inv.serviceInvoiceNo?.trim();
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
    console.error("Error deriving next service invoice number:", error);
  }

  const lastMatch = maxInvoiceNo.match(/^(.*?)(\d+)$/);
  if (!lastMatch) return defaultInvoiceNo;
  const prefix = lastMatch[1];
  const width = lastMatch[2].length;
  const nextValue = String(Number(lastMatch[2]) + 1).padStart(width, "0");
  return `${prefix}${nextValue}`;
}

export default function ServiceInvoice() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<ServiceInvoiceRecord[]>([]);
  const [spares, setSpares] = useState<SpareItem[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSpares, setIsLoadingSpares] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [gstType, setGstType] = useState<"igst" | "cgst-sgst">("cgst-sgst");

  useEffect(() => {
    void loadInvoices();
    void loadSpares();
    // Auto-set invoice number when not editing
    if (!editingId) {
      setForm((prev) => ({
        ...prev,
        serviceInvoiceNo: getNextServiceInvoiceNumber(),
      }));
    }
  }, [editingId]);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("service_invoices")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          const rows: ServiceInvoiceRecord[] =
            data?.map((row: any) => ({
              id: row.id,
              serviceInvoiceNo: row.service_invoice_no || "",
              customerName: row.customer_name || "",
              contactNo: row.contact_no || "",
              location: row.location || "",
              product: row.product || "",
              productDescription: row.product_description || "",
              invoiceDate: row.invoice_date || "",
              amount: row.amount || 0,
              unit: row.unit || 1,
              total: row.total || 0,
              createdAt: new Date(row.created_at).toLocaleDateString(),
            })) || [];
          setInvoices(rows);
          return;
        } catch (supabaseError: any) {
          console.warn("Supabase service invoices load failed, falling back to localStorage:", supabaseError?.message);
        }
      }
      const raw = localStorage.getItem("crm_service_invoices");
      if (raw) setInvoices(JSON.parse(raw));
    } catch (error) {
      console.error("Error loading service invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSpares = async () => {
    setIsLoadingSpares(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("spares_inventory")
            .select("*")
            .gt("qty", 0)
            .order("part_name", { ascending: true });
          if (error) throw error;
          const rows: SpareItem[] =
            data?.map((row: any) => ({
              id: row.id,
              partName: row.part_name || "",
              price: row.price || 0,
              qty: row.qty || 0,
              total: row.total || 0,
              createdAt: new Date(row.created_at).toLocaleDateString(),
            })) || [];
          setSpares(rows);
          return;
        } catch (supabaseError: any) {
          console.warn("Supabase spares load failed, falling back to localStorage:", supabaseError?.message);
        }
      }
      const raw = localStorage.getItem("crm_spares");
      if (raw) {
        const parsed = JSON.parse(raw) as SpareItem[];
        setSpares(parsed.filter(s => s.qty > 0));
      }
    } catch (error) {
      console.error("Error loading spares:", error);
    } finally {
      setIsLoadingSpares(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const amount = Number(form.amount || 0);
      const unit = Number(form.unit || 1);
      const total = amount * unit;

      const payload = {
        serviceInvoiceNo: form.serviceInvoiceNo.trim(),
        customerName: form.customerName.trim(),
        contactNo: form.contactNo.trim(),
        location: form.location.trim(),
        product: form.product.trim(),
        productDescription: form.productDescription.trim(),
        invoiceDate: form.invoiceDate,
        amount,
        unit,
        total,
      };

      if (editingId) {
        if (supabase) {
          const { error } = await supabase
            .from("service_invoices")
            .update({
              service_invoice_no: payload.serviceInvoiceNo,
              customer_name: payload.customerName,
              contact_no: payload.contactNo,
              location: payload.location,
              product: payload.product,
              product_description: payload.productDescription,
              invoice_date: payload.invoiceDate,
              amount: payload.amount,
              unit: payload.unit,
              total: payload.total,
            })
            .eq("id", editingId);
          if (error) throw error;
        }

        const updated = invoices.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...payload,
              }
            : item
        );
        setInvoices(updated);
        localStorage.setItem("crm_service_invoices", JSON.stringify(updated));
      } else {
        let created: ServiceInvoiceRecord;
        if (supabase) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user?.id) {
              throw new Error("User not authenticated");
            }

            const selectedSpare = spares.find(s => s.partName === form.product);
            if (selectedSpare && unit > selectedSpare.qty) {
              throw new Error(`Insufficient inventory. Available: ${selectedSpare.qty}`);
            }

            const { data, error } = await supabase
              .from("service_invoices")
              .insert([
                {
                  user_id: userData.user.id,
                  service_invoice_no: payload.serviceInvoiceNo,
                  customer_name: payload.customerName,
                  contact_no: payload.contactNo,
                  location: payload.location,
                  product: payload.product,
                  product_description: payload.productDescription,
                  invoice_date: payload.invoiceDate,
                  amount: payload.amount,
                  unit: payload.unit,
                  total: payload.total,
                },
              ])
              .select()
              .single();
            if (error) throw error;

            if (selectedSpare) {
              const newQty = selectedSpare.qty - unit;
              const { error: updateError } = await supabase
                .from("spares_inventory")
                .update({ qty: newQty })
                .eq("id", selectedSpare.id);
              if (updateError) console.warn("Error updating spare inventory:", updateError);
              else {
                await loadSpares();
              }
            }

            created = {
              id: data.id,
              serviceInvoiceNo: data.service_invoice_no,
              customerName: data.customer_name,
              contactNo: data.contact_no,
              location: data.location,
              product: data.product,
              productDescription: data.product_description,
              invoiceDate: data.invoice_date,
              amount: data.amount,
              unit: data.unit,
              total: data.total,
              createdAt: new Date(data.created_at).toLocaleDateString(),
            };
            setInvoices((prev) => [created, ...prev]);
          } catch (supabaseError: any) {
            console.warn("Supabase insert failed, using localStorage:", supabaseError?.message);
            created = {
              id: `service_invoice_${Date.now()}`,
              createdAt: new Date().toLocaleDateString(),
              ...payload,
            };
            const updated = [created, ...invoices];
            setInvoices(updated);
            localStorage.setItem("crm_service_invoices", JSON.stringify(updated));

            const selectedSpare = spares.find(s => s.partName === form.product);
            if (selectedSpare && unit <= selectedSpare.qty) {
              const updatedSpares = spares.map(s =>
                s.id === selectedSpare.id ? { ...s, qty: s.qty - unit } : s
              );
              setSpares(updatedSpares);
              localStorage.setItem("crm_spares", JSON.stringify(updatedSpares));
            }
          }
        } else {
          const selectedSpare = spares.find(s => s.partName === form.product);
          if (selectedSpare && unit > selectedSpare.qty) {
            throw new Error(`Insufficient inventory. Available: ${selectedSpare.qty}`);
          }

          created = {
            id: `service_invoice_${Date.now()}`,
            createdAt: new Date().toLocaleDateString(),
            ...payload,
          };
          const updated = [created, ...invoices];
          setInvoices(updated);
          localStorage.setItem("crm_service_invoices", JSON.stringify(updated));

          if (selectedSpare) {
            const updatedSpares = spares.map(s =>
              s.id === selectedSpare.id ? { ...s, qty: s.qty - unit } : s
            );
            setSpares(updatedSpares);
            localStorage.setItem("crm_spares", JSON.stringify(updatedSpares));
          }
        }
      }

      setForm(DEFAULT_FORM);
      setEditingId(null);
    } catch (error: any) {
      console.error("Error saving service invoice:", error);
      alert(error?.message || "Failed to save service invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this service invoice?")) return;
    try {
      if (supabase) {
        try {
          const { error } = await supabase.from("service_invoices").delete().eq("id", id);
          if (error) throw error;
        } catch (supabaseError: any) {
          console.warn("Supabase delete failed, using localStorage only:", supabaseError?.message);
        }
      }
      const updated = invoices.filter((item) => item.id !== id);
      setInvoices(updated);
      localStorage.setItem("crm_service_invoices", JSON.stringify(updated));
    } catch (error: any) {
      console.error("Error deleting service invoice:", error);
      alert(error?.message || "Failed to delete service invoice.");
    }
  };

  const handleEdit = (item: ServiceInvoiceRecord) => {
    setEditingId(item.id);
    setForm({
      serviceInvoiceNo: item.serviceInvoiceNo,
      customerName: item.customerName,
      contactNo: item.contactNo,
      location: item.location,
      product: item.product,
      productDescription: item.productDescription,
      invoiceDate: item.invoiceDate,
      amount: String(item.amount),
      unit: String(item.unit),
      total: String(item.total),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  const handleDownloadPDF = (invoice: ServiceInvoiceRecord) => {
    const element = document.getElementById(`service-invoice-${invoice.id}`);
    if (!element) {
      alert("Invoice not found");
      return;
    }

    import("html2pdf.js").then((html2pdfModule) => {
      const html2pdf = html2pdfModule.default;

      const opt = {
        margin: 0,
        filename: `service-invoice-${invoice.serviceInvoiceNo}.pdf`,
        image: { type: "png" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        },
        jsPDF: {
          unit: "px",
          format: [element.scrollWidth, element.scrollHeight] as [number, number],
          orientation:
            element.scrollWidth > element.scrollHeight ? ("landscape" as const) : ("portrait" as const),
          compress: true,
        },
        pagebreak: { mode: ["css", "legacy"] },
      };

      html2pdf().set(opt).from(element).save();
    });
  };

  const currentPreview = previewId ? invoices.find((inv) => inv.id === previewId) : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Service Invoices</h1>
          <p className="text-muted-foreground">Create and manage service invoices with PDF generation.</p>
        </div>

        {/* Form Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Service Invoice" : "Create New Service Invoice"}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background text-gray-500 cursor-not-allowed"
              placeholder="Auto-generated"
              value={form.serviceInvoiceNo}
              readOnly
              disabled
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Customer Name"
              value={form.customerName}
              onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
              required
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Contact No"
              value={form.contactNo}
              onChange={(e) => setForm((prev) => ({ ...prev, contactNo: e.target.value }))}
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
            <select
              className="px-4 py-2 border border-border rounded-lg bg-background"
              value={form.product}
              onChange={(e) => {
                const selected = spares.find(s => s.partName === e.target.value);
                setForm((prev) => ({
                  ...prev,
                  product: e.target.value,
                  amount: String(selected?.price || 0),
                }));
              }}
              required
            >
              <option value="">Select Product</option>
              {isLoadingSpares ? (
                <option>Loading spares...</option>
              ) : spares.length === 0 ? (
                <option>No spares available</option>
              ) : (
                spares.map((spare) => (
                  <option key={spare.id} value={spare.partName}>
                    {spare.partName}
                  </option>
                ))
              )}
            </select>
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Product Description"
              value={form.productDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, productDescription: e.target.value }))}
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Invoice Date"
              type="date"
              value={form.invoiceDate}
              onChange={(e) => setForm((prev) => ({ ...prev, invoiceDate: e.target.value }))}
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => {
                const newAmount = e.target.value;
                const unit = Number(form.unit || 1);
                const total = Number(newAmount) * unit;
                setForm((prev) => ({
                  ...prev,
                  amount: newAmount,
                  total: String(total),
                }));
              }}
              required
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background"
              placeholder="Unit"
              type="number"
              step="1"
              value={form.unit}
              onChange={(e) => {
                const newUnit = e.target.value;
                const amount = Number(form.amount || 0);
                const total = amount * Number(newUnit);
                setForm((prev) => ({
                  ...prev,
                  unit: newUnit,
                  total: String(total),
                }));
              }}
              required
            />
            <input
              className="px-4 py-2 border border-border rounded-lg bg-background text-gray-500 cursor-not-allowed"
              placeholder="Total"
              type="number"
              step="0.01"
              value={form.total}
              readOnly
              disabled
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : editingId ? "Update Invoice" : "Create Invoice"}
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

        {/* Service Invoices List */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Service Invoices</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading service invoices...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground">No service invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left">Invoice No</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Unit</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-border">
                      <td className="px-4 py-2">{invoice.serviceInvoiceNo}</td>
                      <td className="px-4 py-2">{invoice.customerName}</td>
                      <td className="px-4 py-2">{invoice.contactNo}</td>
                      <td className="px-4 py-2">{invoice.location}</td>
                      <td className="px-4 py-2">{invoice.product}</td>
                      <td className="px-4 py-2">{invoice.invoiceDate}</td>
                      <td className="px-4 py-2 text-right font-semibold">₹{invoice.amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{invoice.unit}</td>
                      <td className="px-4 py-2 text-right font-semibold">₹{invoice.total.toFixed(2)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewId(invoice.id)}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary/90"
                          >
                            <Download className="w-4 h-4" />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(invoice)}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary/90"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(invoice.id)}
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

        {/* Preview Modal */}
        {currentPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
              <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
                <h3 className="font-semibold">Invoice Preview</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownloadPDF(currentPreview)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <button
                    onClick={() => setPreviewId(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div id={`service-invoice-${currentPreview.id}`} className="p-8 bg-white">
                <ServiceInvoiceContent
                  invoice={currentPreview}
                  gstType={gstType}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
