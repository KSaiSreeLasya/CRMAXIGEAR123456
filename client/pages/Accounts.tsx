import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

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

interface EstimationFormData {
  customerName: string;
  address: string;
  contactNo: string;
  model: string;
  estimationSlipNo: string;
  estimationDate: string;
  amount: string;
}

const DEFAULT_FORM: EstimationFormData = {
  customerName: "",
  address: "",
  contactNo: "",
  model: "",
  estimationSlipNo: "",
  estimationDate: "",
  amount: "",
};

export default function Accounts() {
  const [formData, setFormData] = useState<EstimationFormData>(DEFAULT_FORM);
  const [estimations, setEstimations] = useState<EstimationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEstimations();
  }, []);

  const loadEstimations = async () => {
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
        setEstimations(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error in loadEstimations:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateEstimation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      if (Number.isNaN(amount)) {
        alert("Please enter a valid amount.");
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
            createdAt: new Date(data[0].created_at).toLocaleDateString(),
          };

          setEstimations((prev) => [dbRecord, ...prev]);
          setFormData(DEFAULT_FORM);
          return;
        } catch (supabaseError) {
          console.error("Error creating estimation in Supabase:", supabaseError);
        }
      }

      const updated = [localRecord, ...estimations];
      localStorage.setItem("crm_estimations", JSON.stringify(updated));
      setEstimations(updated);
      setFormData(DEFAULT_FORM);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create estimation";
      console.error("Error creating estimation:", errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
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
          <div>
            <h1 className="text-3xl font-bold mb-2">Accounts - Estimation Cost</h1>
            <p className="text-muted-foreground">
              Create and track estimation slips for customers.
            </p>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-6">Create Estimation Cost</h2>
            <form
              onSubmit={handleCreateEstimation}
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

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Create Estimation"}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">Estimations</h2>
            {estimations.length === 0 ? (
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
                      <th className="text-left px-4 py-3">Slip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimations.map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="px-4 py-3">{item.estimationSlipNo}</td>
                        <td className="px-4 py-3">{item.customerName}</td>
                        <td className="px-4 py-3">{item.model}</td>
                        <td className="px-4 py-3">{item.contactNo}</td>
                        <td className="px-4 py-3">{item.estimationDate}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatAmount(item.amount * 1.05)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/estimation-slip/${item.id}`}
                            className="text-primary hover:text-primary/90 font-medium"
                          >
                            View Slip
                          </Link>
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
