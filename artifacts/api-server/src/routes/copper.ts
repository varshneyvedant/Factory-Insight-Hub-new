import { Router, type IRouter } from "express";
import { db, copperEntries } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateCopperEntryBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeCopper, num, dateStr } from "../lib/serialize";

const router: IRouter = Router();

router.get("/copper", requireAuth, async (_req, res) => {
  const rows = await db.select().from(copperEntries).orderBy(desc(copperEntries.date), desc(copperEntries.id));
  res.json(rows.map(serializeCopper));
});

router.post("/copper", requireAuth, async (req, res) => {
  const parsed = CreateCopperEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(copperEntries)
    .values({
      date: dateStr(data.date),
      marketPrice: String(data.marketPrice),
      purchasePrice: String(data.purchasePrice),
      quantityKg: String(data.quantityKg),
      vendor: data.vendor ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  res.status(201).json(serializeCopper(row));
});

router.delete("/copper/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(copperEntries).where(eq(copperEntries.id, id));
  res.status(204).end();
});

router.get("/copper/stats", requireAuth, async (_req, res) => {
  const rows = await db.select().from(copperEntries).orderBy(desc(copperEntries.date), desc(copperEntries.id));
  if (rows.length === 0) {
    res.json({
      currentPrice: null,
      currentMarketPrice: null,
      averagePurchasePrice: null,
      averageMarketPrice: null,
      diffFromAverage: null,
      diffPercent: null,
      trend: "none",
      totalEntries: 0,
      totalQuantityKg: 0,
      totalSpend: 0,
      last30Days: [],
    });
    return;
  }
  const current = rows[0];
  const previous = rows[1];
  const avgPurchase = rows.reduce((s, r) => s + num(r.purchasePrice), 0) / rows.length;
  const avgMarket = rows.reduce((s, r) => s + num(r.marketPrice), 0) / rows.length;
  const totalQuantity = rows.reduce((s, r) => s + num(r.quantityKg), 0);
  const totalSpend = rows.reduce((s, r) => s + num(r.purchasePrice) * num(r.quantityKg), 0);
  const currentPrice = num(current.purchasePrice);
  const diff = currentPrice - avgPurchase;
  const diffPercent = avgPurchase > 0 ? (diff / avgPurchase) * 100 : 0;
  let trend: "up" | "down" | "flat" | "none" = "none";
  if (previous) {
    const pp = num(previous.purchasePrice);
    if (currentPrice > pp) trend = "up";
    else if (currentPrice < pp) trend = "down";
    else trend = "flat";
  }
  const last30 = rows.slice(0, 30).reverse().map((r) => ({
    date: r.date,
    marketPrice: num(r.marketPrice),
    purchasePrice: num(r.purchasePrice),
  }));
  res.json({
    currentPrice,
    currentMarketPrice: num(current.marketPrice),
    averagePurchasePrice: avgPurchase,
    averageMarketPrice: avgMarket,
    diffFromAverage: diff,
    diffPercent,
    trend,
    totalEntries: rows.length,
    totalQuantityKg: totalQuantity,
    totalSpend,
    last30Days: last30,
  });
});

export default router;
