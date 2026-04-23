# Factory Manager

Internal management system for a small Indian copper-wire / electrical-goods factory.

## Features
- **Roles** — Owner (full access including reports & employee CRUD) and Manager (data entry only).
- **Pages** — Dashboard, Employees (list + detail), Attendance, Salaries, Advances, Copper purchases, Reports.
- **Auth** — Simple role-based login with signed cookies (`fm_role`).
- Money in INR, dates in DD MMM YYYY, charts in recharts.

## Default credentials (dev)
- Owner: `owner123`
- Manager: `manager123`

Override via `OWNER_PASSWORD` / `MANAGER_PASSWORD` env vars. Cookies signed by `SESSION_SECRET`.

## Architecture
- **Artifacts**
  - `artifacts/factory` — React + Vite web app at `/`
  - `artifacts/api-server` — Express API at `/api`
- **Shared libs**
  - `lib/api-spec` — OpenAPI source of truth
  - `lib/api-zod` — generated Zod validators
  - `lib/api-client-react` — generated TanStack Query hooks (uses `customFetch` with `credentials: "include"`)
  - `lib/db` — Drizzle ORM schema + Postgres client
- **Database** — Postgres (Replit-managed). Tables: employees, attendance, salary_payments, advances, copper_entries.
- Money stored as numeric strings, serialized to numbers in API responses.
- Attendance POST is upsert-style (one record per employee per date).

## Workflow
- Edit OpenAPI spec → run `pnpm --filter @workspace/api-spec run codegen` → both client and server use new types.
- Edit `lib/db/src/schema/index.ts` → run `pnpm --filter @workspace/db run push`.
