import { Router, type IRouter } from "express";
import { db, productionBatches, salesOrders, salesOrderItems } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { num } from "../lib/serialize";

const router: IRouter = Router();

router.get("/stock", requireAuth, async (_req, res) => {
  const prod = await db.select().from(productionBatches);
  const orders = await db.select().from(salesOrders);
  const items = await db.select().from(salesOrderItems);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const map = new Map<number, { producedKg: number; dispatchedKg: number; pendingKg: number }>();
  const get = (g: number) => {
    if (!map.has(g)) map.set(g, { producedKg: 0, dispatchedKg: 0, pendingKg: 0 });
    return map.get(g)!;
  };
  for (const p of prod) get(num(p.gauge)).producedKg += num(p.outputKg);
  for (const it of items) {
    const order = orderById.get(it.orderId);
    if (!order || order.status === "cancelled") continue;
    const entry = get(num(it.gauge));
    if (order.status === "dispatched") entry.dispatchedKg += num(it.quantityKg);
    else if (order.status === "pending") entry.pendingKg += num(it.quantityKg);
  }
  const rows = Array.from(map.entries())
    .map(([gauge, v]) => ({
      gauge,
      ...v,
      availableKg: v.producedKg - v.dispatchedKg - v.pendingKg,
    }))
    .sort((a, b) => a.gauge - b.gauge);
  res.json(rows);
});

export default router;
