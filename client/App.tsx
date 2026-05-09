import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Accounts from "./pages/Accounts";
import EstimationSlip from "./pages/EstimationSlip";
import Invoice from "./pages/Invoice";
import NotFound from "./pages/NotFound";
import { isAuthenticated } from "./lib/auth";

const queryClient = new QueryClient();

const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  return isAuthenticated() ? element : <Navigate to="/login" replace />;
};

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />}
          />
          <Route path="/dashboard" element={<ProtectedRoute element={<Dashboard />} />} />
          <Route path="/projects" element={<ProtectedRoute element={<Projects />} />} />
          <Route path="/accounts" element={<ProtectedRoute element={<Accounts />} />} />
          <Route
            path="/estimation-slip/:estimationId"
            element={<ProtectedRoute element={<EstimationSlip />} />}
          />
          <Route path="/invoice/:projectId" element={<ProtectedRoute element={<Invoice />} />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
