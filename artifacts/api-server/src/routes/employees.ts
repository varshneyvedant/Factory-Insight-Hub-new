import { Router, type IRouter } from "express";
import { db, employees, attendance, salaryPayments, advances } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateEmployeeBody, UpdateEmployeeBody } from "@workspace/api-zod";
import { requireAuth, requireOwner } from "../middlewares/auth";
import { serializeEmployee, serializeAttendance, serializeSalary, serializeAdvance, num, dateStr } from "../lib/serialize";
import { computeBalance } from "../lib/balance";

const router: IRouter = Router();

router.get("/employees", requireAuth, async (_req, res) => {
  const rows = await db.select().from(employees).orderBy(desc(employees.active), employees.name);
  res.json(rows.map(serializeEmployee));
});

router.post("/employees", requireOwner, async (req, res) => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input", details: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(employees)
    .values({
      name: data.name,
      position: data.position,
      phone: data.phone ?? null,
      dailyWage: String(data.dailyWage),
      monthlySalary: String(data.monthlySalary),
      joiningDate: dateStr(data.joiningDate),
      active: data.active ?? true,
    })
    .returning();
  res.status(201).json(serializeEmployee(row));
});

router.get("/employees/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [emp] = await db.select().from(employees).where(eq(employees.id, id));
  if (!emp) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const [att, sal, adv] = await Promise.all([
    db.select().from(attendance).where(eq(attendance.employeeId, id)).orderBy(desc(attendance.date)),
    db.select().from(salaryPayments).where(eq(salaryPayments.employeeId, id)).orderBy(desc(salaryPayments.paymentDate)),
    db.select().from(advances).where(eq(advances.employeeId, id)).orderBy(desc(advances.date)),
  ]);
  const balance = computeBalance(emp, att, sal, adv);
  res.json({
    employee: serializeEmployee(emp),
    attendance: att.map((a) => serializeAttendance(a, emp.name)),
    salaryPayments: sal.map((s) => serializeSalary(s, emp.name)),
    advances: adv.map((a) => serializeAdvance(a, emp.name)),
    balance,
  });
});

router.put("/employees/:id", requireOwner, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .update(employees)
    .set({
      name: data.name,
      position: data.position,
      phone: data.phone ?? null,
      dailyWage: String(data.dailyWage),
      monthlySalary: String(data.monthlySalary),
      joiningDate: dateStr(data.joiningDate),
      active: data.active ?? true,
    })
    .where(eq(employees.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(serializeEmployee(row));
});

router.delete("/employees/:id", requireOwner, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(employees).where(eq(employees.id, id));
  res.status(204).end();
});

export default router;
export { num };
