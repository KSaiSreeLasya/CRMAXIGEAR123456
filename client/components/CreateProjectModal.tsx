import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Project } from "@/pages/Projects";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<Project, "id" | "createdAt">) => Promise<void>;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    contactNo: "",
    location: "",
    productDescription: "",
    hsnNo: "",
    chassisNo: "",
    amount: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.contactNo.trim()) {
      newErrors.contactNo = "Contact number is required";
    }
    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }
    if (!formData.productDescription.trim()) {
      newErrors.productDescription = "Product description is required";
    }
    if (!formData.hsnNo.trim()) {
      newErrors.hsnNo = "HSN number is required";
    }
    if (!formData.chassisNo.trim()) {
      newErrors.chassisNo = "Chassis number is required";
    }
    if (!formData.amount.trim()) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(parseFloat(formData.amount))) {
      newErrors.amount = "Amount must be a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onCreateProject({
      customerName: formData.customerName,
      contactNo: formData.contactNo,
      location: formData.location,
      productDescription: formData.productDescription,
      hsnNo: formData.hsnNo,
      chassisNo: formData.chassisNo,
      amount: parseFloat(formData.amount),
    });

    // Reset form
    setFormData({
      customerName: "",
      contactNo: "",
      location: "",
      productDescription: "",
      hsnNo: "",
      chassisNo: "",
      amount: "",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg border border-border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Create New Sales</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Customer Name */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Enter customer name"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.customerName ? "border-destructive" : "border-border"
                }`}
              />
              {errors.customerName && (
                <p className="text-sm text-destructive mt-1">
                  {errors.customerName}
                </p>
              )}
            </div>

            {/* Contact No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Contact No *
              </label>
              <input
                type="tel"
                name="contactNo"
                value={formData.contactNo}
                onChange={handleChange}
                placeholder="Enter contact number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.contactNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.contactNo && (
                <p className="text-sm text-destructive mt-1">
                  {errors.contactNo}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter location"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.location ? "border-destructive" : "border-border"
                }`}
              />
              {errors.location && (
                <p className="text-sm text-destructive mt-1">
                  {errors.location}
                </p>
              )}
            </div>

            {/* Product Description */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Product Description *
              </label>
              <textarea
                name="productDescription"
                value={formData.productDescription}
                onChange={handleChange}
                placeholder="Enter product description"
                rows={4}
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                  errors.productDescription
                    ? "border-destructive"
                    : "border-border"
                }`}
              />
              {errors.productDescription && (
                <p className="text-sm text-destructive mt-1">
                  {errors.productDescription}
                </p>
              )}
            </div>

            {/* HSN No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                HSN No. *
              </label>
              <input
                type="text"
                name="hsnNo"
                value={formData.hsnNo}
                onChange={handleChange}
                placeholder="Enter HSN number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.hsnNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.hsnNo && (
                <p className="text-sm text-destructive mt-1">{errors.hsnNo}</p>
              )}
            </div>

            {/* Chassis No */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Chassis No. *
              </label>
              <input
                type="text"
                name="chassisNo"
                value={formData.chassisNo}
                onChange={handleChange}
                placeholder="Enter chassis number"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.chassisNo ? "border-destructive" : "border-border"
                }`}
              />
              {errors.chassisNo && (
                <p className="text-sm text-destructive mt-1">{errors.chassisNo}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold mb-2">
                Amount *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Enter amount"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.amount ? "border-destructive" : "border-border"
                }`}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 justify-end pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
              >
                Create Sales
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
