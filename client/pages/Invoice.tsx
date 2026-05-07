import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import InvoiceContent from "@/components/InvoiceContent";
import type { Project } from "./Projects";

export default function Invoice() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("AAV/2026-27/001");
  const [gstType, setGstType] = useState<"igst" | "cgst-sgst">("igst");

  useEffect(() => {
    // Load project from localStorage
    const savedProjects = localStorage.getItem("crm_projects");
    if (savedProjects) {
      try {
        const projects = JSON.parse(savedProjects) as Project[];
        const foundProject = projects.find((p) => p.id === projectId);
        if (foundProject) {
          setProject(foundProject);
          // Generate invoice number based on project ID
          setInvoiceNo(`AAV/2026-27/${String(projects.indexOf(foundProject) + 1).padStart(3, "0")}`);
        }
      } catch (error) {
        console.error("Error loading project:", error);
      }
    }
  }, [projectId]);

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Project not found</h2>
            <p className="text-muted-foreground">
              The project you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/projects")}>Back to Projects</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleDownloadPDF = () => {
    const element = document.getElementById("invoice-container");
    if (!element) return;

    // Get the HTML content of the invoice
    const invoiceHTML = element.outerHTML;

    // Create a new window for printing
    const printWindow = window.open("", "", "height=900,width=1000");
    if (!printWindow) {
      alert("Please disable popup blockers and try again");
      return;
    }

    // Write complete HTML with proper styling
    const completeHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice_${invoiceNo.replace(/\//g, "-")}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              background-color: #fff;
              color: #000;
              line-height: 1.4;
            }
            html, body {
              width: 100%;
              height: 100%;
            }
            @page {
              size: A4;
              margin: 0;
            }
            #invoice-container {
              background-color: white;
              color: black;
              padding: 3rem;
              width: 100%;
              font-size: 14px;
              page-break-after: avoid;
              break-after: avoid;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 2rem;
              margin-bottom: 2rem;
              padding-bottom: 2rem;
              border-bottom: 2px solid #666;
            }
            .flex {
              display: flex;
            }
            .items-center {
              align-items: center;
            }
            .gap-4 {
              gap: 1rem;
            }
            .mb-6 {
              margin-bottom: 1.5rem;
            }
            .mb-4 {
              margin-bottom: 1rem;
            }
            .mb-3 {
              margin-bottom: 0.75rem;
            }
            .mb-8 {
              margin-bottom: 2rem;
            }
            .mt-3 {
              margin-top: 0.75rem;
            }
            .space-y-1 > * + * {
              margin-top: 0.25rem;
            }
            .space-y-2 > * + * {
              margin-top: 0.5rem;
            }
            .space-y-3 > * + * {
              margin-top: 0.75rem;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .font-bold {
              font-weight: bold;
            }
            .font-semibold {
              font-weight: 600;
            }
            .text-gray-700 {
              color: #333;
            }
            .text-gray-800 {
              color: #1a1a1a;
            }
            .text-gray-600 {
              color: #666;
            }
            .text-green-700 {
              color: #2d7a3e;
            }
            .text-xs {
              font-size: 11px;
            }
            .text-sm {
              font-size: 12px;
            }
            .text-lg {
              font-size: 18px;
            }
            .text-4xl {
              font-size: 32px;
            }
            .text-2xl {
              font-size: 24px;
            }
            .leading-tight {
              line-height: 1.25;
            }
            .leading-snug {
              line-height: 1.375;
            }
            .flex-shrink-0 {
              flex-shrink: 0;
            }
            img {
              width: 80px;
              height: 80px;
              object-fit: contain;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #666;
              margin-bottom: 2rem;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background-color: #d4edda;
              padding: 12px 16px;
              text-align: left;
              font-size: 12px;
              font-weight: bold;
              border: 1px solid #666;
            }
            td {
              padding: 16px;
              border: 1px solid #666;
              font-size: 12px;
              vertical-align: middle;
            }
            tr:hover {
              background-color: #f5f5f5;
            }
            .border-l-2 {
              border-left: 2px solid #ddd;
              padding-left: 1.5rem;
            }
            .border-b-2 {
              border-bottom: 2px solid #999;
            }
            .border-t-2 {
              border-top: 2px solid #2d7a3e;
            }
            .border-2 {
              border: 2px solid #999;
            }
            .border-green-300 {
              border-color: #90ee90;
            }
            .bg-gray-50 {
              background-color: #f9f9f9;
            }
            .bg-green-50 {
              background-color: #f0f8f0;
            }
            .bg-green-100 {
              background-color: #d4edda;
            }
            .rounded {
              border-radius: 4px;
            }
            .p-4 {
              padding: 1rem;
            }
            .p-12 {
              padding: 3rem;
            }
            .w-20 {
              width: 80px;
            }
            .h-20 {
              height: 80px;
            }
            .w-12 {
              width: 48px;
            }
            .w-20 {
              width: 80px;
            }
            .w-32 {
              width: 128px;
            }
            .pl-6 {
              padding-left: 1.5rem;
            }
            .pb-2 {
              padding-bottom: 0.5rem;
            }
            .pb-8 {
              padding-bottom: 2rem;
            }
            .pt-3 {
              padding-top: 0.75rem;
            }
            .italic {
              font-style: italic;
            }
            .font-mono {
              font-family: 'Courier New', monospace;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            #invoice-container > div {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${invoiceHTML}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(completeHTML);
    printWindow.document.close();
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
              Back to Projects
            </Button>
            <div className="flex gap-4">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download Invoice
              </Button>
            </div>
          </div>

          {/* GST Type Selector */}
          <div className="mb-6 print:hidden">
            <div className="bg-white p-4 rounded-lg border border-border shadow-sm max-w-4xl mx-auto">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                GST Type:
              </label>
              <select
                value={gstType}
                onChange={(e) => setGstType(e.target.value as "igst" | "cgst-sgst")}
                className="text-sm border border-gray-300 rounded px-3 py-2 bg-white font-medium"
              >
                <option value="igst">IGST (5%) - Inter-state Transaction</option>
                <option value="cgst-sgst">
                  CGST + SGST (2.5% each) - Intra-state Transaction
                </option>
              </select>
            </div>
          </div>

          {/* Invoice Preview */}
          <InvoiceContent
            project={project}
            invoiceNo={invoiceNo}
            gstType={gstType}
            forPrint={false}
          />
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          #invoice-container {
            max-width: none;
            border-radius: 0;
            border: none;
            box-shadow: none;
            margin: 0;
            padding: 0;
            page-break-after: avoid;
            break-after: avoid;
          }
          table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          #invoice-container > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </Layout>
  );
}
