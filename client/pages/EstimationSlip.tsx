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
  createdAt: string;
}

export default function EstimationSlip() {
  const { estimationId } = useParams();
  const navigate = useNavigate();
  const [estimation, setEstimation] = useState<EstimationRecord | null>(null);

  useEffect(() => {
    if (estimationId) {
      loadEstimation();
    }
  }, [estimationId]);

  const loadEstimation = async () => {
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
          setEstimation(found);
        }
      }
    } catch (error) {
      console.error("Error loading estimation slip:", error);
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

      const opt = {
        margin: 0,
        filename: `estimation-slip-${estimation.estimationSlipNo}.pdf`,
        image: { type: "png" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        pagebreak: { mode: "avoid-all" },
      };

      html2pdf().set(opt).from(element).save();
    });
  };

  if (!estimation) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Estimation not found</h2>
            <Button onClick={() => navigate("/accounts")}>Back to Accounts</Button>
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
              Back to Accounts
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

          <EstimationSlipContent estimation={estimation} forPrint={false} />
        </div>
      </div>
    </Layout>
  );
}
