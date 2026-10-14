import { describe, expect, it } from "vitest";
import { bookSessionSchema, submitAssessmentSchema } from "@shared/schemas";
import { gradeAnswers } from "../src/services/assessments.service";
import { progressFor } from "../src/services/learning.service";

const questions = [
  { prompt: "1 + 1?", options: ["1", "2"], answer: 1 },
  { prompt: "2 + 2?", options: ["4", "5"], answer: 0 },
  { prompt: "3 + 3?", options: ["5", "6"], answer: 1 },
  { prompt: "4 + 4?", options: ["8", "9"], answer: 0 },
];

describe("assessment grading", () => {
  it("scores the percentage of correct answers", () => {
    expect(gradeAnswers(questions, [1, 0, 1, 0])).toEqual({ correct: 4, total: 4, score: 100 });
    expect(gradeAnswers(questions, [1, 0, 0, 1])).toEqual({ correct: 2, total: 4, score: 50 });
  });
  it("counts skipped questions (-1) and missing answers as wrong", () => {
    expect(gradeAnswers(questions, [1, -1]).correct).toBe(1);
  });
  it("only accepts whole-number answer indexes", () => {
    expect(submitAssessmentSchema.safeParse({ answers: [0, 1.5] }).success).toBe(false);
    expect(submitAssessmentSchema.safeParse({ answers: [0, -1, 2] }).success).toBe(true);
  });
});

describe("learning progress", () => {
  it("is the share of finished lessons", () => {
    expect(progressFor(3, 5)).toBe(60);
    expect(progressFor(1, 3)).toBe(33);
    expect(progressFor(0, 0)).toBe(0);
  });
});

describe("mentor booking validation", () => {
  it("needs a time slot, topic and goal", () => {
    expect(bookSessionSchema.safeParse({ day: "Mon", time: "17:00", topic: "React", goal: "Portfolio review" }).success).toBe(true);
    expect(bookSessionSchema.safeParse({ day: "Mon", time: "5pm", topic: "React", goal: "Portfolio review" }).success).toBe(false);
    expect(bookSessionSchema.safeParse({ day: "Mon", time: "17:00", topic: "", goal: "Portfolio review" }).success).toBe(false);
  });
});
