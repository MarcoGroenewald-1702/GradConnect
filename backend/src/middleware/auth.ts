import type { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/client";
import { forbidden, unauthorized } from "../lib/errors";
import { verifyAccessToken } from "../services/tokens";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by requireAuth: the logged-in user. */
      user?: { id: string; role: Role };
    }
  }
}

/** Checks the "Authorization: Bearer <access token>" header (a JWT). */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized();
  }
  const payload = verifyAccessToken(header.slice("Bearer ".length));
  if (!payload) {
    throw unauthorized("Your session has expired.", "token_expired");
  }
  req.user = { id: payload.sub, role: payload.role };
  next();
}

/** Role-based access control: only lets the listed roles through. Use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw forbidden();
    }
    next();
  };
}

/** Logged-in user's id (only call after requireAuth). */
export function userId(req: Request): string {
  if (!req.user) throw unauthorized();
  return req.user.id;
}
