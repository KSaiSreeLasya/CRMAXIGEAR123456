import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Edit, FileText, ArrowLeft, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CreateProjectModal from "@/components/CreateProjectModal";
import EditProjectModal from "@/components/EditProjectModal";
import { supabase } from "@/lib/supabase";
import { ImportExport } from "@/components/ImportExport";
import { SplitPaymentForm, type SplitPayment } from "@/components/SplitPaymentForm";
import { PaymentHistoryDisplay } from "@/components/PaymentHistoryDisplay";
import { createTransaction, getTransactionByReference, getSplitPaymentsByReference, updateTransaction, ensureSplitPaymentsMigrated } from "@/lib/transactions";
import { getCurrentUser } from "@/lib/auth";
import { deductInventoryForSale, restoreInventoryForDeletedSale } from "@/lib/inventory";

interface EstimationRecord {
  id: string;
  estimationSlipNo: string;
  customerName: string;
  contactNo: string;
  address: string;
  estimationDate: string;
  model: string;
  amount: number;
  modeOfPayment: string;
  leadSource: string;
  splitPayments?: SplitPayment[];
  createdAt: string;
}

const DEFAULT_ESTIMATION_FORM = {
  estimationSlipNo: "",
  customerName: "",
  contactNo: "",
  address: "",
  estimationDate: "",
  model: "",
  amount: "",
  modeOfPayment: "Cash",
  leadSource: "",
};

export interface Project {
  id: string;
  modelNo: string;
  customerName: string;
  contactNo: string;
  location: string;
  productDescription: string;
  hsnNo: string;
  chassisNo: string;
  motorNo: string;
  batteryNo: string;
  batteryWarranty: string;
  batteryCapacity: string;
  vehicleWarranty: string;
  invoiceDate: string;
  amount: number;
  modeOfPayment: string;
  leadSource: string;
  gstNo?: string;
  saleType?: "regular" | "b2b";
  splitPayments?: SplitPayment[];
  showSplitPaymentDetails?: boolean;
  createdAt: string;
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [estimations, setEstimations] = useState<EstimationRecord[]>([]);
  const [estimationForm, setEstimationForm] = useState(DEFAULT_ESTIMATION_FORM);
  const [estimationSplitPayments, setEstimationSplitPayments] = useState<SplitPayment[]>([]);
  const [editingEstimationId, setEditingEstimationId] = useState<string | null>(null);
  const [isLoadingEstimations, setIsLoadingEstimations] = useState(false);
  const [isSavingEstimation, setIsSavingEstimation] = useState(false);
  const [saleTypeFilter, setSaleTypeFilter] = useState<"regular" | "b2b">("regular");

  // Load projects and estimations from Supabase on mount
  useEffect(() => {
    loadProjects();
    loadEstimations();

    // Subscribe to real-time changes in projects
    if (supabase) {
      const projectsSubscription = supabase
        .channel('projects-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
          loadProjects();
        })
        .subscribe();

      const estimationsSubscription = supabase
        .channel('estimations-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'estimations' }, () => {
          loadEstimations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(projectsSubscription);
        supabase.removeChannel(estimationsSubscription);
      };
    }
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('projects')
            .select('*', { count: 'estimated' })
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Supabase select error:', error);
            throw error;
          }

          const formattedProjects = data?.map((project: any) => ({
            id: project.id,
            modelNo: project.model_no || "",
            customerName: project.customer_name,
            contactNo: project.contact_no,
            location: project.location,
            productDescription: project.product_description,
            hsnNo: project.hsn_no,
            chassisNo: project.chassis_no,
            motorNo: project.motor_no || "",
            batteryNo: project.battery_no || "",
            batteryWarranty: project.battery_warranty || "",
            batteryCapacity: project.battery_capacity || "",
            vehicleWarranty: project.vehicle_warranty || "",
            invoiceDate: project.invoice_date || "",
            amount: project.amount,
            modeOfPayment: project.mode_of_payment || "Cash",
            leadSource: project.lead_source || "",
            gstNo: project.gst_no || "",
            saleType: project.sale_type || "regular",
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
        const parsed = JSON.parse(savedProjects) as Project[];
        setProjects(
          parsed.map((p) => ({
            ...p,
            batteryWarranty: p.batteryWarranty ?? "",
            batteryCapacity: p.batteryCapacity ?? "",
            vehicleWarranty: p.vehicleWarranty ?? "",
            modeOfPayment: p.modeOfPayment ?? "Cash",
            leadSource: p.leadSource ?? "",
          })),
        );
      }
    } catch (error) {
      console.error("Error in loadProjects:", error);
      // Silent fail - projects will remain empty
    } finally {
      setIsLoading(false);
    }
  };

