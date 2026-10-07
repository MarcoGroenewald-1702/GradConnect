// Kept in its own file so prisma.config.ts can import it without loading the whole app config.
import "dotenv/config";

/** Default: the embedded PostgreSQL 16 started by `npm run db` (port 5433). */
export const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/gradconnect";
