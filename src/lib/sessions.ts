// Helpers for mentor sessions. Times are South African time (UTC+2, no daylight saving).

const SAST_OFFSET_HOURS = 2;

/** The session's start as a real Date, from "2026-10-16" + "17:00" in South African time. */
export function sessionStart(date: string, time: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - SAST_OFFSET_HOURS, mi));
}

/** "Thu 16 Oct, 17:00" */
export function sessionLabel(date: string, time: string) {
  const label = sessionStart(date, time).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  });
  return `${label}, ${time}`;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Downloads a calendar invitation (.ics) that opens in Outlook, Google Calendar or Apple Calendar. */
export function downloadCalendarInvite(session: { mentorName: string; topic: string; goal?: string | null; date: string; time: string }) {
  const start = sessionStart(session.date, session.time);
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
  a.download = `gradconnect-session-${session.date}-${session.time.replace(":", "")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Downloads any JSON as a file (used for the POPIA data export). */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
