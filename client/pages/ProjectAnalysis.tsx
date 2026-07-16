import { ArrowLeft, BarChart3, Download } from "lucide-react";
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

interface MonthlySale {
  model: string;
  count: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const normalize = (value: string) => value.trim().toLowerCase();

const getMonthKey = (dateString: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthYear = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export default function ProjectAnalysis() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<ProjectSale[]>([]);
  const [inventoryCosts, setInventoryCosts] = useState<InventoryCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [viewMode, setViewMode] = useState<"all" | "monthly">("all");

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
        return { ...sale, costPrice, profit: sale.amount - costPrice, hasCost: Boolean(inventory) };
      }),
    [inventoryCosts, sales],
  );

  const totals = useMemo(
    () => rows.reduce((sum, row) => ({ sales: sum.sales + row.amount, cost: sum.cost + row.costPrice, profit: sum.profit + row.profit }), { sales: 0, cost: 0, profit: 0 }),
    [rows],
  );

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sales.forEach((sale) => {
      const monthKey = getMonthKey(sale.invoiceDate);
      if (monthKey) months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [sales]);

  useEffect(() => {
    if (selectedMonth === "" && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const monthlySalesData = useMemo(() => {
    if (!selectedMonth) return [];
    
    const monthSales = rows.filter((row) => {
      const monthKey = getMonthKey(row.invoiceDate);
      return monthKey === selectedMonth;
    });

    const modelMap = new Map<string, MonthlySale>();

    monthSales.forEach((sale) => {
      const model = sale.modelNo || "Unknown";
      const existing = modelMap.get(model) || {
        model,
        count: 0,
        totalSales: 0,
        totalCost: 0,
        totalProfit: 0,
      };

      modelMap.set(model, {
        model,
        count: existing.count + 1,
        totalSales: existing.totalSales + sale.amount,
        totalCost: existing.totalCost + sale.costPrice,
        totalProfit: existing.totalProfit + sale.profit,
      });
    });

    return Array.from(modelMap.values()).sort((a, b) => b.count - a.count);
  }, [selectedMonth, rows]);

  const monthlyTotals = useMemo(() => {
    return monthlySalesData.reduce(
      (sum, item) => ({
        sales: sum.sales + item.totalSales,
        cost: sum.cost + item.totalCost,
        profit: sum.profit + item.totalProfit,
        count: sum.count + item.count,
      }),
      { sales: 0, cost: 0, profit: 0, count: 0 }
    );
  }, [monthlySalesData]);

  const exportMonthlyExcel = () => {
    if (monthlySalesData.length === 0) {
      alert("No data to export for the selected month");
      return;
    }

    const csvContent = [
      [`Monthly Sales Report - ${formatMonthYear(selectedMonth)}`],
      [],
      ["Model", "Count", "Total Sales (₹)", "Total Cost (₹)", "Total Profit (₹)"],
      ...monthlySalesData.map((item) => [
        item.model,
        item.count,
        item.totalSales.toFixed(2),
        item.totalCost.toFixed(2),
        item.totalProfit.toFixed(2),
      ]),
      [],
      ["TOTAL", monthlyTotals.count, monthlyTotals.sales.toFixed(2), monthlyTotals.cost.toFixed(2), monthlyTotals.profit.toFixed(2)],
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `monthly-sales-${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

        {/* View Mode Toggle */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              viewMode === "all"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              viewMode === "monthly"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Report
          </button>
        </div>

        {viewMode === "all" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Selling Price</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totals.sales)}</p></div>
              <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Cost Price</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totals.cost)}</p></div>
              <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Profit (Selling − Cost)</p><p className="mt-2 text-2xl font-bold">{formatCurrency(totals.profit)}</p></div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">Sales analysis</h2>
              {isLoading ? <p className="text-muted-foreground">Loading sales and inventory costs...</p> : rows.length === 0 ? <p className="text-muted-foreground">No sales entries are available yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead><tr className="border-b border-border text-left"><th className="px-3 py-3">Customer Name</th><th className="px-3 py-3">Model</th><th className="px-3 py-3">Selling Price</th><th className="px-3 py-3">Cost Price</th><th className="px-3 py-3">Profit (Selling − Cost)</th></tr></thead>
                    <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border"><td className="px-3 py-3">{row.customerName}</td><td className="px-3 py-3">{row.modelNo || "-"}</td><td className="px-3 py-3">{formatCurrency(row.amount)}</td><td className="px-3 py-3">{row.hasCost ? formatCurrency(row.costPrice) : "Cost not added"}</td><td className="px-3 py-3 font-semibold">{row.hasCost ? formatCurrency(row.profit) : "-"}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Month Selection */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="text-sm font-semibold">Select Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {formatMonthYear(month)}
                  </option>
                ))}
              </select>
              <Button
                onClick={exportMonthlyExcel}
                variant="outline"
                className="gap-2 ml-auto"
                disabled={monthlySalesData.length === 0}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {/* Monthly Summary Cards */}
            {selectedMonth && (
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Vehicles Sold</p>
                  <p className="mt-2 text-2xl font-bold">{monthlyTotals.count}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(monthlyTotals.sales)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(monthlyTotals.cost)}</p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(monthlyTotals.profit)}</p>
                </div>
              </div>
            )}

            {/* Monthly Model-wise Breakdown */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-xl font-semibold">
                {selectedMonth ? `Model-wise Sales - ${formatMonthYear(selectedMonth)}` : "Model-wise Sales"}
              </h2>

              {isLoading ? (
                <p className="text-muted-foreground">Loading data...</p>
              ) : monthlySalesData.length === 0 ? (
                <p className="text-muted-foreground">No sales for the selected month.</p>
              ) : (
                <>
                  {/* Bar Chart using CSS */}
                  <div className="space-y-4 mb-8">
                    <div>
                      <h3 className="font-semibold mb-4">Sales Count by Model</h3>
                      <div className="space-y-2">
                        {monthlySalesData.map((item) => {
                          const maxCount = Math.max(...monthlySalesData.map((m) => m.count), 1);
                          const percentage = (item.count / maxCount) * 100;
                          return (
                            <div key={item.model}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{item.model || "Unknown"}</span>
                                <span className="text-muted-foreground">{item.count} units</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sales Revenue Chart */}
                  <div className="space-y-4 mb-8">
                    <div>
                      <h3 className="font-semibold mb-4">Revenue by Model</h3>
                      <div className="space-y-2">
                        {monthlySalesData.map((item) => {
                          const maxSales = Math.max(...monthlySalesData.map((m) => m.totalSales), 1);
                          const percentage = (item.totalSales / maxSales) * 100;
                          return (
                            <div key={`revenue-${item.model}`}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{item.model || "Unknown"}</span>
                                <span className="text-muted-foreground">{formatCurrency(item.totalSales)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                                <div
                                  className="bg-green-600 h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-3 py-3">Model</th>
                          <th className="px-3 py-3">Count</th>
                          <th className="px-3 py-3">Total Sales</th>
                          <th className="px-3 py-3">Total Cost</th>
                          <th className="px-3 py-3">Total Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlySalesData.map((item) => (
                          <tr key={item.model} className="border-b border-border">
                            <td className="px-3 py-3 font-medium">{item.model || "Unknown"}</td>
                            <td className="px-3 py-3">{item.count}</td>
                            <td className="px-3 py-3">{formatCurrency(item.totalSales)}</td>
                            <td className="px-3 py-3">{formatCurrency(item.totalCost)}</td>
                            <td className="px-3 py-3 font-semibold text-green-600">{formatCurrency(item.totalProfit)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-border bg-muted/50 font-bold">
                          <td className="px-3 py-3">TOTAL</td>
                          <td className="px-3 py-3">{monthlyTotals.count}</td>
                          <td className="px-3 py-3">{formatCurrency(monthlyTotals.sales)}</td>
                          <td className="px-3 py-3">{formatCurrency(monthlyTotals.cost)}</td>
                          <td className="px-3 py-3 text-green-600">{formatCurrency(monthlyTotals.profit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
