import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import EstimationSlipContent from "@/components/EstimationSlipContent";

interface EstimationRecord {
  id: string;
  customerName: string;
  address: string;
  contactNo: string;
  model: string;
  estimationSlipNo: string;
  estimationDate: string;
  amount: number;
  batteryWarranty: string;
  batteryCapacity: string;
  kmsRange: string;
  speed: string;
  vehicleWarranty: string;
  createdAt: string;
}

export default function EstimationSlip() {
  const { estimationId } = useParams();
  const navigate = useNavigate();
  const [estimation, setEstimation] = useState<EstimationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gstType, setGstType] = useState<"igst" | "cgst-sgst">("cgst-sgst");
  const settingsKey = estimationId ? `crm_estimation_settings_${estimationId}` : null;

  useEffect(() => {
    if (estimationId) {
      loadEstimation();
    }
  }, [estimationId]);

  useEffect(() => {
    if (!settingsKey) return;
    try {
      const saved = localStorage.getItem(settingsKey);
      if (!saved) {
        setGstType("cgst-sgst");
        return;
      }
      const parsed = JSON.parse(saved) as { gstType?: "igst" | "cgst-sgst" };
      setGstType(parsed.gstType === "igst" || parsed.gstType === "cgst-sgst" ? parsed.gstType : "cgst-sgst");
    } catch (error) {
      console.error("Error loading estimation slip settings:", error);
    }
  }, [settingsKey]);

  useEffect(() => {
    if (!settingsKey) return;
    try {
      localStorage.setItem(settingsKey, JSON.stringify({ gstType }));
    } catch (error) {
      console.error("Error saving estimation slip settings:", error);
    }
  }, [settingsKey, gstType]);

  const loadEstimation = async () => {
    setIsLoading(true);
    try {
      if (supabase && estimationId) {
        try {
          const { data, error } = await supabase
            .from("estimations")
            .select("*")
            .eq("id", estimationId)
            .single();

          if (!error && data) {
            setEstimation({
              id: data.id,
              customerName: data.customer_name,
              address: data.address,
              contactNo: data.contact_no,
              model: data.model || "",
              estimationSlipNo: data.estimation_slip_no,
              estimationDate: data.estimation_date,
              amount: data.amount,
              batteryWarranty: data.battery_warranty || "",
              batteryCapacity: data.battery_capacity || "",
              kmsRange: data.kms_range || "",
              speed: data.speed || "",
              vehicleWarranty: data.vehicle_warranty || "",
              createdAt: new Date(data.created_at).toLocaleDateString(),
            });
            return;
          }
        } catch (supabaseError) {
          console.error("Error loading estimation from Supabase:", supabaseError);
        }
      }

      const saved = localStorage.getItem("crm_estimations");
      if (saved) {
        const estimations = JSON.parse(saved) as EstimationRecord[];
        const found = estimations.find((item) => item.id === estimationId);
        if (found) {
          setEstimation({
            ...found,
            batteryWarranty: found.batteryWarranty ?? "",
            batteryCapacity: found.batteryCapacity ?? "",
            kmsRange: found.kmsRange ?? "",
            speed: found.speed ?? "",
            vehicleWarranty: found.vehicleWarranty ?? "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading estimation slip:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById("estimation-slip-container");
    if (!element || !estimation) {
      alert("Estimation slip not found");
      return;
    }

    import("html2pdf.js").then((html2pdfModule) => {
      const html2pdf = html2pdfModule.default;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T").join("_").slice(0, -5);
      const cleanSlipNo = estimation.estimationSlipNo.replace(/\//g, "-");
      const opt = {
        margin: 0,
        filename: `${cleanSlipNo}_${timestamp}.pdf`,
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

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Loading estimation slip...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  if (!estimation) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Estimation not found</h2>
            <Button onClick={() => navigate("/accounts")}>Back to Sales</Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-100 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8 print:hidden">
            <Button
              variant="outline"
              onClick={() => navigate("/accounts")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sales
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

          <div className="mb-6 print:hidden">
            <div className="bg-white p-4 rounded-lg border border-border shadow-sm max-w-4xl mx-auto">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                GST Type:
              </label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value as "igst" | "cgst-sgst")}
                className="text-sm border border-gray-300 rounded px-3 py-2 bg-white font-medium w-full"
              >
                <option value="cgst-sgst">CGST + SGST (2.5% each)</option>
                <option value="igst">IGST (5%)</option>
              </select>
            </div>
          </div>

          <EstimationSlipContent estimation={estimation} gstType={gstType} forPrint={false} />
        </div>
      </div>
    </Layout>
  );
}
