import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Delivery {
  id: string;
  project_name: string;
  deliverables: string;
  delivery_date: string;
  status: string;
  created_at: string;
}

export default function Delivery() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    project_name: "",
    deliverables: "",
    delivery_date: "",
    status: "pending",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/deliveries");
      const data = await response.json();
      setDeliveries(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch deliveries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.project_name || !formData.deliverables || !formData.delivery_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const endpoint = editingId ? `/api/deliveries/${editingId}` : "/api/deliveries";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save delivery");

      toast({
        title: "Success",
        description: editingId
          ? "Delivery updated successfully"
          : "Delivery created successfully",
      });

      setFormData({
        project_name: "",
        deliverables: "",
        delivery_date: "",
        status: "pending",
      });
      setIsAdding(false);
      setEditingId(null);
      await fetchDeliveries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save delivery",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (delivery: Delivery) => {
    setFormData({
      project_name: delivery.project_name,
      deliverables: delivery.deliverables,
      delivery_date: delivery.delivery_date,
      status: delivery.status,
    });
    setEditingId(delivery.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this delivery?")) return;

    try {
      const response = await fetch(`/api/deliveries/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete delivery");

      toast({
        title: "Success",
        description: "Delivery deleted successfully",
      });

      await fetchDeliveries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete delivery",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      project_name: "",
      deliverables: "",
      delivery_date: "",
      status: "pending",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Deliveries</h1>
              <p className="text-muted-foreground">
                Manage project deliverables and delivery dates
              </p>
            </div>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Delivery
              </Button>
            )}
          </div>

          {isAdding && (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Delivery" : "New Delivery"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Project Name *
                    </label>
                    <Input
                      value={formData.project_name}
                      onChange={(e) =>
                        setFormData({ ...formData, project_name: e.target.value })
                      }
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Deliverables *
                    </label>
                    <Textarea
                      value={formData.deliverables}
                      onChange={(e) =>
                        setFormData({ ...formData, deliverables: e.target.value })
                      }
                      placeholder="Describe the deliverables (one per line or comma-separated)"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Delivery Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) =>
                        setFormData({ ...formData, delivery_date: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delayed">Delayed</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingId ? "Update" : "Create"} Delivery
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>All Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : deliveries.length === 0 ? (
                <p className="text-muted-foreground">
                  No deliveries yet. Create one to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project Name</TableHead>
                        <TableHead>Deliverables</TableHead>
                        <TableHead>Delivery Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell className="font-medium">
                            {delivery.project_name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {delivery.deliverables}
                          </TableCell>
                          <TableCell>
                            {new Date(delivery.delivery_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                delivery.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : delivery.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : delivery.status === "delayed"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {delivery.status}
                            </span>
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <button
                              onClick={() => handleEdit(delivery)}
                              className="p-1 hover:bg-muted rounded"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(delivery.id)}
                              className="p-1 hover:bg-muted rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
