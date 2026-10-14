import type { z } from "zod";
import type { bookSessionSchema, completeSessionSchema, declineSessionSchema, mentorProfileSchema } from "@shared/schemas";
import { prisma } from "../db";
import { Prisma } from "../generated/prisma/client";
import { nextDateFor, todaySast } from "../lib/dates";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { addActivity, addNotification } from "./feed.service";
import { getProfileOrThrow } from "./profile.service";

interface Slot {
  day: string;
  times: string[];
}

const slotsOf = (json: unknown) => (Array.isArray(json) ? (json as Slot[]) : []);

type MentorRow = Prisma.MentorGetPayload<object>;

function summary(m: MentorRow) {
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

// ======================= Graduate side =======================

/** Mentor directory (only mentors who have published availability). */
export async function listMentors() {
  const mentors = await prisma.mentor.findMany({ orderBy: { rating: "desc" } });
  return mentors.filter((m) => slotsOf(m.slots).length > 0).map(summary);
}

/** One mentor with their weekly availability; each slot shows its next date and whether it is free. */
export async function getMentor(userId: string, mentorId: string) {
  const profile = await getProfileOrThrow(userId);
  const mentor = await prisma.mentor.findUnique({
    where: { id: mentorId },
    include: { sessions: { where: { date: { gte: todaySast() } } } },
  });
  if (!mentor) throw notFound("Mentor not found.");
  const taken = new Map(mentor.sessions.map((s) => [`${s.date} ${s.time}`, s.profileId]));
  return {
    ...summary(mentor),
    confirmsBookings: !!mentor.userId,
    slots: slotsOf(mentor.slots).map((slot) => ({
      day: slot.day,
      times: slot.times.map((time) => {
        const date = nextDateFor(slot.day, time);
        const bookedBy = taken.get(`${date} ${time}`);
        return { time, date, available: !bookedBy, mine: bookedBy === profile.id };
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

  const date = nextDateFor(data.day, data.time);
  const existing = await prisma.mentorSession.findUnique({
    where: { mentorId_date_time: { mentorId, date, time: data.time } },
  });
  if (existing) {
    throw conflict(
      existing.profileId === profile.id ? "You have already booked this slot." : "Sorry, that slot has just been booked. Please pick another time.",
    );
  }

  // Mentors with a GradConnect account confirm each request; demo mentors without an account accept automatically.
  const status = mentor.userId ? "requested" : "accepted";
  const student = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  try {
    const session = await prisma.$transaction(async (tx) => {
      const created = await tx.mentorSession.create({
        data: { mentorId, profileId: profile.id, day: data.day, time: data.time, date, status, topic: data.topic, goal: data.goal, question: data.question },
      });
      await addActivity(tx, userId, status === "requested" ? "Requested mentor session" : "Booked mentor session", `${mentor.name} · ${data.topic}`, "mentor");
      if (status === "requested") {
        await addNotification(tx, userId, `Request sent to ${mentor.name}`, `${data.day} ${data.time} · ${data.topic}. You'll be notified when it's accepted.`, "mentor");
        await addNotification(tx, mentor.userId!, `New session request from ${student.firstName} ${student.lastName}`, `${data.day} ${data.time} · ${data.topic}`, "mentor");
      } else {
        await tx.mentor.update({ where: { id: mentorId }, data: { sessionsCount: { increment: 1 } } });
        await addNotification(tx, userId, `Session booked with ${mentor.name}`, `${data.day} ${data.time} · ${data.topic}`, "mentor");
      }
      return created;
    });
    return toSessionDto({ ...session, mentor });
  } catch (err) {
    // The database's unique (mentorId, date, time) rule stops two people booking the same slot at the same moment.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw conflict("Sorry, that slot has just been booked. Please pick another time.");
    }
    throw err;
  }
}

type SessionWithMentor = Prisma.MentorSessionGetPayload<{ include: { mentor: true } }>;

function toSessionDto(s: SessionWithMentor) {
  return {
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
    date: s.date,
    status: s.status,
    bookedAt: s.createdAt.toISOString(),
  };
}

/** The graduate's sessions: upcoming first, then past. */
export async function mySessions(userId: string) {
  const profile = await getProfileOrThrow(userId);
  const sessions = await prisma.mentorSession.findMany({
    where: { profileId: profile.id },
    include: { mentor: true },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return sessions.map(toSessionDto);
}

/** Upcoming (not completed, today or later) sessions, used on the dashboard. */
export async function upcomingSessions(profileId: string, take: number) {
  const sessions = await prisma.mentorSession.findMany({
    where: { profileId, status: { not: "completed" }, date: { gte: todaySast() } },
    include: { mentor: true },
    orderBy: [{ date: "asc" }, { time: "asc" }],
    take,
  });
  return sessions.map(toSessionDto);
}

export async function cancelSession(userId: string, sessionId: string) {
  const profile = await getProfileOrThrow(userId);
  const session = await prisma.mentorSession.findUnique({ where: { id: sessionId }, include: { mentor: true } });
  if (!session || session.profileId !== profile.id) throw notFound("Session not found.");
  if (session.status === "completed") throw badRequest("Completed sessions can't be cancelled.");
  const student = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.$transaction(async (tx) => {
    await tx.mentorSession.delete({ where: { id: sessionId } });
    if (session.status === "accepted") {
      await tx.mentor.update({ where: { id: session.mentorId }, data: { sessionsCount: { decrement: 1 } } });
    }
    if (session.mentor.userId) {
      await addNotification(tx, session.mentor.userId, `${student.firstName} cancelled a session`, `${session.day} ${session.date} ${session.time} · ${session.topic}`, "mentor");
    }
  });
}

// ======================= Mentor side =======================

async function myMentorOrThrow(userId: string) {
  const mentor = await prisma.mentor.findUnique({ where: { userId } });
  if (!mentor) throw forbidden("Only mentor accounts can do this.");
  return mentor;
}

const menteeInclude = { mentor: true, profile: { include: { user: true } } } as const;
type SessionWithMentee = Prisma.MentorSessionGetPayload<{ include: typeof menteeInclude }>;

function toMenteeSessionDto(s: SessionWithMentee) {
  const u = s.profile.user;
  return {
    ...toSessionDto(s),
    mentorNote: s.mentorNote,
    mentee: {
      name: `${u.firstName} ${u.lastName}`,
      initials: `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase(),
      email: u.email,
      headline: s.profile.headline,
      qualification: s.profile.qualification,
      institution: s.profile.institution,
    },
  };
}

/** Everything the mentor dashboard shows. */
export async function mentorOverview(userId: string) {
  const mentor = await myMentorOrThrow(userId);
  const sessions = await prisma.mentorSession.findMany({
    where: { mentorId: mentor.id },
    include: menteeInclude,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  const today = todaySast();
  const all = sessions.map(toMenteeSessionDto);
  const requests = all.filter((s) => s.status === "requested");
  const upcoming = all.filter((s) => s.status === "accepted");
  const completed = all.filter((s) => s.status === "completed").reverse();
  return {
    mentor: { ...summary(mentor), slots: slotsOf(mentor.slots) },
    stats: {
      requests: requests.length,
      upcoming: upcoming.filter((s) => s.date >= today).length,
      completed: completed.length,
      mentees: new Set(completed.map((s) => s.mentee.email)).size,
      rating: mentor.rating,
    },
    requests,
    upcoming,
    completed,
  };
}

async function mentorSessionOrThrow(userId: string, sessionId: string) {
  const mentor = await myMentorOrThrow(userId);
  const session = await prisma.mentorSession.findUnique({ where: { id: sessionId }, include: menteeInclude });
  if (!session || session.mentorId !== mentor.id) throw notFound("Session not found.");
  return { mentor, session };
}

export async function acceptSession(userId: string, sessionId: string) {
  const { mentor, session } = await mentorSessionOrThrow(userId, sessionId);
  if (session.status !== "requested") throw badRequest("Only requests can be accepted.");
  await prisma.$transaction(async (tx) => {
    await tx.mentorSession.update({ where: { id: sessionId }, data: { status: "accepted" } });
    await tx.mentor.update({ where: { id: mentor.id }, data: { sessionsCount: { increment: 1 } } });
    await addNotification(tx, session.profile.userId, `${mentor.name} accepted your session`, `${session.day} ${session.time} · ${session.topic}`, "mentor");
  });
}

export async function declineSession(userId: string, sessionId: string, data: z.output<typeof declineSessionSchema>) {
  const { mentor, session } = await mentorSessionOrThrow(userId, sessionId);
  if (session.status === "completed") throw badRequest("Completed sessions can't be declined.");
  await prisma.$transaction(async (tx) => {
    await tx.mentorSession.delete({ where: { id: sessionId } });
    if (session.status === "accepted") {
      await tx.mentor.update({ where: { id: mentor.id }, data: { sessionsCount: { decrement: 1 } } });
    }
    await addNotification(
      tx,
      session.profile.userId,
      `${mentor.name} can't make your session`,
      `${session.day} ${session.time} · ${session.topic}${data.reason ? ` — "${data.reason}"` : ""}. Please pick another time.`,
      "mentor",
    );
  });
}

export async function completeSession(userId: string, sessionId: string, data: z.output<typeof completeSessionSchema>) {
  const { mentor, session } = await mentorSessionOrThrow(userId, sessionId);
  if (session.status !== "accepted") throw badRequest("Only accepted sessions can be marked as completed.");
  await prisma.$transaction(async (tx) => {
    await tx.mentorSession.update({ where: { id: sessionId }, data: { status: "completed", mentorNote: data.note } });
    await addActivity(tx, session.profile.userId, "Completed mentor session", `${mentor.name} · ${session.topic}`, "mentor");
    await addNotification(tx, session.profile.userId, `Session with ${mentor.name} completed`, "Keep the momentum going — book a follow-up when you're ready.", "mentor");
  });
}

/** The mentor's own profile and weekly availability. */
export async function getMentorProfile(userId: string) {
  const mentor = await myMentorOrThrow(userId);
  return { ...summary(mentor), slots: slotsOf(mentor.slots) };
}

export async function updateMentorProfile(userId: string, data: z.output<typeof mentorProfileSchema>) {
  const mentor = await myMentorOrThrow(userId);
  // keep days in week order and times sorted, without duplicates
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const slots = data.slots
    .map((s) => ({ day: s.day, times: [...new Set(s.times)].sort() }))
    .filter((s) => s.times.length > 0)
    .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  await prisma.mentor.update({
    where: { id: mentor.id },
    data: {
      jobTitle: data.jobTitle,
      company: data.company,
      years: data.years,
      bio: data.bio,
      availability: data.availability || "See weekly availability",
      specialisations: data.specialisations,
      languages: data.languages,
      slots,
    },
  });
  return getMentorProfile(userId);
}
