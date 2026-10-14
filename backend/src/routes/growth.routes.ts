import { Router } from "express";
import { bookSessionSchema, submitAssessmentSchema } from "@shared/schemas";
import { requireAuth, requireRole, userId } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { listAssessments, startAssessment, submitAssessment } from "../services/assessments.service";
import { enrol, getModule, listModules, setLessonDone } from "../services/learning.service";
import { bookSession, cancelSession, getMentor, listMentors, mySessions } from "../services/mentors.service";

/** Assessments, learning modules and mentors (graduate only). */
export const growthRouter = Router();
growthRouter.use(["/assessments", "/learn", "/mentors", "/sessions"], requireAuth, requireRole("graduate"));

// ----- Assessments (sprint S4) -----
growthRouter.get("/assessments", async (req, res) => {
  res.json(await listAssessments(userId(req)));
});
/** Starts (or resumes) an attempt; returns the questions without answers. */
growthRouter.post("/assessments/:id/start", async (req, res) => {
  res.json(await startAssessment(userId(req), String(req.params.id)));
});
/** Submits answers; graded on the server. */
growthRouter.post("/assessments/attempts/:attemptId/submit", validateBody(submitAssessmentSchema), async (req, res) => {
  res.json(await submitAssessment(userId(req), String(req.params.attemptId), req.body));
});

// ----- Micro-learning (sprint S5) -----
growthRouter.get("/learn", async (req, res) => {
  res.json(await listModules(userId(req)));
});
growthRouter.get("/learn/:id", async (req, res) => {
  res.json(await getModule(userId(req), String(req.params.id)));
});
growthRouter.post("/learn/:id/enrol", async (req, res) => {
  res.json(await enrol(userId(req), String(req.params.id)));
});
growthRouter.post("/learn/:id/lessons/:index/complete", async (req, res) => {
  res.json(await setLessonDone(userId(req), String(req.params.id), Number(req.params.index), true));
});
growthRouter.delete("/learn/:id/lessons/:index/complete", async (req, res) => {
  res.json(await setLessonDone(userId(req), String(req.params.id), Number(req.params.index), false));
});

// ----- Mentors (sprint S6) -----
growthRouter.get("/mentors", async (_req, res) => {
  res.json(await listMentors());
});
growthRouter.get("/mentors/:id", async (req, res) => {
  res.json(await getMentor(userId(req), String(req.params.id)));
});
growthRouter.post("/mentors/:id/book", validateBody(bookSessionSchema), async (req, res) => {
  res.status(201).json(await bookSession(userId(req), String(req.params.id), req.body));
});
growthRouter.get("/sessions", async (req, res) => {
  res.json(await mySessions(userId(req)));
});
growthRouter.delete("/sessions/:id", async (req, res) => {
  await cancelSession(userId(req), String(req.params.id));
  res.status(204).end();
});
