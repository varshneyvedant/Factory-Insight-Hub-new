import { Router, type IRouter } from "express";
import { db, customers, salesOrders, salesOrderItems } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCustomerBody, UpdateCustomerBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeCustomer, num } from "../lib/serialize";

const router: IRouter = Router();

async function buildCustomerTotals() {
  const rows = await db
    .select({
      customerId: salesOrders.id,
      customerRef: salesOrders.customerId,
      qty: salesOrderItems.quantityKg,
      price: salesOrderItems.pricePerKg,
    })
    .from(salesOrders)
    .leftJoin(salesOrderItems, eq(salesOrderItems.orderId, salesOrders.id));
  const map = new Map<number, { totalOrders: Set<number>; totalValue: number }>();
  for (const r of rows) {
    const cid = r.customerRef;
    if (!map.has(cid)) map.set(cid, { totalOrders: new Set(), totalValue: 0 });
    const entry = map.get(cid)!;
    entry.totalOrders.add(r.customerId);
    if (r.qty && r.price) entry.totalValue += num(r.qty) * num(r.price);
  }
  return map;
}

router.get("/customers", requireAuth, async (_req, res) => {
  const rows = await db.select().from(customers).orderBy(customers.name);
  const totals = await buildCustomerTotals();
  res.json(
    rows.map((c) => {
      const t = totals.get(c.id);
      return serializeCustomer(c, t?.totalOrders.size ?? 0, t?.totalValue ?? 0);
    }),
  );
});

router.post("/customers", requireAuth, async (req, res) => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(customers)
    .values({
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      gstin: data.gstin ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  res.status(201).json(serializeCustomer(row));
});

router.put("/customers/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .update(customers)
    .set({
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
      gstin: data.gstin ?? null,
      notes: data.notes ?? null,
    })
    .where(eq(customers.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(serializeCustomer(row));
});

router.delete("/customers/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(customers).where(eq(customers.id, id));
  res.status(204).end();
});

export default router;