  const loadEstimations = async () => {
    setIsLoadingEstimations(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("estimations")
            .select("*", { count: 'estimated' })
            .order("created_at", { ascending: false });
          if (error) {
            console.error('Supabase estimations select error:', error);
            throw error;
          }
          const rows: EstimationRecord[] =
            data?.map((row: any) => ({
              id: row.id,
              estimationSlipNo: row.estimation_slip_no || "",
              customerName: row.customer_name || "",
              contactNo: row.contact_no || "",
              address: row.address || "",
              estimationDate: row.estimation_date || "",
              model: row.model || "",
              amount: row.amount || 0,
              modeOfPayment: row.mode_of_payment || "Cash",
              leadSource: row.lead_source || "",
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
        address: estimationForm.address.trim(),
        estimationDate: estimationForm.estimationDate,
        model: estimationForm.model.trim(),
        amount,
        modeOfPayment: estimationForm.modeOfPayment,
        leadSource: estimationForm.leadSource.trim(),
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
                address: payload.address,
                estimation_date: payload.estimationDate,
                model: payload.model,
                amount: payload.amount,
                mode_of_payment: payload.modeOfPayment,
                lead_source: payload.leadSource,
              })
              .eq("id", editingEstimationId);
            if (error) throw error;

            // Update split payments if they exist
            const transaction = await getTransactionByReference("estimation", editingEstimationId);
            if (transaction) {
              await updateTransaction(transaction.id, estimationSplitPayments);
            } else if (estimationSplitPayments.length > 0) {
              // Create transaction if it doesn't exist
              await createTransaction("estimation", editingEstimationId, payload.amount, estimationSplitPayments);
            }
          } catch (supabaseError: any) {
            console.error("Error updating estimation in Supabase:", supabaseError?.message);
          }
        }

        const updated = estimations.map((item) =>
          item.id === editingEstimationId
            ? { ...item, ...payload, createdAt: item.createdAt }
            : item
        );
        setEstimations(updated);
        localStorage.setItem("crm_estimations", JSON.stringify(updated));
      } else {
        let created: EstimationRecord;
        if (supabase) {
          try {
            const { data: userData } = await supabase.auth.getUser();

            const { data, error } = await supabase
              .from("estimations")
              .insert([
                {
                  user_id: userData.user?.id || null,
                  estimation_slip_no: payload.estimationSlipNo,
                  customer_name: payload.customerName,
                  contact_no: payload.contactNo,
                  address: payload.address,
                  estimation_date: payload.estimationDate || null,
                  model: payload.model,
                  amount: payload.amount,
                  mode_of_payment: payload.modeOfPayment,
                  lead_source: payload.leadSource,
                },
              ])
              .select('*');
            if (error) {
              console.error('Supabase estimation insert error:', error);
              throw error;
            }
            created = {
              id: data[0].id,
              ...payload,
              createdAt: new Date().toLocaleDateString(),
            };

            // Create transaction with split payments
            if (estimationSplitPayments.length > 0) {
              await createTransaction(
                "estimation",
                data[0].id,
                payload.amount,
                estimationSplitPayments
              );
            }

            setEstimations((prev) => [created, ...prev]);
          } catch (supabaseError: any) {
            console.error("Error creating estimation in Supabase:", supabaseError?.message);
            created = {
              id: `estimation_${Date.now()}`,
              ...payload,
              createdAt: new Date().toLocaleDateString(),
            };
            const updated = [created, ...estimations];
            setEstimations(updated);
            localStorage.setItem("crm_estimations", JSON.stringify(updated));
          }
        } else {
          created = {
            id: `estimation_${Date.now()}`,
            ...payload,
            createdAt: new Date().toLocaleDateString(),
          };
          const updated = [created, ...estimations];
          setEstimations(updated);
          localStorage.setItem("crm_estimations", JSON.stringify(updated));
        }
      }

      setEstimationForm(DEFAULT_ESTIMATION_FORM);
      setEstimationSplitPayments([]);
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
          console.error("Error deleting estimation in Supabase:", supabaseError?.message);
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

