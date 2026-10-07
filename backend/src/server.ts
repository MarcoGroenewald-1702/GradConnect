import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./db";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`[api] GradConnect API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
