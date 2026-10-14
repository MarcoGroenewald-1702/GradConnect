import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  LoaderCircle,
  MapPin,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { applySchema, type ApplyInput } from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { DemoNote, MatchBadge, SkillBadge } from "@/components/brand";
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
import { FieldError } from "@/components/ui/form-error";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/api";
import { useApply, useDashboard, useProfileSnapshot, useToggleSaved } from "@/lib/queries";
import { nextSessionLabel } from "@/lib/sessions";
import { useStore } from "@/lib/store";
import type { Opportunity } from "@/lib/types";

function OpportunityCard({
  opportunity,
  onToggleSave,
  onApply,
}: {
  opportunity: Opportunity;
  onToggleSave: () => void;
  onApply: () => void;
}) {
  const o = opportunity;
  return (
    <article className="surface-panel p-5 transition-shadow hover:shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">{o.type}</span>
          <h3 className="text-lg font-semibold text-foreground">{o.title}</h3>
          <p className="text-sm text-muted-foreground">{o.company}</p>
        </div>
        <MatchBadge value={o.match} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden /> {o.location}
        </span>
        <span>{o.workMode}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {o.postedDate}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.skills.map((s) => (
          <SkillBadge key={s} name={s} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {o.applied ? (
          <Button variant="success" disabled>
            <Check className="size-4" /> Applied
          </Button>
        ) : (
          <Button variant="action" onClick={onApply}>
            Apply now
          </Button>
        )}
        <Button variant="outline" onClick={onToggleSave} aria-pressed={o.saved}>
          {o.saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {o.saved ? "Saved" : "Save"}
        </Button>
      </div>
    </article>
  );
}

/** Shows exactly what the employer will receive, plus an optional cover note (max 500 characters). */
function ApplyDialog({ opportunity, onClose }: { opportunity: Opportunity | null; onClose: () => void }) {
  const snapshot = useProfileSnapshot(!!opportunity);
  const apply = useApply();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ApplyInput>({ resolver: zodResolver(applySchema), defaultValues: { coverNote: "" } });
  const noteLength = watch("coverNote")?.length ?? 0;

  function close() {
    reset();
    onClose();
  }

  async function submit(values: ApplyInput) {
    if (!opportunity) return;
    try {
      await apply.mutateAsync({ id: opportunity.id, input: values });
      toast.success(`Applied for ${opportunity.title}`);
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply.");
    }
  }

  const s = snapshot.data;
  return (
    <Dialog open={!!opportunity} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for {opportunity?.title}</DialogTitle>
          <DialogDescription>
            {opportunity?.company} will receive a copy of your profile as it is right now.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          {!s ? (
            <p className="text-muted-foreground">Loading your profile…</p>
          ) : (
            <>
              <p className="font-semibold text-foreground">{s.name}</p>
              <p className="text-muted-foreground">{s.headline}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[s.qualification, s.institution, s.location].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.verifiedSkills.map((v) => (
                  <SkillBadge key={v.name} name={v.name} verified />
                ))}
                {s.declaredSkills.map((d) => (
                  <SkillBadge key={d} name={d} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Career readiness: {s.readinessScore} / 100</p>
            </>
          )}
        </div>

        <form id="apply-form" onSubmit={handleSubmit(submit)} className="space-y-2" noValidate>
          <div className="flex items-center justify-between">
            <Label htmlFor="coverNote">Cover note (optional)</Label>
            <span className={noteLength > 500 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {noteLength}/500
            </span>
          </div>
          <Textarea id="coverNote" rows={4} placeholder="Why are you a good fit?" {...register("coverNote")} />
          <FieldError message={errors.coverNote?.message} />
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="apply-form" variant="action" disabled={apply.isPending || !s}>
            {apply.isPending && <LoaderCircle className="size-4 animate-spin" />} Send application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

const activityIcons = { verified: BadgeCheck, applied: Briefcase, learning: BookOpen, mentor: CalendarClock };

function DashboardContent() {
  const { user } = useStore();
  const { data, error } = useDashboard();
  const toggleSaved = useToggleSaved();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [applyingTo, setApplyingTo] = useState<Opportunity | null>(null);

  if (!data) {
    return (
      <AppShell>
        <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {error ? error.message : "Loading your dashboard…"}
        </p>
      </AppShell>
    );
  }

  const { readiness, activity, sessions, verifiedSkills } = data;
  const nextActions = [
    { title: "Verify a new skill", body: "Prove a skill with project evidence.", cta: "Verify a skill", to: "/skills", icon: BadgeCheck },
    {
      title: "Complete your profile",
      body: `You're ${100 - readiness.profile}% away from a complete profile.`,
      cta: "Update profile",
      to: "/profile",
      icon: UserRound,
    },
    {
      title: "Book a mentor session",
      body: "Get guidance from an experienced developer.",
      cta: "Find a mentor",
      to: "/mentors",
      icon: CalendarClock,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Let's keep building your career momentum.</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Career readiness */}
          <button
            onClick={() => setBreakdownOpen(true)}
            className="surface-panel group p-6 text-left transition-shadow hover:shadow-raised"
            aria-haspopup="dialog"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Career Readiness</p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight text-foreground">
                  {readiness.total}
                  <span className="text-xl font-semibold text-muted-foreground"> / 100</span>
                </p>
              </div>
              <ChevronRight
                className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </div>
            <Progress value={readiness.total} className="mt-4" />
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Profile</dt>
                <dd className="font-semibold text-foreground">{readiness.profile}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Verified skills</dt>
                <dd className="font-semibold text-foreground">{readiness.skills}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Learning</dt>
                <dd className="font-semibold text-foreground">{readiness.learning}%</dd>
              </div>
            </dl>
          </button>

          {/* Next actions */}
          <section className="surface-panel p-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Recommended next actions</h2>
              <span className="text-xs text-muted-foreground">Top 3</span>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {nextActions.map((a) => (
                <li key={a.title} className="rounded-xl border border-border bg-surface p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <a.icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                  <Button size="sm" variant="subtle" className="mt-3" asChild>
                    <Link to={a.to}>{a.cta}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Activity */}
          <section className="surface-panel p-6">
            <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
            {activity.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>}
            <ul className="mt-4 space-y-4">
              {activity.map((item) => {
                const Icon = activityIcons[item.kind];
                return (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.detail} · {formatDate(item.time)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Verified skills */}
          <section className="surface-panel p-6">
            <h2 className="text-base font-semibold text-foreground">Verified skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {verifiedSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No verified skills yet.</p>
              ) : (
                verifiedSkills.map((name) => <SkillBadge key={name} name={name} verified />)
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-5" asChild>
              <Link to="/skills">Verify another skill</Link>
            </Button>
          </section>

          {/* Mentor sessions */}
          <section className="surface-panel p-6">
            <h2 className="text-base font-semibold text-foreground">Upcoming mentor sessions</h2>
            {sessions.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No sessions booked yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {sessions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-border bg-surface p-3">
                    <p className="text-sm font-semibold text-foreground">{s.mentorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {nextSessionLabel(s.day, s.time)} · {s.topic}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-5" asChild>
              <Link to="/mentors">Browse mentors</Link>
            </Button>
          </section>
        </div>

        {/* Opportunities */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recommended opportunities</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/opportunities">
                View all <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {data.recommendedOpportunities.map((o) => (
              <OpportunityCard
                key={o.id}
                opportunity={o}
                onApply={() => setApplyingTo(o)}
                onToggleSave={() =>
                  toggleSaved.mutate(o.id, { onError: (e) => toast.error(e.message) })
                }
              />
            ))}
          </div>
          <DemoNote className="mt-3" />
        </section>
      </div>

      <ApplyDialog opportunity={applyingTo} onClose={() => setApplyingTo(null)} />

      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Career readiness breakdown</DialogTitle>
            <DialogDescription>
              Your score combines profile completeness, verified skills and learning activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { label: "Profile completeness", value: readiness.profile, weight: "40 points" },
              { label: "Skills verified", value: Math.min(100, readiness.skills * 25), weight: "35 points" },
              { label: "Learning activity", value: readiness.learning, weight: "25 points" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">{row.weight}</span>
                </div>
                <Progress value={row.value} className="mt-2" />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <MatchBadge value={readiness.total} />
            </div>
            <Button variant="action" className="w-full" asChild>
              <Link to="/skills">Improve my score</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function Dashboard() {
  return (
    <RequireRole roles={["graduate"]}>
      <DashboardContent />
    </RequireRole>
  );
}