  const handleEditEstimation = async (item: EstimationRecord) => {
    setEditingEstimationId(item.id);

    // Load split payments from Supabase first, fallback to localStorage
    let splitPayments = await getSplitPaymentsByReference("estimation", item.id);

    // If no payments in Supabase, check if item has splitPayments from localStorage
    if (splitPayments.length === 0 && item.splitPayments && item.splitPayments.length > 0) {
      splitPayments = item.splitPayments;
      // Migrate to Supabase if they exist in localStorage but not in Supabase
      await ensureSplitPaymentsMigrated("estimation", item.id, item.amount, splitPayments);
    }

    setEstimationSplitPayments(splitPayments);
    setEstimationForm({
      estimationSlipNo: item.estimationSlipNo,
      customerName: item.customerName,
      contactNo: item.contactNo,
      address: item.address,
      estimationDate: item.estimationDate,
      model: item.model,
      amount: String(item.amount),
      modeOfPayment: item.modeOfPayment,
      leadSource: item.leadSource,
    });
  };

  const cancelEditEstimation = () => {
    setEditingEstimationId(null);
    setEstimationForm(DEFAULT_ESTIMATION_FORM);
    setEstimationSplitPayments([]);
  };

  const handleCreateProject = async (newProject: Omit<Project, "id" | "createdAt">, splitPayments?: SplitPayment[]) => {
    try {
      const createdProject: Project = {
        id: `project_${Date.now()}`,
        modelNo: newProject.modelNo || "",
        customerName: newProject.customerName,
        contactNo: newProject.contactNo,
        location: newProject.location,
        productDescription: newProject.productDescription,
        hsnNo: newProject.hsnNo,
        chassisNo: newProject.chassisNo,
        motorNo: newProject.motorNo,
        batteryNo: newProject.batteryNo,
        batteryWarranty: newProject.batteryWarranty,
        batteryCapacity: newProject.batteryCapacity,
        vehicleWarranty: newProject.vehicleWarranty,
        invoiceDate: newProject.invoiceDate,
        amount: newProject.amount,
        modeOfPayment: newProject.modeOfPayment,
        leadSource: newProject.leadSource,
        saleType: newProject.saleType,
        splitPayments: splitPayments,
        showSplitPaymentDetails: newProject.showSplitPaymentDetails,
        createdAt: new Date().toLocaleDateString(),
      };

      if (supabase) {
          const user = await getCurrentUser();
          if (!user) {
            throw new Error("Your session has expired. Please sign in with your Supabase account and try again.");
          }

          const { data, error } = await supabase
            .from('projects')
            .insert([
              {
                user_id: user.id,
                model_no: newProject.modelNo || null,
                customer_name: newProject.customerName,
                contact_no: newProject.contactNo,
                location: newProject.location,
                product_description: newProject.productDescription,
                hsn_no: newProject.hsnNo,
                chassis_no: newProject.chassisNo,
                motor_no: newProject.motorNo || null,
                battery_no: newProject.batteryNo || null,
                battery_warranty: newProject.batteryWarranty || null,
                battery_capacity: newProject.batteryCapacity || null,
                vehicle_warranty: newProject.vehicleWarranty || null,
                invoice_date: newProject.invoiceDate || null,
                amount: newProject.amount,
                mode_of_payment: newProject.modeOfPayment,
                lead_source: newProject.leadSource || null,
                gst_no: newProject.gstNo || null,
                sale_type: newProject.saleType || "regular",
                show_split_payment_details: newProject.showSplitPaymentDetails ?? false,
              }
            ])
            .select('*');

          if (error) {
            console.error('Supabase insert error:', error);
            throw error;
          }

          const dbProject: Project = {
            id: data[0].id,
            modelNo: data[0].model_no || "",
            customerName: data[0].customer_name,
            contactNo: data[0].contact_no,
            location: data[0].location,
            productDescription: data[0].product_description,
            hsnNo: data[0].hsn_no,
            chassisNo: data[0].chassis_no,
            motorNo: data[0].motor_no || "",
            batteryNo: data[0].battery_no || "",
            batteryWarranty: data[0].battery_warranty || "",
            batteryCapacity: data[0].battery_capacity || "",
            vehicleWarranty: data[0].vehicle_warranty || "",
            invoiceDate: data[0].invoice_date || "",
            amount: data[0].amount,
            modeOfPayment: data[0].mode_of_payment || "Cash",
            leadSource: data[0].lead_source || "",
            gstNo: data[0].gst_no || "",
            saleType: data[0].sale_type || "regular",
            splitPayments: splitPayments,
            showSplitPaymentDetails: data[0].show_split_payment_details ?? false,
            createdAt: new Date(data[0].created_at).toLocaleDateString(),
          };

          // Create transaction with split payments
          if (splitPayments && splitPayments.length > 0) {
            try {
              await createTransaction(
                "project",
                data[0].id,
                newProject.amount,
                splitPayments
              );
            } catch (txError) {
              console.error("Error creating transaction for project:", txError);
              // Continue even if transaction creation fails
            }
          }

          // Deduct inventory for this sale if chassis number is provided
          if (newProject.chassisNo) {
            await deductInventoryForSale(newProject.modelNo, newProject.chassisNo);
          }

          setProjects([dbProject, ...projects]);
          setIsModalOpen(false);
          return;
      }

      const updatedProjects = [createdProject, ...projects];
      localStorage.setItem("crm_projects", JSON.stringify(updatedProjects));
      setProjects(updatedProjects);

      // Deduct inventory for this sale if chassis number is provided
      if (newProject.chassisNo) {
        await deductInventoryForSale(newProject.modelNo, newProject.chassisNo);
      }

      setIsModalOpen(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error);
      console.error("Error creating project:", errorMessage);
      alert(`Failed to create project: ${errorMessage}`);
    }
  };

