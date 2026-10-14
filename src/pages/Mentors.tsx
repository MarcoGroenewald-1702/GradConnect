import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Languages, Search, Star, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader, SkillBadge } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCancelSession, useMentors, useSessions } from "@/lib/queries";
import type { BookedSession } from "@/lib/types";
import { sessionLabel } from "@/lib/sessions";
import { cn } from "@/lib/utils";

function MySessions() {
  const { data: sessions } = useSessions();
  const cancel = useCancelSession();
  const [cancelling, setCancelling] = useState<BookedSession | null>(null);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
  const upcoming = (sessions ?? []).filter((s) => s.status !== "completed" && s.date >= today);
  const past = (sessions ?? []).filter((s) => s.status === "completed");
  if (upcoming.length === 0 && past.length === 0) return null;
  return (
    <section className="surface-panel p-6">
      <h2 className="text-base font-semibold text-foreground">Your sessions</h2>
      {upcoming.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No upcoming sessions.</p>}
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {upcoming.map((s) => (
          <li key={s.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {s.mentorInitials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{s.mentorName}</p>
              <p className="inline-flex items-center gap-1 text-xs font-medium text-action">
                <CalendarClock className="size-3.5" aria-hidden /> {sessionLabel(s.date, s.time)} · {s.topic}
              </p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  s.status === "requested" ? "bg-warning-soft text-warning-foreground" : "bg-success-soft text-success",
                )}
              >
                {s.status === "requested" ? "Waiting for the mentor to accept" : "Confirmed"}
              </span>
              {s.goal && <p className="mt-1 text-xs text-muted-foreground">Goal: {s.goal}</p>}
            </div>
            <Button variant="ghost" size="icon" aria-label={`Cancel session with ${s.mentorName}`} onClick={() => setCancelling(s)}>
              <X />
            </Button>
          </li>
        ))}
      </ul>
      {past.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Completed: {past.map((s) => `${s.mentorName} (${sessionLabel(s.date, s.time)})`).join(" · ")}
        </p>
      )}

      <Dialog open={!!cancelling} onOpenChange={(open) => !open && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this session?</DialogTitle>
            <DialogDescription>
              {cancelling?.mentorName}, {cancelling && sessionLabel(cancelling.date, cancelling.time)}. The slot will become available to other
              graduates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() =>
                cancelling &&
                cancel.mutate(cancelling.id, {
                  onSuccess: () => {
                    toast.success("Session cancelled");
                    setCancelling(null);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Cancel session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MentorsContent() {
  const { data, error } = useMentors();
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("All");
  const mentors = data ?? [];

  const specialisations = useMemo(
    () => ["All", ...new Set(mentors.flatMap((m) => m.specialisations))],
    [mentors],
  );
  const list = mentors.filter((m) => {
    const text = `${m.name} ${m.jobTitle} ${m.company} ${m.specialisations.join(" ")}`.toLowerCase();
    return (focus === "All" || m.specialisations.includes(focus)) && text.includes(query.toLowerCase());
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Mentors"
          description="Book a session with working IT professionals across South Africa."
        />

        <MySessions />

        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Search by name, company or skill"
              aria-label="Search mentors"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {specialisations.map((s) => (
              <button
                key={s}
                onClick={() => setFocus(s)}
                aria-pressed={focus === s}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold",
                  focus === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!data ? (
          <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {error ? error.message : "Loading mentors…"}
          </p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mentors match your search.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {list.map((m) => (
              <article key={m.id} className="surface-panel flex flex-col p-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {m.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground">{m.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {m.jobTitle} · {m.company}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Star className="size-3.5 fill-warning text-warning" aria-hidden /> {m.rating.toFixed(1)}
                      </span>
                      <span>{m.sessions} sessions</span>
                      <span>{m.years} years experience</span>
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.specialisations.map((s) => (
                    <SkillBadge key={s} name={s} />
                  ))}
                </div>
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Languages className="size-3.5" aria-hidden /> {m.languages.join(", ")} · {m.availability}
                </p>
                <div className="mt-auto pt-4">
                  <Button variant="action" size="sm" asChild>
                    <Link to={`/mentors/${m.id}`}>View availability & book</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function Mentors() {
  return (
    <RequireRole roles={["graduate"]}>
      <MentorsContent />
    </RequireRole>
  );
}
