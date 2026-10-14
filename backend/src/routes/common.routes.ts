import { Router } from "express";
import { accountUpdateSchema, deleteAccountSchema } from "@shared/schemas";
import { requireAuth, userId } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { deleteMyAccount, exportMyData } from "../services/account.service";
import { updateAccount } from "../services/auth.service";
import { listNotifications, markAllRead, markRead, unreadCount } from "../services/feed.service";
import { listSkills } from "../services/skills.service";

/** Endpoints any role can use. */
export const commonRouter = Router();

/** GET /api/health (public) */
commonRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/** GET /api/skills (public) - the skills catalogue */
commonRouter.get("/skills", async (_req, res) => {
  res.json(await listSkills());
});

// ----- Notifications -----
commonRouter.get("/notifications", requireAuth, async (req, res) => {
  res.json(await listNotifications(userId(req)));
});
commonRouter.get("/notifications/unread-count", requireAuth, async (req, res) => {
  res.json({ count: await unreadCount(userId(req)) });
});
commonRouter.post("/notifications/read-all", requireAuth, async (req, res) => {
  await markAllRead(userId(req));
  res.status(204).end();
});
commonRouter.post("/notifications/:id/read", requireAuth, async (req, res) => {
  await markRead(userId(req), String(req.params.id));
  res.status(204).end();
});

// ----- Settings -----
commonRouter.put("/me", requireAuth, validateBody(accountUpdateSchema), async (req, res) => {
  res.json(await updateAccount(userId(req), req.body));
});

// ----- POPIA: access and deletion of your own data -----
commonRouter.get("/me/export", requireAuth, async (req, res) => {
  res.setHeader("Content-Disposition", 'attachment; filename="gradconnect-my-data.json"');
  res.json(await exportMyData(userId(req)));
});
commonRouter.delete("/me", requireAuth, validateBody(deleteAccountSchema), async (req, res) => {
  await deleteMyAccount(userId(req), req.body.password);
  res.clearCookie("gc_refresh", { path: "/api/auth" });
  res.status(204).end();
});
