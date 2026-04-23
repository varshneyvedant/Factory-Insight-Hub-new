import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListOrders,
  useCreateOrder,
  useDeleteOrder,
  useUpdateOrderStatus,
  useListCustomers,
  getListOrdersQueryKey,
  getGetStockSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart, Truck, X } from "lucide-react";
import { inr2, fmtDate, todayYmd } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const itemSchema = z.object({
  gauge: z.coerce.number().min(0),
  quantityKg: z.coerce.number().min(0),
  pricePerKg: z.coerce.number().min(0),
});

const schema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().min(1),
  status: z.enum(["pending", "dispatched", "cancelled"]),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});
type FormData = z.infer<typeof schema>;

const statusVariant = (s: string) =>
  s === "dispatched" ? "default" : s === "cancelled" ? "destructive" : "secondary";

export default function OrdersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: orders } = useListOrders(statusFilter === "all" ? undefined : { status: statusFilter });
  const { data: customers } = useListCustomers();
  const create = useCreateOrder();
  const del = useDeleteOrder();
  const updateStatus = useUpdateOrderStatus();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      customerId: "",
      orderDate: todayYmd(),
      status: "pending",
      notes: "",
      items: [{ gauge: 1.0, quantityKg: 0, pricePerKg: 0 }],
    },
  });
  const items = useFieldArray({ control: form.control, name: "items" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetStockSummaryQueryKey() });
  };

  const onSubmit = (data: FormData) => {
    create.mutate(
      {
        data: {
          customerId: Number(data.customerId),
          orderDate: new Date(data.orderDate),
          status: data.status,
          notes: data.notes || undefined,
          items: data.items,
        } as any,
      },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          form.reset({ customerId: "", orderDate: todayYmd(), status: "pending", notes: "", items: [{ gauge: 1.0, quantityKg: 0, pricePerKg: 0 }] });
          toast({ title: "Order created" });
        },
      },
    );
  };

  const watchItems = form.watch("items");
  const orderTotal = watchItems.reduce((s, i) => s + (Number(i.quantityKg) || 0) * (Number(i.pricePerKg) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><ShoppingCart className="h-7 w-7" /> Sales orders</h1>
          <p className="text-muted-foreground">Track customer orders from booking to dispatch.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New order</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New order</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-3 grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Customer</Label>
                    <Select value={form.watch("customerId")} onValueChange={(v) => form.setValue("customerId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {(customers ?? []).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Date</Label><Input type="date" {...form.register("orderDate")} /></div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Line items</Label>
                    <Button type="button" size="sm" variant="outline" onClick={() => items.append({ gauge: 1.0, quantityKg: 0, pricePerKg: 0 })}><Plus className="h-3 w-3 mr-1" /> Add row</Button>
                  </div>
                  <div className="space-y-2">
                    {items.fields.map((f, idx) => (
                      <div key={f.id} className="grid gap-2 grid-cols-[1fr_1fr_1fr_auto] items-end">
                        <div className="space-y-1"><Label className="text-xs">Gauge (mm)</Label><Input type="number" step="0.01" {...form.register(`items.${idx}.gauge`)} /></div>
                        <div className="space-y-1"><Label className="text-xs">Qty (kg)</Label><Input type="number" step="0.001" {...form.register(`items.${idx}.quantityKg`)} /></div>
                        <div className="space-y-1"><Label className="text-xs">Price ₹/kg</Label><Input type="number" step="0.01" {...form.register(`items.${idx}.pricePerKg`)} /></div>
                        <Button type="button" size="icon" variant="ghost" disabled={items.fields.length === 1} onClick={() => items.remove(idx)}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="text-right text-sm text-muted-foreground mt-2">Total: <span className="font-mono font-bold text-foreground">{inr2(orderTotal)}</span></div>
                </div>

                <div className="space-y-1.5"><Label>Notes</Label><Input {...form.register("notes")} /></div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Create order</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Orders</CardTitle></CardHeader>
        <CardContent>
          {(orders ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Qty (kg)</TableHead><TableHead className="text-right">Value</TableHead><TableHead>Status</TableHead><TableHead className="w-[180px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {(orders ?? []).map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{fmtDate(o.orderDate)}</TableCell>
                    <TableCell className="font-medium">{o.customerName}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {o.items.map((i: any) => (
                          <div key={i.id}>{i.gauge.toFixed(2)} mm × {i.quantityKg.toFixed(2)} kg @ ₹{i.pricePerKg.toFixed(2)}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{o.totalQuantityKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{inr2(o.totalValue)}</TableCell>
                    <TableCell><Badge variant={statusVariant(o.status) as any}>{o.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {o.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, data: { status: "dispatched" } as any }, { onSuccess: invalidate })}>
                            <Truck className="h-3 w-3 mr-1" /> Dispatch
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => del.mutate({ id: o.id }, { onSuccess: invalidate })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
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
