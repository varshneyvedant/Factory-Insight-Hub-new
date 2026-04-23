import { Router, type IRouter } from "express";
import { db, employees, attendance, salaryPayments, advances, copperEntries } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { num } from "../lib/serialize";
import { computeBalance } from "../lib/balance";

const router: IRouter = Router();

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

router.get("/dashboard/summary", requireAuth, async (_req, res) => {
  const [emps, sals, advs, copper, todayAtt] = await Promise.all([
    db.select().from(employees),
    db.select().from(salaryPayments),
    db.select().from(advances),
    db.select().from(copperEntries).orderBy(desc(copperEntries.date), desc(copperEntries.id)),
    db.select().from(attendance).where(eq(attendance.date, todayStr())),
  ]);

  const totalEmployees = emps.length;
  const activeEmployees = emps.filter((e) => e.active).length;
  const totalSalaryPaid = sals.filter((s) => s.status === "paid").reduce((s, r) => s + num(r.amount), 0);
  const totalSalaryPending = sals.filter((s) => s.status === "pending").reduce((s, r) => s + num(r.amount), 0);
  const totalAdvancesGiven = advs.reduce((s, r) => s + num(r.amount), 0);

  let copperCurrentPrice: number | null = null;
  let copperAveragePrice: number | null = null;
  let copperTrend: "up" | "down" | "flat" | "none" = "none";
  if (copper.length > 0) {
    copperCurrentPrice = num(copper[0]!.purchasePrice);
    copperAveragePrice = copper.reduce((s, r) => s + num(r.purchasePrice), 0) / copper.length;
    if (copper[1]) {
      const prev = num(copper[1].purchasePrice);
      if (copperCurrentPrice > prev) copperTrend = "up";
      else if (copperCurrentPrice < prev) copperTrend = "down";
      else copperTrend = "flat";
    }
  }

  const attendanceToday = {
    present: todayAtt.filter((a) => a.status === "present").length,
    absent: todayAtt.filter((a) => a.status === "absent").length,
    halfDay: todayAtt.filter((a) => a.status === "half_day").length,
  };

  // monthly payments for last 6 months
  const months: { month: string; paid: number; advances: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const paid = sals
      .filter((s) => s.status === "paid" && s.paymentDate.startsWith(ym))
      .reduce((sum, s) => sum + num(s.amount), 0);
    const adv = advs
      .filter((a) => a.date.startsWith(ym))
      .reduce((sum, a) => sum + num(a.amount), 0);
    months.push({ month: ym, paid, advances: adv });
  }

  res.json({
    totalEmployees,
    activeEmployees,
    totalSalaryPaid,
    totalSalaryPending,
    totalAdvancesGiven,
    copperCurrentPrice,
    copperAveragePrice,
    copperTrend,
    attendanceToday,
    monthlyPayments: months,
  });
});

router.get("/dashboard/employee-balances", requireAuth, async (_req, res) => {
  const emps = await db.select().from(employees);
  const result = await Promise.all(
    emps.map(async (emp) => {
      const [att, sal, adv] = await Promise.all([
        db.select().from(attendance).where(eq(attendance.employeeId, emp.id)),
        db.select().from(salaryPayments).where(eq(salaryPayments.employeeId, emp.id)),
        db.select().from(advances).where(eq(advances.employeeId, emp.id)),
      ]);
      return computeBalance(emp, att, sal, adv);
    }),
  );
  res.json(result);
});

router.get("/dashboard/recent-activity", requireAuth, async (_req, res) => {
  const [sals, advs, copper, emps, atts] = await Promise.all([
    db.select({ s: salaryPayments, e: employees })
      .from(salaryPayments)
      .innerJoin(employees, eq(employees.id, salaryPayments.employeeId))
      .orderBy(desc(salaryPayments.createdAt))
      .limit(10),
    db.select({ a: advances, e: employees })
      .from(advances)
      .innerJoin(employees, eq(employees.id, advances.employeeId))
      .orderBy(desc(advances.createdAt))
      .limit(10),
    db.select().from(copperEntries).orderBy(desc(copperEntries.createdAt)).limit(10),
    db.select().from(employees).orderBy(desc(employees.createdAt)).limit(10),
    db.select({ a: attendance, e: employees })
      .from(attendance)
      .innerJoin(employees, eq(employees.id, attendance.employeeId))
      .orderBy(desc(attendance.createdAt))
      .limit(10),
  ]);

  const items: any[] = [];
  for (const { s, e } of sals) {
    items.push({
      id: `salary-${s.id}`,
      type: "salary",
      title: `Salary ${s.status === "paid" ? "paid to" : "pending for"} ${e.name}`,
      subtitle: `Period ${s.periodMonth}`,
      amount: num(s.amount),
      timestamp: (s.createdAt as Date).toISOString(),
    });
  }
  for (const { a, e } of advs) {
    items.push({
      id: `advance-${a.id}`,
      type: "advance",
      title: `Advance given to ${e.name}`,
      subtitle: a.notes ?? "Cash advance",
      amount: num(a.amount),
      timestamp: (a.createdAt as Date).toISOString(),
    });
  }
  for (const c of copper) {
    items.push({
      id: `copper-${c.id}`,
      type: "copper",
      title: `Copper purchase logged`,
      subtitle: `${num(c.quantityKg)} kg @ ₹${num(c.purchasePrice).toFixed(2)}/kg${c.vendor ? ` from ${c.vendor}` : ""}`,
      amount: num(c.purchasePrice) * num(c.quantityKg),
      timestamp: (c.createdAt as Date).toISOString(),
    });
  }
  for (const e of emps) {
    items.push({
      id: `employee-${e.id}`,
      type: "employee",
      title: `${e.name} added`,
      subtitle: e.position,
      amount: null,
      timestamp: (e.createdAt as Date).toISOString(),
    });
  }
  for (const { a, e } of atts) {
    items.push({
      id: `attendance-${a.id}`,
      type: "attendance",
      title: `${e.name} marked ${a.status.replace("_", " ")}`,
      subtitle: `Date ${a.date}`,
      amount: null,
      timestamp: (a.createdAt as Date).toISOString(),
    });
  }

  items.sort((x, y) => (x.timestamp < y.timestamp ? 1 : -1));
  res.json(items.slice(0, 25));
});

export default router;
