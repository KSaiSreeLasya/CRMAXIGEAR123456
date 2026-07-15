import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { hydrateAuthTokenFromSupabase, isAuthenticated, setEmployeeSession } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!error) {
          if (data.session?.access_token) {
            localStorage.setItem("auth_token", data.session.access_token);
          } else {
            await hydrateAuthTokenFromSupabase();
          }
          if (!isAuthenticated()) {
            throw new Error(
              "Sign-in did not return a session. Confirm your email in Supabase or try again.",
            );
          }
          localStorage.removeItem("offline_user_email");
          navigate("/dashboard", { replace: true });
          return;
        }

        // Employee login fallback (email + password managed by Admin module)
        const { data: employeeData, error: employeeError } = await supabase.rpc("employee_login", {
          p_email: email,
          p_password: password,
        });
        if (employeeError) throw employeeError;
        const employee = employeeData?.[0];
        if (!employee) throw error;

        localStorage.removeItem("offline_user_email");
        setEmployeeSession({
          employeeId: employee.employee_id,
          employeeName: employee.employee_name,
          employeeRole: employee.employee_role || "Employee",
          email: email.trim().toLowerCase(),
          isAdmin: employee.employee_role === "Admin",
        });
        navigate("/dashboard", { replace: true });
      } else {
        localStorage.removeItem("employee_session");
        localStorage.setItem("offline_user_email", email.trim().toLowerCase());
        localStorage.setItem("auth_token", "offline-" + Date.now());
        navigate("/dashboard", { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-lg border border-border shadow-lg p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fe8b0f34e11e04fd5ad5fe77ca26e5a4c%2F898bd506bd194b53a5eda248601c50c7?format=webp&width=64&height=64"
              alt="AXIGEAR"
              className="w-12 h-12 mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold">AXIGEAR CRM</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? "Loading..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
