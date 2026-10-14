-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('requested', 'accepted', 'completed');

-- DropIndex
DROP INDEX "MentorSession_mentorId_day_time_key";

-- AlterTable
ALTER TABLE "MentorSession" ADD COLUMN     "date" TEXT,
ADD COLUMN     "mentorNote" TEXT,
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'accepted';

-- Backfill: existing bookings get the next date their weekly slot happens (South African time)
UPDATE "MentorSession"
SET "date" = to_char(
    (now() AT TIME ZONE 'Africa/Johannesburg')::date
      + ((CASE "day" WHEN 'Sun' THEN 0 WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
                     WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 ELSE 6 END
          - EXTRACT(DOW FROM (now() AT TIME ZONE 'Africa/Johannesburg'))::int + 7) % 7),
    'YYYY-MM-DD');

ALTER TABLE "MentorSession" ALTER COLUMN "date" SET NOT NULL;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "isOpen" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "visibleToEmployers" BOOLEAN NOT NULL DEFAULT false;

-- Demo account: Thandi has agreed to be visible to employers
UPDATE "Profile" SET "visibleToEmployers" = true
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" = 'thandi.nkosi@example.co.za');

-- CreateTable
CREATE TABLE "Shortlist" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shortlist_employerId_profileId_key" ON "Shortlist"("employerId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "MentorSession_mentorId_date_time_key" ON "MentorSession"("mentorId", "date", "time");

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "Employer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
