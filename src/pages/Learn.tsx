import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CircleCheck, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useModules } from "@/lib/queries";
import type { ModuleSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function ModuleCard({ m }: { m: ModuleSummary }) {
  const action = m.completed ? "Review" : m.enrolled && m.progress > 0 ? "Continue" : "Start module";
  return (
    <article className="surface-panel flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <BookOpen className="size-5" aria-hidden />
        </span>
        {m.completed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
            <CircleCheck className="size-3.5" aria-hidden /> Completed
          </span>
        ) : m.recommended ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-action/25 bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden /> Recommended
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{m.title}</h3>
      <p className="text-xs text-muted-foreground">
        {m.track} · {m.difficulty}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {m.minutes} min
        </span>
        <span>
          {m.completedCount}/{m.lessonCount} lessons
        </span>
      </div>
      <div className="mt-auto pt-4">
        {m.enrolled && (
          <div className="mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">{m.progress}%</span>
            </div>
            <Progress value={m.progress} className="mt-1.5" />
          </div>
        )}
        <Button variant={m.completed ? "outline" : "action"} size="sm" asChild>
          <Link to={`/learn/${m.id}`}>{action}</Link>
        </Button>
      </div>
    </article>
  );
}

function LearnContent() {
  const { data, error } = useModules();
  const [track, setTrack] = useState("All");
  const modules = data ?? [];
  const tracks = ["All", ...new Set(modules.map((m) => m.track))];
  const list = modules.filter((m) => track === "All" || m.track === track);
  const inProgress = modules.filter((m) => m.enrolled && !m.completed);
  const average = modules.length ? Math.round(modules.reduce((sum, m) => sum + m.progress, 0) / modules.length) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Learn"
          description="Short modules that keep your technical skills current. Recommended modules close gaps in your verified skills."
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-panel p-5">
            <p className="text-sm text-muted-foreground">Learning activity</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{average}%</p>
            <p className="text-xs text-muted-foreground">counts for 25 points of your readiness score</p>
          </div>
          <div className="surface-panel p-5">
            <p className="text-sm text-muted-foreground">In progress</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{inProgress.length}</p>
          </div>
          <div className="surface-panel p-5">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{modules.filter((m) => m.completed).length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => (
            <button
              key={t}
              onClick={() => setTrack(t)}
              aria-pressed={track === t}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-semibold",
                track === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {!data ? (
          <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {error ? error.message : "Loading modules…"}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => (
              <ModuleCard key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function Learn() {
  return (
    <RequireRole roles={["graduate"]}>
      <LearnContent />
    </RequireRole>
  );
}
