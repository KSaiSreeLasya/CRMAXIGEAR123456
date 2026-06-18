import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getEmployeeSession, isAdminUser } from "@/lib/auth";
import AdminPasswordDialog from "@/components/AdminPasswordDialog";

interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const DEFAULT_FORM = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  role: "",
};

export default function AdminEmployees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const employeeSession = getEmployeeSession();
  const isAdmin = isAdminUser();
  const [passwordVerified, setPasswordVerified] = useState(isAdmin);

  useEffect(() => {
    void loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("employees")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;

          const rows: Employee[] =
            data?.map((row: any) => ({
              id: row.id,
              fullName: row.full_name,
              email: row.email || "",
              phone: row.phone || "",
              role: row.role || "",
              isActive: row.is_active ?? true,
              createdAt: new Date(row.created_at).toLocaleDateString(),
            })) || [];
          setEmployees(rows);
          console.log(`✅ Loaded ${rows.length} employees from Supabase`);
          return;
        } catch (supabaseError: any) {
          console.error("Supabase error loading employees:", supabaseError?.message);
          const raw = localStorage.getItem("crm_employees");
          if (raw) {
            setEmployees(JSON.parse(raw));
            console.log("Loaded from localStorage fallback");
          }
          return;
        }
      }

      const raw = localStorage.getItem("crm_employees");
      if (raw) setEmployees(JSON.parse(raw));
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const persistLocalEmployees = (rows: Employee[]) => {
    setEmployees(rows);
    localStorage.setItem("crm_employees", JSON.stringify(rows));
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!form.fullName.trim()) {
        alert("Employee name is required.");
        return;
      }
      if (!form.email.trim()) {
        alert("Employee email is required.");
        return;
      }
      if (!editingId && (!form.password.trim() || form.password.trim().length < 6)) {
        alert("Password is required (minimum 6 characters).");
        return;
      }

      if (editingId) {
        if (supabase) {
          const { error } = await supabase
            .from("employees")
            .update({
              full_name: form.fullName.trim(),
              email: form.email.trim().toLowerCase(),
              phone: form.phone.trim() || null,
              role: form.role.trim() || null,
            })
            .eq("id", editingId);
          if (error) throw error;
        }

        const next = employees.map((item) =>
          item.id === editingId
            ? {
                ...item,
                fullName: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                role: form.role.trim(),
              }
            : item,
        );
        persistLocalEmployees(next);
      } else {
        if (supabase) {
          // Use server endpoint to handle employee creation securely
          const response = await fetch("/api/admin/setup-employee", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fullName: form.fullName.trim(),
              email: form.email.trim().toLowerCase(),
              password: form.password.trim(),
              role: form.role.trim() || "Employee",
            }),
          });

          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              throw new Error(`Failed to create employee (${response.status}: ${response.statusText})`);
            }
            throw new Error(errorData.error || "Failed to create employee");
          }

          let data;
          try {
            data = await response.json();
          } catch {
            throw new Error("Invalid response from server");
          }
          if (!data.success || !data.employee) {
            throw new Error("Employee was not created.");
          }

          const row = data.employee;
          const created: Employee = {
            id: row.id,
            fullName: row.fullName,
            email: row.email || "",
            phone: row.phone || "",
            role: row.role || "",
            isActive: true,
            createdAt: row.createdAt
              ? new Date(row.createdAt).toLocaleDateString()
              : new Date().toLocaleDateString(),
          };
          setEmployees((prev) => [created, ...prev]);
        } else {
          const created: Employee = {
            id: `employee_${Date.now()}`,
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            role: form.role.trim(),
            isActive: true,
            createdAt: new Date().toLocaleDateString(),
          };
          persistLocalEmployees([created, ...employees]);
        }
      }

      setForm(DEFAULT_FORM);
      setEditingId(null);
    } catch (error: any) {
      console.error("Error adding employee:", error);
      alert(error?.message || "Failed to add employee.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      if (supabase) {
        const { error } = await supabase.from("employees").delete().eq("id", id);
        if (error) throw error;
      }
      const next = employees.filter((item) => item.id !== id);
      persistLocalEmployees(next);
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      alert(error?.message || "Failed to delete employee.");
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    const nextStatus = !employee.isActive;
    try {
      if (supabase) {
        const { error } = await supabase
          .from("employees")
          .update({ is_active: nextStatus })
          .eq("id", employee.id);
        if (error) throw error;
      }
      const next = employees.map((item) =>
        item.id === employee.id ? { ...item, isActive: nextStatus } : item,
      );
      persistLocalEmployees(next);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      alert(error?.message || "Failed to update employee status.");
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({
      fullName: employee.fullName,
      email: employee.email,
      password: "",
      phone: employee.phone,
      role: employee.role,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  };

  if (!passwordVerified) {
    return (
      <Layout>
        <AdminPasswordDialog
          isOpen={true}
          onSuccess={() => setPasswordVerified(true)}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Admin - Employee Management</h1>
          <p className="text-muted-foreground">Add employees and manage active/inactive status.</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? "Edit Employee" : "Add Employee"}
          </h2>
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Employee Name"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              required
            />
            <input
              type="email"
              placeholder="Employee Email"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            {!editingId && (
              <input
                type="password"
                placeholder="Set Password"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            )}
            <input
              type="text"
              placeholder="Phone Number"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Role (Sales / Admin / Technician)"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : editingId ? "Update Employee" : "Add Employee"}
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

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Employees</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading employees...</p>
          ) : employees.length === 0 ? (
            <p className="text-muted-foreground">No employees added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Phone</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Created</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">{item.fullName}</td>
                      <td className="px-4 py-3">{item.email || "-"}</td>
                      <td className="px-4 py-3">{item.phone || "-"}</td>
                      <td className="px-4 py-3">{item.role || "-"}</td>
                      <td className="px-4 py-3">{item.isActive ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3">{item.createdAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditEmployee(item)}
                            className="text-primary hover:text-primary/90"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(item)}
                            className="text-primary hover:text-primary/90"
                          >
                            {item.isActive ? "Set Inactive" : "Set Active"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteEmployee(item.id)}
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
      </div>
    </Layout>
  );
}
