// Helpers for mentor sessions. Mentors publish weekly slots like "Thu 17:00" (South African time, UTC+2).

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SAST_OFFSET_HOURS = 2; // South Africa has no daylight saving

/** The next date this weekly slot happens, as a real Date (UTC). */
export function nextOccurrence(day: string, time: string, from = new Date()): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const target = DAYS.indexOf(day);
  // current date/time in South Africa
  const sastNow = new Date(from.getTime() + SAST_OFFSET_HOURS * 3_600_000);
  for (let add = 0; add <= 7; add++) {
    const d = new Date(Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate() + add, hours, minutes));
    const utc = new Date(d.getTime() - SAST_OFFSET_HOURS * 3_600_000);
    if (d.getUTCDay() === target && utc > from) return utc;
  }
  return from;
}

/** "Thu 16 Oct, 17:00" */
export function nextSessionLabel(day: string, time: string) {
  const date = nextOccurrence(day, time);
  const label = date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Johannesburg" });
  return `${label}, ${time}`;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Downloads a calendar invitation (.ics) that opens in Outlook, Google Calendar or Apple Calendar. */
export function downloadCalendarInvite(session: { mentorName: string; topic: string; goal?: string | null; day: string; time: string }) {
  const start = nextOccurrence(session.day, session.time);
  const end = new Date(start.getTime() + 60 * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GradConnect//Mentor session//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@gradconnect`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:GradConnect mentor session with ${session.mentorName}`,
    `DESCRIPTION:Topic: ${session.topic}${session.goal ? `\\nGoal: ${session.goal}` : ""}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Mentor session in 30 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gradconnect-session-${session.day}-${session.time.replace(":", "")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
