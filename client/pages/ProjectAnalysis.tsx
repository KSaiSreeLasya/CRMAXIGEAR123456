import { ArrowLeft, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface ProjectSale {
  id: string;
  customerName: string;
  modelNo: string;
  amount: number;
  invoiceDate: string;
}

interface InventoryCost {
  modelNo: string;
  vehicleModel: string;
  costPrice: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const normalize = (value: string) => value.trim().toLowerCase();

export default function ProjectAnalysis() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<ProjectSale[]>([]);
  const [inventoryCosts, setInventoryCosts] = useState<InventoryCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalysis = async () => {
      setIsLoading(true);
      try {
        if (supabase) {
          const [projectsResult, inventoryResult] = await Promise.all([
            supabase.from("projects").select("id, customer_name, model_no, amount, invoice_date").order("created_at", { ascending: false }),
            supabase.from("inventory_items").select("model_no, vehicle_model, lot_price, transportation_price"),
          ]);

          if (projectsResult.error) throw projectsResult.error;
          if (inventoryResult.error) throw inventoryResult.error;

          setSales(
            (projectsResult.data ?? []).map((project) => ({
              id: project.id,
              customerName: project.customer_name ?? "-",
              modelNo: project.model_no ?? "",
              amount: Number(project.amount ?? 0),
              invoiceDate: project.invoice_date ?? "",
            })),
          );
          setInventoryCosts(
            (inventoryResult.data ?? []).map((item) => ({
              modelNo: item.model_no ?? "",
              vehicleModel: item.vehicle_model ?? "",
              costPrice: Number(item.lot_price ?? 0) + Number(item.transportation_price ?? 0),
            })),
          );
          return;
        }

        const savedProjects = JSON.parse(localStorage.getItem("crm_projects") ?? "[]");
        const savedInventory = JSON.parse(localStorage.getItem("crm_inventory_items") ?? "[]");
        setSales(
          savedProjects.map((project: any) => ({
            id: project.id,
            customerName: project.customerName ?? "-",
            modelNo: project.modelNo ?? "",
            amount: Number(project.amount ?? 0),
            invoiceDate: project.invoiceDate ?? "",
          })),
        );
        setInventoryCosts(
          savedInventory.map((item: any) => ({
            modelNo: item.modelNo ?? "",
            vehicleModel: item.vehicleModel ?? "",
            costPrice: Number(item.costPrice ?? (Number(item.lotPrice ?? 0) + Number(item.transportationPrice ?? 0))),
          })),
        );
      } catch (error) {
        console.error("Unable to load project analysis:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAnalysis();
  }, []);

  const rows = useMemo(
    () =>
      sales.map((sale) => {
        const model = normalize(sale.modelNo);
        const inventory = inventoryCosts.find(
          (item) => normalize(item.modelNo) === model || normalize(item.vehicleModel) === model,
        );
        const costPrice = inventory?.costPrice ?? 0;
        return { ...sale, costPrice, profit: costPrice - sale.amount, hasCost: Boolean(inventory) };
      }),
    [inventoryCosts, sales],
  );

  const totals = useMemo(
    () => rows.reduce((sum, row) => ({ sales: sum.sales + row.amount, cost: sum.cost + row.costPrice, profit: sum.profit + row.profit }), { sales: 0, cost: 0, profit: 0 }),
    [rows],
  );

  return (
    <Layout>
      <div className="container mx-auto space-y-8 px-4 py-12">
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-start gap-4">
          <div className="rounded-md bg-indigo-100 p-3 text-indigo-700">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Project Analysis</h1>
            <p className="mt-1 text-muted-foreground">Sales from Projects compared with the matching inventory cost price.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Selling Price</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totals.sales)}</p></div>
          <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Cost Price</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totals.cost)}</p></div>
          <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Profit (Cost − Selling)</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totals.profit)}</p></div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-xl font-semibold">Sales analysis</h2>
          {isLoading ? <p className="text-muted-foreground">Loading sales and inventory costs...</p> : rows.length === 0 ? <p className="text-muted-foreground">No sales entries are available yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-border text-left"><th className="px-3 py-3">Customer Name</th><th className="px-3 py-3">Model</th><th className="px-3 py-3">Selling Price</th><th className="px-3 py-3">Cost Price</th><th className="px-3 py-3">Profit (Cost − Selling)</th></tr></thead>
                <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border"><td className="px-3 py-3">{row.customerName}</td><td className="px-3 py-3">{row.modelNo || "-"}</td><td className="px-3 py-3">{formatCurrency(row.amount)}</td><td className="px-3 py-3">{row.hasCost ? formatCurrency(row.costPrice) : "Cost not added"}</td><td className="px-3 py-3 font-semibold">{row.hasCost ? formatCurrency(row.profit) : "-"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
