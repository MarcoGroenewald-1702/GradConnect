import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock, FileCheckCorner, ListChecks, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/api";
import { useAssessments } from "@/lib/queries";
import type { AssessmentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters = ["All", "Not verified", "Verified"] as const;

function AssessmentCard({ a }: { a: AssessmentSummary }) {
  return (
    <article className="surface-panel flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileCheckCorner className="size-5" aria-hidden />
        </span>
        {a.verified ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
            <BadgeCheck className="size-3.5" aria-hidden /> Verified
          </span>
        ) : a.attempts > 0 ? (
          <span className="rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            Best {a.bestScore}%
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{a.title}</h3>
      <p className="text-xs text-muted-foreground">{a.category}</p>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {a.minutes} min
        </span>
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5" aria-hidden /> {a.questionCount} questions
        </span>
        <span>Pass mark {a.passMark}%</span>
      </dl>
      {a.lastAttemptAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          {a.attempts} attempt{a.attempts === 1 ? "" : "s"} · last on {formatDate(a.lastAttemptAt)}
        </p>
      )}
      <div className="mt-auto pt-4">
        {a.verified ? (
          <p className="text-xs text-muted-foreground">
            {a.skill} is verified{a.verifiedBy === "project" ? " with project evidence" : ""}.
          </p>
        ) : (
          <Button variant="action" size="sm" asChild>
            <Link to={`/assessments/${a.id}`}>
              {a.attempts > 0 ? (
                <>
                  <RotateCcw className="size-4" /> Try again
                </>
              ) : (
                "Start assessment"
              )}
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function AssessmentsContent() {
  const { data, error } = useAssessments();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const list = (data ?? []).filter((a) =>
    filter === "All" ? true : filter === "Verified" ? a.verified : !a.verified,
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Assessments"
          description="Timed, auto-graded assessments. Pass one and the skill is verified on your profile."
        />

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-semibold",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {!data ? (
          <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {error ? error.message : "Loading assessments…"}
          </p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <AssessmentCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function Assessments() {
  return (
    <RequireRole roles={["graduate"]}>
      <AssessmentsContent />
    </RequireRole>
  );
}
