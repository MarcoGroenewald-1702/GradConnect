/**
 * Starts a local PostgreSQL 16 server without installing PostgreSQL.
 * (Uses the `embedded-postgres` npm package, which ships the real PostgreSQL binaries.)
 *
 * Data is kept in ~/.gradconnect/pg16 (outside OneDrive/your project folder) so it survives restarts.
 * Press Ctrl+C to stop it.
 *
 * Using your own PostgreSQL or Docker instead? Set USE_EMBEDDED_DB=false and DATABASE_URL in backend/.env
 */
import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";

if (process.env.USE_EMBEDDED_DB === "false") {
  console.log("[db] USE_EMBEDDED_DB=false, using the database in DATABASE_URL instead.");
  process.exit(0);
}

const port = Number(process.env.EMBEDDED_DB_PORT ?? 5433);
const dataDir = process.env.EMBEDDED_DB_DIR ?? path.join(os.homedir(), ".gradconnect", "pg16");
const firstRun = !fs.existsSync(path.join(dataDir, "PG_VERSION"));

const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: true,
  onLog: () => {},
  onError: (message) => {
    const text = String(message).trim();
    if (text && !/^(LOG|DEBUG)/.test(text)) console.error("[db]", text);
  },
});

/** Is a PostgreSQL server already answering on this port (e.g. left running after a crash)? */
async function alreadyRunning() {
  const client = new Client({ host: "localhost", port, user: "postgres", password: "postgres", database: "postgres" });
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

let startedByUs = true;

async function main() {
  if (await alreadyRunning()) {
    startedByUs = false;
    console.log(`[db] PostgreSQL is already running on port ${port}, using it.`);
    return;
  }
  if (firstRun) {
    console.log(`[db] First run: creating a PostgreSQL 16 database in ${dataDir} ...`);
    fs.mkdirSync(path.dirname(dataDir), { recursive: true });
    await server.initialise();
  }
  await server.start();
  if (firstRun) {
    await server.createDatabase("gradconnect");
  }
  console.log(`[db] PostgreSQL 16 is running on port ${port} (database "gradconnect"). Press Ctrl+C to stop.`);
}

async function shutdown() {
  if (startedByUs) {
    console.log("\n[db] Stopping PostgreSQL...");
    await server.stop().catch(() => {});
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (err) => {
  console.error("[db] Could not start PostgreSQL:", err?.message ?? err);
  console.error("[db] Is something else already using port " + port + "? You can change EMBEDDED_DB_PORT in backend/.env");
  await server.stop().catch(() => {});
  process.exit(1);
});

// keep the process alive
setInterval(() => {}, 1 << 30);
