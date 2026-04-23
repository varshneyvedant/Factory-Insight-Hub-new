import { Router, type IRouter } from "express";
import { db, attendance, employees } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { RecordAttendanceBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeAttendance, dateStr } from "../lib/serialize";

const router: IRouter = Router();

router.get("/attendance", requireAuth, async (req, res) => {
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  const conds = [] as any[];
  if (employeeId) conds.push(eq(attendance.employeeId, employeeId));
  if (from) conds.push(gte(attendance.date, from));
  if (to) conds.push(lte(attendance.date, to));
  const rows = await db
    .select({ a: attendance, e: employees })
    .from(attendance)
    .innerJoin(employees, eq(employees.id, attendance.employeeId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(attendance.date), desc(attendance.id));
  res.json(rows.map(({ a, e }) => serializeAttendance(a, e.name)));
});

router.post("/attendance", requireAuth, async (req, res) => {
  const parsed = RecordAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const { employeeId, date: rawDate, status, notes } = parsed.data;
  const d = dateStr(rawDate);
  const [emp] = await db.select().from(employees).where(eq(employees.id, employeeId));
  if (!emp) {
    res.status(404).json({ error: "employee not found" });
    return;
  }
  // upsert-like: replace existing entry for this employee/date
  await db
    .delete(attendance)
    .where(and(eq(attendance.employeeId, employeeId), eq(attendance.date, d)));
  const [row] = await db
    .insert(attendance)
    .values({ employeeId, date: d, status, notes: notes ?? null })
    .returning();
  res.status(201).json(serializeAttendance(row, emp.name));
});

router.delete("/attendance/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(attendance).where(eq(attendance.id, id));
  res.status(204).end();
});

export default router;
