import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Bookmark, BookmarkCheck, Briefcase, Building2, Check, CircleDashed, Clock, MapPin, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DemoNote, MatchBadge } from "@/components/brand";
import { ApplyDialog } from "@/components/opportunities";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { useAssessments, useOpportunity, useToggleSaved } from "@/lib/queries";
import { cn } from "@/lib/utils";

const statusStyle = {
  verified: { label: "Verified", icon: BadgeCheck, className: "border-success/30 bg-success-soft text-success" },
  declared: { label: "Self-declared", icon: CircleDashed, className: "border-action/25 bg-accent text-accent-foreground" },
  missing: { label: "Not on your profile", icon: CircleDashed, className: "border-border bg-muted text-muted-foreground" },
};

function OpportunityDetailContent() {
  const { id = "" } = useParams();
  const { data: o, error } = useOpportunity(id);
  const toggleSaved = useToggleSaved();
  const assessments = useAssessments().data ?? [];
  const [applying, setApplying] = useState(false);

  if (!o) {
    return (
      <AppShell>
        <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {error ? error.message : "Loading opportunity…"}
        </p>
      </AppShell>
    );
  }

  const gaps = o.skillMatch.filter((s) => s.status !== "verified");

  return (
    <AppShell>
      <Link to="/opportunities" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All opportunities
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: the opportunity */}
        <div className="space-y-6">
          <section className="surface-panel p-6">
            <span className="text-xs font-semibold text-muted-foreground">{o.type}</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{o.title}</h1>
            <p className="text-sm text-muted-foreground">{o.company}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {o.location} · {o.workMode}
              </span>
              <span className="inline-flex items-center gap-1">
                <Briefcase className="size-4" aria-hidden /> {o.experience}
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="size-4" aria-hidden /> {o.salary}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" aria-hidden /> Posted {o.postedDate.toLowerCase()}
              </span>
            </div>
            {!o.isOpen && (
              <p className="mt-3 rounded-lg bg-warning-soft p-2 text-sm text-warning-foreground">This opportunity has closed.</p>
            )}
            <p className="mt-5 text-sm leading-relaxed text-foreground">{o.description}</p>
          </section>

          {/* Required skills compared with yours (design doc 4.3.3) */}
          <section className="surface-panel p-6">
            <h2 className="text-base font-semibold text-foreground">Skills: how you match</h2>
            <ul className="mt-4 space-y-2">
              {o.skillMatch.map(({ skill, status }) => {
                const s = statusStyle[status];
                const assessment = assessments.find((a) => a.skill.toLowerCase() === skill.toLowerCase());
                return (
                  <li key={skill} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3">
                    <span className="text-sm font-medium text-foreground">{skill}</span>
                    <span className="flex items-center gap-2">
                      {status !== "verified" && assessment && !assessment.verified && (
                        <Link to={`/assessments/${assessment.id}`} className="text-xs font-medium text-action hover:underline">
                          Verify now
                        </Link>
                      )}
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", s.className)}>
                        <s.icon className="size-3.5" aria-hidden /> {s.label}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {gaps.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Verified skills count fully, self-declared skills count half. Verifying {gaps.map((g) => g.skill).join(", ")} would raise your match.
              </p>
            )}
          </section>

          <section className="surface-panel grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">What you'll do</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {o.responsibilities.map((r) => (
                  <li key={r} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-action" aria-hidden /> {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">What they're looking for</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {o.requirements.map((r) => (
                  <li key={r} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-action" aria-hidden /> {r}
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <DemoNote />
        </div>

        {/* Right: sticky summary card */}
        <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:h-fit">
          <section className="surface-panel space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Your match</span>
              <MatchBadge value={o.match} />
            </div>
            {o.applied ? (
              <div className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm">
                <p className="font-semibold text-success">You've applied</p>
                <p className="text-muted-foreground">Status: {o.applicationStatus}</p>
                <Link to="/applications" className="text-xs font-medium text-action hover:underline">
                  View my applications
                </Link>
              </div>
            ) : (
              <Button variant="action" className="w-full" size="lg" disabled={!o.isOpen} onClick={() => setApplying(true)}>
                Apply now
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => toggleSaved.mutate(o.id, { onError: (e) => toast.error(e.message) })}
            >
              {o.saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
              {o.saved ? "Saved for later" : "Save for later"}
            </Button>
            <div className="border-t border-border pt-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="size-4 text-action" aria-hidden /> {o.employer.name}
              </p>
              {o.employer.industry && <p className="mt-1 text-xs text-muted-foreground">{o.employer.industry}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {o.employer.openRoles} open {o.employer.openRoles === 1 ? "role" : "roles"} on GradConnect
              </p>
            </div>
          </section>
        </aside>
      </div>

      <ApplyDialog opportunity={applying ? o : null} onClose={() => setApplying(false)} />
    </AppShell>
  );
}

export default function OpportunityDetail() {
  return (
    <RequireRole roles={["graduate"]}>
      <OpportunityDetailContent />
    </RequireRole>
  );
}
