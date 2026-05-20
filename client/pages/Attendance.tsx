import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarRange,
  Check,
  ChevronRight,
  ClipboardList,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getEmployeeSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Matches DB check constraint + MODULES_SQL_SETUP.sql */
type AttendanceStatus = "Present" | "Absent" | "Half Day" | "Leave" | "Weekly Off";

interface AttendanceEntry {
  id: string;
  employeeId: string | null;
  employeeName: string;
  attendanceDate: string;
  attendanceTime: string;
  status: AttendanceStatus;
  remark: string;
}

interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
}

interface PayrollRow {
  numPresents: number;
  numWeeklyOffs: number;
  numAbsents: number;
  numLeaves: number;
  paidDays: number;
  grossSalary: number | null;
  netSalary: number | null;
}

interface CellEdit {
  employee: Employee;
  day: number;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseYearMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function dateISO(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function matchesEmployee(record: AttendanceEntry, emp: Employee) {
  if (record.employeeId && record.employeeId === emp.id) return true;
  return (
    !record.employeeId &&
    record.employeeName.trim().toLowerCase() === emp.fullName.trim().toLowerCase()
  );
}

function computeSummary(rows: AttendanceEntry[]): Omit<PayrollRow, "grossSalary" | "netSalary"> {
  let numPresents = 0;
  let numWeeklyOffs = 0;
  let numAbsents = 0;
  let numLeaves = 0;

  for (const r of rows) {
    switch (r.status) {
      case "Present":
      case "Half Day":
        numPresents += 1;
        break;
      case "Absent":
        numAbsents += 1;
        break;
      case "Leave":
        numLeaves += 1;
        break;
      case "Weekly Off":
        numWeeklyOffs += 1;
        break;
      default:
        break;
    }
  }

  const paidDays = numPresents + numLeaves + numWeeklyOffs;
  return { numPresents, numWeeklyOffs, numAbsents, numLeaves, paidDays };
}

function payrollStorageKey(yearMonth: string) {
  return `crm_payroll_${yearMonth}`;
}

function formatMonthDisplay(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const monthName = d.toLocaleString("en-US", { month: "long" });
  return `${monthName}, ${y}`;
}

function DayHeaderLabel({ day }: { day: number }) {
  if (day < 10) {
    return (
      <span className="tabular-nums text-[11px] font-semibold tracking-tight text-foreground/75">{day}</span>
    );
  }
  const s = String(day);
  return (
    <span className="flex flex-col items-center justify-center gap-0 leading-[0.9] tabular-nums">
      <span className="text-[10px] font-semibold text-foreground/75">{s[0]}</span>
      <span className="text-[10px] font-semibold text-foreground/75">{s[1]}</span>
    </span>
  );
}

const summaryHeaderClass =
  "min-w-[4.75rem] max-w-[5.5rem] border-b border-amber-200/80 bg-[#fef9c3] px-1.5 py-2.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-foreground shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-50/95";

const summaryCellClass =
  "border-border/60 bg-amber-50/90 px-1.5 py-2 text-center text-xs font-semibold tabular-nums text-foreground dark:bg-amber-950/25";

export default function Attendance() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollMap, setPayrollMap] = useState<Record<string, PayrollRow>>({});

  const [employeeId, setEmployeeId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceTime, setAttendanceTime] = useState(new Date().toTimeString().slice(0, 5));
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [remark, setRemark] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const now = new Date();
  const [viewYearMonth, setViewYearMonth] = useState(
    `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`,
  );

  const [cellEdit, setCellEdit] = useState<CellEdit | null>(null);

