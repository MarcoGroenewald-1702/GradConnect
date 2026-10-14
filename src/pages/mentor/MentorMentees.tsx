import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Avatar, Empty, LoadState, StatusBadge } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { useMentorOverview } from "@/lib/queries";
import { sessionLabel } from "@/lib/sessions";
import type { MenteeSession } from "@/lib/types";

function MentorMenteesContent() {
  const { data, error } = useMentorOverview();

  // Group every session (upcoming + completed) by mentee email
  const mentees = useMemo(() => {
    const all = [...(data?.upcoming ?? []), ...(data?.completed ?? [])];
    const map = new Map<string, { mentee: MenteeSession["mentee"]; sessions: MenteeSession[] }>();
    for (const s of all) {
      const entry = map.get(s.mentee.email) ?? { mentee: s.mentee, sessions: [] };
      entry.sessions.push(s);
      map.set(s.mentee.email, entry);
    }
    for (const m of map.values()) m.sessions.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    return [...map.values()].sort((a, b) => a.mentee.name.localeCompare(b.mentee.name));
  }, [data]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Your mentees" description="Everyone you've met or are about to meet, with your session notes." />
        {!data ? (
          <LoadState error={error} label="mentees" />
        ) : mentees.length === 0 ? (
          <Empty>No mentees yet. Accepted sessions will appear here.</Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {mentees.map(({ mentee, sessions }) => (
              <article key={mentee.email} className="surface-panel p-5">
                <div className="flex items-start gap-3">
                  <Avatar initials={mentee.initials} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{mentee.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[mentee.qualification, mentee.institution].filter(Boolean).join(" · ") || mentee.headline}
                    </p>
                    <a href={`mailto:${mentee.email}`} className="text-xs text-action hover:underline">
                      {mentee.email}
                    </a>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {sessions.map((s) => (
                    <li key={s.id} className="rounded-lg bg-surface p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{s.topic}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {sessionLabel(s.date, s.time)} <StatusBadge status={s.status} label={s.status === "accepted" ? "Upcoming" : undefined} />
                        </span>
                      </div>
                      {s.mentorNote && <p className="mt-1 text-muted-foreground">Your note: {s.mentorNote}</p>}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function MentorMentees() {
  return (
    <RequireRole roles={["mentor"]}>
      <MentorMenteesContent />
    </RequireRole>
  );
}
