import { Router } from "express";
import { applySchema, onboardingSchema, profileUpdateSchema, projectEvidenceSchema, visibilitySchema } from "@shared/schemas";
import { requireAuth, requireRole, userId } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { getDashboard } from "../services/dashboard.service";
import {
  apply,
  buildProfileSnapshot,
  getOpportunity,
  listApplications,
  listOpportunities,
  toggleSaved,
  withdrawApplication,
} from "../services/opportunities.service";
import { completeOnboarding, getProfile, setVisibility, updateProfile } from "../services/profile.service";
import { mySkills, verifyWithProject } from "../services/skills.service";

/** Endpoints for graduates (role-based access control: graduate only). */
export const graduateRouter = Router();
graduateRouter.use(requireAuth, requireRole("graduate"));

// ----- Profile -----
graduateRouter.get("/profile", async (req, res) => {
  res.json(await getProfile(userId(req)));
});
graduateRouter.put("/profile", validateBody(profileUpdateSchema), async (req, res) => {
  res.json(await updateProfile(userId(req), req.body));
});
graduateRouter.post("/profile/onboarding", validateBody(onboardingSchema), async (req, res) => {
  res.json(await completeOnboarding(userId(req), req.body));
});
/** What an employer would receive if you applied now (shown before applying). */
graduateRouter.get("/profile/snapshot", async (req, res) => {
  res.json(await buildProfileSnapshot(userId(req)));
});

// ----- Skills -----
graduateRouter.get("/skills/mine", async (req, res) => {
  res.json(await mySkills(userId(req)));
});
graduateRouter.post("/skills/:skillId/verify", validateBody(projectEvidenceSchema), async (req, res) => {
  res.json(await verifyWithProject(userId(req), String(req.params.skillId), req.body));
});

// ----- Opportunities & applications -----
graduateRouter.get("/opportunities", async (req, res) => {
  res.json(await listOpportunities(userId(req)));
});
graduateRouter.get("/opportunities/:id", async (req, res) => {
  res.json(await getOpportunity(userId(req), String(req.params.id)));
});
graduateRouter.post("/opportunities/:id/save", async (req, res) => {
  res.json(await toggleSaved(userId(req), String(req.params.id)));
});
graduateRouter.post("/opportunities/:id/apply", validateBody(applySchema), async (req, res) => {
  res.status(201).json(await apply(userId(req), String(req.params.id), req.body));
});
graduateRouter.get("/applications", async (req, res) => {
  res.json(await listApplications(userId(req)));
});
graduateRouter.delete("/applications/:id", async (req, res) => {
  await withdrawApplication(userId(req), String(req.params.id));
  res.status(204).end();
});
/** POPIA: opt in / out of being found by employers */
graduateRouter.put("/profile/visibility", validateBody(visibilitySchema), async (req, res) => {
  res.json(await setVisibility(userId(req), req.body.visibleToEmployers));
});

// ----- Dashboard -----
graduateRouter.get("/dashboard", async (req, res) => {
  res.json(await getDashboard(userId(req)));
});
