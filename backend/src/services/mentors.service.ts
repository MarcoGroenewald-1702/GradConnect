import type { z } from "zod";
import type { bookSessionSchema } from "@shared/schemas";
import { prisma } from "../db";
import { Prisma } from "../generated/prisma/client";
import { badRequest, conflict, notFound } from "../lib/errors";
import { addActivity, addNotification } from "./feed.service";
import { getProfileOrThrow } from "./profile.service";

interface Slot {
  day: string;
  times: string[];
}

const slotsOf = (json: unknown) => (Array.isArray(json) ? (json as Slot[]) : []);

function summary(m: {
  id: string;
  name: string;
  initials: string;
  jobTitle: string;
  company: string;
  years: number;
  rating: number;
  sessionsCount: number;
  availability: string;
  bio: string;
  specialisations: string[];
  languages: string[];
}) {
  return {
    id: m.id,
    name: m.name,
    initials: m.initials,
    jobTitle: m.jobTitle,
    company: m.company,
    years: m.years,
    rating: m.rating,
    sessions: m.sessionsCount,
    availability: m.availability,
    bio: m.bio,
    specialisations: m.specialisations,
    languages: m.languages,
  };
}

/** Mentor directory (only mentors who have published availability). */
export async function listMentors() {
  const mentors = await prisma.mentor.findMany({ orderBy: { rating: "desc" } });
  return mentors.filter((m) => slotsOf(m.slots).length > 0).map(summary);
}

/** One mentor with their weekly availability grid; each slot says if it is free. */
export async function getMentor(userId: string, mentorId: string) {
  const profile = await getProfileOrThrow(userId);
  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId }, include: { sessions: true } });
  if (!mentor) throw notFound("Mentor not found.");
  const taken = new Map(mentor.sessions.map((s) => [`${s.day} ${s.time}`, s.profileId]));
  return {
    ...summary(mentor),
    slots: slotsOf(mentor.slots).map((slot) => ({
      day: slot.day,
      times: slot.times.map((time) => {
        const bookedBy = taken.get(`${slot.day} ${time}`);
        return { time, available: !bookedBy, mine: bookedBy === profile.id };
      }),
    })),
  };
}

export async function bookSession(userId: string, mentorId: string, data: z.output<typeof bookSessionSchema>) {
  const profile = await getProfileOrThrow(userId);
  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
  if (!mentor) throw notFound("Mentor not found.");
  const offered = slotsOf(mentor.slots).some((s) => s.day === data.day && s.times.includes(data.time));
  if (!offered) throw badRequest(`${mentor.name} is not available on ${data.day} at ${data.time}.`);
  const existing = await prisma.mentorSession.findUnique({
    where: { mentorId_day_time: { mentorId, day: data.day, time: data.time } },
  });
  if (existing) {
    throw conflict(
      existing.profileId === profile.id
        ? "You have already booked this slot."
        : "Sorry, that slot has just been booked. Please pick another time.",
    );
  }

  try {
    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.mentorSession.create({
        data: {
          mentorId,
          profileId: profile.id,
          day: data.day,
          time: data.time,
          topic: data.topic,
          goal: data.goal,
          question: data.question,
        },
      });
      await tx.mentor.update({ where: { id: mentorId }, data: { sessionsCount: { increment: 1 } } });
      await addActivity(tx, userId, "Booked mentor session", `${mentor.name} · ${data.topic}`, "mentor");
      await addNotification(tx, userId, `Session booked with ${mentor.name}`, `${data.day} ${data.time} · ${data.topic}`, "mentor");
      return created;
    });
    return { id: session.id, mentorId, mentorName: mentor.name, topic: session.topic, goal: session.goal, day: session.day, time: session.time };
  } catch (err) {
    // The database's unique (mentorId, day, time) rule stops two people booking the same slot.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict("Sorry, someone has just booked that slot. Please pick another time.");
    }
    throw err;
  }
}

export async function mySessions(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const sessions = await prisma.mentorSession.findMany({
    where: { profileId: profile.id },
    include: { mentor: true },
    orderBy: { createdAt: "desc" },
  });
  return sessions.map((s) => ({
    id: s.id,
    mentorId: s.mentorId,
    mentorName: s.mentor.name,
    mentorInitials: s.mentor.initials,
    mentorTitle: `${s.mentor.jobTitle}, ${s.mentor.company}`,
    topic: s.topic,
    goal: s.goal,
    question: s.question,
    day: s.day,
    time: s.time,
    bookedAt: s.createdAt.toISOString(),
  }));
}

export async function cancelSession(userId: string, sessionId: string) {
  const profile = await getProfileOrThrow(userId);
  const session = await prisma.mentorSession.findUnique({ where: { id: sessionId }, include: { mentor: true } });
  if (!session || session.profileId !== profile.id) throw notFound("Session not found.");
  await prisma.$transaction([
    prisma.mentorSession.delete({ where: { id: sessionId } }),
    prisma.mentor.update({ where: { id: session.mentorId }, data: { sessionsCount: { decrement: 1 } } }),
  ]);
}
