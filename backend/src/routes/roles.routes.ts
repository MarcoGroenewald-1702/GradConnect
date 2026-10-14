import { Router } from "express";
import {
  applicationStatusSchema,
  completeSessionSchema,
  declineSessionSchema,
  mentorProfileSchema,
  opportunitySchema,
  shortlistSchema,
} from "@shared/schemas";
import type { Role } from "../generated/prisma/client";
import { requireAuth, requireRole, userId } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { adminOverview, listUsers } from "../services/admin.service";
import {
  addToShortlist,
  createOpportunity,
  deleteOpportunity,
  employerOverview,
  getCandidate,
  listApplicants,
  listMyOpportunities,
  listShortlist,
  removeFromShortlist,
  searchCandidates,
  setApplicationStatus,
  setOpportunityOpen,
  updateOpportunity,
} from "../services/employer.service";
import {
  acceptSession,
  completeSession,
  declineSession,
  getMentorProfile,
  mentorOverview,
  updateMentorProfile,
} from "../services/mentors.service";

const list = (value: unknown) =>
  String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

// ======================= Employer (sprints S7–S8) =======================
export const employerRouter = Router();
employerRouter.use(requireAuth, requireRole("employer"));

employerRouter.get("/overview", async (req, res) => {
  res.json(await employerOverview(userId(req)));
});

employerRouter.get("/opportunities", async (req, res) => {
  res.json(await listMyOpportunities(userId(req)));
});
employerRouter.post("/opportunities", validateBody(opportunitySchema), async (req, res) => {
  res.status(201).json({ id: await createOpportunity(userId(req), req.body) });
});
employerRouter.put("/opportunities/:id", validateBody(opportunitySchema), async (req, res) => {
  await updateOpportunity(userId(req), String(req.params.id), req.body);
  res.status(204).end();
});
employerRouter.post("/opportunities/:id/open", async (req, res) => {
  await setOpportunityOpen(userId(req), String(req.params.id), true);
  res.status(204).end();
});
employerRouter.post("/opportunities/:id/close", async (req, res) => {
  await setOpportunityOpen(userId(req), String(req.params.id), false);
  res.status(204).end();
});
employerRouter.delete("/opportunities/:id", async (req, res) => {
  await deleteOpportunity(userId(req), String(req.params.id));
  res.status(204).end();
});
employerRouter.get("/opportunities/:id/applicants", async (req, res) => {
  res.json(await listApplicants(userId(req), String(req.params.id)));
});
employerRouter.put("/applications/:id/status", validateBody(applicationStatusSchema), async (req, res) => {
  await setApplicationStatus(userId(req), String(req.params.id), req.body);
  res.status(204).end();
});

/** GET /api/employer/candidates?skills=React,SQL&location=Johannesburg&graduationYear=2025&verifiedOnly=true */
employerRouter.get("/candidates", async (req, res) => {
  res.json(
    await searchCandidates(userId(req), {
      skills: list(req.query.skills),
      location: req.query.location ? String(req.query.location) : undefined,
      graduationYear: req.query.graduationYear ? String(req.query.graduationYear) : undefined,
      verifiedOnly: req.query.verifiedOnly === "true",
    }),
  );
});
employerRouter.get("/candidates/:profileId", async (req, res) => {
  res.json(await getCandidate(userId(req), String(req.params.profileId)));
});

employerRouter.get("/shortlist", async (req, res) => {
  res.json(await listShortlist(userId(req)));
});
employerRouter.post("/shortlist", validateBody(shortlistSchema), async (req, res) => {
  await addToShortlist(userId(req), req.body);
  res.status(204).end();
});
employerRouter.delete("/shortlist/:profileId", async (req, res) => {
  await removeFromShortlist(userId(req), String(req.params.profileId));
  res.status(204).end();
});

// ======================= Mentor =======================
export const mentorRouter = Router();
mentorRouter.use(requireAuth, requireRole("mentor"));

mentorRouter.get("/overview", async (req, res) => {
  res.json(await mentorOverview(userId(req)));
});
mentorRouter.post("/sessions/:id/accept", async (req, res) => {
  await acceptSession(userId(req), String(req.params.id));
  res.status(204).end();
});
mentorRouter.post("/sessions/:id/decline", validateBody(declineSessionSchema), async (req, res) => {
  await declineSession(userId(req), String(req.params.id), req.body);
  res.status(204).end();
});
mentorRouter.post("/sessions/:id/complete", validateBody(completeSessionSchema), async (req, res) => {
  await completeSession(userId(req), String(req.params.id), req.body);
  res.status(204).end();
});
mentorRouter.get("/profile", async (req, res) => {
  res.json(await getMentorProfile(userId(req)));
});
mentorRouter.put("/profile", validateBody(mentorProfileSchema), async (req, res) => {
  res.json(await updateMentorProfile(userId(req), req.body));
});

// ======================= Admin (read-only) =======================
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/overview", async (_req, res) => {
  res.json(await adminOverview());
});
adminRouter.get("/users", async (req, res) => {
  const role = ["graduate", "employer", "mentor", "admin"].includes(String(req.query.role)) ? (String(req.query.role) as Role) : undefined;
  res.json(await listUsers(role));
});
