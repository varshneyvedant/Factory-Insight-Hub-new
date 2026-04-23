import { Router, type IRouter } from "express";
import { db, salaryPayments, employees } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateSalaryPaymentBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeSalary, dateStr } from "../lib/serialize";

const router: IRouter = Router();

router.get("/salaries", requireAuth, async (req, res) => {
  const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
  const rows = await db
    .select({ s: salaryPayments, e: employees })
    .from(salaryPayments)
    .innerJoin(employees, eq(employees.id, salaryPayments.employeeId))
    .where(employeeId ? eq(salaryPayments.employeeId, employeeId) : undefined)
    .orderBy(desc(salaryPayments.paymentDate), desc(salaryPayments.id));
  res.json(rows.map(({ s, e }) => serializeSalary(s, e.name)));
});

router.post("/salaries", requireAuth, async (req, res) => {
  const parsed = CreateSalaryPaymentBody.safeParse(req.body);
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
    .insert(salaryPayments)
    .values({
      employeeId: data.employeeId,
      amount: String(data.amount),
      paymentDate: dateStr(data.paymentDate),
      periodMonth: data.periodMonth,
      status: data.status,
      notes: data.notes ?? null,
    })
    .returning();
  res.status(201).json(serializeSalary(row, emp.name));
});

router.delete("/salaries/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(salaryPayments).where(eq(salaryPayments.id, id));
  res.status(204).end();
});

export default router;
