import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  phone: text("phone"),
  dailyWage: numeric("daily_wage", { precision: 12, scale: 2 }).notNull().default("0"),
  monthlySalary: numeric("monthly_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  joiningDate: date("joining_date").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salaryPayments = pgTable("salary_payments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  periodMonth: text("period_month").notNull(),
  status: text("status").notNull().default("paid"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const advances = pgTable("advances", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  gauge: numeric("gauge", { precision: 6, scale: 3 }).notNull(),
  copperInputKg: numeric("copper_input_kg", { precision: 12, scale: 3 }).notNull(),
  outputKg: numeric("output_kg", { precision: 12, scale: 3 }).notNull(),
  scrapKg: numeric("scrap_kg", { precision: 12, scale: 3 }).notNull().default("0"),
  operatorId: integer("operator_id").references(() => employees.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  gstin: text("gstin"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  orderDate: date("order_date").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
  gauge: numeric("gauge", { precision: 6, scale: 3 }).notNull(),
  quantityKg: numeric("quantity_kg", { precision: 12, scale: 3 }).notNull(),
  pricePerKg: numeric("price_per_kg", { precision: 12, scale: 2 }).notNull(),
});

export const copperEntries = pgTable("copper_entries", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  marketPrice: numeric("market_price", { precision: 12, scale: 2 }).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull(),
  quantityKg: numeric("quantity_kg", { precision: 12, scale: 3 }).notNull(),
  vendor: text("vendor"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
