import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Check, ChevronDown, CircleCheck, Clock, LoaderCircle, Target } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAssessments, useEnrol, useLessonDone, useModule } from "@/lib/queries";
import { cn } from "@/lib/utils";

function LearnModuleContent() {
  const { id = "" } = useParams();
  const { data: m, error } = useModule(id);
  const lessonDone = useLessonDone(id);
  const enrol = useEnrol(id);
  const assessment = useAssessments().data?.find((a) => a.skill === m?.skill);
  const [open, setOpen] = useState<number | null>(null);

  if (!m) {
    return (
      <AppShell>
        <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {error ? error.message : "Loading module…"}
        </p>
      </AppShell>
    );
  }

  // open the first unfinished lesson by default
  const firstOpen = m.lessons.find((l) => !l.done)?.index ?? 0;
  const openIndex = open ?? (m.enrolled ? firstOpen : null);
  const doneCount = m.lessons.filter((l) => l.done).length;

  async function toggle(index: number, done: boolean) {
    try {
      const updated = await lessonDone.mutateAsync({ index, done });
      if (done) {
        if (updated.completedAt && updated.progress === 100) toast.success(`Module complete: ${m!.title}`);
        const next = updated.lessons.find((l) => !l.done);
        setOpen(next ? next.index : null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <AppShell contentClassName="max-w-4xl">
      <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All modules
      </Link>

      <div className="space-y-6">
        <section className="surface-panel p-6">
          <p className="text-sm font-semibold text-action">
            {m.track} · {m.difficulty}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{m.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{m.description}</p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden /> {m.minutes} minutes · {m.lessons.length} lessons
          </p>

          {m.enrolled ? (
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>
                  {doneCount} of {m.lessons.length} lessons done
                </span>
                <span className="text-action">{m.progress}%</span>
              </div>
              <Progress value={m.progress} className="mt-2" />
            </div>
          ) : (
            <Button
              className="mt-5"
              variant="action"
              disabled={enrol.isPending}
              onClick={() => enrol.mutate(undefined, { onError: (e) => toast.error(e.message) })}
            >
              {enrol.isPending && <LoaderCircle className="size-4 animate-spin" />} Start module
            </Button>
          )}
        </section>

        {m.completedAt && (
          <section className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CircleCheck className="size-6 text-success" aria-hidden />
              <div>
                <p className="font-semibold text-foreground">Module complete</p>
                <p className="text-sm text-muted-foreground">Ready to prove it? Verify {m.skill} on your profile.</p>
              </div>
            </div>
            {assessment && !assessment.verified ? (
              <Button variant="success" asChild>
                <Link to={`/assessments/${assessment.id}`}>
                  <BadgeCheck className="size-4" /> Take the {m.skill} assessment
                </Link>
              </Button>
            ) : (
              <Button variant="success" asChild>
                <Link to="/skills">
                  <BadgeCheck className="size-4" /> Verify a skill
                </Link>
              </Button>
            )}
          </section>
        )}

        <section className="surface-panel p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="size-4 text-action" aria-hidden /> What you'll be able to do
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            {m.objectives.map((o) => (
              <li key={o} className="rounded-lg border border-border bg-surface p-3">
                {o}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Lessons</h2>
          {m.lessons.map((lesson) => {
            const isOpen = openIndex === lesson.index;
            return (
              <article key={lesson.index} className="surface-panel overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 p-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : lesson.index)}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      lesson.done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {lesson.done ? <Check className="size-4" aria-hidden /> : lesson.index + 1}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">{lesson.title}</span>
                    <span className="block text-xs text-muted-foreground">{lesson.minutes} min</span>
                  </span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-surface px-4 py-4 sm:pl-15">
                    <ul className="space-y-2 text-sm text-foreground">
                      {lesson.content.map((point) => (
                        <li key={point} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-action" aria-hidden />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      {lesson.done ? (
                        <Button variant="outline" size="sm" disabled={lessonDone.isPending} onClick={() => toggle(lesson.index, false)}>
                          Mark as not done
                        </Button>
                      ) : (
                        <Button variant="action" size="sm" disabled={lessonDone.isPending} onClick={() => toggle(lesson.index, true)}>
                          <Check className="size-4" /> Mark lesson as done
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}

export default function LearnModule() {
  return (
    <RequireRole roles={["graduate"]}>
      <LearnModuleContent />
    </RequireRole>
  );
}
