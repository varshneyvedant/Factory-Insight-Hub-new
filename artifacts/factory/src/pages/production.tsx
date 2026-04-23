import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProductionBatches,
  useCreateProductionBatch,
  useDeleteProductionBatch,
  useGetProductionStats,
  useListEmployees,
  getListProductionBatchesQueryKey,
  getGetProductionStatsQueryKey,
  getGetStockSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Factory } from "lucide-react";
import { fmtDate, todayYmd } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  date: z.string().min(1),
  gauge: z.coerce.number().min(0),
  copperInputKg: z.coerce.number().min(0),
  outputKg: z.coerce.number().min(0),
  scrapKg: z.coerce.number().min(0),
  operatorId: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ProductionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: batches } = useListProductionBatches();
  const { data: stats } = useGetProductionStats();
  const { data: employees } = useListEmployees();
  const create = useCreateProductionBatch();
  const del = useDeleteProductionBatch();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { date: todayYmd(), gauge: 1.0, copperInputKg: 0, outputKg: 0, scrapKg: 0, operatorId: "", notes: "" },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListProductionBatchesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetProductionStatsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetStockSummaryQueryKey() });
  };

  const onSubmit = (data: FormData) => {
    create.mutate(
      {
        data: {
          ...data,
          date: new Date(data.date),
          operatorId: data.operatorId ? Number(data.operatorId) : undefined,
          notes: data.notes || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          invalidate();
          form.reset({ ...form.getValues(), copperInputKg: 0, outputKg: 0, scrapKg: 0, notes: "" });
          toast({ title: "Batch recorded" });
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Factory className="h-7 w-7" /> Production</h1>
        <p className="text-muted-foreground">Record daily wire production batches and track yield.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total batches</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.totalBatches ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Copper consumed</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{(stats?.totalCopperInputKg ?? 0).toFixed(1)} kg</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Wire produced</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.totalOutputKg ?? 0).toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground mt-1">Scrap {(stats?.totalScrapKg ?? 0).toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Yield</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.yieldPercent ?? 0).toFixed(1)}%</div>
            <Badge variant={(stats?.yieldPercent ?? 0) >= 95 ? "default" : "destructive"} className="mt-1">
              {(stats?.yieldPercent ?? 0) >= 95 ? "Healthy" : "Watch"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Output last 30 days</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(stats?.last30Days ?? []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="outputKg" name="Output kg" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="scrapKg" name="Scrap kg" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Output by gauge</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(stats?.byGauge ?? []) as any[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="gauge" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v} mm`} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="outputKg" name="Output kg" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">New production batch</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-7">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...form.register("date")} /></div>
            <div className="space-y-1.5"><Label>Gauge (mm)</Label><Input type="number" step="0.01" {...form.register("gauge")} /></div>
            <div className="space-y-1.5"><Label>Copper in (kg)</Label><Input type="number" step="0.001" {...form.register("copperInputKg")} /></div>
            <div className="space-y-1.5"><Label>Output (kg)</Label><Input type="number" step="0.001" {...form.register("outputKg")} /></div>
            <div className="space-y-1.5"><Label>Scrap (kg)</Label><Input type="number" step="0.001" {...form.register("scrapKg")} /></div>
            <div className="space-y-1.5">
              <Label>Operator</Label>
              <Select value={form.watch("operatorId")} onValueChange={(v) => form.setValue("operatorId", v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map((e: any) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end"><Button type="submit" disabled={create.isPending} className="w-full">Record</Button></div>
            <div className="md:col-span-7 space-y-1.5"><Label>Notes</Label><Input {...form.register("notes")} /></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent batches</CardTitle></CardHeader>
        <CardContent>
          {(batches ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No batches yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Gauge</TableHead><TableHead>Operator</TableHead><TableHead className="text-right">Copper in</TableHead><TableHead className="text-right">Output</TableHead><TableHead className="text-right">Scrap</TableHead><TableHead className="text-right">Yield</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(batches ?? []).map((b: any) => {
                  const yieldP = b.copperInputKg > 0 ? (b.outputKg / b.copperInputKg) * 100 : 0;
                  return (
                    <TableRow key={b.id}>
                      <TableCell>{fmtDate(b.date)}</TableCell>
                      <TableCell><Badge variant="outline">{b.gauge.toFixed(2)} mm</Badge></TableCell>
                      <TableCell>{b.operatorName ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono">{b.copperInputKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{b.outputKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{b.scrapKg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{yieldP.toFixed(1)}%</TableCell>
                      <TableCell><Button size="icon" variant="ghost" onClick={() => del.mutate({ id: b.id }, { onSuccess: invalidate })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
