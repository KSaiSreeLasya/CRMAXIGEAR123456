import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreateProjectModal from "@/components/CreateProjectModal";
import EditProjectModal from "@/components/EditProjectModal";
import { supabase } from "@/lib/supabase";

export interface Project {
  id: string;
  customerName: string;
  contactNo: string;
  location: string;
  productDescription: string;
  hsnNo: string;
  chassisNo: string;
  amount: number;
  createdAt: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Load projects from Supabase on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const formattedProjects = data?.map((project: any) => ({
            id: project.id,
            customerName: project.customer_name,
            contactNo: project.contact_no,
            location: project.location,
            productDescription: project.product_description,
            hsnNo: project.hsn_no,
            chassisNo: project.chassis_no,
            amount: project.amount,
            createdAt: new Date(project.created_at).toLocaleDateString(),
          })) || [];

          setProjects(formattedProjects);
          return;
        } catch (supabaseError) {
          console.error("Error loading projects from Supabase:", supabaseError);
          // Fall through to localStorage
        }
      }

      // Use localStorage if Supabase is not initialized or failed
      const savedProjects = localStorage.getItem("crm_projects");
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error("Error in loadProjects:", error);
      // Silent fail - projects will remain empty
    }
  };

  const handleCreateProject = async (newProject: Omit<Project, "id" | "createdAt">) => {
    try {
      const createdProject: Project = {
        id: `project_${Date.now()}`,
        customerName: newProject.customerName,
        contactNo: newProject.contactNo,
        location: newProject.location,
        productDescription: newProject.productDescription,
        hsnNo: newProject.hsnNo,
        chassisNo: newProject.chassisNo,
        amount: newProject.amount,
        createdAt: new Date().toLocaleDateString(),
      };

      if (supabase) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user?.id) {
            throw new Error('User not authenticated');
          }

          const { data, error } = await supabase
            .from('projects')
            .insert([
              {
                user_id: userData.user.id,
                customer_name: newProject.customerName,
                contact_no: newProject.contactNo,
                location: newProject.location,
                product_description: newProject.productDescription,
                hsn_no: newProject.hsnNo,
                chassis_no: newProject.chassisNo,
                amount: newProject.amount,
              }
            ])
            .select();

          if (error) throw error;

          const dbProject: Project = {
            id: data[0].id,
            customerName: data[0].customer_name,
            contactNo: data[0].contact_no,
            location: data[0].location,
            productDescription: data[0].product_description,
            hsnNo: data[0].hsn_no,
            chassisNo: data[0].chassis_no,
            amount: data[0].amount,
            createdAt: new Date(data[0].created_at).toLocaleDateString(),
          };

          setProjects([dbProject, ...projects]);
          setIsModalOpen(false);
          return;
        } catch (supabaseError) {
          console.error("Error creating project in Supabase:", supabaseError);
          // Fall through to localStorage
        }
      }

      // Save to localStorage if Supabase is not available or failed
      const updatedProjects = [createdProject, ...projects];
      localStorage.setItem("crm_projects", JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
      setIsModalOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
      console.error("Error creating project:", errorMessage);
      alert(`Failed to create project: ${errorMessage}`);
    }
  };

  const handleUpdateProject = async (id: string, updatedData: Omit<Project, "id" | "createdAt">) => {
    try {
      if (supabase) {
        try {
          const { error } = await supabase
            .from('projects')
            .update({
              customer_name: updatedData.customerName,
              contact_no: updatedData.contactNo,
              location: updatedData.location,
              product_description: updatedData.productDescription,
              hsn_no: updatedData.hsnNo,
              chassis_no: updatedData.chassisNo,
              amount: updatedData.amount,
            })
            .eq('id', id);

          if (error) throw error;
        } catch (supabaseError) {
          console.error("Error updating project in Supabase:", supabaseError);
          // Fall through to localStorage
        }
      }

      // Update local state and localStorage
      const updatedProjects = projects.map((p) =>
        p.id === id
          ? { ...p, ...updatedData }
          : p
      );
      setProjects(updatedProjects);
      localStorage.setItem("crm_projects", JSON.stringify(updatedProjects));

      setIsEditModalOpen(false);
      setEditingProject(null);
    } catch (error: any) {
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
      console.error("Error updating project:", errorMessage);
      alert(`Failed to update project: ${errorMessage}`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      if (supabase) {
        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (supabaseError) {
          console.error("Error deleting project in Supabase:", supabaseError);
          // Fall through to localStorage
        }
      }

      // Update local state and localStorage
      const updatedProjects = projects.filter((p) => p.id !== id);
      setProjects(updatedProjects);
      localStorage.setItem("crm_projects", JSON.stringify(updatedProjects));
    } catch (error: any) {
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
      console.error("Error deleting project:", errorMessage);
      alert(`Failed to delete project: ${errorMessage}`);
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sales</h1>
              <p className="text-muted-foreground">
                Create and manage your EV bike sales entries with retailers.
              </p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Sales
            </Button>
          </div>

          {/* Sales Table */}
          {projects.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <div className="space-y-4 max-w-md mx-auto">
                <h2 className="text-2xl font-semibold">No sales yet</h2>
                <p className="text-muted-foreground">
                  Create your first sales entry to start tracking EV bike sales opportunities.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Sales
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Customer Name
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Contact No
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Product Description
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      HSN No.
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Chassis No.
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">{project.customerName}</td>
                      <td className="px-6 py-4">{project.contactNo}</td>
                      <td className="px-6 py-4">{project.location}</td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        {project.productDescription}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        {project.hsnNo}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">
                        {project.chassisNo}
                      </td>
                      <td className="px-6 py-4 font-semibold text-success">
                        {formatAmount(project.amount)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {project.createdAt}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setIsEditModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 text-primary hover:text-primary/90 transition-colors font-medium text-sm"
                            title="Edit project"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <Link to={`/invoice/${project.id}`}>
                            <button className="inline-flex items-center gap-2 text-primary hover:text-primary/90 transition-colors font-medium text-sm">
                              <FileText className="w-4 h-4" />
                              Invoice
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="inline-flex items-center gap-2 text-destructive hover:text-destructive/90 transition-colors font-medium text-sm"
                            title="Delete project"
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

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProject(null);
        }}
        onUpdateProject={handleUpdateProject}
        project={editingProject}
      />
    </Layout>
  );
}
