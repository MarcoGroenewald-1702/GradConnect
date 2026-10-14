-- AlterTable
ALTER TABLE "AssessmentAttempt" ADD COLUMN     "answers" JSONB;

-- AlterTable
ALTER TABLE "ModuleEnrolment" ADD COLUMN     "completedLessons" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateIndex
CREATE UNIQUE INDEX "MentorSession_mentorId_day_time_key" ON "MentorSession"("mentorId", "day", "time");

-- Backfill: existing progress (%) becomes "the first N lessons completed"
UPDATE "ModuleEnrolment" AS me
SET "completedLessons" = ARRAY(
        SELECT generate_series(0, LEAST(
            jsonb_array_length(lm."lessons"),
            ROUND(me."progress" / 100.0 * jsonb_array_length(lm."lessons"))::int
        ) - 1)
    )
FROM "LearningModule" AS lm
WHERE lm."id" = me."moduleId" AND me."progress" > 0;

UPDATE "ModuleEnrolment" AS me
SET "progress" = ROUND(COALESCE(array_length(me."completedLessons", 1), 0) * 100.0 / jsonb_array_length(lm."lessons"))::int
FROM "LearningModule" AS lm
WHERE lm."id" = me."moduleId" AND jsonb_array_length(lm."lessons") > 0;
