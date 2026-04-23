import { Router, type IRouter } from "express";
import { db, salesOrders, salesOrderItems, customers } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateOrderBody, UpdateOrderStatusBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeOrder, dateStr } from "../lib/serialize";

const router: IRouter = Router();

async function loadOrder(id: number) {
  const [o] = await db
    .select({ o: salesOrders, customerName: customers.name })
    .from(salesOrders)
    .innerJoin(customers, eq(customers.id, salesOrders.customerId))
    .where(eq(salesOrders.id, id));
  if (!o) return null;
  const items = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, id));
  return serializeOrder(o.o, o.customerName, items);
}

router.get("/orders", requireAuth, async (req, res) => {
  const filters = [] as any[];
  if (req.query.customerId) filters.push(eq(salesOrders.customerId, Number(req.query.customerId)));
  if (req.query.status) filters.push(eq(salesOrders.status, String(req.query.status)));
  const rows = await db
    .select({ o: salesOrders, customerName: customers.name })
    .from(salesOrders)
    .innerJoin(customers, eq(customers.id, salesOrders.customerId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(salesOrders.orderDate), desc(salesOrders.id));
  const ids = rows.map((r) => r.o.id);
  const items = ids.length
    ? await db.select().from(salesOrderItems).where(
        // eq with array isn't directly supported; use inArray
        // import lazily
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        (await import("drizzle-orm")).inArray(salesOrderItems.orderId, ids),
      )
    : [];
  const itemsByOrder = new Map<number, any[]>();
  for (const it of items) {
    if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
    itemsByOrder.get(it.orderId)!.push(it);
  }
  res.json(rows.map((r) => serializeOrder(r.o, r.customerName, itemsByOrder.get(r.o.id) ?? [])));
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const order = await loadOrder(Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(order);
});

router.post("/orders", requireAuth, async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const [order] = await db
    .insert(salesOrders)
    .values({
      customerId: data.customerId,
      orderDate: dateStr(data.orderDate),
      status: data.status,
      notes: data.notes ?? null,
    })
    .returning();
  if (data.items.length) {
    await db.insert(salesOrderItems).values(
      data.items.map((i) => ({
        orderId: order.id,
        gauge: String(i.gauge),
        quantityKg: String(i.quantityKg),
        pricePerKg: String(i.pricePerKg),
      })),
    );
  }
  const full = await loadOrder(order.id);
  res.status(201).json(full);
});

router.patch("/orders/:id/status", requireAuth, async (req, res) => {
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const id = Number(req.params.id);
  const [row] = await db
    .update(salesOrders)
    .set({ status: parsed.data.status })
    .where(eq(salesOrders.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const full = await loadOrder(id);
  res.json(full);
});

router.delete("/orders/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(salesOrders).where(eq(salesOrders.id, id));
  res.status(204).end();
});

export default router;
