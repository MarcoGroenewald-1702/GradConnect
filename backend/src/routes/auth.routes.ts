import { Router, type Response } from "express";
import { loginSchema, registerSchema } from "@shared/schemas";
import { env } from "../config/env";
import { unauthorized } from "../lib/errors";
import { requireAuth, userId } from "../middleware/auth";
import { authRateLimit, requireCsrfHeader } from "../middleware/security";
import { validateBody } from "../middleware/validate";
import { getUserDto, login, register } from "../services/auth.service";
import { revokeRefreshToken, rotateRefreshToken, signAccessToken } from "../services/tokens";

export const authRouter = Router();

const COOKIE = "gc_refresh";

/** The refresh token lives in an httpOnly cookie: JavaScript can't read it, so XSS can't steal it. */
function setRefreshCookie(res: Response, token: string, expires: Date) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/api/auth",
    expires,
  });
}
function clearRefreshCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/api/auth" });
}

/** POST /api/auth/register */
authRouter.post("/register", authRateLimit, validateBody(registerSchema), async (req, res) => {
  const session = await register(req.body);
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  res.status(201).json({ accessToken: session.accessToken, user: session.user });
});

/** POST /api/auth/login */
authRouter.post("/login", authRateLimit, validateBody(loginSchema), async (req, res) => {
  const session = await login(req.body);
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  res.json({ accessToken: session.accessToken, user: session.user });
});

/** POST /api/auth/refresh  -> swaps the refresh cookie for a new one + a new access token */
authRouter.post("/refresh", requireCsrfHeader, async (req, res) => {
  const token = req.cookies?.[COOKIE];
  const rotated = token ? await rotateRefreshToken(token) : null;
  if (!rotated) {
    clearRefreshCookie(res);
    throw unauthorized("Please log in again.", "refresh_failed");
  }
  setRefreshCookie(res, rotated.token, rotated.expiresAt);
  res.json({
    accessToken: signAccessToken(rotated.user.id, rotated.user.role),
    user: await getUserDto(rotated.user.id),
  });
});

/** POST /api/auth/logout  -> revokes the refresh token */
authRouter.post("/logout", requireCsrfHeader, async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (token) await revokeRefreshToken(token);
  clearRefreshCookie(res);
  res.status(204).end();
});

/** GET /api/auth/me */
authRouter.get("/me", requireAuth, async (req, res) => {
  res.json(await getUserDto(userId(req)));
});
