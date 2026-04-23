import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useListSalaryPayments,
  useCreateSalaryPayment,
  useDeleteSalaryPayment,
  getListSalaryPaymentsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetEmployeeBalancesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { inr, fmtDate, todayYmd } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  employeeId: z.coerce.number().min(1),
  amount: z.coerce.number().min(0),
  paymentDate: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM"),
  status: z.enum(["paid", "pending"]),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function SalariesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: employees } = useListEmployees();
  const [filterEmp, setFilterEmp] = useState<string>("all");
  const params = filterEmp !== "all" ? { employeeId: Number(filterEmp) } : undefined;
  const { data: salaries } = useListSalaryPayments(params, { query: { queryKey: getListSalaryPaymentsQueryKey(params) } });
  const create = useCreateSalaryPayment();
  const del = useDeleteSalaryPayment();

  const today = todayYmd();
  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { employeeId: 0, amount: 0, paymentDate: today, periodMonth: today.slice(0, 7), status: "paid", notes: "" },
  });

  const totals = useMemo(() => {
    const paid = (salaries ?? []).filter((s: any) => s.status === "paid").reduce((a: number, s: any) => a + s.amount, 0);
    const pending = (salaries ?? []).filter((s: any) => s.status === "pending").reduce((a: number, s: any) => a + s.amount, 0);
    return { paid, pending };
  }, [salaries]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListSalaryPaymentsQueryKey() });
    qc.invalidateQueries({ queryKey: getListSalaryPaymentsQueryKey(params) });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetEmployeeBalancesQueryKey() });
  };

  const onSubmit = (data: FormData) => {
    create.mutate(
      { data: { ...data, paymentDate: new Date(data.paymentDate), notes: data.notes || undefined } as any },
      {
        onSuccess: () => { invalidate(); form.reset({ ...form.getValues(), amount: 0, notes: "" }); toast({ title: "Salary recorded" }); },
        onError: () => toast({ title: "Failed to record salary", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Salaries</h1>
        <p className="text-muted-foreground">Record monthly salary payments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base text-muted-foreground">Total paid (filtered)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{inr(totals.paid)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base text-muted-foreground">Total pending (filtered)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{inr(totals.pending)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">New salary entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Employee</Label>
              <Select value={String(form.watch("employeeId") || "")} onValueChange={(v) => form.setValue("employeeId", Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(employees ?? []).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" {...form.register("amount")} /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...form.register("paymentDate")} /></div>
            <div className="space-y-1.5"><Label>Period (YYYY-MM)</Label><Input placeholder="2026-04" {...form.register("periodMonth")} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5 space-y-1.5"><Label>Notes</Label><Input {...form.register("notes")} /></div>
            <div className="flex items-end"><Button type="submit" disabled={create.isPending} className="w-full">Record</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payment history</CardTitle>
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {(employees ?? []).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {(salaries ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No payments yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Period</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(salaries ?? []).map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.employeeName}</TableCell>
                    <TableCell>{s.periodMonth}</TableCell>
                    <TableCell>{fmtDate(s.paymentDate)}</TableCell>
                    <TableCell className="text-right font-mono">{inr(s.amount)}</TableCell>
                    <TableCell><Badge variant={s.status === "paid" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate({ id: s.id }, { onSuccess: invalidate })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
