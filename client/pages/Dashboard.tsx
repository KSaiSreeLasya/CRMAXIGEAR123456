import Layout from "@/components/Layout";
import { Briefcase, CalendarCheck2, Boxes, ShieldCheck, Wrench, Users, Receipt, Truck, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {

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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">Gatekeeper Function</h3>
              <p className="text-sm text-blue-800">
                The CRM acts as a gatekeeper for incoming dealer shipments. Visit the <strong>INVENTORY</strong> module and open the <strong>"Incoming Shipments"</strong> tab to review and manage pending dealer requests.
              </p>
            </div>
          </div>

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
