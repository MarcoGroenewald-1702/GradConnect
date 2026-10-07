import "dotenv/config";
import { DATABASE_URL } from "./database-url";

const isProduction = process.env.NODE_ENV === "production";

const DEV_SECRET = "dev-only-secret-change-me-in-production";
const accessSecret = process.env.JWT_ACCESS_SECRET ?? DEV_SECRET;
if (isProduction && accessSecret === DEV_SECRET) {
  throw new Error("Set JWT_ACCESS_SECRET in production.");
}

export const env = {
  isProduction,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: DATABASE_URL,
  /** Where the React app runs (allowed by CORS). */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  jwt: {
    accessSecret,
    /** Short-lived access token (sent in the Authorization header). */
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  },
  /** Long-lived refresh token (httpOnly cookie), rotated on every use. */
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 7),
};
