import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Edit2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import InvoiceContent from "@/components/InvoiceContent";
import type { Project } from "./Projects";
import { supabase } from "@/lib/supabase";
import type { SplitPayment } from "@/components/SplitPaymentForm";

export default function Invoice() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [gstType, setGstType] = useState<"igst" | "cgst-sgst">("cgst-sgst");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("TG");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const settingsKey = projectId ? `crm_invoice_settings_${projectId}` : null;

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (!settingsKey) return;
    try {
      const saved = localStorage.getItem(settingsKey);
      if (!saved) {
        setInvoiceNo(getNextInvoiceNumber());
        setGstType("cgst-sgst");
        setPlaceOfSupply("TG");
        return;
      }

      const parsed = JSON.parse(saved) as {
        invoiceNo?: string;
        gstType?: "igst" | "cgst-sgst";
        placeOfSupply?: string;
      };
      setInvoiceNo(parsed.invoiceNo || getNextInvoiceNumber());
      setGstType(parsed.gstType === "igst" || parsed.gstType === "cgst-sgst" ? parsed.gstType : "cgst-sgst");
      setPlaceOfSupply(parsed.placeOfSupply || "TG");
    } catch (error) {
      console.error("Error loading saved invoice settings:", error);
      setInvoiceNo(getNextInvoiceNumber());
      setGstType("cgst-sgst");
      setPlaceOfSupply("TG");
    }
  }, [settingsKey]);

  useEffect(() => {
    if (!settingsKey) return;
    try {
      localStorage.setItem(
        settingsKey,
        JSON.stringify({
          invoiceNo,
          gstType,
          placeOfSupply,
        }),
      );
    } catch (error) {
      console.error("Error saving invoice settings:", error);
    }
  }, [settingsKey, invoiceNo, gstType, placeOfSupply]);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      if (supabase && projectId) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

          if (!error && data) {
            const project: Project = {
              id: data.id,
              modelNo: data.model_no || "",
              customerName: data.customer_name,
              contactNo: data.contact_no,
              location: data.location,
              productDescription: data.product_description,
              hsnNo: data.hsn_no,
              chassisNo: data.chassis_no,
              motorNo: data.motor_no || "",
              batteryNo: data.battery_no || "",
              batteryWarranty: data.battery_warranty || "",
              batteryCapacity: data.battery_capacity || "",
              vehicleWarranty: data.vehicle_warranty || "",
              invoiceDate: data.invoice_date || "",
              amount: data.amount,
              modeOfPayment: data.mode_of_payment || "Cash",
              leadSource: data.lead_source || "",
              createdAt: new Date(data.created_at).toLocaleDateString(),
            };
            setProject(project);

            // Load split payments
            try {
              const { data: txData } = await supabase
                .from('transactions')
                .select(`
                  id,
                  split_payments (
                    amount,
                    mode_of_payment,
                    payment_date
                  )
                `)
                .eq('reference_type', 'project')
                .eq('reference_id', projectId)
                .single();

              if (txData?.split_payments) {
                setSplitPayments(
                  txData.split_payments.map((sp: any) => ({
                    amount: sp.amount ? (typeof sp.amount === 'string' ? parseFloat(sp.amount) : Number(sp.amount)) : 0,
                    modeOfPayment: sp.mode_of_payment,
                    paymentDate: sp.payment_date,
                  }))
                );
              }
            } catch (splitPaymentError) {
              console.log("No split payments found:", splitPaymentError);
            }

            return;
          }
        } catch (supabaseError) {
          console.error("Error loading project from Supabase:", supabaseError);
        }
      }

      // Fallback to localStorage if Supabase fails or no data
      const savedProjects = localStorage.getItem("crm_projects");
      if (savedProjects) {
        const projects = JSON.parse(savedProjects) as Project[];
        const foundProject = projects.find((p) => p.id === projectId);
        if (foundProject) {
          setProject({
            ...foundProject,
            batteryWarranty: foundProject.batteryWarranty ?? "",
            batteryCapacity: foundProject.batteryCapacity ?? "",
            vehicleWarranty: foundProject.vehicleWarranty ?? "",
            modeOfPayment: foundProject.modeOfPayment ?? "Cash",
            leadSource: foundProject.leadSource ?? "",
          });
          if (foundProject.splitPayments) {
            setSplitPayments(foundProject.splitPayments);
          }
        }
      }
    } catch (error) {
      console.error("Error in loadProject:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Loading invoice...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Sale not found</h2>
            <p className="text-muted-foreground">
              The project you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/projects")}>Back to Sales</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleDownloadPDF = () => {
    const element = document.getElementById("invoice-container");
    if (!element) {
      alert("Invoice not found");
      return;
    }

    // Dynamically import html2pdf to avoid SSR issues
    import("html2pdf.js").then((html2pdfModule) => {
      const html2pdf = html2pdfModule.default;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T").join("_").slice(0, -5);
      const cleanInvoiceNo = invoiceNo.replace(/\//g, "-");
      const opt = {
        margin: 0,
        filename: `${cleanInvoiceNo}_${timestamp}.pdf`,
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

  return (
    <Layout>
      <div className="bg-gray-100 min-h-screen py-8">
        <div className="container mx-auto px-4">
          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-8 print:hidden">
            <Button
              variant="outline"
              onClick={() => navigate("/projects")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sales
            </Button>
            <div className="flex gap-4">
              <Button
                onClick={() => navigate(`/projects`)}
                variant="outline"
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit sale
              </Button>
              <Button
                onClick={handleDownloadPDF}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* GST Type Selector and Place of Supply */}
          <div className="mb-6 print:hidden">
            <div className="bg-white p-4 rounded-lg border border-border shadow-sm max-w-4xl mx-auto space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Invoice No:
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Enter invoice number"
                  className="text-sm border border-gray-300 rounded px-3 py-2 bg-white font-medium w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  GST Type:
                </label>
                <select
                  value={gstType}
                  onChange={(e) => {
                    const newGstType = e.target.value as "igst" | "cgst-sgst";
                    setGstType(newGstType);
                    if (newGstType === "cgst-sgst") {
                      setPlaceOfSupply("TG");
                    }
                  }}
                  className="text-sm border border-gray-300 rounded px-3 py-2 bg-white font-medium w-full"
                >
                  <option value="igst">IGST (5%) - Inter-state Transaction</option>
                  <option value="cgst-sgst">
                    CGST + SGST (2.5% each) - Intra-state Transaction
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Place of Supply:
                </label>
                {gstType === "cgst-sgst" ? (
                  <input
                    type="text"
                    value="36-TG"
                    disabled
                    className="text-sm border border-gray-300 rounded px-3 py-2 bg-gray-100 font-medium w-full text-gray-600 cursor-not-allowed"
                  />
                ) : (
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value.toUpperCase())}
                    placeholder="Enter state code (e.g., TG, KA, MH)"
                    className="text-sm border border-gray-300 rounded px-3 py-2 bg-white font-medium w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Invoice Preview */}
          <InvoiceContent
            project={project}
            invoiceNo={invoiceNo}
            gstType={gstType}
            placeOfSupply={placeOfSupply}
            forPrint={false}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
            background: white !important;
            font-family: Arial, sans-serif;
          }

          .print\\:hidden {
            display: none !important;
          }

          html, body {
            width: 100%;
            height: 100%;
          }

          #invoice-container {
            width: 100%;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 48px !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            background: white !important;
            color: black !important;
            display: block !important;
          }

          table {
            width: 100%;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border-collapse: collapse !important;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          td, th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          img {
            max-width: 100%;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          div, section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </Layout>
  );
}

function getNextInvoiceNumber(): string {
  const defaultInvoiceNo = "AAV/2026-27/001";
  let maxInvoiceNo = defaultInvoiceNo;
  let maxNumericSuffix = 0;

  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("crm_invoice_settings_")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { invoiceNo?: string };
      const invoice = parsed.invoiceNo?.trim();
      if (!invoice) continue;

      const match = invoice.match(/^(.*?)(\d+)$/);
      if (!match) continue;
      const numericValue = Number(match[2]);
      if (Number.isNaN(numericValue)) continue;

      if (numericValue > maxNumericSuffix) {
        maxNumericSuffix = numericValue;
        maxInvoiceNo = invoice;
      }
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
