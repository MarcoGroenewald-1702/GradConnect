import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimit } from "./middleware/security";
import { authRouter } from "./routes/auth.routes";
import { commonRouter } from "./routes/common.routes";
import { graduateRouter } from "./routes/graduate.routes";
import { growthRouter } from "./routes/growth.routes";
import { adminRouter, employerRouter, mentorRouter } from "./routes/roles.routes";

/** Builds the Express app (kept separate from server.ts so tests can import it). */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet()); // security headers (HSTS, no-sniff, etc.)
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use("/api", apiRateLimit);

  app.use("/api/auth", authRouter);
  app.use("/api/employer", employerRouter);
  app.use("/api/mentor", mentorRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", commonRouter);
  app.use("/api", growthRouter);
  app.use("/api", graduateRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
