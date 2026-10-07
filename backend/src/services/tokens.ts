import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../db";
import type { Role } from "../generated/prisma/client";

// ---------- Access tokens (JWT, short-lived, sent in the Authorization header) ----------

export interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(userId: string, role: Role): string {
  return jwt.sign({ role }, env.jwt.accessSecret, {
    subject: userId,
    expiresIn: env.jwt.accessTokenTtl as jwt.SignOptions["expiresIn"],
  });
}

/** Returns the payload, or null if the token is invalid or expired. */
export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as jwt.JwtPayload;
    if (typeof decoded.sub !== "string") return null;
    return { sub: decoded.sub, role: decoded.role as Role };
  } catch {
    return null;
  }
}

// ---------- Refresh tokens (random, long-lived, httpOnly cookie, rotated on every use) ----------

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/** Two requests can race to refresh the same token (e.g. two tabs). Within this window that is not treated as theft. */
const REUSE_GRACE_MS = 15_000;

export async function issueRefreshToken(userId: string, familyId: string = crypto.randomUUID()) {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, familyId, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
}

/**
 * Exchanges a refresh token for a new one (rotation).
 * If an already-used token is presented again, someone may have stolen it,
 * so every token in that login "family" is revoked.
 */
export async function rotateRefreshToken(token: string) {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!existing) return null;

  if (existing.revokedAt) {
    const recentlyRotated = Date.now() - existing.revokedAt.getTime() < REUSE_GRACE_MS;
    if (!recentlyRotated) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return null;
  }
  if (existing.expiresAt < new Date()) return null;

  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  const next = await issueRefreshToken(existing.userId, existing.familyId);
  return { user: existing.user, ...next };
}

export async function revokeRefreshToken(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
