import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCopperEntries,
  useCreateCopperEntry,
  useDeleteCopperEntry,
  useGetCopperStats,
  getListCopperEntriesQueryKey,
  getGetCopperStatsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { inr2, fmtDate, todayYmd } from "@/lib/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  date: z.string().min(1),
  marketPrice: z.coerce.number().min(0),
  purchasePrice: z.coerce.number().min(0),
  quantityKg: z.coerce.number().min(0),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CopperPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: entries } = useListCopperEntries();
  const { data: stats } = useGetCopperStats();
  const create = useCreateCopperEntry();
  const del = useDeleteCopperEntry();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: todayYmd(), marketPrice: 0, purchasePrice: 0, quantityKg: 0, vendor: "", notes: "" },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListCopperEntriesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetCopperStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  const onSubmit = (data: FormData) => {
    create.mutate(
      { data: { ...data, date: new Date(data.date), vendor: data.vendor || undefined, notes: data.notes || undefined } as any },
      { onSuccess: () => { invalidate(); form.reset({ ...form.getValues(), marketPrice: 0, purchasePrice: 0, quantityKg: 0, notes: "" }); toast({ title: "Entry recorded" }); } },
    );
  };

  const TrendIcon = stats?.trend === "up" ? TrendingUp : stats?.trend === "down" ? TrendingDown : Minus;
  const aboveAverage = (stats?.diffFromAverage ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Copper</h1>
        <p className="text-muted-foreground">Track purchase prices, market prices and consumption.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Latest purchase</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{stats?.currentPrice != null ? `₹${stats.currentPrice.toFixed(2)}` : "—"}</div>
              <span className="text-xs text-muted-foreground">/ kg</span>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${stats?.trend === "up" ? "text-destructive" : stats?.trend === "down" ? "text-green-600" : "text-muted-foreground"}`}>
              <TrendIcon className="h-3 w-3" /> {stats?.trend ?? "no data"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Average purchase</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averagePurchasePrice != null ? `₹${stats.averagePurchasePrice.toFixed(2)}` : "—"}</div>
            {stats?.diffFromAverage != null && (
              <Badge variant={aboveAverage ? "destructive" : "default"} className="mt-1">
                {aboveAverage ? "Above" : "Below"} avg by ₹{Math.abs(stats.diffFromAverage).toFixed(2)} ({Math.abs(stats.diffPercent ?? 0).toFixed(1)}%)
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total bought</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(stats?.totalQuantityKg ?? 0).toLocaleString("en-IN")} kg</div><p className="text-xs text-muted-foreground mt-1">Across {stats?.totalEntries ?? 0} entries</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total spend</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{inr2(stats?.totalSpend ?? 0)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Last 30 days</CardTitle><CardDescription>Market vs. purchase price (₹/kg)</CardDescription></CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(stats?.last30Days ?? []) as any[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={["auto", "auto"]} />
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
        <CardHeader><CardTitle className="text-base">New copper entry</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-6">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...form.register("date")} /></div>
            <div className="space-y-1.5"><Label>Market ₹/kg</Label><Input type="number" step="0.01" {...form.register("marketPrice")} /></div>
            <div className="space-y-1.5"><Label>Purchase ₹/kg</Label><Input type="number" step="0.01" {...form.register("purchasePrice")} /></div>
            <div className="space-y-1.5"><Label>Quantity (kg)</Label><Input type="number" step="0.01" {...form.register("quantityKg")} /></div>
            <div className="space-y-1.5"><Label>Vendor</Label><Input {...form.register("vendor")} /></div>
            <div className="flex items-end"><Button type="submit" disabled={create.isPending} className="w-full">Record</Button></div>
            <div className="md:col-span-6 space-y-1.5"><Label>Notes</Label><Input {...form.register("notes")} /></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">All entries</CardTitle></CardHeader>
        <CardContent>
          {(entries ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No entries yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Vendor</TableHead><TableHead className="text-right">Market</TableHead><TableHead className="text-right">Purchase</TableHead><TableHead className="text-right">Qty (kg)</TableHead><TableHead className="text-right">Spend</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(entries ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{fmtDate(c.date)}</TableCell>
                    <TableCell>{c.vendor ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">₹{c.marketPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">₹{c.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{c.quantityKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{inr2(c.purchasePrice * c.quantityKg)}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate({ id: c.id }, { onSuccess: invalidate })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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
