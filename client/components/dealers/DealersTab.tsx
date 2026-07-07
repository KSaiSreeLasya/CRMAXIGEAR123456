import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, EyeOff, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Dealer {
  id?: string;
  name: string;
  code: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  manager_name?: string;
}

interface DealersTabProps {
  dealers: Dealer[];
  onAddDealer: (dealer: Omit<Dealer, "id">) => Promise<void>;
  onUpdateDealer: (id: string, dealer: Omit<Dealer, "id">) => Promise<boolean>;
  onDeleteDealer: (id: string) => Promise<void>;
}

export default function DealersTab({
  dealers,
  onAddDealer,
  onUpdateDealer,
  onDeleteDealer,
}: DealersTabProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    email: "",
    password: "",
    phone: "",
    location: "",
    manager_name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, code, email, password, phone, location, manager_name } = formData;

    if (!name.trim()) {
      toast.error("Dealer name is required");
      return false;
    }
    if (!code.trim()) {
      toast.error("Dealer code is required");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Valid email is required");
      return false;
    }
    if (!password.trim()) {
      toast.error("Password is required");
      return false;
    }
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!location.trim()) {
      toast.error("Address/Location is required");
      return false;
    }
    if (!manager_name.trim()) {
      toast.error("Manager name is required");
      return false;
    }
    return true;
  };

  const startEdit = (dealer: Dealer) => {
    setEditingId(dealer.id || null);
    setFormData({
      name: dealer.name,
      code: dealer.code,
      email: dealer.email,
      password: dealer.password,
      phone: dealer.phone || "",
      location: dealer.location || "",
      manager_name: dealer.manager_name || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: "",
      code: "",
      email: "",
      password: "",
      phone: "",
      location: "",
      manager_name: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const dealerData = {
        name: formData.name,
        code: formData.code,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        location: formData.location,
        manager_name: formData.manager_name,
      };

      if (editingId) {
        const result = await onUpdateDealer(editingId, dealerData);
        if (result) {
          toast.success("Dealer updated successfully");
          cancelEdit();
        } else {
          toast.error("Failed to update dealer. Check browser console for details.");
        }
      } else {
        const result = await onAddDealer(dealerData);
        if (result === false) {
          toast.error("Failed to add dealer. Check browser console for details.");
          setIsSubmitting(false);
          return;
        }
        toast.success("Dealer added successfully");
        setFormData({
          name: "",
          code: "",
          email: "",
          password: "",
          phone: "",
          location: "",
          manager_name: "",
        });
      }
    } catch (error) {
      console.error("Error saving dealer:", error);
      toast.error(`Failed to save dealer: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add/Edit Dealer Form */}
      <div className="bg-background rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{editingId ? "Edit Dealer" : "Add New Dealer"}</h2>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={cancelEdit}
              className="text-sm"
            >
              Cancel Edit
            </Button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Dealer Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter dealer name"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium mb-2">
                Dealer Code (Unique) *
              </label>
              <input
                id="code"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g., AXI-001"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email (Unique) *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="dealer@example.com"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone Number *
              </label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-2">
                Address/Location *
              </label>
              <input
                id="location"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, State"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="manager_name" className="block text-sm font-medium mb-2">
                Manager Name *
              </label>
              <input
                id="manager_name"
                type="text"
                name="manager_name"
                value={formData.manager_name}
                onChange={handleInputChange}
                placeholder="Enter manager name"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update Dealer" : "Add Dealer")}
          </Button>
        </form>
      </div>

      {/* Dealers List */}
      <div className="bg-background rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Dealers List ({dealers.length})</h2>
        </div>

        {dealers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No dealers added yet. Add one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealers.map((dealer) => (
                  <TableRow key={dealer.id}>
                    <TableCell className="font-medium">{dealer.name}</TableCell>
                    <TableCell>{dealer.code}</TableCell>
                    <TableCell className="text-sm">{dealer.email}</TableCell>
                    <TableCell>{dealer.phone}</TableCell>
                    <TableCell className="text-sm">{dealer.location || "Not Specified"}</TableCell>
                    <TableCell className="text-sm">{dealer.manager_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEdit(dealer)}
                          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                          title="Edit dealer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (dealer.id && window.confirm("Are you sure you want to delete this dealer?")) {
                              await onDeleteDealer(dealer.id);
                              toast.success("Dealer deleted successfully");
                            }
                          }}
                          className="inline-flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors"
                          title="Delete dealer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
