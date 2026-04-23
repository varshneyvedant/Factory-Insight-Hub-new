import { Router, type IRouter } from "express";
import { LoginBody } from "@workspace/api-zod";
import { getRole, setRoleCookie, clearRoleCookie } from "../middlewares/auth";

const router: IRouter = Router();

const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "owner123";
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD ?? "manager123";

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid input" });
    return;
  }
  const { role, password } = parsed.data;
  const expected = role === "owner" ? OWNER_PASSWORD : MANAGER_PASSWORD;
  if (password !== expected) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }
  setRoleCookie(res, role);
  res.json({ role });
});

router.post("/auth/logout", (_req, res) => {
  clearRoleCookie(res);
  res.status(204).end();
});

router.get("/auth/me", (req, res) => {
  const role = getRole(req);
  if (!role) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({ role });
});

export default router;
