import Layout from "@/components/Layout";
import { BarChart3, Briefcase, CalendarCheck2, Boxes, ShieldCheck, Wrench, Users, Receipt, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UpcomingDelivery {
  id: string;
  project_name: string;
  delivery_date: string;
  deliverables: string;
}

export default function Dashboard() {
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<UpcomingDelivery[]>([]);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(true);

  useEffect(() => {
    fetchUpcomingDeliveries();
  }, []);

  const fetchUpcomingDeliveries = async () => {
    setIsLoadingDeliveries(true);
    try {
      if (supabase) {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('deliveries')
          .select('id, project_name, delivery_date, deliverables')
          .eq('status', 'pending')
          .gte('delivery_date', today)
          .lte('delivery_date', sevenDaysLater)
          .order('delivery_date', { ascending: true });

        if (error) {
          console.warn("Could not fetch upcoming deliveries:", error?.message);
          setUpcomingDeliveries([]);
        } else {
          setUpcomingDeliveries(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching upcoming deliveries:", error);
      setUpcomingDeliveries([]);
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Choose a module to continue.
            </p>
          </div>

          {!isLoadingDeliveries && upcomingDeliveries.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <Truck className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">Upcoming Deliveries (Next 7 Days)</h3>
                  <p className="text-sm text-orange-800 mt-1">
                    You have <strong>{upcomingDeliveries.length}</strong> delivery(ies) scheduled in the next 7 days.
                  </p>
                </div>
              </div>
              <div className="ml-9 space-y-2 max-h-48 overflow-y-auto">
                {upcomingDeliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-white rounded p-3 border border-orange-100 text-sm">
                    <div className="font-semibold text-orange-900">{delivery.project_name}</div>
                    <div className="text-orange-700 text-xs">
                      {new Date(delivery.delivery_date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-orange-600 text-xs mt-1">{delivery.deliverables}</div>
                  </div>
                ))}
              </div>
              <Link
                to="/delivery"
                className="inline-block mt-3 text-sm font-semibold text-orange-700 hover:text-orange-900 underline"
              >
                View all deliveries →
              </Link>
            </div>
          )}

          {/* Modules Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl">
            <Link
              to="/projects"
              className="rounded-lg border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-primary/10 p-3 text-primary">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">SALES</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage account entries and invoices.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/project-analysis"
              className="rounded-lg border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-indigo-100 p-3 text-indigo-700">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">PROJECT ANALYSIS</h2>
                  <p className="text-sm text-muted-foreground">
                    Compare project sales with inventory cost prices.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/attendance"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-blue-100 p-3 text-blue-700">
                  <CalendarCheck2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">ATTENDANCE</h2>
                  <p className="text-sm text-muted-foreground">
                    Mark daily attendance and track status.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/inventory"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-amber-100 p-3 text-amber-700">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">INVENTORY</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage vehicle stock, battery count and closing stock.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/service-invoice"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-orange-100 p-3 text-orange-700">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">SERVICE</h2>
                  <p className="text-sm text-muted-foreground">
                    Create and manage service invoices with PDF export.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/dealers"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-violet-100 p-3 text-violet-700">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">DEALERS</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage dealers and their products.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/dealer-invoice"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-cyan-100 p-3 text-cyan-700">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">DEALER INVOICE</h2>
                  <p className="text-sm text-muted-foreground">
                    Create and manage dealer product invoices.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin-employees"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-emerald-100 p-3 text-emerald-700">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">ADMIN</h2>
                  <p className="text-sm text-muted-foreground">
                    Add and manage employees from one place.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/delivery"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-pink-100 p-3 text-pink-700">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">DELIVERY</h2>
                  <p className="text-sm text-muted-foreground">
                    Track deliverables and delivery dates.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
