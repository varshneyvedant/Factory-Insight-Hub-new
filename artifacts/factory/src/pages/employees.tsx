import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useCreateEmployee,
  useDeleteEmployee,
  useGetEmployeeBalances,
  useGetMe,
  getListEmployeesQueryKey,
  getGetEmployeeBalancesQueryKey,
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { inr } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  position: z.string().min(1, "Position required"),
  phone: z.string().optional(),
  dailyWage: z.coerce.number().min(0),
  monthlySalary: z.coerce.number().min(0),
  joiningDate: z.string().min(1, "Joining date required"),
  active: z.boolean().default(true),
});
type FormData = z.infer<typeof schema>;

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isOwner = me?.role === "owner";
  const { data: employees } = useListEmployees();
  const { data: balances } = useGetEmployeeBalances();
  const createEmp = useCreateEmployee();
  const deleteEmp = useDeleteEmployee();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const balanceMap = useMemo(() => {
    const m = new Map<number, number>();
    (balances ?? []).forEach((b: any) => m.set(b.employeeId, b.remainingDue));
    return m;
  }, [balances]);

  const filtered = (employees ?? []).filter((e: any) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.position.toLowerCase().includes(search.toLowerCase()),
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "", position: "", phone: "", dailyWage: 0, monthlySalary: 0,
      joiningDate: new Date().toISOString().slice(0, 10), active: true,
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetEmployeeBalancesQueryKey() });
  };

  const onSubmit = (data: FormData) => {
    createEmp.mutate(
      { data: { ...data, phone: data.phone || undefined, joiningDate: new Date(data.joiningDate) } as any },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          form.reset();
          toast({ title: "Employee added", description: `${data.name} is now on the team.` });
        },
        onError: () => toast({ title: "Could not add employee", variant: "destructive" }),
      },
    );
  };

  const onDelete = (id: number, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    deleteEmp.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Employee removed" }); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">{filtered.length} of {employees?.length ?? 0} shown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees" className="pl-9 w-[240px]" />
          </div>
          {isOwner && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add employee</DialogTitle></DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Name</Label><Input {...form.register("name")} /></div>
                    <div className="space-y-1.5"><Label>Position</Label><Input {...form.register("position")} /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input {...form.register("phone")} /></div>
                    <div className="space-y-1.5"><Label>Joining date</Label><Input type="date" {...form.register("joiningDate")} /></div>
                    <div className="space-y-1.5"><Label>Daily wage (₹)</Label><Input type="number" step="0.01" {...form.register("dailyWage")} /></div>
                    <div className="space-y-1.5"><Label>Monthly salary (₹)</Label><Input type="number" step="0.01" {...form.register("monthlySalary")} /></div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", v)} />
                    <Label>Active</Label>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createEmp.isPending}>Save</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Team roster</CardTitle></CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No employees yet"
              description={isOwner ? "Add your first team member to start tracking attendance and payments." : "Ask the owner to add employees."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead className="text-right">Monthly salary</TableHead>
                  <TableHead className="text-right">Remaining due</TableHead>
                  <TableHead>Status</TableHead>
                  {isOwner && <TableHead className="w-[60px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e: any) => (
                  <TableRow key={e.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/employees/${e.id}`}>
                        <span className="font-medium hover:underline cursor-pointer">{e.name}</span>
                      </Link>
                      {e.phone && <div className="text-xs text-muted-foreground">{e.phone}</div>}
                    </TableCell>
                    <TableCell>{e.position}</TableCell>
                    <TableCell className="text-right font-mono">{inr(e.monthlySalary)}</TableCell>
                    <TableCell className="text-right font-mono">{inr(balanceMap.get(e.id) ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={e.active ? "default" : "secondary"}>{e.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(e.id, e.name)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
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
