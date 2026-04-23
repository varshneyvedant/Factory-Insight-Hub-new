import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useListAttendance,
  useRecordAttendance,
  useDeleteAttendance,
  getListAttendanceQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, CircleDashed, Trash2 } from "lucide-react";
import { fmtDate, todayYmd } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const STATUS = [
  { key: "present", label: "Present", icon: CheckCircle2, cls: "bg-green-600 hover:bg-green-700 text-white" },
  { key: "half_day", label: "Half day", icon: CircleDashed, cls: "bg-amber-500 hover:bg-amber-600 text-white" },
  { key: "absent", label: "Absent", icon: XCircle, cls: "bg-destructive hover:bg-destructive/90 text-white" },
] as const;

export default function AttendancePage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [date, setDate] = useState(todayYmd());
  const { data: employees } = useListEmployees();
  const { data: attendance } = useListAttendance(
    { from: date, to: date },
    { query: { queryKey: getListAttendanceQueryKey({ from: date, to: date }) } },
  );
  const record = useRecordAttendance();
  const del = useDeleteAttendance();

  const byEmp = new Map<number, any>();
  (attendance ?? []).forEach((a: any) => byEmp.set(a.employeeId, a));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListAttendanceQueryKey({ from: date, to: date }) });
    qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const mark = (employeeId: number, status: "present" | "absent" | "half_day") => {
    record.mutate(
      { data: { employeeId, date: new Date(date), status } as any },
      { onSuccess: () => { invalidate(); toast({ title: "Saved" }); } },
    );
  };

  const removeRow = (id: number) => {
    del.mutate({ id }, { onSuccess: () => invalidate() });
  };

  const active = (employees ?? []).filter((e: any) => e.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Mark today's attendance for the floor.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[180px]" /></div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{fmtDate(date)} · {active.length} active employees</CardTitle><CardDescription>Tap a status to record. Latest tap wins.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {active.map((e: any) => {
            const cur = byEmp.get(e.id);
            return (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/30 transition-colors">
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.position}</div>
                </div>
                <div className="flex items-center gap-2">
                  {cur && <Badge variant="outline" className="mr-2">Recorded: {cur.status.replace("_", " ")}</Badge>}
                  {STATUS.map((s) => {
                    const Icon = s.icon;
                    const active = cur?.status === s.key;
                    return (
                      <Button key={s.key} size="sm" variant={active ? "default" : "outline"} onClick={() => mark(e.id, s.key)} className={active ? s.cls : ""}>
                        <Icon className="h-3.5 w-3.5 mr-1" /> {s.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {active.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No active employees.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Attendance log — {fmtDate(date)}</CardTitle></CardHeader>
        <CardContent>
          {(attendance ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No entries for this date yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(attendance ?? []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.employeeName}</TableCell>
                    <TableCell><Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"}>{a.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{a.notes ?? "—"}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => removeRow(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
