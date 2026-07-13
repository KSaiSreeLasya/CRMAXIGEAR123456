import { supabase } from "./supabase";

const EMPLOYEE_SESSION_KEY = "employee_session";

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem("auth_token");
  return !!token;
};

/** Copy Supabase session access token into auth_token so ProtectedRoute stays in sync. */
export async function clearInvalidSupabaseSession(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: "local" });
  if (!localStorage.getItem("auth_token")?.startsWith("employee-")) {
    localStorage.removeItem("auth_token");
  }
}

export async function hydrateAuthTokenFromSupabase(): Promise<void> {
  if (!supabase) return;
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    await clearInvalidSupabaseSession();
    return;
  }
  if (session?.access_token) {
    localStorage.setItem("auth_token", session.access_token);
  }
}

export const logout = (): void => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem(EMPLOYEE_SESSION_KEY);
  if (supabase) {
    supabase.auth.signOut();
  }
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    await clearInvalidSupabaseSession();
    return null;
  }
  return data.user;
};

export const setEmployeeSession = (session: {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  isAdmin?: boolean;
}) => {
  localStorage.setItem("auth_token", `employee-${session.employeeId}`);
  localStorage.setItem(EMPLOYEE_SESSION_KEY, JSON.stringify(session));
};

export const getEmployeeSession = (): {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  isAdmin?: boolean;
} | null => {
  const raw = localStorage.getItem(EMPLOYEE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const isAdminUser = (): boolean => {
  const employeeSession = getEmployeeSession();
  if (!employeeSession) {
    // Supabase user with access token is treated as admin
    return !!localStorage.getItem("auth_token");
  }
  // Admin if employee has Admin role or isAdmin flag
  return employeeSession.isAdmin === true || employeeSession.employeeRole === "Admin";
};