  const handleUpdateProject = async (id: string, updatedData: Omit<Project, "id" | "createdAt">) => {
    try {
      // Get the original project to track chassis changes
      const originalProject = projects.find((p) => p.id === id);
      const chassisChanged = originalProject && originalProject.chassisNo !== updatedData.chassisNo;

      if (supabase) {
        try {
          const { error } = await supabase
            .from('projects')
            .update({
              customer_name: updatedData.customerName,
              model_no: updatedData.modelNo || null,
              contact_no: updatedData.contactNo,
              location: updatedData.location,
              product_description: updatedData.productDescription,
              hsn_no: updatedData.hsnNo,
              chassis_no: updatedData.chassisNo,
              motor_no: updatedData.motorNo || null,
              battery_no: updatedData.batteryNo || null,
              battery_warranty: updatedData.batteryWarranty || null,
              battery_capacity: updatedData.batteryCapacity || null,
              vehicle_warranty: updatedData.vehicleWarranty || null,
              invoice_date: updatedData.invoiceDate || null,
              amount: updatedData.amount,
              mode_of_payment: updatedData.modeOfPayment,
              lead_source: updatedData.leadSource || null,
              gst_no: updatedData.gstNo || null,
              sale_type: updatedData.saleType || "regular",
              show_split_payment_details: updatedData.showSplitPaymentDetails ?? false,
            })
            .eq('id', id);

          if (error) throw error;

          // Handle split payments update
          if (updatedData.splitPayments && updatedData.splitPayments.length > 0) {
            try {
              const transaction = await getTransactionByReference("project", id);
              if (transaction) {
                await updateTransaction(transaction.id, updatedData.splitPayments);
              } else {
                await createTransaction("project", id, updatedData.amount, updatedData.splitPayments);
              }
            } catch (txError) {
              console.error("Error updating transaction for project:", txError);
            }
          }
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

      // Handle inventory changes if chassis was modified
      if (chassisChanged && originalProject) {
        if (originalProject.chassisNo) {
          // Restore the old chassis to inventory
          await restoreInventoryForDeletedSale(originalProject.modelNo, originalProject.chassisNo);
        }
        if (updatedData.chassisNo) {
          // Deduct the new chassis from inventory
          await deductInventoryForSale(updatedData.modelNo, updatedData.chassisNo);
        }
      }

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
      // Find the project to get its details before deletion
      const projectToDelete = projects.find((p) => p.id === id);

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

      // Restore inventory for this deleted sale if chassis number exists
      if (projectToDelete && projectToDelete.chassisNo) {
        await restoreInventoryForDeletedSale(projectToDelete.modelNo, projectToDelete.chassisNo);
      }
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

  const handleImportProjects = async (importedItems: Record<string, any>[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;

      const newProjects: Project[] = [];
      const projectsToInsert = importedItems.map((item) => ({
        user_id: userId,
        model_no: item.modelNo || null,
        customer_name: item.customerName,
        contact_no: item.contactNo,
        location: item.location,
        product_description: item.productDescription,
        hsn_no: item.hsnNo,
        chassis_no: item.chassisNo,
        motor_no: item.motorNo || null,
        battery_no: item.batteryNo || null,
        battery_warranty: item.batteryWarranty || null,
        battery_capacity: item.batteryCapacity || null,
        vehicle_warranty: item.vehicleWarranty || null,
        invoice_date: item.invoiceDate,
        amount: Number(item.amount || 0),
        mode_of_payment: item.modeOfPayment || "Cash",
        lead_source: item.leadSource || null,
      }));

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("projects")
            .insert(projectsToInsert)
            .select();

          if (error) throw error;

          data?.forEach((row: any) => {
            newProjects.push({
              id: row.id,
              modelNo: row.model_no || "",
              customerName: row.customer_name,
              contactNo: row.contact_no,
              location: row.location,
              productDescription: row.product_description,
              hsnNo: row.hsn_no,
              chassisNo: row.chassis_no,
              motorNo: row.motor_no || "",
              batteryNo: row.battery_no || "",
              batteryWarranty: row.battery_warranty || "",
              batteryCapacity: row.battery_capacity || "",
              vehicleWarranty: row.vehicle_warranty || "",
              invoiceDate: row.invoice_date || "",
              amount: row.amount,
              modeOfPayment: row.mode_of_payment || "Cash",
              leadSource: row.lead_source || "",
              createdAt: new Date(row.created_at).toLocaleDateString(),
            });
          });
        } catch (supabaseError: any) {
          console.warn("Supabase insert failed, using localStorage:", supabaseError?.message);
          importedItems.forEach((item) => {
            const project: Project = {
              id: `project_${Date.now()}_${Math.random()}`,
              modelNo: item.modelNo || "",
              customerName: item.customerName,
              contactNo: item.contactNo,
              location: item.location,
              productDescription: item.productDescription,
              hsnNo: item.hsnNo,
              chassisNo: item.chassisNo,
              motorNo: item.motorNo || "",
              batteryNo: item.batteryNo || "",
              batteryWarranty: item.batteryWarranty || "",
              batteryCapacity: item.batteryCapacity || "",
              vehicleWarranty: item.vehicleWarranty || "",
              invoiceDate: item.invoiceDate,
              amount: Number(item.amount || 0),
              modeOfPayment: item.modeOfPayment || "Cash",
              leadSource: item.leadSource || "",
              createdAt: new Date().toLocaleDateString(),
            };
            newProjects.push(project);
          });
        }
      }

      const updated = [...newProjects, ...projects];
      setProjects(updated);
      localStorage.setItem("crm_projects", JSON.stringify(updated));
      alert(`Successfully imported ${newProjects.length} project(s)`);
    } catch (error: any) {
      console.error("Error importing projects:", error);
      throw error;
    }
  };

  const handleImportEstimations = async (importedItems: Record<string, any>[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;

      const newEstimations: EstimationRecord[] = [];
      const estimationsToInsert = importedItems.map((item) => ({
        user_id: userId,
        estimation_slip_no: item.estimationSlipNo,
        customer_name: item.customerName,
        contact_no: item.contactNo,
        address: item.address,
        estimation_date: item.estimationDate,
        model: item.model,
        amount: Number(item.amount || 0),
        mode_of_payment: item.modeOfPayment || "Cash",
        lead_source: item.leadSource || null,
      }));

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("estimations")
            .insert(estimationsToInsert)
            .select();

          if (error) throw error;

          data?.forEach((row: any) => {
            newEstimations.push({
              id: row.id,
              estimationSlipNo: row.estimation_slip_no || "",
              customerName: row.customer_name || "",
              contactNo: row.contact_no || "",
              address: row.address || "",
              estimationDate: row.estimation_date || "",
              model: row.model || "",
              amount: row.amount || 0,
              modeOfPayment: row.mode_of_payment || "Cash",
              leadSource: row.lead_source || "",
              createdAt: new Date(row.created_at).toLocaleDateString(),
            });
          });
        } catch (supabaseError: any) {
          console.warn("Supabase insert failed, using localStorage:", supabaseError?.message);
          importedItems.forEach((item) => {
            const estimation: EstimationRecord = {
              id: `estimation_${Date.now()}_${Math.random()}`,
              estimationSlipNo: item.estimationSlipNo,
              customerName: item.customerName,
              contactNo: item.contactNo,
              address: item.address,
              estimationDate: item.estimationDate,
              model: item.model,
              amount: Number(item.amount || 0),
              modeOfPayment: item.modeOfPayment || "Cash",
              leadSource: item.leadSource || "",
              createdAt: new Date().toLocaleDateString(),
            };
            newEstimations.push(estimation);
          });
        }
      }

      const updated = [...newEstimations, ...estimations];
      setEstimations(updated);
      localStorage.setItem("crm_estimations", JSON.stringify(updated));
      alert(`Successfully imported ${newEstimations.length} estimation(s)`);
    } catch (error: any) {
      console.error("Error importing estimations:", error);
      throw error;
    }
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Sales</h1>
              <p className="text-muted-foreground">
                Create and manage EV bike sales entries, invoices, and retailer accounts.
              </p>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="w-4 h-4" />
              Add sale
            </Button>
          </div>

          {/* Tabbed content */}
          <Tabs defaultValue="projects" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg max-w-sm">
              <TabsTrigger value="projects" className="data-[state=active]:bg-background">Projects</TabsTrigger>
              <TabsTrigger value="sales" className="data-[state=active]:bg-background">Sales Pipeline</TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold mb-4">Import/Export Projects</h2>
                <ImportExport
                  data={projects}
                  onImport={handleImportProjects}
                  dataType="projects"
                  exportHeaders={["modelNo", "customerName", "contactNo", "location", "productDescription", "hsnNo", "chassisNo", "motorNo", "batteryNo", "batteryWarranty", "batteryCapacity", "vehicleWarranty", "invoiceDate", "amount", "modeOfPayment", "leadSource"]}
                  filename="projects.csv"
                  title="Sales Projects"
                />
              </div>

              {isLoading ? (
                <div className="bg-card rounded-lg border border-border p-12 text-center">
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-2xl font-semibold">Loading sales...</h2>
                  </div>
                </div>
              ) : projects.length === 0 ? (
                <div className="bg-card rounded-lg border border-border p-12 text-center">
                  <div className="space-y-4 max-w-md mx-auto">
                    <h2 className="text-2xl font-semibold">No sales entries yet</h2>
                    <p className="text-muted-foreground">
                      Create your first sales entry to start tracking EV bike opportunities.
                    </p>
                    <Button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add sale
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  {/* Sale Type Filter Tabs */}
                  <Tabs value={saleTypeFilter} onValueChange={(val) => setSaleTypeFilter(val as "regular" | "b2b")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg max-w-xs">
                      <TabsTrigger value="regular" className="data-[state=active]:bg-background">Regular Sales</TabsTrigger>
                      <TabsTrigger value="b2b" className="data-[state=active]:bg-background">B2B Sales</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {projects.filter((p) => (p.saleType || "regular") === saleTypeFilter).length === 0 ? (
                    <div className="bg-card rounded-lg border border-border p-8 text-center">
                      <p className="text-muted-foreground">No {saleTypeFilter === "b2b" ? "B2B" : "regular"} sales yet</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Model No.
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Customer Name
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Contact No
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Location
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs max-w-[120px]">
                          Product
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          HSN
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Chassis
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Motor
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Battery
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Inv. Date
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Amount
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Created
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-foreground text-xs">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.filter((p) => (p.saleType || "regular") === saleTypeFilter).map((project) => (
                        <tr
                          key={project.id}
                          className="border-b border-border hover:bg-muted/50 transition-colors text-xs"
                        >
                          <td className="px-3 py-3 font-mono">{project.modelNo || "-"}</td>
                          <td className="px-3 py-3 font-medium">{project.customerName}</td>
                          <td className="px-3 py-3">{project.contactNo}</td>
                          <td className="px-3 py-3">{project.location}</td>
                          <td className="px-3 py-3 max-w-[120px] truncate" title={project.productDescription}>
                            {project.productDescription}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {project.hsnNo}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {project.chassisNo}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {project.motorNo || "-"}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {project.batteryNo || "-"}
                          </td>
                          <td className="px-3 py-3">
                            {project.invoiceDate || "-"}
                          </td>
                          <td className="px-3 py-3 font-semibold text-success">
                            {formatAmount(project.amount)}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {project.createdAt}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  setEditingProject(project);
                                  setIsEditModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-primary hover:text-primary/90 transition-colors font-medium text-xs whitespace-nowrap"
                                title="Edit project"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </button>
                              <Link to={`/invoice/${project.id}`}>
                                <button className="inline-flex items-center gap-1 text-primary hover:text-primary/90 transition-colors font-medium text-xs whitespace-nowrap">
                                  <FileText className="w-3 h-3" />
                                  Inv
                                </button>
                              </Link>
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="inline-flex items-center gap-1 text-destructive hover:text-destructive/90 transition-colors font-medium text-xs whitespace-nowrap"
                                title="Delete project"
                              >
                                <Trash2 className="w-3 h-3" />
                                Del
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Sales Pipeline Tab */}
            <TabsContent value="sales" className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-semibold mb-4">Import/Export Estimations</h2>
                <ImportExport
                  data={estimations}
                  onImport={handleImportEstimations}
                  dataType="estimations"
                  exportHeaders={["estimationSlipNo", "customerName", "contactNo", "address", "estimationDate", "model", "amount", "modeOfPayment", "leadSource"]}
                  filename="estimations.csv"
                  title="Sales Pipeline Estimations"
                />
              </div>

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
                    placeholder="Address"
                    value={estimationForm.address}
                    onChange={(e) => setEstimationForm((prev) => ({ ...prev, address: e.target.value }))}
                    required
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
                  <select
                    className="px-4 py-2 border border-border rounded-lg bg-background"
                    value={estimationForm.modeOfPayment}
                    onChange={(e) => setEstimationForm((prev) => ({ ...prev, modeOfPayment: e.target.value }))}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bajaj">Bajaj</option>
                    <option value="NEFT">NEFT</option>
                  </select>
                  <input
                    className="px-4 py-2 border border-border rounded-lg bg-background"
                    placeholder="Lead Source"
                    value={estimationForm.leadSource}
                    onChange={(e) => setEstimationForm((prev) => ({ ...prev, leadSource: e.target.value }))}
                  />

                  <div className="md:col-span-2 border border-border rounded-lg p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-sm mb-4">Payment Breakdown (Split Payments)</h3>
                      <SplitPaymentForm
                        totalAmount={parseFloat(estimationForm.amount as string) || 0}
                        initialPayments={estimationSplitPayments}
                        onPaymentsChange={(payments) => setEstimationSplitPayments(payments)}
                      />
                    </div>

                    {estimationSplitPayments.length > 0 && (
                      <div className="border-t border-border pt-4">
                        <h4 className="font-semibold text-sm mb-4">Payment History</h4>
                        <PaymentHistoryDisplay
                          payments={estimationSplitPayments}
                          totalAmount={parseFloat(estimationForm.amount as string) || 0}
                        />
                      </div>
                    )}
                  </div>

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
                    <table className="w-full min-w-[1200px] text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-2 text-left">Slip No</th>
                          <th className="px-4 py-2 text-left">Customer</th>
                          <th className="px-4 py-2 text-left">Contact</th>
                          <th className="px-4 py-2 text-left">Address</th>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Model</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                          <th className="px-4 py-2 text-left">Payment Mode</th>
                          <th className="px-4 py-2 text-left">Lead Source</th>
                          <th className="px-4 py-2 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimations.map((est) => (
                          <tr key={est.id} className="border-b border-border">
                            <td className="px-4 py-2">{est.estimationSlipNo}</td>
                            <td className="px-4 py-2">{est.customerName}</td>
                            <td className="px-4 py-2">{est.contactNo}</td>
                            <td className="px-4 py-2">{est.address}</td>
                            <td className="px-4 py-2">{est.estimationDate}</td>
                            <td className="px-4 py-2">{est.model}</td>
                            <td className="px-4 py-2 text-right font-semibold">₹{est.amount.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm">{est.modeOfPayment}</td>
                            <td className="px-4 py-2 text-sm">{est.leadSource || "-"}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-3">
                                <Link
                                  to={`/estimation-slip/${est.id}`}
                                  className="inline-flex items-center gap-1 text-primary hover:text-primary/90"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Link>
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
