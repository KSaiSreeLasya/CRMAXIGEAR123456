import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface AttendanceEntry {
  id: string;
  employeeName: string;
  attendanceDate: string;
  attendanceTime: string;
  status: "Present" | "Absent" | "Half Day" | "Leave";
  remark: string;
}

export default function Attendance() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceEntry[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceTime, setAttendanceTime] = useState(new Date().toTimeString().slice(0, 5));
  const [status, setStatus] = useState<AttendanceEntry["status"]>("Present");
  const [remark, setRemark] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadAttendance();
  }, []);

  const persistLocal = (rows: AttendanceEntry[]) => {
    setRecords(rows);
    localStorage.setItem("crm_attendance", JSON.stringify(rows));
  };

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .order("attendance_date", { ascending: false })
          .order("attendance_time", { ascending: false });
        if (error) throw error;
        const rows: AttendanceEntry[] =
          data?.map((row: any) => ({
            id: row.id,
            employeeName: row.employee_name,
            attendanceDate: row.attendance_date,
            attendanceTime: row.attendance_time || "",
            status: row.status,
            remark: row.remark || "",
          })) || [];
        setRecords(rows);
      } else {
        const raw = localStorage.getItem("crm_attendance");
        if (raw) setRecords(JSON.parse(raw));
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!employeeName.trim()) {
        alert("Employee name is required.");
        return;
      }

      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user?.id) {
          throw new Error("User not authenticated");
        }
        const { data, error } = await supabase
          .from("attendance")
          .insert([
            {
              user_id: userData.user.id,
              employee_name: employeeName.trim(),
              attendance_date: attendanceDate,
              attendance_time: attendanceTime,
              status,
              remark: remark.trim() || null,
            },
          ])
          .select()
          .single();
        if (error) throw error;

        const created: AttendanceEntry = {
          id: data.id,
          employeeName: data.employee_name,
          attendanceDate: data.attendance_date,
          attendanceTime: data.attendance_time || "",
          status: data.status,
          remark: data.remark || "",
        };
        setRecords((prev) => [created, ...prev]);
      } else {
        const created: AttendanceEntry = {
          id: `attendance_${Date.now()}`,
          employeeName: employeeName.trim(),
          attendanceDate,
          attendanceTime,
          status,
          remark: remark.trim(),
        };
        persistLocal([created, ...records]);
      }

      setEmployeeName("");
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Attendance</h1>
          <p className="text-muted-foreground">Mark daily attendance for team members.</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Mark Attendance</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <input
              type="text"
              placeholder="Employee Name"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              required
            />
            <input
              type="date"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
            />
            <input
              type="time"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={attendanceTime}
              onChange={(e) => setAttendanceTime(e.target.value)}
              required
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceEntry["status"])}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
            </select>
            <input
              type="text"
              placeholder="Remark (optional)"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Attendance Records</h2>
          {isLoading ? (
            <p className="text-muted-foreground">Loading attendance...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground">No attendance records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Employee</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-3">{item.attendanceDate}</td>
                      <td className="px-4 py-3">{item.attendanceTime || "-"}</td>
                      <td className="px-4 py-3 font-medium">{item.employeeName}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.remark || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
