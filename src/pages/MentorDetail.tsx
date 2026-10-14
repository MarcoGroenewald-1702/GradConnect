import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CalendarPlus, Languages, LoaderCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { bookSessionSchema, type BookSessionInput } from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { SkillBadge } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBookSession, useMentor, useMySkills } from "@/lib/queries";
import { downloadCalendarInvite, sessionLabel } from "@/lib/sessions";
import type { BookedSession } from "@/lib/types";
import { cn } from "@/lib/utils";

const generalTopics = ["Career advice", "Portfolio review", "Interview preparation", "CV feedback"];

function MentorDetailContent() {
  const { id = "" } = useParams();
  const { data: mentor, error } = useMentor(id);
  const mySkills = useMySkills().data ?? [];
  const book = useBookSession(id);
  const [slot, setSlot] = useState<{ day: string; time: string; date: string } | null>(null);
  const [booked, setBooked] = useState<BookedSession | null>(null);

  const form = useForm<BookSessionInput>({
    resolver: zodResolver(bookSessionSchema),
    defaultValues: { day: "", time: "", topic: "", goal: "", question: "" },
  });
  const errors = form.formState.errors;

  if (!mentor) {
    return (
      <AppShell>
        <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {error ? error.message : "Loading mentor…"}
        </p>
      </AppShell>
    );
  }

  // Topic choices: the mentor's specialisations, then the graduate's own skills, then general career topics
  const topics = [...new Set([...mentor.specialisations, ...mySkills.map((s) => s.name), ...generalTopics])];

  function pick(day: string, time: string, date: string) {
    setSlot({ day, time, date });
    setBooked(null);
    form.setValue("day", day);
    form.setValue("time", time);
  }

  async function submit(values: BookSessionInput) {
    try {
      const session = await book.mutateAsync(values);
      setBooked(session);
      setSlot(null);
      form.reset();
      toast.success(session.status === "requested" ? `Request sent to ${mentor!.name}` : `Session booked with ${mentor!.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not book the session.");
    }
  }

  return (
    <AppShell>
      <Link to="/mentors" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All mentors
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Mentor profile */}
        <section className="surface-panel h-fit p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
              {mentor.initials}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{mentor.name}</h1>
              <p className="text-sm text-muted-foreground">
                {mentor.jobTitle} · {mentor.company}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="size-3.5 fill-warning text-warning" aria-hidden /> {mentor.rating.toFixed(1)}
                </span>
                <span>{mentor.sessions} sessions</span>
                <span>{mentor.years} years experience</span>
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{mentor.bio}</p>
          <h2 className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Specialisations</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mentor.specialisations.map((s) => (
              <SkillBadge key={s} name={s} />
            ))}
          </div>
          <p className="mt-5 inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Languages className="size-4" aria-hidden /> {mentor.languages.join(", ")}
          </p>
        </section>

        {/* Availability + booking */}
        <section className="space-y-4">
          <div className="surface-panel p-6">
            <h2 className="text-base font-semibold text-foreground">Weekly availability</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {mentor.availability} · times are South African time · sessions are 1 hour
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {mentor.slots.map((d) => (
                <div key={d.day} className="rounded-xl border border-border bg-surface p-3">
                  <p className="text-sm font-semibold text-foreground">
                    {d.times[0] ? sessionLabel(d.times[0].date, d.times[0].time).split(",")[0] : d.day}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.times.map((t) => {
                      const selected = slot?.day === d.day && slot.time === t.time;
                      return (
                        <button
                          key={t.time}
                          disabled={!t.available}
                          onClick={() => pick(d.day, t.time, t.date)}
                          aria-pressed={selected}
                          title={`${sessionLabel(t.date, t.time)}: ${t.mine ? "you booked this" : t.available ? "available" : "already booked"}`}
                          className={cn(
                            "min-h-10 min-w-16 rounded-lg border px-3 text-sm font-semibold transition-colors",
                            selected && "border-action bg-action text-action-foreground",
                            !selected && t.available && "border-border bg-background text-foreground hover:border-action/50",
                            t.mine && "border-success/30 bg-success-soft text-success",
                            !t.available && !t.mine && "cursor-not-allowed border-border bg-muted text-muted-foreground line-through",
                          )}
                        >
                          {t.time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-success">Green</span> = your booking ·{" "}
              <span className="line-through">crossed out</span> = taken
            </p>
          </div>

          {booked && (
            <div className="rounded-xl border border-success/30 bg-success-soft p-5">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <CalendarCheck className="size-5 text-success" aria-hidden />{" "}
                {booked.status === "requested" ? "Requested" : "Booked"}: {sessionLabel(booked.date, booked.time)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {mentor.name} · {booked.topic}.{" "}
                {booked.status === "requested"
                  ? `${mentor.name.split(" ")[0]} will confirm, and you'll get a notification.`
                  : "You'll find it on your dashboard and under Mentors."}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => downloadCalendarInvite(booked)}>
                <CalendarPlus className="size-4" /> Add to calendar
              </Button>
            </div>
          )}

          {slot && (
            <form className="surface-panel space-y-4 p-6" onSubmit={form.handleSubmit(submit)} noValidate>
              <h2 className="text-base font-semibold text-foreground">
                Book {sessionLabel(slot.date, slot.time)} with {mentor.name.split(" ")[0]}
              </h2>
              {mentor.confirmsBookings && (
                <p className="text-xs text-muted-foreground">
                  {mentor.name.split(" ")[0]} confirms each request personally; you'll be notified when it's accepted.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <select
                  id="topic"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  {...form.register("topic")}
                >
                  <option value="">Choose a topic…</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.topic?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal">Session goal</Label>
                <Input id="goal" placeholder="e.g. Get feedback on my portfolio before applying" {...form.register("goal")} />
                <FieldError message={errors.goal?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question">Question for the mentor (optional)</Label>
                <Textarea id="question" rows={3} {...form.register("question")} />
                <FieldError message={errors.question?.message} />
              </div>
              <FieldError message={errors.time?.message} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setSlot(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="action" disabled={book.isPending}>
                  {book.isPending && <LoaderCircle className="size-4 animate-spin" />} Confirm booking
                </Button>
              </div>
            </form>
          )}

          {!slot && !booked && (
            <p className="text-sm text-muted-foreground">Pick an available time above to book a session.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function MentorDetail() {
  return (
    <RequireRole roles={["graduate"]}>
      <MentorDetailContent />
    </RequireRole>
  );
}
