import { useGetStockSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, AlertTriangle } from "lucide-react";

export default function StockPage() {
  const { data: rows } = useGetStockSummary();

  const totalProduced = (rows ?? []).reduce((s: number, r: any) => s + r.producedKg, 0);
  const totalDispatched = (rows ?? []).reduce((s: number, r: any) => s + r.dispatchedKg, 0);
  const totalPending = (rows ?? []).reduce((s: number, r: any) => s + r.pendingKg, 0);
  const totalAvailable = (rows ?? []).reduce((s: number, r: any) => s + r.availableKg, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Boxes className="h-7 w-7" /> Stock</h1>
        <p className="text-muted-foreground">Available finished wire by gauge.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Produced</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{totalProduced.toFixed(1)} kg</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Dispatched</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{totalDispatched.toFixed(1)} kg</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pending orders</CardDescription></CardHeader><CardContent><div className="text-2xl font-bold">{totalPending.toFixed(1)} kg</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Available</CardDescription></CardHeader><CardContent><div className={`text-2xl font-bold ${totalAvailable < 0 ? "text-destructive" : ""}`}>{totalAvailable.toFixed(1)} kg</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Stock by gauge</CardTitle></CardHeader>
        <CardContent>
          {(rows ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No production data yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Gauge</TableHead><TableHead className="text-right">Produced</TableHead><TableHead className="text-right">Dispatched</TableHead><TableHead className="text-right">Pending</TableHead><TableHead className="text-right">Available</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(rows ?? []).map((r: any) => (
                  <TableRow key={r.gauge}>
                    <TableCell><Badge variant="outline">{r.gauge.toFixed(2)} mm</Badge></TableCell>
                    <TableCell className="text-right font-mono">{r.producedKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{r.dispatchedKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{r.pendingKg.toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${r.availableKg < 0 ? "text-destructive" : ""}`}>{r.availableKg.toFixed(2)}</TableCell>
                    <TableCell>{r.availableKg < r.pendingKg && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Low</Badge>}</TableCell>
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
