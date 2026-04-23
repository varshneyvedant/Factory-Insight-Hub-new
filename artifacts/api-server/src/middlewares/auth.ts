import type { Request, Response, NextFunction } from "express";

export type Role = "owner" | "manager";

export function getRole(req: Request): Role | null {
  const r = req.signedCookies?.["fm_role"];
  if (r === "owner" || r === "manager") return r;
  return null;
}

export function setRoleCookie(res: Response, role: Role) {
  res.cookie("fm_role", role, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: "/",
  });
}

export function clearRoleCookie(res: Response) {
  res.clearCookie("fm_role", { path: "/" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!getRole(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (getRole(req) !== "owner") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}
