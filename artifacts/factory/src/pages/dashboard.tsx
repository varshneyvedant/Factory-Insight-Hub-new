import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { inr, ymToLabel, fmtDate } from "@/lib/format";
import { Users, IndianRupee, Clock, HandCoins, TrendingUp, TrendingDown, Minus, UtilityPole, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function DashboardPage() {
  const { data: s } = useGetDashboardSummary();
  const { data: recent } = useGetRecentActivity();

  const TrendIcon = s?.copperTrend === "up" ? TrendingUp : s?.copperTrend === "down" ? TrendingDown : Minus;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Today's snapshot of the factory.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Employees"
          value={s ? `${s.activeEmployees}` : "—"}
          description={s ? `of ${s.totalEmployees} total` : ""}
          icon={<Users />}
        />
        <KpiCard
          title="Salary Paid"
          value={inr(s?.totalSalaryPaid ?? 0)}
          description="All-time"
          icon={<IndianRupee />}
        />
        <KpiCard
          title="Salary Pending"
          value={inr(s?.totalSalaryPending ?? 0)}
          description="To be paid"
          icon={<Clock />}
        />
        <KpiCard
          title="Total Advances"
          value={inr(s?.totalAdvancesGiven ?? 0)}
          description="All-time"
          icon={<HandCoins />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UtilityPole className="h-4 w-4 text-primary" /> Copper Price
            </CardTitle>
            <CardDescription>Latest purchase vs. average</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-bold tracking-tight">
                {s?.copperCurrentPrice != null ? `₹${s.copperCurrentPrice.toFixed(2)}` : "—"}
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                s?.copperTrend === "up" ? "text-green-600" : s?.copperTrend === "down" ? "text-destructive" : "text-muted-foreground"
              }`}>
                <TrendIcon className="h-3 w-3" />
                {s?.copperTrend ?? "no data"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average: {s?.copperAveragePrice != null ? `₹${s.copperAveragePrice.toFixed(2)}/kg` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Attendance</CardTitle>
            <CardDescription>{fmtDate(new Date())}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 rounded-md bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 mx-auto text-green-600" />
                <div className="text-2xl font-bold mt-1">{s?.attendanceToday.present ?? 0}</div>
                <div className="text-xs text-muted-foreground">Present</div>
              </div>
              <div className="text-center p-3 rounded-md bg-amber-500/10">
                <CircleDashed className="h-4 w-4 mx-auto text-amber-600" />
                <div className="text-2xl font-bold mt-1">{s?.attendanceToday.halfDay ?? 0}</div>
                <div className="text-xs text-muted-foreground">Half day</div>
              </div>
              <div className="text-center p-3 rounded-md bg-destructive/10">
                <XCircle className="h-4 w-4 mx-auto text-destructive" />
                <div className="text-2xl font-bold mt-1">{s?.attendanceToday.absent ?? 0}</div>
                <div className="text-xs text-muted-foreground">Absent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Stats</CardTitle>
            <CardDescription>Workforce & cash flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total employees</span><span className="font-medium">{s?.totalEmployees ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Active employees</span><span className="font-medium">{s?.activeEmployees ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding salary</span><span className="font-medium">{inr(s?.totalSalaryPending ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Advances given</span><span className="font-medium">{inr(s?.totalAdvancesGiven ?? 0)}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Monthly Cash Out</CardTitle>
            <CardDescription>Salaries paid and advances given (last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(s?.monthlyPayments ?? []).map((m) => ({ ...m, label: ymToLabel(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => inr(v)}
                  />
                  <Legend />
                  <Bar dataKey="paid" name="Salary paid" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="advances" name="Advances" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Across the factory</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
            {(recent ?? []).slice(0, 12).map((it: any) => (
              <div key={it.id} className="flex items-start gap-3 text-sm border-b border-border/50 pb-2 last:border-none">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold uppercase">{it.type[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-xs text-muted-foreground">{it.subtitle} · {fmtDate(it.timestamp)}</div>
                </div>
                {it.amount != null && <div className="text-xs font-medium">{inr(it.amount)}</div>}
              </div>
            ))}
            {(recent ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
