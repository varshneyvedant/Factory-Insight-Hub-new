import { useRoute, Link } from "wouter";
import { useGetEmployee, useGetMe, getGetEmployeeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, IndianRupee, Calendar, HandCoins } from "lucide-react";
import { inr, fmtDate } from "@/lib/format";

export default function EmployeeDetailPage() {
  const [, params] = useRoute("/employees/:id");
  const id = params ? Number(params.id) : 0;
  const { data: me } = useGetMe();
  const { data, isLoading } = useGetEmployee(id, { query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id) } });

  if (isLoading || !data) return <div className="p-8 text-muted-foreground">Loading…</div>;
  const { employee, attendance = [], salaryPayments = [], advances = [], balance } = data as any;
  const earned = balance.totalEarned || 1;
  const usedPct = Math.min(100, ((balance.totalPaid + balance.totalAdvances) / earned) * 100);

  return (
    <div className="space-y-6">
      <Link href="/employees"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Employees</Button></Link>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{employee.position}</Badge>
            <Badge variant={employee.active ? "default" : "secondary"}>{employee.active ? "Active" : "Inactive"}</Badge>
            <span className="text-sm text-muted-foreground">Joined {fmtDate(employee.joiningDate)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Monthly salary</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{inr(employee.monthlySalary)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total earned</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{inr(balance.totalEarned)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Paid + Advances</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{inr(balance.totalPaid + balance.totalAdvances)}</div></CardContent></Card>
        <Card className="border-primary/30 bg-primary/5"><CardHeader className="pb-2"><CardDescription>Remaining due</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{inr(balance.remainingDue)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pay-out progress</CardTitle><CardDescription>What's been paid vs. what's earned</CardDescription></CardHeader>
        <CardContent>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{inr(balance.totalPaid)} paid · {inr(balance.totalAdvances)} advances</span>
            <span>{inr(balance.totalEarned)} earned</span>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance"><Calendar className="h-4 w-4 mr-1" /> Attendance ({attendance.length})</TabsTrigger>
          <TabsTrigger value="salaries"><IndianRupee className="h-4 w-4 mr-1" /> Salaries ({salaryPayments.length})</TabsTrigger>
          <TabsTrigger value="advances"><HandCoins className="h-4 w-4 mr-1" /> Advances ({advances.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance">
          <Card><CardContent className="pt-6">
            {attendance.length === 0 ? <p className="text-sm text-muted-foreground">No attendance records.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {attendance.slice(0, 60).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{fmtDate(a.date)}</TableCell>
                      <TableCell><Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"}>{a.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{a.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="salaries">
          <Card><CardContent className="pt-6">
            {salaryPayments.length === 0 ? <p className="text-sm text-muted-foreground">No salary payments yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {salaryPayments.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.periodMonth}</TableCell>
                      <TableCell>{fmtDate(s.paymentDate)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(s.amount)}</TableCell>
                      <TableCell><Badge variant={s.status === "paid" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="advances">
          <Card><CardContent className="pt-6">
            {advances.length === 0 ? <p className="text-sm text-muted-foreground">No advances given.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {advances.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{fmtDate(a.date)}</TableCell>
                      <TableCell className="text-right font-mono">{inr(a.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">{a.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
