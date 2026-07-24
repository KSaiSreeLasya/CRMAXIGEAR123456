import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, ArrowLeft, Search as SearchIcon, X, MessageCircle, Eye, Download, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { exportLeadsToExcel, importLeadsFromExcel, LeadImportData } from "@/lib/excel-utils";

interface Lead {
  id: string;
  slno: number;
  date: string;
  customerName: string;
  phoneNo: string;
  remark1: string;
  remark2: string;
  remark3: string;
  createdAt: string;
}

const DEFAULT_LEAD_FORM = {
  date: new Date().toISOString().split('T')[0],
  customerName: "",
  phoneNo: "",
  remark1: "",
  remark2: "",
  remark3: "",
};

const WHATSAPP_MESSAGE = `🌿 Greetings from Axigear Electric Lounge!
Wishing you happiness, good health, and safe journeys.
We are excited to announce the arrival of the latest models at our showroom. Visit us today to explore the latest collection, enjoy a test ride, and experience the future of eco-friendly mobility.
We look forward to welcoming you!
– Team Axigear Electric Lounge`;

export default function Leads() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_LEAD_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadLeads();

    if (supabase) {
      const leadsSubscription = supabase
        .channel('leads-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
          loadLeads();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(leadsSubscription);
      };
    }
  }, []);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Supabase select error:', error);
            throw error;
          }

          const formattedLeads = data?.map((lead: any, index: number) => ({
            id: lead.id,
            slno: index + 1,
            date: new Date(lead.date || lead.created_at).toLocaleDateString(),
            customerName: lead.customer_name,
            phoneNo: lead.phone_no,
            remark1: lead.remark1 || "",
            remark2: lead.remark2 || "",
            remark3: lead.remark3 || "",
            createdAt: new Date(lead.created_at).toLocaleDateString(),
          })) || [];

          setLeads(formattedLeads);
          return;
        } catch (supabaseError) {
          console.error("Error loading leads from Supabase:", supabaseError);
        }
      }

      const savedLeads = localStorage.getItem("crm_leads");
      if (savedLeads) {
        setLeads(JSON.parse(savedLeads));
      }
    } catch (error) {
      console.error("Error in loadLeads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        date: formData.date,
        customerName: formData.customerName.trim(),
        phoneNo: formData.phoneNo.trim(),
        remark1: formData.remark1.trim(),
        remark2: formData.remark2.trim(),
        remark3: formData.remark3.trim(),
      };

      if (editingId) {
        if (supabase) {
          try {
            const { error } = await supabase
              .from('leads')
              .update({
                date: payload.date,
                customer_name: payload.customerName,
                phone_no: payload.phoneNo,
                remark1: payload.remark1,
                remark2: payload.remark2,
                remark3: payload.remark3,
              })
              .eq('id', editingId);

            if (error) throw error;
          } catch (supabaseError) {
            console.error("Error updating lead in Supabase:", supabaseError);
          }
        }

        const updated = leads.map((item) =>
          item.id === editingId
            ? { ...item, ...payload }
            : item
        );
        setLeads(updated);
        localStorage.setItem("crm_leads", JSON.stringify(updated));
      } else {
        let created: Lead;

        if (supabase) {
          try {
            const user = await getCurrentUser();
            if (!user) {
              throw new Error("Your session has expired. Please sign in again.");
            }

            const { data, error } = await supabase
              .from('leads')
              .insert([
                {
                  user_id: user.id,
                  date: payload.date,
                  customer_name: payload.customerName,
                  phone_no: payload.phoneNo,
                  remark1: payload.remark1,
                  remark2: payload.remark2,
                  remark3: payload.remark3,
                },
              ])
              .select('*');

            if (error) {
              console.error('Supabase insert error:', error);
              throw error;
            }

            created = {
              id: data[0].id,
              slno: leads.length + 1,
              date: new Date(data[0].date || new Date()).toLocaleDateString(),
              ...payload,
              createdAt: new Date().toLocaleDateString(),
            };

            setLeads([created, ...leads]);
          } catch (supabaseError: any) {
            console.error("Error creating lead in Supabase:", supabaseError?.message);
            created = {
              id: `lead_${Date.now()}`,
              slno: leads.length + 1,
              date: payload.date,
              ...payload,
              createdAt: new Date().toLocaleDateString(),
            };
            const updated = [created, ...leads];
            setLeads(updated);
            localStorage.setItem("crm_leads", JSON.stringify(updated));
          }
        } else {
          created = {
            id: `lead_${Date.now()}`,
            slno: leads.length + 1,
            date: payload.date,
            ...payload,
            createdAt: new Date().toLocaleDateString(),
          };
          const updated = [created, ...leads];
          setLeads(updated);
          localStorage.setItem("crm_leads", JSON.stringify(updated));
        }
      }

      setFormData(DEFAULT_LEAD_FORM);
      setEditingId(null);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error("Error saving lead:", error);
      alert(error?.message || "Failed to save lead.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Delete this lead?")) return;

    try {
      if (supabase) {
        try {
          const { error } = await supabase.from('leads').delete().eq('id', id);
          if (error) throw error;
        } catch (supabaseError) {
          console.error("Error deleting lead in Supabase:", supabaseError);
        }
      }

      const updated = leads.filter((item) => item.id !== id);
      setLeads(updated);
      localStorage.setItem("crm_leads", JSON.stringify(updated));
      setIsDetailModalOpen(false);
      setSelectedLead(null);
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      alert(error?.message || "Failed to delete lead.");
    }
  };

  const handleEditLead = (lead: Lead) => {
    setFormData({
      date: lead.date,
      customerName: lead.customerName,
      phoneNo: lead.phoneNo,
      remark1: lead.remark1,
      remark2: lead.remark2,
      remark3: lead.remark3,
    });
    setEditingId(lead.id);
    setIsFormOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleCancel = () => {
    setFormData(DEFAULT_LEAD_FORM);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleShareWhatsApp = (lead: Lead) => {
    const phoneWithCountryCode = lead.phoneNo.replace(/[^\d+]/g, '');
    const message = WHATSAPP_MESSAGE;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneWithCountryCode}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleBulkWhatsApp = () => {
    if (filteredLeads.length === 0) {
      alert("No leads to send messages to.");
      return;
    }

    const confirmMessage = `Send WhatsApp message to ${filteredLeads.length} lead(s)?`;
    if (!window.confirm(confirmMessage)) return;

    filteredLeads.forEach((lead, index) => {
      setTimeout(() => {
        handleShareWhatsApp(lead);
      }, index * 500);
    });
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailModalOpen(true);
  };

  const handleExportToExcel = () => {
    if (leads.length === 0) {
      alert("No leads to export.");
      return;
    }
    exportLeadsToExcel(leads);
  };

  const handleImportFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const importedData = await importLeadsFromExcel(file);
      const user = await getCurrentUser();

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const leadsToInsert = importedData.map((item: LeadImportData) => ({
        user_id: user.id,
        date: item['Date'],
        customer_name: item['Customer Name'],
        phone_no: item['Phone No.'],
        remark1: item['Remark 1'] || '',
        remark2: item['Remark 2'] || '',
        remark3: item['Remark 3'] || '',
      }));

      if (supabase) {
        const { error } = await supabase
          .from('leads')
          .insert(leadsToInsert);

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
      }

      await loadLeads();
      alert(`Successfully imported ${leadsToInsert.length} leads!`);
    } catch (error: any) {
      console.error("Error importing leads:", error);
      alert(error?.message || "Failed to import leads. Please check the Excel file format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredLeads = leads.filter((lead) => {
    return searchQuery.toLowerCase() === "" ||
      lead.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phoneNo.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
              <h1 className="text-3xl font-bold mb-2">Leads Required</h1>
              <p className="text-muted-foreground">
                Manage customer information and remarks.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                onClick={handleBulkWhatsApp}
                variant="outline"
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Send to All
              </Button>
              <Button
                onClick={handleExportToExcel}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="gap-2"
                disabled={isImporting}
              >
                <Upload className="w-4 h-4" />
                {isImporting ? "Importing..." : "Import from Excel"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFromExcel}
                style={{ display: 'none' }}
              />
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Lead
              </Button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {isFormOpen && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingId ? "Edit Lead" : "Add New Lead"}
              </h2>
              <form onSubmit={handleSaveLead} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold mb-2">Phone No. *</label>
                  <input
                    type="tel"
                    value={formData.phoneNo}
                    onChange={(e) => setFormData({ ...formData, phoneNo: e.target.value })}
                    placeholder="Enter phone number"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Remark 1</label>
                  <textarea
                    value={formData.remark1}
                    onChange={(e) => setFormData({ ...formData, remark1: e.target.value })}
                    placeholder="Enter first remark"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-vertical"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Remark 2</label>
                  <textarea
                    value={formData.remark2}
                    onChange={(e) => setFormData({ ...formData, remark2: e.target.value })}
                    placeholder="Enter second remark"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-vertical"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-2">Remark 3</label>
                  <textarea
                    value={formData.remark3}
                    onChange={(e) => setFormData({ ...formData, remark3: e.target.value })}
                    placeholder="Enter third remark"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-vertical"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : editingId ? "Update Lead" : "Save Lead"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-2.5 hover:bg-muted/50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search Section */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by customer name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Leads List */}
          {isLoading ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <h2 className="text-2xl font-semibold">Loading leads...</h2>
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <div className="space-y-4 max-w-md mx-auto">
                <h2 className="text-2xl font-semibold">No leads yet</h2>
                <p className="text-muted-foreground">
                  Create your first lead to start tracking customer information.
                </p>
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Lead
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No leads match your search</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Sl.No.
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Phone No.
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Remark 1
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Remark 2
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Remark 3
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-center">{lead.slno}</td>
                        <td className="px-4 py-3 text-sm">{lead.date}</td>
                        <td className="px-4 py-3 font-medium">{lead.customerName}</td>
                        <td className="px-4 py-3 font-mono">{lead.phoneNo}</td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={lead.remark1}>
                          {lead.remark1 || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={lead.remark2}>
                          {lead.remark2 || "-"}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={lead.remark3}>
                          {lead.remark3 || "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {lead.createdAt}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleViewDetails(lead)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors font-medium text-xs whitespace-nowrap"
                              title="View lead details"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <button
                              onClick={() => handleEditLead(lead)}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/90 transition-colors font-medium text-xs whitespace-nowrap"
                              title="Edit lead"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="inline-flex items-center gap-1 text-destructive hover:text-destructive/90 transition-colors font-medium text-xs whitespace-nowrap"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
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
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Lead Details</h2>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedLead(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-lg font-medium">{selectedLead.date}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Sl.No.</p>
                    <p className="text-lg font-medium">{selectedLead.slno}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Customer Name</p>
                    <p className="text-lg font-medium">{selectedLead.customerName}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4 bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                    <p className="text-lg font-medium font-mono">{selectedLead.phoneNo}</p>
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <div className="space-y-3">
                  {selectedLead.remark1 && (
                    <div className="border border-border rounded-lg p-4 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">Remark 1</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedLead.remark1}</p>
                    </div>
                  )}
                  {selectedLead.remark2 && (
                    <div className="border border-border rounded-lg p-4 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">Remark 2</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedLead.remark2}</p>
                    </div>
                  )}
                  {selectedLead.remark3 && (
                    <div className="border border-border rounded-lg p-4 bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">Remark 3</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedLead.remark3}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta Information */}
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Created: {selectedLead.createdAt}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => handleShareWhatsApp(selectedLead)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  title="Share to WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  Share to WhatsApp
                </button>
                <button
                  onClick={() => handleEditLead(selectedLead)}
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors"
                  title="Edit lead"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteLead(selectedLead.id)}
                  className="inline-flex items-center justify-center gap-2 bg-destructive hover:bg-destructive/90 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                  title="Delete lead"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
