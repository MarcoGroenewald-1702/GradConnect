import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CalendarClock, Inbox, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Avatar, Empty, LoadState, StatCard, StatusBadge } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAcceptSession, useCompleteSession, useDeclineSession, useMentorOverview } from "@/lib/queries";
import { downloadCalendarInvite, sessionLabel, sessionStart } from "@/lib/sessions";
import type { MenteeSession } from "@/lib/types";

function SessionRow({ s, children }: { s: MenteeSession; children?: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar initials={s.mentee.initials} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{s.mentee.name}</p>
          <p className="text-xs text-muted-foreground">
            {[s.mentee.qualification, s.mentee.institution].filter(Boolean).join(" · ") || s.mentee.headline}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">{sessionLabel(s.date, s.time)}</p>
          <StatusBadge status={s.status} label={s.status === "requested" ? "Needs your reply" : undefined} />
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div>
          <dt className="inline font-medium text-foreground">Topic: </dt>
          <dd className="inline text-muted-foreground">{s.topic}</dd>
        </div>
        {s.goal && (
          <div>
            <dt className="inline font-medium text-foreground">Goal: </dt>
            <dd className="inline text-muted-foreground">{s.goal}</dd>
          </div>
        )}
        {s.question && (
          <div>
            <dt className="inline font-medium text-foreground">Question: </dt>
            <dd className="inline text-muted-foreground">{s.question}</dd>
          </div>
        )}
      </dl>
      {children && <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">{children}</div>}
    </li>
  );
}

function MentorDashboardContent() {
  const { data, error } = useMentorOverview();
  const accept = useAcceptSession();
  const decline = useDeclineSession();
  const complete = useCompleteSession();
  const [declining, setDeclining] = useState<MenteeSession | null>(null);
  const [completing, setCompleting] = useState<MenteeSession | null>(null);
  const [text, setText] = useState("");

  const close = () => {
    setDeclining(null);
    setCompleting(null);
    setText("");
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={data ? `Welcome back, ${data.mentor.name.split(" ")[0]}` : "Mentor dashboard"}
          description={data ? `${data.mentor.jobTitle} · ${data.mentor.company}` : undefined}
          action={
            <Button variant="outline" asChild>
              <Link to="/mentor/availability">Edit availability</Link>
            </Button>
          }
        />

        {!data ? (
          <LoadState error={error} label="your dashboard" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="New requests" value={data.stats.requests} icon={Inbox} />
              <StatCard label="Upcoming sessions" value={data.stats.upcoming} icon={CalendarClock} />
              <StatCard label="Completed sessions" value={data.stats.completed} icon={CalendarCheck} />
              <StatCard label="Mentees" value={data.stats.mentees} icon={Users} hint={`Rating ${data.stats.rating.toFixed(1)}`} />
            </div>

            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">Session requests</h2>
              <p className="text-sm text-muted-foreground">Graduates wait for you to accept before the session is confirmed.</p>
              {data.requests.length === 0 ? (
                <div className="mt-4">
                  <Empty>No pending requests.</Empty>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.requests.map((s) => (
                    <SessionRow key={s.id} s={s}>
                      <Button
                        size="sm"
                        variant="success"
                        disabled={accept.isPending}
                        onClick={() =>
                          accept.mutate(s.id, {
                            onSuccess: () => toast.success(`Accepted. ${s.mentee.name.split(" ")[0]} has been notified.`),
                            onError: (e) => toast.error(e.message),
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeclining(s)}>
                        Decline
                      </Button>
                    </SessionRow>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">Upcoming sessions</h2>
              {data.upcoming.length === 0 ? (
                <div className="mt-4">
                  <Empty>Nothing scheduled yet.</Empty>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.upcoming.map((s) => {
                    const started = sessionStart(s.date, s.time).getTime() <= Date.now();
                    return (
                      <SessionRow key={s.id} s={s}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCalendarInvite({ mentorName: s.mentee.name, topic: s.topic, goal: s.goal, date: s.date, time: s.time })}
                        >
                          Add to calendar
                        </Button>
                        <Button size="sm" variant={started ? "action" : "ghost"} onClick={() => setCompleting(s)}>
                          Mark as completed
                        </Button>
                      </SessionRow>
                    );
                  })}
                </ul>
              )}
            </section>

            {data.completed.length > 0 && (
              <section className="surface-panel p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Recently completed</h2>
                  <Link to="/mentor/mentees" className="text-sm font-medium text-action hover:underline">
                    All mentees
                  </Link>
                </div>
                <ul className="mt-4 divide-y divide-border">
                  {data.completed.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <Avatar initials={s.mentee.initials} className="size-8 text-xs" />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-medium text-foreground">{s.mentee.name}</span>
                        <span className="text-muted-foreground"> · {s.topic}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{sessionLabel(s.date, s.time)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3.5" /> Times are South African time (SAST).
            </p>
          </>
        )}
      </div>

      <Dialog open={!!declining || !!completing} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogTitle>{declining ? "Decline this request?" : "Mark session as completed"}</DialogTitle>
          <DialogDescription>
            {declining
              ? `${declining.mentee.name} will be notified and the time slot opens up again.`
              : `Leave a short note for ${completing?.mentee.name}: what you covered and suggested next steps. They'll see it on GradConnect.`}
          </DialogDescription>
          <div className="space-y-2">
            <Label htmlFor="mentor-text">{declining ? "Reason (optional)" : "Note for the mentee (optional)"}</Label>
            <Textarea id="mentor-text" rows={4} maxLength={declining ? 300 : 1000} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            {declining ? (
              <Button
                variant="destructive"
                disabled={decline.isPending}
                onClick={() =>
                  decline.mutate(
                    { id: declining.id, reason: text.trim() || undefined },
                    { onSuccess: () => (toast.success("Request declined"), close()), onError: (e) => toast.error(e.message) },
                  )
                }
              >
                Decline request
              </Button>
            ) : (
              <Button
                variant="action"
                disabled={complete.isPending}
                onClick={() =>
                  complete.mutate(
                    { id: completing!.id, note: text.trim() || undefined },
                    { onSuccess: () => (toast.success("Session completed"), close()), onError: (e) => toast.error(e.message) },
                  )
                }
              >
                Complete session
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function MentorDashboard() {
  return (
    <RequireRole roles={["mentor"]}>
      <MentorDashboardContent />
    </RequireRole>
  );
}
