/** Waits (up to 2 minutes) until PostgreSQL accepts connections, so the API doesn't start too early. */
import pg from "pg";
import { DATABASE_URL } from "../src/config/database-url";

const deadline = Date.now() + 120_000;
let warned = false;

for (;;) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.end();
    break;
  } catch {
    await client.end().catch(() => {});
    if (Date.now() > deadline) {
      console.error(`[api] Could not connect to the database at ${DATABASE_URL.replace(/:[^:@/]+@/, ":***@")}`);
      console.error("[api] Is PostgreSQL running? (npm run dev starts it for you)");
      process.exit(1);
    }
    if (!warned) {
      console.log("[api] Waiting for the database...");
      warned = true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
