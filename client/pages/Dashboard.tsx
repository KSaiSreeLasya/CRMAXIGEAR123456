import Layout from "@/components/Layout";
import { Briefcase, Calculator } from "lucide-react";
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

          <div className="grid gap-6 sm:grid-cols-2 max-w-3xl">
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
                    Manage sales entries and invoices.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/accounts"
              className="rounded-lg border border-border bg-card p-6 text-left hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-md bg-muted p-3 text-muted-foreground">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">ACCOUNTS</h2>
                  <p className="text-sm text-muted-foreground">
                    Create and manage estimation costs.
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
