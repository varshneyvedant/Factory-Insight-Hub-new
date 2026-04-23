import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useListAdvances,
  useCreateAdvance,
  useDeleteAdvance,
  getListAdvancesQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetEmployeeBalancesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { inr, fmtDate, todayYmd } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  employeeId: z.coerce.number().min(1),
  amount: z.coerce.number().min(0),
  date: z.string().min(1),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function AdvancesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: employees } = useListEmployees();
  const [filterEmp, setFilterEmp] = useState<string>("all");
  const params = filterEmp !== "all" ? { employeeId: Number(filterEmp) } : undefined;
  const { data: advances } = useListAdvances(params, { query: { queryKey: getListAdvancesQueryKey(params) } });
  const create = useCreateAdvance();
  const del = useDeleteAdvance();

  const total = useMemo(() => (advances ?? []).reduce((a: number, x: any) => a + x.amount, 0), [advances]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { employeeId: 0, amount: 0, date: todayYmd(), notes: "" },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListAdvancesQueryKey() });
    qc.invalidateQueries({ queryKey: getListAdvancesQueryKey(params) });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetEmployeeBalancesQueryKey() });
  };

  const onSubmit = (data: FormData) => {
    create.mutate(
      { data: { ...data, date: new Date(data.date), notes: data.notes || undefined } as any },
      { onSuccess: () => { invalidate(); form.reset({ ...form.getValues(), amount: 0, notes: "" }); toast({ title: "Advance recorded" }); } },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advances</h1>
        <p className="text-muted-foreground">Cash advances given to employees.</p>
      </div>

      <Card><CardHeader><CardTitle className="text-base text-muted-foreground">Total advances (filtered)</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{inr(total)}</div></CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-base">New advance</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-5">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Employee</Label>
              <Select value={String(form.watch("employeeId") || "")} onValueChange={(v) => form.setValue("employeeId", Number(v))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{(employees ?? []).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount</Label><Input type="number" step="0.01" {...form.register("amount")} /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...form.register("date")} /></div>
            <div className="flex items-end"><Button type="submit" disabled={create.isPending} className="w-full">Record</Button></div>
            <div className="md:col-span-5 space-y-1.5"><Label>Notes</Label><Input {...form.register("notes")} /></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Advance history</CardTitle>
          <Select value={filterEmp} onValueChange={setFilterEmp}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {(employees ?? []).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {(advances ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No advances recorded.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(advances ?? []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.employeeName}</TableCell>
                    <TableCell>{fmtDate(a.date)}</TableCell>
                    <TableCell className="text-right font-mono">{inr(a.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{a.notes ?? "—"}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate({ id: a.id }, { onSuccess: invalidate })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
