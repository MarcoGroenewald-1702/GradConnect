import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { applicationStatuses } from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { MatchBadge, PageHeader, SkillBadge } from "@/components/brand";
import { CandidatePanel } from "@/components/candidate";
import { Avatar, Empty, LoadState, StatusBadge } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { useApplicants, useSetApplicationStatus } from "@/lib/queries";
import type { ApplicationStatusKey } from "@/lib/types";
import { selectClass, timeAgo } from "@/lib/utils";

const labels: Record<ApplicationStatusKey, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

function EmployerApplicantsContent() {
  const { id = "" } = useParams();
  const { data, error } = useApplicants(id);
  const setStatus = useSetApplicationStatus();
  const [viewing, setViewing] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatusKey | "all">("all");

  const list = (data?.applicants ?? []).filter((a) => filter === "all" || a.status === filter);

  return (
    <AppShell>
      <Link to="/employer/opportunities" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Your opportunities
      </Link>
      {!data ? (
        <LoadState error={error} label="applicants" />
      ) : (
        <div className="space-y-6">
          <PageHeader
            title={`Applicants: ${data.opportunity.title}`}
            description={`${data.applicants.length} ${data.applicants.length === 1 ? "application" : "applications"} · sorted by best match · required skills: ${data.opportunity.skills.join(", ")}`}
            action={<StatusBadge status={data.opportunity.isOpen ? "open" : "closed"} />}
          />

          <label className="flex max-w-xs items-center gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">Show</span>
            <select className={selectClass} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <option value="all">All statuses</option>
              {applicationStatuses.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>

          {list.length === 0 ? (
            <Empty>{data.applicants.length ? "No applicants with this status." : "No one has applied yet."}</Empty>
          ) : (
            <ul className="space-y-3">
              {list.map((a) => {
                const verified = (a.snapshot.verifiedSkills ?? []).map((s) => (typeof s === "string" ? s : s.name));
                return (
                  <li key={a.id} className="surface-panel p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <Avatar initials={a.initials} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{a.candidate}</p>
                        <p className="text-sm text-muted-foreground">
                          {[a.snapshot.qualification, a.snapshot.institution].filter(Boolean).join(" · ") || a.snapshot.headline}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Applied {timeAgo(a.appliedAt)}
                          {a.snapshot.readinessScore != null && ` · readiness ${a.snapshot.readinessScore}%`}
                        </p>
                      </div>
                      <MatchBadge value={a.match} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {verified.map((s) => (
                        <SkillBadge key={s} name={s} verified />
                      ))}
                      {(a.snapshot.declaredSkills ?? []).map((s) => (
                        <SkillBadge key={s} name={s} />
                      ))}
                    </div>
                    {verified.length > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <BadgeCheck className="size-3.5 text-success" /> = verified on GradConnect; others are self-declared
                      </p>
                    )}

                    {a.coverNote && (
                      <p className="mt-3 rounded-lg bg-surface p-3 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Cover note: </span>
                        {a.coverNote}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <Button variant="ghost" size="sm" onClick={() => setViewing(a.profileId)}>
                        View full profile
                      </Button>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <select
                          aria-label={`Status for ${a.candidate}`}
                          className={selectClass + " w-40"}
                          value={a.status}
                          disabled={setStatus.isPending}
                          onChange={(e) => {
                            const status = e.target.value as ApplicationStatusKey;
                            setStatus.mutate(
                              { id: a.id, status },
                              {
                                onSuccess: () => toast.success(`${a.candidate} moved to ${labels[status]}. They've been notified.`),
                                onError: (err) => toast.error(err.message),
                              },
                            );
                          }}
                        >
                          {applicationStatuses.map((s) => (
                            <option key={s} value={s}>
                              {labels[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <CandidatePanel profileId={viewing} onClose={() => setViewing(null)} />
    </AppShell>
  );
}

export default function EmployerApplicants() {
  return (
    <RequireRole roles={["employer"]}>
      <EmployerApplicantsContent />
    </RequireRole>
  );
}
