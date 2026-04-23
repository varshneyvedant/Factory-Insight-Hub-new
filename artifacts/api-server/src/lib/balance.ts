import { num } from "./serialize";

export function computeBalance(emp: any, att: any[], sal: any[], adv: any[]) {
  const monthlySalary = num(emp.monthlySalary);
  const joiningDate = new Date(emp.joiningDate);
  const now = new Date();
  const months = Math.max(
    1,
    (now.getFullYear() - joiningDate.getFullYear()) * 12 +
      (now.getMonth() - joiningDate.getMonth()) +
      1,
  );
  const totalEarned = monthlySalary * months;
  const totalPaid = sal
    .filter((s) => s.status === "paid")
    .reduce((sum, s) => sum + num(s.amount), 0);
  const totalAdvances = adv.reduce((sum, a) => sum + num(a.amount), 0);
  const remainingDue = Math.max(0, totalEarned - totalPaid - totalAdvances);
  const daysPresent = att.filter((a) => a.status === "present").length + att.filter((a) => a.status === "half_day").length * 0.5;
  const daysAbsent = att.filter((a) => a.status === "absent").length;
  return {
    employeeId: emp.id,
    employeeName: emp.name,
    position: emp.position,
    monthlySalary,
    totalEarned,
    totalPaid,
    totalAdvances,
    remainingDue,
    daysPresent: Math.round(daysPresent),
    daysAbsent,
  };
}