  const { year: viewYear, month: viewMonth } = parseYearMonth(viewYearMonth);
  const dim = daysInMonth(viewYear, viewMonth);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive),
    [employees],
  );

  const loadEmployees = async () => {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("employees")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const rows: Employee[] =
          data?.map((row: any) => ({
            id: row.id,
            fullName: row.full_name,
            email: row.email || "",
            phone: row.phone || "",
            role: row.role || "",
            isActive: row.is_active ?? true,
          })) || [];
        setEmployees(rows);
        return;
      }
      const raw = localStorage.getItem("crm_employees");
      if (raw) setEmployees(JSON.parse(raw));
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadPayrollForMonth = useCallback(async () => {
    const monthStart = `${viewYearMonth}-01`;
    if (supabase) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;

        const { data, error } = await supabase
          .from("employee_monthly_payroll")
          .select("*")
          .eq("year_month", monthStart);
        if (error) throw error;

        const next: Record<string, PayrollRow> = {};
        data?.forEach((row: any) => {
          next[row.employee_id] = {
            numPresents: row.num_presents ?? 0,
            numWeeklyOffs: row.num_weekly_offs ?? 0,
            numAbsents: row.num_absents ?? 0,
            numLeaves: row.num_leaves ?? 0,
            paidDays: row.paid_days ?? 0,
            grossSalary: row.gross_salary != null ? Number(row.gross_salary) : null,
            netSalary: row.net_salary != null ? Number(row.net_salary) : null,
          };
        });
        setPayrollMap(next);
      } catch (e) {
        console.error("Error loading payroll:", e);
      }
      return;
    }

    try {
      const raw = localStorage.getItem(payrollStorageKey(viewYearMonth));
      if (raw) setPayrollMap(JSON.parse(raw));
      else setPayrollMap({});
    } catch {
      setPayrollMap({});
    }
  }, [viewYearMonth]);

  const persistPayrollLocal = (map: Record<string, PayrollRow>) => {
    setPayrollMap(map);
    localStorage.setItem(payrollStorageKey(viewYearMonth), JSON.stringify(map));
  };

  const fetchAttendanceForMonth = async (ym: string): Promise<AttendanceEntry[]> => {
    const { year: y, month: m } = parseYearMonth(ym);
    const monthStart = `${ym}-01`;
    const monthEnd = `${ym}-${pad2(daysInMonth(y, m))}`;

    if (supabase) {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", monthStart)
        .lte("attendance_date", monthEnd)
        .order("attendance_date", { ascending: true })
        .order("attendance_time", { ascending: false });
      if (error) throw error;
      return (
        data?.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id ?? null,
          employeeName: row.employee_name,
          attendanceDate: row.attendance_date,
          attendanceTime: row.attendance_time || "",
          status: row.status as AttendanceStatus,
          remark: row.remark || "",
        })) || []
      );
    }

    const raw = localStorage.getItem("crm_attendance");
    const all: AttendanceEntry[] = raw ? JSON.parse(raw) : [];
    return all.filter((r) => r.attendanceDate >= monthStart && r.attendanceDate <= monthEnd);
  };

  const syncPayrollRow = async (
    emp: Employee,
    monthRecords: AttendanceEntry[],
    payrollYm: string,
  ) => {
    const empRows = monthRecords.filter((r) => matchesEmployee(r, emp));
    const computed = computeSummary(empRows);

    let gross: number | null = null;
    let net: number | null = null;

    if (!supabase) {
      let map: Record<string, PayrollRow> = {};
      try {
        const raw = localStorage.getItem(payrollStorageKey(payrollYm));
        if (raw) map = JSON.parse(raw);
      } catch {
        map = {};
      }
      const prevRow = map[emp.id];
      const merged: PayrollRow = {
        ...computed,
        grossSalary: prevRow?.grossSalary ?? null,
        netSalary: prevRow?.netSalary ?? null,
      };
      map[emp.id] = merged;
      localStorage.setItem(payrollStorageKey(payrollYm), JSON.stringify(map));
      if (payrollYm === viewYearMonth) setPayrollMap(map);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data: existing } = await supabase
      .from("employee_monthly_payroll")
      .select("gross_salary, net_salary")
      .eq("user_id", uid)
      .eq("employee_id", emp.id)
      .eq("year_month", `${payrollYm}-01`)
      .maybeSingle();

    gross = existing?.gross_salary != null ? Number(existing.gross_salary) : null;
    net = existing?.net_salary != null ? Number(existing.net_salary) : null;

    const merged: PayrollRow = { ...computed, grossSalary: gross, netSalary: net };

    try {
      const { error } = await supabase.from("employee_monthly_payroll").upsert(
        {
          user_id: uid,
          employee_id: emp.id,
          year_month: `${payrollYm}-01`,
          num_presents: merged.numPresents,
          num_weekly_offs: merged.numWeeklyOffs,
          num_absents: merged.numAbsents,
          num_leaves: merged.numLeaves,
          paid_days: merged.paidDays,
          gross_salary: merged.grossSalary,
          net_salary: merged.netSalary,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,employee_id,year_month" },
      );
      if (error) throw error;
    } catch (e) {
      console.error("Payroll sync failed:", e);
    }

    if (payrollYm === viewYearMonth) {
      setPayrollMap((p) => ({ ...p, [emp.id]: merged }));
    }
  };

  const loadAttendance = async (): Promise<AttendanceEntry[]> => {
    setIsLoading(true);
    try {
      const rows = await fetchAttendanceForMonth(viewYearMonth);
      setRecords(rows);
      return rows;
    } catch (error) {
      console.error("Error loading attendance:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, []);

  useEffect(() => {
    void loadAttendance();
  }, [viewYearMonth]);

  useEffect(() => {
    void loadPayrollForMonth();
  }, [loadPayrollForMonth, viewYearMonth]);

  const persistLocalAttendance = (rows: AttendanceEntry[]) => {
    const raw = localStorage.getItem("crm_attendance");
    const all: AttendanceEntry[] = raw ? JSON.parse(raw) : [];
    const other = all.filter((r) => {
      const d = r.attendanceDate;
      const ms = `${viewYearMonth}-01`;
      const last = `${viewYearMonth}-${pad2(dim)}`;
      return !(d >= ms && d <= last);
    });
    localStorage.setItem("crm_attendance", JSON.stringify([...other, ...rows]));
    setRecords(rows);
  };

  const upsertDayRecord = async (
    emp: Employee,
    day: number,
    nextStatus: AttendanceStatus | null,
  ) => {
    const attendance_date = dateISO(viewYear, viewMonth, day);

    if (!supabase) {
      const filtered = records.filter(
        (r) =>
          !(matchesEmployee(r, emp) && r.attendanceDate === attendance_date),
      );
      let updated = filtered;
      if (nextStatus) {
        const created: AttendanceEntry = {
          id: `attendance_${Date.now()}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          attendanceDate: attendance_date,
          attendanceTime: new Date().toTimeString().slice(0, 5),
          status: nextStatus,
          remark: "",
        };
        updated = [created, ...filtered];
      }
      persistLocalAttendance(updated);
      await syncPayrollRow(emp, updated, viewYearMonth);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("User not authenticated");

    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", uid)
      .eq("employee_name", emp.fullName)
      .eq("attendance_date", attendance_date)
      .maybeSingle();

    if (!nextStatus) {
      if (existing?.id) {
        const { error } = await supabase.from("attendance").delete().eq("id", existing.id);
        if (error) throw error;
      }
    } else if (existing?.id) {
      const { error } = await supabase
        .from("attendance")
        .update({
          status: nextStatus,
          employee_id: emp.id,
          attendance_time: new Date().toTimeString().slice(0, 5),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("attendance").insert([
        {
          user_id: uid,
          employee_id: emp.id,
          employee_name: emp.fullName,
          attendance_date,
          attendance_time: new Date().toTimeString().slice(0, 5),
          status: nextStatus,
          remark: null,
        },
      ]);
      if (error) throw error;
    }

    const freshRows = await loadAttendance();
    await syncPayrollRow(emp, freshRows, viewYearMonth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const emp = employees.find((x) => x.id === employeeId);
      if (!emp) {
        alert("Select an employee.");
        return;
      }

      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user?.id) throw new Error("User not authenticated");
        const uid = userData.user.id;

        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", uid)
          .eq("employee_name", emp.fullName)
          .eq("attendance_date", attendanceDate)
          .maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from("attendance")
            .update({
              employee_id: emp.id,
              attendance_time: attendanceTime,
              status,
              remark: remark.trim() || null,
            })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("attendance").insert([
            {
              user_id: uid,
              employee_id: emp.id,
              employee_name: emp.fullName,
              attendance_date: attendanceDate,
              attendance_time: attendanceTime,
              status,
              remark: remark.trim() || null,
            },
          ]);
          if (error) throw error;
        }

        const payrollYm = attendanceDate.slice(0, 7);
        const rowsForPayroll = await fetchAttendanceForMonth(payrollYm);
        await syncPayrollRow(emp, rowsForPayroll, payrollYm);
        if (payrollYm === viewYearMonth) {
          setRecords(rowsForPayroll);
        } else {
          await loadAttendance();
        }
      } else {
        const payrollYm = attendanceDate.slice(0, 7);
        const rawAll = localStorage.getItem("crm_attendance");
        const all: AttendanceEntry[] = rawAll ? JSON.parse(rawAll) : [];
        const others = all.filter(
          (r) =>
            !(
              matchesEmployee(r, emp) &&
              r.attendanceDate === attendanceDate
            ),
        );
        const created: AttendanceEntry = {
          id: `attendance_${Date.now()}`,
          employeeId: emp.id,
          employeeName: emp.fullName,
          attendanceDate,
          attendanceTime,
          status,
          remark: remark.trim(),
        };
        localStorage.setItem("crm_attendance", JSON.stringify([...others, created]));

        const rowsForPayroll = await fetchAttendanceForMonth(payrollYm);
        await syncPayrollRow(emp, rowsForPayroll, payrollYm);
        if (payrollYm === viewYearMonth) {
          setRecords(rowsForPayroll);
        } else {
          await loadAttendance();
        }
      }

      setRemark("");
      setStatus("Present");
      setAttendanceTime(new Date().toTimeString().slice(0, 5));
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      alert(error?.message || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSalaryBlur = async (emp: Employee, field: "gross" | "net", raw: string) => {
    const num = raw === "" ? null : Number(raw);
    if (raw !== "" && Number.isNaN(num)) return;

    const empRows = records.filter((r) => matchesEmployee(r, emp));
    const computed = computeSummary(empRows);
    const prev = payrollMap[emp.id];

    const merged: PayrollRow = {
      ...computed,
      grossSalary: field === "gross" ? num : prev?.grossSalary ?? null,
      netSalary: field === "net" ? num : prev?.netSalary ?? null,
    };

    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      try {
        const { error } = await supabase.from("employee_monthly_payroll").upsert(
          {
            user_id: uid,
            employee_id: emp.id,
            year_month: `${viewYearMonth}-01`,
            num_presents: merged.numPresents,
            num_weekly_offs: merged.numWeeklyOffs,
            num_absents: merged.numAbsents,
            num_leaves: merged.numLeaves,
            paid_days: merged.paidDays,
            gross_salary: merged.grossSalary,
            net_salary: merged.netSalary,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,employee_id,year_month" },
        );
        if (error) throw error;
      } catch (e) {
        console.error("Payroll save failed:", e);
        alert("Could not save salary fields. Run the latest SQL migration if the table is missing.");
      }
    }

    setPayrollMap((p) => {
      const next = { ...p, [emp.id]: merged };
      if (!supabase) persistPayrollLocal(next);
      return next;
    });
  };

  const statusForCell = (emp: Employee, day: number): AttendanceStatus | null => {
    const d = dateISO(viewYear, viewMonth, day);
    const rec = records.find((r) => matchesEmployee(r, emp) && r.attendanceDate === d);
    return rec?.status ?? null;
  };

  const displaySummary = (emp: Employee) => {
    const empRows = records.filter((r) => matchesEmployee(r, emp));
    const computed = computeSummary(empRows);
    const stored = payrollMap[emp.id];
    return {
      numPresents: stored?.numPresents ?? computed.numPresents,
      numWeeklyOffs: stored?.numWeeklyOffs ?? computed.numWeeklyOffs,
      numAbsents: stored?.numAbsents ?? computed.numAbsents,
      numLeaves: stored?.numLeaves ?? computed.numLeaves,
      paidDays: stored?.paidDays ?? computed.paidDays,
      grossSalary: stored?.grossSalary ?? null,
      netSalary: stored?.netSalary ?? null,
    };
  };

  const renderCellIcon = (st: AttendanceStatus | null) => {
    if (!st)
      return (
        <span className="text-sm font-light text-muted-foreground/50 tabular-nums" aria-hidden>
          —
        </span>
      );
    if (st === "Present")
      return (
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25"
          aria-label="Present"
        >
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.75} />
        </span>
      );
    if (st === "Absent")
      return (
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/12 ring-1 ring-red-500/25"
          aria-label="Absent"
        >
          <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={2.75} />
        </span>
      );
    if (st === "Leave")
      return (
        <span
          className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-sky-500/15 px-1 py-0.5 text-[10px] font-bold uppercase tracking-tighter text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300"
          title="Leave"
        >
          L
        </span>
      );
    if (st === "Weekly Off")
      return (
        <span
          className="inline-flex justify-center rounded-md bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground ring-1 ring-border"
          title="Weekly Off"
        >
          WO
        </span>
      );
    return (
      <span
        className="inline-flex min-w-[1.5rem] justify-center rounded-md bg-amber-500/15 px-1 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-300"
        title="Half Day"
      >
        ½
      </span>
    );
  };

  const cellEditStatus = cellEdit ? statusForCell(cellEdit.employee, cellEdit.day) : null;

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 via-background to-background">
        <div className="container mx-auto max-w-[1600px] space-y-8 px-4 py-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2 border-border/80 bg-background/80 shadow-sm backdrop-blur-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15">
                    <CalendarCheck2 className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Attendance</h1>
                    <p className="mt-1 max-w-xl text-sm text-muted-foreground sm:text-base">
                      Log check-ins and scan the month grid—each row is one team member with payroll summaries on the
                      right.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-border/70 shadow-md shadow-black/5">
            <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 pb-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-4 w-4" />
                <CardTitle className="text-lg font-semibold">Quick entry</CardTitle>
              </div>
              <CardDescription>Add or update one attendance record using the form below.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="att-employee">Employee</Label>
                  <select
                    id="att-employee"
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id} disabled={!e.isActive}>
                        {e.fullName}
                        {!e.isActive ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="att-date">Date</Label>
                  <Input
                    id="att-date"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="att-time">Time</Label>
                  <Input
                    id="att-time"
                    type="time"
                    value={attendanceTime}
                    onChange={(e) => setAttendanceTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="att-status">Status</Label>
                  <select
                    id="att-status"
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">Leave</option>
                    <option value="Weekly Off">Weekly Off</option>
                  </select>
                </div>
                <div className="space-y-2 xl:col-span-2">
                  <Label htmlFor="att-remark">Remark</Label>
                  <Input
                    id="att-remark"
                    placeholder="Optional note"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
                <div className="flex items-end xl:col-span-6">
                  <Button type="submit" disabled={isSaving} className="h-10 w-full min-w-[8rem] sm:w-auto">
                    {isSaving ? "Saving…" : "Save attendance"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 shadow-lg shadow-black/[0.06]">
            <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-br from-muted/40 via-card to-card pb-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl font-bold tracking-tight">Employees — monthly attendance</CardTitle>
                  </div>
                  <CardDescription className="max-w-2xl text-sm leading-relaxed">
                    <span className="font-medium text-foreground/80">Green tick</span> = present,{" "}
                    <span className="font-medium text-foreground/80">red ×</span> = absent. Click any day to set or clear.
                    Summary columns match payroll totals for the selected month.
                  </CardDescription>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/5 font-normal">
                      <Check className="h-3 w-3 text-emerald-600" />
                      Present
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-red-500/30 bg-red-500/5 font-normal">
                      <X className="h-3 w-3 text-red-600" />
                      Absent
                    </Badge>
                    <Badge variant="outline" className="border-sky-500/30 bg-sky-500/5 font-normal">
                      L Leave
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      WO Weekly off
                    </Badge>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 font-normal">
                      ½ Half day
                    </Badge>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</Label>
                  <div className="relative flex items-center gap-2 rounded-xl border border-border/80 bg-background px-3 py-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                    <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{formatMonthDisplay(viewYearMonth)}</p>
                      <p className="text-[11px] text-muted-foreground">Change period</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <input
                      type="month"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      value={viewYearMonth}
                      onChange={(e) => setViewYearMonth(e.target.value)}
                      aria-label="Select month"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              {!activeEmployees.length ? (
                <div className="px-6 py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">
                    No active employees. Add people under{" "}
                    <span className="font-medium text-foreground">Admin → Employee Management</span>.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading attendance…</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px] border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/95 dark:bg-slate-900/80">
                          <th className="sticky left-0 z-30 min-w-[148px] border-b border-r border-border/80 bg-slate-100/95 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground shadow-[6px_0_12px_-6px_rgba(0,0,0,0.18)] dark:bg-slate-900/95">
                            Employee
                          </th>
                          {Array.from({ length: dim }, (_, i) => i + 1).map((d) => (
                            <th
                              key={d}
                              className="w-9 min-w-[2.25rem] border-b border-border/60 px-0 py-2.5 text-center align-middle"
                            >
                              <DayHeaderLabel day={d} />
                            </th>
                          ))}
                          <th className={cn(summaryHeaderClass, "border-l border-amber-300/60")}>No. of Presents</th>
                          <th className={summaryHeaderClass}>No. of W/Os</th>
                          <th className={summaryHeaderClass}>No.of Absents</th>
                          <th className={summaryHeaderClass}>No.of leaves</th>
                          <th className={summaryHeaderClass}>Paid days</th>
                          <th className={summaryHeaderClass}>Gross Salary</th>
                          <th className={summaryHeaderClass}>Net Salary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeEmployees.map((emp, rowIdx) => {
                          const s = displaySummary(emp);
                          return (
                            <tr
                              key={emp.id}
                              className={cn(
                                "border-b border-border/50 transition-colors",
                                rowIdx % 2 === 0 ? "bg-card" : "bg-muted/[0.35]",
                                "hover:bg-primary/[0.04]",
                              )}
                            >
                              <td
                                className={cn(
                                  "sticky left-0 z-20 border-r border-border/80 px-3 py-2 font-semibold text-foreground shadow-[6px_0_12px_-6px_rgba(0,0,0,0.12)]",
                                  rowIdx % 2 === 0 ? "bg-card" : "bg-muted/[0.45]",
                                )}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                    {(emp.fullName?.[0] ?? "?").toUpperCase()}
                                  </span>
                                  <span className="truncate">{emp.fullName}</span>
                                </span>
                              </td>
                              {Array.from({ length: dim }, (_, i) => i + 1).map((day) => {
                                const st = statusForCell(emp, day);
                                return (
                                  <td
                                    key={day}
                                    className={cn(
                                      "border-l border-border/40 p-0.5 align-middle",
                                      day === dim && "border-r border-border/40",
                                    )}
                                  >
                                    <button
                                      type="button"
                                      className={cn(
                                        "flex h-9 w-full min-w-[2rem] items-center justify-center rounded-lg transition-all",
                                        "hover:bg-primary/8 hover:ring-2 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        "active:scale-[0.97]",
                                      )}
                                      onClick={() => setCellEdit({ employee: emp, day })}
                                      title={`${emp.fullName} — ${dateISO(viewYear, viewMonth, day)}`}
                                    >
                                      {renderCellIcon(st)}
                                    </button>
                                  </td>
                                );
                              })}
                              <td className={cn(summaryCellClass, "border-l border-amber-200/70 dark:border-amber-900/40")}>
                                {s.numPresents}
                              </td>
                              <td className={summaryCellClass}>{s.numWeeklyOffs}</td>
                              <td className={summaryCellClass}>{s.numAbsents}</td>
                              <td className={summaryCellClass}>{s.numLeaves}</td>
                              <td className={summaryCellClass}>{s.paidDays}</td>
                              <td className={cn(summaryCellClass, "p-1")}>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 border-amber-200/80 bg-background/90 text-center text-xs font-medium dark:border-amber-900/50"
                                  defaultValue={s.grossSalary ?? ""}
                                  key={`g-${emp.id}-${viewYearMonth}-${s.grossSalary ?? ""}`}
                                  onBlur={(e) => void handleSalaryBlur(emp, "gross", e.target.value)}
                                />
                              </td>
                              <td className={cn(summaryCellClass, "p-1")}>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-8 border-amber-200/80 bg-background/90 text-center text-xs font-medium dark:border-amber-900/50"
                                  defaultValue={s.netSalary ?? ""}
                                  key={`n-${emp.id}-${viewYearMonth}-${s.netSalary ?? ""}`}
                                  onBlur={(e) => void handleSalaryBlur(emp, "net", e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-border/60 px-4 py-2.5 text-center text-[11px] text-muted-foreground">
                    Scroll horizontally to see all days and payroll columns
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/70 shadow-md shadow-black/5">
            <CardHeader className="flex flex-row items-center gap-2 border-b border-border/60 bg-muted/15 pb-4">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg font-semibold">Detailed log</CardTitle>
                <CardDescription>Raw entries for {formatMonthDisplay(viewYearMonth)}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</div>
              ) : records.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No attendance records for this month.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...records]
                        .sort((a, b) => (a.attendanceDate < b.attendanceDate ? 1 : -1))
                        .map((item, i) => (
                          <tr
                            key={item.id}
                            className={cn(
                              "border-b border-border/50 transition-colors hover:bg-muted/40",
                              i % 2 === 1 && "bg-muted/[0.2]",
                            )}
                          >
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">
                              {item.attendanceDate}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 tabular-nums">{item.attendanceTime || "—"}</td>
                            <td className="px-4 py-3 font-medium">{item.employeeName}</td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className="font-normal">
                                {item.status}
                              </Badge>
                            </td>
                            <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                              {item.remark || "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!cellEdit} onOpenChange={(open) => !open && setCellEdit(null)}>
        <DialogContent className="gap-0 overflow-hidden border-border/80 p-0 sm:max-w-md">
          <DialogHeader className="space-y-3 border-b border-border/60 bg-muted/30 px-6 py-5">
            <DialogTitle className="text-lg font-semibold leading-snug pr-8">
              {cellEdit
                ? `${cellEdit.employee.fullName} — ${dateISO(viewYear, viewMonth, cellEdit.day)}`
                : "Day"}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current</span>
              <Badge variant={cellEditStatus ? "default" : "outline"} className="font-normal">
                {cellEditStatus ?? "No record"}
              </Badge>
            </div>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Paid days = presents + leaves + weekly offs (half days count as present in the present column).
            </p>
            <div className="flex flex-wrap gap-2">
              {(["Present", "Absent", "Half Day", "Leave", "Weekly Off"] as const).map((st) => (
                <Button
                  key={st}
                  type="button"
                  variant={cellEditStatus === st ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    if (!cellEdit) return;
                    void (async () => {
                      try {
                        await upsertDayRecord(cellEdit.employee, cellEdit.day, st);
                        setCellEdit(null);
                      } catch (err: any) {
                        alert(err?.message || "Failed to update");
                      }
                    })();
                  }}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 bg-muted/20 px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                if (!cellEdit) return;
                void (async () => {
                  try {
                    await upsertDayRecord(cellEdit.employee, cellEdit.day, null);
                    setCellEdit(null);
                  } catch (err: any) {
                    alert(err?.message || "Failed to clear");
                  }
                })();
              }}
            >
              Clear day
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCellEdit(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
