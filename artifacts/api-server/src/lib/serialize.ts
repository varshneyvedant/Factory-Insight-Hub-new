export function dateStr(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseFloat(v);
}

export function serializeEmployee(e: any) {
  return {
    id: e.id,
    name: e.name,
    position: e.position,
    phone: e.phone ?? null,
    dailyWage: num(e.dailyWage),
    monthlySalary: num(e.monthlySalary),
    joiningDate: e.joiningDate,
    active: e.active,
    createdAt: (e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt)).toISOString(),
  };
}

export function serializeAttendance(a: any, employeeName: string) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employeeName,
    date: a.date,
    status: a.status,
    notes: a.notes ?? null,
    createdAt: (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).toISOString(),
  };
}

export function serializeSalary(s: any, employeeName: string) {
  return {
    id: s.id,
    employeeId: s.employeeId,
    employeeName,
    amount: num(s.amount),
    paymentDate: s.paymentDate,
    periodMonth: s.periodMonth,
    status: s.status,
    notes: s.notes ?? null,
    createdAt: (s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt)).toISOString(),
  };
}

export function serializeAdvance(a: any, employeeName: string) {
  return {
    id: a.id,
    employeeId: a.employeeId,
    employeeName,
    amount: num(a.amount),
    date: a.date,
    notes: a.notes ?? null,
    createdAt: (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)).toISOString(),
  };
}

export function serializeProduction(p: any, operatorName?: string | null) {
  return {
    id: p.id,
    date: p.date,
    gauge: num(p.gauge),
    copperInputKg: num(p.copperInputKg),
    outputKg: num(p.outputKg),
    scrapKg: num(p.scrapKg),
    operatorId: p.operatorId ?? null,
    operatorName: operatorName ?? null,
    notes: p.notes ?? null,
    createdAt: (p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)).toISOString(),
  };
}

export function serializeCustomer(c: any, totalOrders = 0, totalValue = 0) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    address: c.address ?? null,
    gstin: c.gstin ?? null,
    notes: c.notes ?? null,
    totalOrders,
    totalValue,
    createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
  };
}

export function serializeOrderItem(it: any) {
  const qty = num(it.quantityKg);
  const price = num(it.pricePerKg);
  return {
    id: it.id,
    gauge: num(it.gauge),
    quantityKg: qty,
    pricePerKg: price,
    lineTotal: qty * price,
  };
}

export function serializeOrder(o: any, customerName: string, items: any[]) {
  const sItems = items.map(serializeOrderItem);
  const totalQuantityKg = sItems.reduce((s, i) => s + i.quantityKg, 0);
  const totalValue = sItems.reduce((s, i) => s + i.lineTotal, 0);
  return {
    id: o.id,
    customerId: o.customerId,
    customerName,
    orderDate: o.orderDate,
    status: o.status,
    notes: o.notes ?? null,
    items: sItems,
    totalQuantityKg,
    totalValue,
    createdAt: (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt)).toISOString(),
  };
}

export function serializeCopper(c: any) {
  return {
    id: c.id,
    date: c.date,
    marketPrice: num(c.marketPrice),
    purchasePrice: num(c.purchasePrice),
    quantityKg: num(c.quantityKg),
    vendor: c.vendor ?? null,
    notes: c.notes ?? null,
    createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
  };
}
