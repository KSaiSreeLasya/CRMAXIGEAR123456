import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Plus, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getEmployeeSession } from "@/lib/auth";

interface EstimationRecord {
  id: string;
  estimationSlipNo: string;
  customerName: string;
  contactNo: string;
  estimationDate: string;
  model: string;
  amount: number;
  createdAt: string;
}

const DEFAULT_ESTIMATION_FORM = {
  estimationSlipNo: "",
  customerName: "",
  contactNo: "",
  estimationDate: "",
  model: "",
  amount: "",
};

export default function Sales() {
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState<EstimationRecord[]>([]);
  const [estimationForm, setEstimationForm] = useState(DEFAULT_ESTIMATION_FORM);
  const [editingEstimationId, setEditingEstimationId] = useState<string | null>(null);
  const [isLoadingEstimations, setIsLoadingEstimations] = useState(false);
  const [isSavingEstimation, setIsSavingEstimation] = useState(false);

  useEffect(() => {
    void loadEstimations();
  }, []);

  const loadEstimations = async () => {
    setIsLoadingEstimations(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("estimations")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) {
            console.warn("Supabase error:", error.message);
            throw error;
          }
          const rows: EstimationRecord[] =
            data?.map((row: any) => ({
              id: row.id,
              estimationSlipNo: row.estimation_slip_no || "",
              customerName: row.customer_name || "",
              contactNo: row.contact_no || "",
              estimationDate: row.estimation_date || "",
              model: row.model || "",
              amount: row.amount || 0,
              createdAt: new Date(row.created_at).toLocaleDateString(),
            })) || [];
          setEstimations(rows);
          return;
        } catch (supabaseError: any) {
          console.warn("Supabase estimations load failed, falling back to localStorage:", supabaseError?.message);
        }
      }
      const raw = localStorage.getItem("crm_estimations");
      if (raw) setEstimations(JSON.parse(raw));
    } catch (error) {
      console.error("Error loading estimations:", error);
    } finally {
      setIsLoadingEstimations(false);
    }
  };

  const handleSaveEstimation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEstimation(true);
    try {
      const amount = Number(estimationForm.amount || 0);

      const payload = {
        estimationSlipNo: estimationForm.estimationSlipNo.trim(),
        customerName: estimationForm.customerName.trim(),
        contactNo: estimationForm.contactNo.trim(),
        estimationDate: estimationForm.estimationDate,
        model: estimationForm.model.trim(),
        amount,
      };

      if (editingEstimationId) {
        if (supabase) {
          try {
            const { error } = await supabase
              .from("estimations")
              .update({
                estimation_slip_no: payload.estimationSlipNo,
                customer_name: payload.customerName,
                contact_no: payload.contactNo,
                estimation_date: payload.estimationDate,
                model: payload.model,
                amount: payload.amount,
              })
              .eq("id", editingEstimationId);
            if (error) throw error;
          } catch (supabaseError: any) {
            console.warn("Supabase update failed, using localStorage only:", supabaseError?.message);
          }
        }

        const updated = estimations.map((item) =>
          item.id === editingEstimationId
            ? {
                ...item,
                ...payload,
              }
            : item
        );
        setEstimations(updated);
        localStorage.setItem("crm_estimations", JSON.stringify(updated));
      } else {
        let created: EstimationRecord;
        if (supabase) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user?.id) {
              throw new Error("User not authenticated");
            }
            const { data, error } = await supabase
              .from("estimations")
              .insert([
                {
                  user_id: userData.user.id,
                  estimation_slip_no: payload.estimationSlipNo,
                  customer_name: payload.customerName,
                  contact_no: payload.contactNo,
                  estimation_date: payload.estimationDate,
                  model: payload.model,
                  amount: payload.amount,
                },
              ])
              .select()
              .single();
            if (error) throw error;

            created = {
              id: data.id,
              estimationSlipNo: data.estimation_slip_no,
              customerName: data.customer_name,
              contactNo: data.contact_no,
              estimationDate: data.estimation_date,
              model: data.model,
              amount: data.amount,
              createdAt: new Date(data.created_at).toLocaleDateString(),
            };
            setEstimations((prev) => [created, ...prev]);
          } catch (supabaseError: any) {
            console.warn("Supabase insert failed, using localStorage:", supabaseError?.message);
            created = {
              id: `estimation_${Date.now()}`,
              createdAt: new Date().toLocaleDateString(),
              ...payload,
            };
            const updated = [created, ...estimations];
            setEstimations(updated);
            localStorage.setItem("crm_estimations", JSON.stringify(updated));
          }
        } else {
          created = {
            id: `estimation_${Date.now()}`,
            createdAt: new Date().toLocaleDateString(),
            ...payload,
          };
          const updated = [created, ...estimations];
          setEstimations(updated);
          localStorage.setItem("crm_estimations", JSON.stringify(updated));
        }
      }

      setEstimationForm(DEFAULT_ESTIMATION_FORM);
      setEditingEstimationId(null);
    } catch (error: any) {
      console.error("Error saving estimation:", error);
      alert(error?.message || "Failed to save estimation.");
    } finally {
      setIsSavingEstimation(false);
    }
  };

  const handleDeleteEstimation = async (id: string) => {
    if (!window.confirm("Delete this estimation?")) return;
    try {
      if (supabase) {
        try {
          const { error } = await supabase.from("estimations").delete().eq("id", id);
          if (error) throw error;
        } catch (supabaseError: any) {
          console.warn("Supabase delete failed, using localStorage only:", supabaseError?.message);
        }
      }
      const updated = estimations.filter((item) => item.id !== id);
      setEstimations(updated);
      localStorage.setItem("crm_estimations", JSON.stringify(updated));
    } catch (error: any) {
      console.error("Error deleting estimation:", error);
      alert(error?.message || "Failed to delete estimation.");
    }
  };

  const handleEditEstimation = (item: EstimationRecord) => {
    setEditingEstimationId(item.id);
    setEstimationForm({
      estimationSlipNo: item.estimationSlipNo,
      customerName: item.customerName,
      contactNo: item.contactNo,
      estimationDate: item.estimationDate,
      model: item.model,
      amount: String(item.amount),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditEstimation = () => {
    setEditingEstimationId(null);
    setEstimationForm(DEFAULT_ESTIMATION_FORM);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sales Pipeline</h1>
          <p className="text-muted-foreground">
            Track and manage all your EV bike sales and service invoices.
          </p>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => navigate("/service-invoice")} className="gap-2">
            <Plus className="w-4 h-4" />
            Service Invoices
          </Button>
        </div>

        <Tabs defaultValue="estimation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 bg-muted p-1 rounded-lg max-w-sm">
            <TabsTrigger value="estimation" className="data-[state=active]:bg-background">Estimation Cost</TabsTrigger>
          </TabsList>

          {/* Estimation Cost Tab */}
          <TabsContent value="estimation" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingEstimationId ? "Edit Estimation" : "Add Estimation"}
              </h2>
              <form onSubmit={handleSaveEstimation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Estimation Slip No"
                  value={estimationForm.estimationSlipNo}
                  onChange={(e) => setEstimationForm((prev) => ({ ...prev, estimationSlipNo: e.target.value }))}
                  required
                />
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Customer Name"
                  value={estimationForm.customerName}
                  onChange={(e) => setEstimationForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  required
                />
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Contact No"
                  value={estimationForm.contactNo}
                  onChange={(e) => setEstimationForm((prev) => ({ ...prev, contactNo: e.target.value }))}
                />
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Estimation Date"
                  type="date"
                  value={estimationForm.estimationDate}
                  onChange={(e) => setEstimationForm((prev) => ({ ...prev, estimationDate: e.target.value }))}
                />
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Model"
                  value={estimationForm.model}
                  onChange={(e) => setEstimationForm((prev) => ({ ...prev, model: e.target.value }))}
                />
                <input
                  className="px-4 py-2 border border-border rounded-lg bg-background"
                  placeholder="Amount"
                  type="number"
                  step="0.01"
                  value={estimationForm.amount}
                  onChange={(e) => setEstimationForm((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
                <button
                  type="submit"
                  disabled={isSavingEstimation}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSavingEstimation ? "Saving..." : editingEstimationId ? "Update Estimation" : "Save Estimation"}
                </button>
                {editingEstimationId && (
                  <button
                    type="button"
                    onClick={cancelEditEstimation}
                    className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 hover:bg-muted/50"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">Estimations</h2>
              {isLoadingEstimations ? (
                <p className="text-muted-foreground">Loading estimations...</p>
              ) : estimations.length === 0 ? (
                <p className="text-muted-foreground">No estimations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2 text-left">Slip No</th>
                        <th className="px-4 py-2 text-left">Customer</th>
                        <th className="px-4 py-2 text-left">Contact</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Model</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-left">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimations.map((est) => (
                        <tr key={est.id} className="border-b border-border">
                          <td className="px-4 py-2">{est.estimationSlipNo}</td>
                          <td className="px-4 py-2">{est.customerName}</td>
                          <td className="px-4 py-2">{est.contactNo}</td>
                          <td className="px-4 py-2">{est.estimationDate}</td>
                          <td className="px-4 py-2">{est.model}</td>
                          <td className="px-4 py-2 text-right font-semibold">₹{est.amount.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleEditEstimation(est)}
                                className="inline-flex items-center gap-1 text-primary hover:text-primary/90"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteEstimation(est.id)}
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
