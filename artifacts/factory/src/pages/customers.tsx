import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers,
  useCreateCustomer,
  useDeleteCustomer,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, UserSquare2 } from "lucide-react";
import { inr2 } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: customers } = useListCustomers();
  const create = useCreateCustomer();
  const del = useDeleteCustomer();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", phone: "", address: "", gstin: "", notes: "" },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCustomersQueryKey() });

  const onSubmit = (data: FormData) => {
    create.mutate(
      { data: { ...data, phone: data.phone || undefined, address: data.address || undefined, gstin: data.gstin || undefined, notes: data.notes || undefined } as any },
      { onSuccess: () => { invalidate(); setOpen(false); form.reset(); toast({ title: "Customer added" }); } },
    );
  };

  const filtered = (customers ?? []).filter((c: any) =>
    [c.name, c.phone, c.gstin, c.address].some((f) => f && String(f).toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><UserSquare2 className="h-7 w-7" /> Customers</h1>
          <p className="text-muted-foreground">Buyers of finished winding wire.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add customer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New customer</DialogTitle></DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label><Input {...form.register("name")} /></div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5"><Label>Phone</Label><Input {...form.register("phone")} /></div>
                <div className="space-y-1.5"><Label>GSTIN</Label><Input {...form.register("gstin")} /></div>
              </div>
              <div className="space-y-1.5"><Label>Address</Label><Input {...form.register("address")} /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Input {...form.register("notes")} /></div>
              <DialogFooter><Button type="submit" disabled={create.isPending}>Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">All customers</CardTitle></CardHeader>
        <CardContent>
          <Input placeholder="Search by name, phone, GSTIN…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm mb-4" />
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No customers yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>GSTIN</TableHead><TableHead>Address</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Total value</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{c.gstin ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{c.address ?? "—"}</TableCell>
                    <TableCell className="text-right">{c.totalOrders}</TableCell>
                    <TableCell className="text-right font-mono">{inr2(c.totalValue)}</TableCell>
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
