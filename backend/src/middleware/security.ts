import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { forbidden } from "../lib/errors";

/** Limits login / sign-up attempts to slow down password guessing. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

/** General limit for the whole API. */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

/**
 * CSRF protection for endpoints that use the refresh-token cookie.
 * Browsers only let our own frontend add this custom header (other sites would need CORS permission),
 * and the cookie is SameSite=Strict as a second layer.
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction) {
  if (req.get("X-Requested-With") !== "XMLHttpRequest") {
    throw forbidden("Missing CSRF header.");
  }
  next();
}
