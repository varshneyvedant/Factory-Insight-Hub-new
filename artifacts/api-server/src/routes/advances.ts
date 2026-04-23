import { Router, type IRouter } from "express";
import { db, advances, employees } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateAdvanceBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeAdvance, dateStr } from "../lib/serialize";

const router: IRouter = Router();

router.get("/advances", requireAuth, async (req, res) => {
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const rows = await db
    .select({ a: advances, e: employees })
    .from(advances)
    .innerJoin(employees, eq(employees.id, advances.employeeId))
    .where(employeeId ? eq(advances.employeeId, employeeId) : undefined)
    .orderBy(desc(advances.date), desc(advances.id));
  res.json(rows.map(({ a, e }) => serializeAdvance(a, e.name)));
});

router.post("/advances", requireAuth, async (req, res) => {
  const parsed = CreateAdvanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const data = parsed.data;
  const [emp] = await db.select().from(employees).where(eq(employees.id, data.employeeId));
  if (!emp) {
    res.status(404).json({ error: "employee not found" });
    return;
  }
  const [row] = await db
    .insert(advances)
    .values({
      employeeId: data.employeeId,
      amount: String(data.amount),
      date: dateStr(data.date),
      notes: data.notes ?? null,
    })
    .returning();
  res.status(201).json(serializeAdvance(row, emp.name));
});

router.delete("/advances/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(advances).where(eq(advances.id, id));
  res.status(204).end();
});

export default router;
