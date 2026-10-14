import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleCheck, CircleX, Clock, LoaderCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
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
import { Progress } from "@/components/ui/progress";
import { useAssessments, useStartAssessment, useSubmitAssessment } from "@/lib/queries";
import type { AssessmentAttempt, AssessmentResult } from "@/lib/types";
import { cn } from "@/lib/utils";

// Answers are kept in sessionStorage so a page refresh doesn't lose them.
const storageKey = (attemptId: string) => `gradconnect.attempt.${attemptId}`;
function loadAnswers(attemptId: string, count: number): number[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(attemptId)) ?? "null");
    if (Array.isArray(saved) && saved.length === count) return saved;
  } catch {
    /* ignore */
  }
  return Array(count).fill(-1);
}
function saveAnswers(attemptId: string, answers: number[]) {
  try {
    sessionStorage.setItem(storageKey(attemptId), JSON.stringify(answers));
  } catch {
    /* ignore */
  }
}

/** mm:ss */
const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/** Large countdown. Turns amber at 30 seconds and red at 10 seconds (design doc 4.3.2). */
function Timer({ remainingMs }: { remainingMs: number }) {
  const seconds = remainingMs / 1000;
  return (
    <div
      role="timer"
      aria-live={seconds <= 30 ? "assertive" : "off"}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-3xl font-bold tabular-nums transition-colors",
        seconds > 30 && "border-border bg-background text-foreground",
        seconds <= 30 && seconds > 10 && "border-warning/40 bg-warning-soft text-warning-foreground",
        seconds <= 10 && "animate-pulse border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      <Clock className="size-6" aria-hidden />
      {clock(remainingMs)}
    </div>
  );
}

