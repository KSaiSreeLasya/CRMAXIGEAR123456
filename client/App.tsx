import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Accounts from "./pages/Accounts";
import Sales from "./pages/Sales";
import ServiceInvoice from "./pages/ServiceInvoice";
import DealerInvoice from "./pages/DealerInvoice";
import DealersProductInvoice from "./pages/DealersProductInvoice";
import EstimationSlip from "./pages/EstimationSlip";
import Invoice from "./pages/Invoice";
import Attendance from "./pages/Attendance";
import Inventory from "./pages/Inventory";
import Dealers from "./pages/Dealers";
import AdminEmployees from "./pages/AdminEmployees";
import AdminSettings from "./pages/AdminSettings";
import Delivery from "./pages/Delivery";
import NotFound from "./pages/NotFound";
import { hydrateAuthTokenFromSupabase, isAuthenticated } from "./lib/auth";
import { supabase } from "./lib/supabase";
import { useCanonicalUrl } from "./lib/seo";

const queryClient = new QueryClient();

const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  return isAuthenticated() ? element : <Navigate to="/login" replace />;
};

function AppRoutesContent() {
  useCanonicalUrl();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />}
      />
      <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
      <Route path="/projects" element={<ProtectedRoute element={<Projects />} />} />
      <Route path="/accounts" element={<ProtectedRoute element={<Accounts />} />} />
      <Route path="/sales" element={<ProtectedRoute element={<Sales />} />} />
      <Route path="/service-invoice" element={<ProtectedRoute element={<ServiceInvoice />} />} />
      <Route path="/dealer-invoice" element={<ProtectedRoute element={<DealerInvoice />} />} />
      <Route path="/dealers-product-invoice" element={<ProtectedRoute element={<DealersProductInvoice />} />} />
      <Route path="/attendance" element={<ProtectedRoute element={<Attendance />} />} />
      <Route path="/inventory" element={<ProtectedRoute element={<Inventory />} />} />
      <Route path="/dealers" element={<ProtectedRoute element={<Dealers />} />} />
      <Route path="/admin-employees" element={<ProtectedRoute element={<AdminEmployees />} />} />
      <Route path="/admin-settings" element={<ProtectedRoute element={<AdminSettings />} />} />
      <Route path="/delivery" element={<ProtectedRoute element={<Delivery />} />} />
      <Route
        path="/estimation-slip/:estimationId"
        element={<ProtectedRoute element={<EstimationSlip />} />}
      />
      <Route path="/invoice/:projectId" element={<ProtectedRoute element={<Invoice />} />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AppRoutesContent />
    </BrowserRouter>
  );
}

export const App = () => {
  const [authReady, setAuthReady] = useState(() => !supabase);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    void (async () => {
      await hydrateAuthTokenFromSupabase();
      if (!cancelled) setAuthReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem("auth_token", session.access_token);
      } else {
        const existingToken = localStorage.getItem("auth_token");
        if (!existingToken?.startsWith("employee-")) {
          localStorage.removeItem("auth_token");
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!authReady ? (
          <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <AppRoutes />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
