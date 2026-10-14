/** Dates for mentor sessions. Everything is in South African time (UTC+2, no daylight saving). */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SAST_MS = 2 * 60 * 60 * 1000;

/** Today's date in South Africa, e.g. "2026-10-21". */
export function todaySast(now = new Date()): string {
  return new Date(now.getTime() + SAST_MS).toISOString().slice(0, 10);
}

/**
 * The next date a weekly slot (e.g. "Thu" at "17:00") happens, as "YYYY-MM-DD".
 * If today is that day but the time has passed, it's next week.
 */
export function nextDateFor(day: string, time: string, now = new Date()): string {
  const target = DAYS.indexOf(day);
  if (target < 0) throw new Error(`Unknown day: ${day}`);
  const [h, m] = time.split(":").map(Number);
  const sastNow = new Date(now.getTime() + SAST_MS);
  for (let add = 0; add <= 7; add++) {
    const d = new Date(Date.UTC(sastNow.getUTCFullYear(), sastNow.getUTCMonth(), sastNow.getUTCDate() + add, h, m));
    if (d.getUTCDay() === target && d.getTime() > sastNow.getTime()) return d.toISOString().slice(0, 10);
  }
  return sastNow.toISOString().slice(0, 10);
}
