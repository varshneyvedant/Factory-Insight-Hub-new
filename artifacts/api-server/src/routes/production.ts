import { Router, type IRouter } from "express";
import { db, productionBatches, employees } from "@workspace/db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { CreateProductionBatchBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeProduction, num, dateStr } from "../lib/serialize";

const router: IRouter = Router();

router.get("/production", requireAuth, async (req, res) => {
  const filters = [] as any[];
  if (req.query.from) filters.push(gte(productionBatches.date, String(req.query.from)));
  if (req.query.to) filters.push(lte(productionBatches.date, String(req.query.to)));
  if (req.query.gauge) filters.push(eq(productionBatches.gauge, String(req.query.gauge)));
  const rows = await db
    .select({ b: productionBatches, opName: employees.name })
    .from(productionBatches)
    .leftJoin(employees, eq(productionBatches.operatorId, employees.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(productionBatches.date), desc(productionBatches.id));
  res.json(rows.map((r) => serializeProduction(r.b, r.opName)));
});

router.post("/production", requireAuth, async (req, res) => {
  const parsed = CreateProductionBatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input", details: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(productionBatches)
    .values({
      date: dateStr(data.date),
      gauge: String(data.gauge),
      copperInputKg: String(data.copperInputKg),
      outputKg: String(data.outputKg),
      scrapKg: String(data.scrapKg ?? 0),
      operatorId: data.operatorId ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  let opName: string | null = null;
  if (row.operatorId) {
    const [op] = await db.select().from(employees).where(eq(employees.id, row.operatorId));
    opName = op?.name ?? null;
  }
  res.status(201).json(serializeProduction(row, opName));
});

router.delete("/production/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(productionBatches).where(eq(productionBatches.id, id));
  res.status(204).end();
});

router.get("/production/stats", requireAuth, async (_req, res) => {
  const rows = await db.select().from(productionBatches);
  const totalCopperInputKg = rows.reduce((s, r) => s + num(r.copperInputKg), 0);
  const totalOutputKg = rows.reduce((s, r) => s + num(r.outputKg), 0);
  const totalScrapKg = rows.reduce((s, r) => s + num(r.scrapKg), 0);
  const yieldPercent = totalCopperInputKg > 0 ? (totalOutputKg / totalCopperInputKg) * 100 : 0;

  // Last 30 days aggregation
  const today = new Date();
  const days: { date: string; outputKg: number; scrapKg: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const matching = rows.filter((r) => r.date === key);
    days.push({
      date: key,
      outputKg: matching.reduce((s, r) => s + num(r.outputKg), 0),
      scrapKg: matching.reduce((s, r) => s + num(r.scrapKg), 0),
    });
  }

  const byGaugeMap = new Map<number, number>();
  for (const r of rows) {
    const g = num(r.gauge);
    byGaugeMap.set(g, (byGaugeMap.get(g) ?? 0) + num(r.outputKg));
  }
  const byGauge = Array.from(byGaugeMap.entries())
    .map(([gauge, outputKg]) => ({ gauge, outputKg }))
    .sort((a, b) => a.gauge - b.gauge);

  res.json({
    totalBatches: rows.length,
    totalCopperInputKg,
    totalOutputKg,
    totalScrapKg,
    yieldPercent,
    last30Days: days,
    byGauge,
  });
});

export default router;
