import { useGetEmployeeBalances, useGetDashboardSummary, useGetCopperStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import { inr, ymToLabel } from "@/lib/format";

export default function ReportsPage() {
  const { data: balances } = useGetEmployeeBalances();
  const { data: summary } = useGetDashboardSummary();
  const { data: copper } = useGetCopperStats();

  const sortedBalances = [...(balances ?? [])].sort((a: any, b: any) => b.remainingDue - a.remainingDue);
  const advancesByEmp = sortedBalances.filter((b: any) => b.totalAdvances > 0).sort((a: any, b: any) => b.totalAdvances - a.totalAdvances).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Owner-only analytics across the factory.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Salary paid vs pending</CardTitle><CardDescription>Last 6 months</CardDescription></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(summary?.monthlyPayments ?? []).map((m: any) => ({ ...m, label: ymToLabel(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="paid" name="Paid" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="advances" name="Advances" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top advances by employee</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={advancesByEmp} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="employeeName" fontSize={11} width={110} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="totalAdvances" name="Advances" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Copper price trend</CardTitle><CardDescription>Last 30 days</CardDescription></CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(copper?.last30Days ?? []) as any[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="marketPrice" name="Market" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="purchasePrice" name="Purchase" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Outstanding balances</CardTitle><CardDescription>Sorted by remaining dues</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Position</TableHead><TableHead className="text-right">Earned</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Advances</TableHead><TableHead className="text-right">Remaining</TableHead></TableRow></TableHeader>
            <TableBody>
              {sortedBalances.map((b: any) => (
                <TableRow key={b.employeeId}>
                  <TableCell className="font-medium">{b.employeeName}</TableCell>
                  <TableCell>{b.position}</TableCell>
                  <TableCell className="text-right font-mono">{inr(b.totalEarned)}</TableCell>
                  <TableCell className="text-right font-mono">{inr(b.totalPaid)}</TableCell>
                  <TableCell className="text-right font-mono">{inr(b.totalAdvances)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{inr(b.remainingDue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