function Quiz({ attempt, onDone }: { attempt: AssessmentAttempt; onDone: (r: AssessmentResult) => void }) {
  const total = attempt.questions.length;
  const [answers, setAnswers] = useState<number[]>(() => loadAnswers(attempt.attemptId, total));
  const [current, setCurrent] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [remaining, setRemaining] = useState(() => new Date(attempt.endsAt).getTime() - Date.now());
  const submit = useSubmitAssessment();
  const submitted = useRef(false);

  const doSubmit = useCallback(
    async (latest: number[]) => {
      if (submitted.current) return;
      submitted.current = true;
      try {
        const result = await submit.mutateAsync({ attemptId: attempt.attemptId, input: { answers: latest } });
        sessionStorage.removeItem(storageKey(attempt.attemptId));
        onDone(result);
      } catch (e) {
        submitted.current = false;
        toast.error(e instanceof Error ? e.message : "Could not submit.");
      }
    },
    [attempt.attemptId, onDone, submit],
  );

  // tick the timer; submit automatically when time runs out
  const answersRef = useRef(answers);
  answersRef.current = answers;
  useEffect(() => {
    const id = setInterval(() => {
      const left = new Date(attempt.endsAt).getTime() - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        toast.info("Time is up. Submitting your answers…");
        doSubmit(answersRef.current);
      }
    }, 250);
    return () => clearInterval(id);
  }, [attempt.endsAt, doSubmit]);

  function choose(option: number) {
    const next = answers.map((a, i) => (i === current ? option : a));
    setAnswers(next);
    saveAnswers(attempt.attemptId, next);
  }

  const answered = answers.filter((a) => a >= 0).length;
  const q = attempt.questions[current];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-action">{attempt.assessment.skill}</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{attempt.assessment.title}</h1>
        </div>
        <Timer remainingMs={remaining} />
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>
            Question {current + 1} of {total}
          </span>
          <span>{answered} answered</span>
        </div>
        <Progress value={((current + 1) / total) * 100} className="mt-2" />
      </div>

      <section className="surface-panel p-6">
        <h2 className="text-lg font-semibold text-foreground">{q.prompt}</h2>
        <fieldset className="mt-5 grid gap-3">
          <legend className="sr-only">Choose one answer</legend>
          {q.options.map((option, i) => {
            const selected = answers[current] === i;
            return (
              <label
                key={option}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-colors",
                  selected ? "border-action bg-accent font-medium text-foreground" : "border-border bg-surface hover:border-action/40",
                )}
              >
                <input
                  type="radio"
                  name={`q-${current}`}
                  className="size-4 accent-[var(--action)]"
                  checked={selected}
                  onChange={() => choose(i)}
                />
                <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                {option}
              </label>
            );
          })}
        </fieldset>
      </section>

      {/* question dots */}
      <nav className="flex flex-wrap gap-2" aria-label="Questions">
        {attempt.questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-current={i === current ? "step" : undefined}
            aria-label={`Question ${i + 1}${answers[i] >= 0 ? ", answered" : ""}`}
            className={cn(
              "size-9 rounded-lg border text-xs font-semibold",
              i === current
                ? "border-action bg-action text-action-foreground"
                : answers[i] >= 0
                  ? "border-success/30 bg-success-soft text-success"
                  : "border-border bg-background text-muted-foreground",
            )}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          <ArrowLeft className="size-4" /> Previous
        </Button>
        {current < total - 1 ? (
          <Button variant="action" onClick={() => setCurrent((c) => c + 1)}>
            Next <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            variant="success"
            disabled={submit.isPending}
            onClick={() => (answered < total ? setConfirmOpen(true) : doSubmit(answers))}
          >
            {submit.isPending && <LoaderCircle className="size-4 animate-spin" />} Submit answers
          </Button>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit with unanswered questions?</DialogTitle>
            <DialogDescription>
              You've answered {answered} of {total} questions. Unanswered questions count as wrong.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep going
            </Button>
            <Button
              variant="success"
              onClick={() => {
                setConfirmOpen(false);
                doSubmit(answers);
              }}
            >
              Submit anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Result({ result, onRetry }: { result: AssessmentResult; onRetry: () => void }) {
  return (
    <div className="space-y-6">
      <section className="surface-panel p-8 text-center">
        <span
          className={cn(
            "mx-auto flex size-14 items-center justify-center rounded-full",
            result.passed ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground",
          )}
        >
          {result.passed ? <BadgeCheck className="size-7" aria-hidden /> : <RotateCcw className="size-7" aria-hidden />}
        </span>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {result.passed ? `${result.skill} verified!` : result.late ? "Time ran out" : "Not quite there yet"}
        </h1>
        <p className="mt-1 text-5xl font-extrabold tracking-tight text-foreground">{result.score}%</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.correct} of {result.total} correct · pass mark {result.passMark}%
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {result.passed
            ? "The verified badge is now on your profile, and your readiness score and opportunity matches have gone up."
            : result.late
              ? "Answers sent after the timer ended can't count towards verification. You can try again."
              : "Review the topics below (the Learn section can help), then try again."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {result.passed ? (
            <>
              <Button variant="action" asChild>
                <Link to="/profile">View my profile</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/assessments">More assessments</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="action" onClick={onRetry}>
                <RotateCcw className="size-4" /> Try again
              </Button>
              <Button variant="outline" asChild>
                <Link to="/learn">Go to Learn</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="surface-panel p-6">
        <h2 className="text-base font-semibold text-foreground">Your answers</h2>
        <ol className="mt-4 space-y-4">
          {result.review.map((r, i) => (
            <li key={i} className="flex gap-3">
              {r.isCorrect ? (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-label="Correct" />
              ) : (
                <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Incorrect" />
              )}
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {i + 1}. {r.prompt}
                </p>
                <p className="text-muted-foreground">
                  Your answer: {r.chosen >= 0 ? r.options[r.chosen] : "not answered"}
                  {r.answer !== null && !r.isCorrect && <> · Correct: {r.options[r.answer]}</>}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {!result.passed && (
          <p className="mt-4 text-xs text-muted-foreground">The correct answers are shown once you pass.</p>
        )}
      </section>
    </div>
  );
}

function AssessmentTakeContent() {
  const { id = "" } = useParams();
  const summary = useAssessments().data?.find((a) => a.id === id);
  const start = useStartAssessment();
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  async function begin() {
    setResult(null);
    try {
      setAttempt(await start.mutateAsync(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the assessment.");
    }
  }

  return (
    <AppShell contentClassName="max-w-3xl">
      <Link to="/assessments" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All assessments
      </Link>

      {result ? (
        <Result
          result={result}
          onRetry={() => {
            setAttempt(null);
            begin();
          }}
        />
      ) : attempt ? (
        <Quiz attempt={attempt} onDone={setResult} />
      ) : (
        <section className="surface-panel p-8">
          {!summary ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-action">{summary.skill}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{summary.title}</h1>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  • {summary.questionCount} multiple-choice questions, {summary.minutes} minutes
                </li>
                <li>• Pass mark {summary.passMark}%: passing verifies {summary.skill} on your profile</li>
                <li>• The timer keeps running if you leave the page; answers are submitted automatically at 00:00</li>
                <li>• You can move between questions and change answers before submitting</li>
              </ul>
              {summary.verified ? (
                <p className="mt-6 text-sm font-medium text-success">{summary.skill} is already verified.</p>
              ) : (
                <Button className="mt-7" size="lg" variant="action" onClick={begin} disabled={start.isPending}>
                  {start.isPending && <LoaderCircle className="size-4 animate-spin" />} Start the timer
                </Button>
              )}
            </>
          )}
        </section>
      )}
    </AppShell>
  );
}

export default function AssessmentTake() {
  return (
    <RequireRole roles={["graduate"]}>
      <AssessmentTakeContent />
    </RequireRole>
  );
}
