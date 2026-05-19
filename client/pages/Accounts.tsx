import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Trash2 } from "lucide-react";

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

interface EstimationFormData {
  customerName: string;
  address: string;
  contactNo: string;
  model: string;
  estimationSlipNo: string;
  estimationDate: string;
  amount: string;
  batteryWarranty: string;
  batteryCapacity: string;
  kmsRange: string;
  speed: string;
  vehicleWarranty: string;
}

const DEFAULT_FORM: EstimationFormData = {
  customerName: "",
  address: "",
  contactNo: "",
  model: "",
  estimationSlipNo: "",
  estimationDate: "",
  amount: "",
  batteryWarranty: "",
  batteryCapacity: "",
  kmsRange: "",
  speed: "",
  vehicleWarranty: "",
};

export default function Accounts() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<EstimationFormData>(DEFAULT_FORM);
  const [estimations, setEstimations] = useState<EstimationRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadEstimations();
  }, []);

  useEffect(() => {
    if (!editingId && !formData.estimationSlipNo) {
      setFormData((prev) => ({ ...prev, estimationSlipNo: getNextEstimationSlipNo(estimations) }));
    }
  }, [estimations, editingId, formData.estimationSlipNo]);

  const loadEstimations = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("estimations")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;

          const formatted: EstimationRecord[] =
            data?.map((row: any) => ({
              id: row.id,
              customerName: row.customer_name,
              address: row.address,
              contactNo: row.contact_no,
              model: row.model || "",
              estimationSlipNo: row.estimation_slip_no,
              estimationDate: row.estimation_date,
              amount: row.amount,
              batteryWarranty: row.battery_warranty || "",
              batteryCapacity: row.battery_capacity || "",
              kmsRange: row.kms_range || "",
              speed: row.speed || "",
              vehicleWarranty: row.vehicle_warranty || "",
              createdAt: new Date(row.created_at).toLocaleDateString(),
            })) || [];

          setEstimations(formatted);
          return;
        } catch (supabaseError) {
          console.error("Error loading estimations from Supabase:", supabaseError);
        }
      }

      const saved = localStorage.getItem("crm_estimations");
      if (saved) {
        const parsed = JSON.parse(saved) as EstimationRecord[];
        setEstimations(
          parsed.map((row) => ({
            ...row,
            batteryWarranty: row.batteryWarranty ?? "",
            batteryCapacity: row.batteryCapacity ?? "",
            kmsRange: row.kmsRange ?? "",
            speed: row.speed ?? "",
            vehicleWarranty: row.vehicleWarranty ?? "",
          })),
        );
      }
    } catch (error) {
      console.error("Error in loadEstimations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const persistEstimations = (next: EstimationRecord[]) => {
    localStorage.setItem("crm_estimations", JSON.stringify(next));
    setEstimations(next);
  };

  const startEditEstimation = (row: EstimationRecord) => {
    setEditingId(row.id);
    setFormData({
      customerName: row.customerName,
      address: row.address,
      contactNo: row.contactNo,
      model: row.model,
      estimationSlipNo: row.estimationSlipNo,
      estimationDate: row.estimationDate,
      amount: String(row.amount),
      batteryWarranty: row.batteryWarranty,
      batteryCapacity: row.batteryCapacity,
      kmsRange: row.kmsRange,
      speed: row.speed,
      vehicleWarranty: row.vehicleWarranty,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditEstimation = () => {
    setEditingId(null);
    setFormData({ ...DEFAULT_FORM, estimationSlipNo: getNextEstimationSlipNo(estimations) });
  };

  const handleDeleteEstimation = async (id: string) => {
    if (!window.confirm("Delete this estimation slip? This cannot be undone.")) {
      return;
    }

    if (supabase) {
      try {
        const { error } = await supabase.from("estimations").delete().eq("id", id);
        if (error) throw error;
      } catch (supabaseError) {
        console.error("Error deleting estimation from Supabase:", supabaseError);
      }
    }

    const next = estimations.filter((row) => row.id !== id);
    persistEstimations(next);
    if (editingId === id) {
      cancelEditEstimation();
    }
  };

  const handleEstimationFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const amount = parseFloat(formData.amount);
      if (Number.isNaN(amount)) {
        alert("Please enter a valid amount.");
        return;
      }

      if (editingId) {
        const existing = estimations.find((row) => row.id === editingId);
        const updatedRow: EstimationRecord = {
          id: editingId,
          customerName: formData.customerName,
          address: formData.address,
          contactNo: formData.contactNo,
          model: formData.model,
          estimationSlipNo: formData.estimationSlipNo,
          estimationDate: formData.estimationDate,
          amount,
          batteryWarranty: formData.batteryWarranty,
          batteryCapacity: formData.batteryCapacity,
          kmsRange: formData.kmsRange,
          speed: formData.speed,
          vehicleWarranty: formData.vehicleWarranty,
          createdAt: existing?.createdAt ?? new Date().toLocaleDateString(),
        };

        if (supabase) {
          try {
            const { error } = await supabase
              .from("estimations")
              .update({
                customer_name: formData.customerName,
                address: formData.address,
                contact_no: formData.contactNo,
                model: formData.model,
                estimation_slip_no: formData.estimationSlipNo,
                estimation_date: formData.estimationDate,
                amount,
                battery_warranty: formData.batteryWarranty || null,
                battery_capacity: formData.batteryCapacity || null,
                kms_range: formData.kmsRange || null,
                speed: formData.speed || null,
                vehicle_warranty: formData.vehicleWarranty || null,
              })
              .eq("id", editingId);

            if (error) throw error;
          } catch (supabaseError) {
            console.error("Error updating estimation in Supabase:", supabaseError);
          }
        }

        const next = estimations.map((row) => (row.id === editingId ? updatedRow : row));
        persistEstimations(next);
        setFormData({ ...DEFAULT_FORM, estimationSlipNo: getNextEstimationSlipNo(next) });
        setEditingId(null);
        return;
      }

      const localRecord: EstimationRecord = {
        id: `estimation_${Date.now()}`,
        customerName: formData.customerName,
        address: formData.address,
        contactNo: formData.contactNo,
        model: formData.model,
        estimationSlipNo: formData.estimationSlipNo,
        estimationDate: formData.estimationDate,
        amount,
        batteryWarranty: formData.batteryWarranty,
        batteryCapacity: formData.batteryCapacity,
        kmsRange: formData.kmsRange,
        speed: formData.speed,
        vehicleWarranty: formData.vehicleWarranty,
        createdAt: new Date().toLocaleDateString(),
      };

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
                customer_name: formData.customerName,
                address: formData.address,
                contact_no: formData.contactNo,
                model: formData.model,
                estimation_slip_no: formData.estimationSlipNo,
                estimation_date: formData.estimationDate,
                amount,
                battery_warranty: formData.batteryWarranty || null,
                battery_capacity: formData.batteryCapacity || null,
                kms_range: formData.kmsRange || null,
                speed: formData.speed || null,
                vehicle_warranty: formData.vehicleWarranty || null,
              },
            ])
            .select();

          if (error) throw error;

          const dbRecord: EstimationRecord = {
            id: data[0].id,
            customerName: data[0].customer_name,
            address: data[0].address,
            contactNo: data[0].contact_no,
            model: data[0].model || "",
            estimationSlipNo: data[0].estimation_slip_no,
            estimationDate: data[0].estimation_date,
            amount: data[0].amount,
            batteryWarranty: data[0].battery_warranty || "",
            batteryCapacity: data[0].battery_capacity || "",
            kmsRange: data[0].kms_range || "",
            speed: data[0].speed || "",
            vehicleWarranty: data[0].vehicle_warranty || "",
            createdAt: new Date(data[0].created_at).toLocaleDateString(),
          };

          setEstimations((prev) => [dbRecord, ...prev]);
          setFormData((prev) => ({
            ...DEFAULT_FORM,
            estimationSlipNo: getNextEstimationSlipNo([dbRecord, ...estimations]),
          }));
          return;
        } catch (supabaseError) {
          console.error("Error creating estimation in Supabase:", supabaseError);
        }
      }

      const updated = [localRecord, ...estimations];
      persistEstimations(updated);
      setFormData({ ...DEFAULT_FORM, estimationSlipNo: getNextEstimationSlipNo(updated) });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to save estimation";
      console.error("Error saving estimation:", errorMessage);
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Estimation</h1>
            <p className="text-muted-foreground">
              Create and track estimation slips for customers.
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-6">
              {editingId ? "Edit Estimation" : "Create Estimation"}
            </h2>
            <form
              onSubmit={handleEstimationFormSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Customer Name</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact No</label>
                <input
                  type="text"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Estimation Slip No
                </label>
                <input
                  type="text"
                  name="estimationSlipNo"
                  value={formData.estimationSlipNo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  name="estimationDate"
                  value={formData.estimationDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-muted-foreground mb-3 border-b border-border pb-2">
                  Battery &amp; vehicle specifications
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Battery warranty</label>
                    <input
                      type="text"
                      name="batteryWarranty"
                      value={formData.batteryWarranty}
                      onChange={handleInputChange}
                      placeholder="e.g. 24 months"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Battery capacity</label>
                    <input
                      type="text"
                      name="batteryCapacity"
                      value={formData.batteryCapacity}
                      onChange={handleInputChange}
                      placeholder="e.g. 3.5 kWh"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">KM range</label>
                    <input
                      type="text"
                      name="kmsRange"
                      value={formData.kmsRange}
                      onChange={handleInputChange}
                      placeholder="e.g. 120 km"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Speed</label>
                    <input
                      type="text"
                      name="speed"
                      value={formData.speed}
                      onChange={handleInputChange}
                      placeholder="e.g. 65 km/h"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Vehicle warranty</label>
                    <input
                      type="text"
                      name="vehicleWarranty"
                      value={formData.vehicleWarranty}
                      onChange={handleInputChange}
                      placeholder="e.g. 36 months"
                      className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3">
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEditEstimation}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Estimation" : "Create Estimation"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">Estimations</h2>
            {isLoading ? (
              <p className="text-muted-foreground">Loading estimations...</p>
            ) : estimations.length === 0 ? (
              <p className="text-muted-foreground">No estimations created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3">Slip No</th>
                      <th className="text-left px-4 py-3">Customer</th>
                      <th className="text-left px-4 py-3">Model</th>
                      <th className="text-left px-4 py-3">Contact</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Amount (Incl. GST)</th>
                      <th className="text-left px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimations.map((item) => (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-3">{item.estimationSlipNo}</td>
                        <td className="px-4 py-3">{item.customerName}</td>
                        <td className="px-4 py-3">{item.model}</td>
                        <td className="px-4 py-3">{item.contactNo}</td>
                        <td className="px-4 py-3">{item.estimationDate}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatAmount(item.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <Link
                              to={`/estimation-slip/${item.id}`}
                              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/90 font-medium text-sm"
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              View slip
                            </Link>
                            <button
                              type="button"
                              onClick={() => startEditEstimation(item)}
                              className="inline-flex items-center gap-1.5 text-primary hover:text-primary/90 font-medium text-sm"
                              title="Edit slip"
                            >
                              <Edit className="w-4 h-4 shrink-0" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteEstimation(item.id)}
                              className="inline-flex items-center gap-1.5 text-destructive hover:text-destructive/90 font-medium text-sm"
                              title="Delete slip"
                            >
                              <Trash2 className="w-4 h-4 shrink-0" />
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
        </div>
      </div>
    </Layout>
  );
}

function getNextEstimationSlipNo(estimations: EstimationRecord[]): string {
  const defaultNo = "EST/2026-27/001";
  let maxNo = defaultNo;
  let maxSuffix = 0;

  for (const row of estimations) {
    const value = row.estimationSlipNo?.trim();
    if (!value) continue;
    const match = value.match(/^(.*?)(\d+)$/);
    if (!match) continue;
    const suffix = Number(match[2]);
    if (Number.isNaN(suffix)) continue;
    if (suffix > maxSuffix) {
      maxSuffix = suffix;
      maxNo = value;
    }
  }

  const match = maxNo.match(/^(.*?)(\d+)$/);
  if (!match) return defaultNo;
  const prefix = match[1];
  const width = match[2].length;
  const next = String(Number(match[2]) + 1).padStart(width, "0");
  return `${prefix}${next}`;
}
