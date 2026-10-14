import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Check, FileCheckCorner, FolderGit2, LoaderCircle, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { projectEvidenceSchema, type ProjectEvidenceInput } from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { PageHeader, SkillBadge } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAssessments, useMySkills, useSkills, useVerifySkill } from "@/lib/queries";
import { cn } from "@/lib/utils";

const categories = ["All", "Languages", "Frameworks", "Cloud", "Data", "Security", "Tools"];
const steps = ["Select a skill", "Verification method", "Confirmation"];

function SkillsContent() {
  const navigate = useNavigate();
  const skills = useSkills().data ?? [];
  const mySkills = useMySkills().data ?? [];
  const verify = useVerifySkill();
  const assessments = useAssessments().data ?? [];

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [method, setMethod] = useState<"assessment" | "project" | null>(null);

  // Project evidence form, validated with the shared Zod schema (same rules as the API)
  const form = useForm<ProjectEvidenceInput>({
    resolver: zodResolver(projectEvidenceSchema),
    defaultValues: { projectName: "", repoUrl: "", description: "", artefactName: "", consent: false as unknown as true },
  });
  const evidence = form.watch();
  const errors = form.formState.errors;

  const filtered = useMemo(
    () =>
      skills.filter(
        (s) => (category === "All" || s.category === category) && s.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [skills, query, category],
  );
  const selected = skills.find((s) => s.id === selectedId);
  const assessment = assessments.find((a) => a.skillId === selectedId);

  async function confirm(values: ProjectEvidenceInput) {
    if (!selectedId) return;
    try {
      await verify.mutateAsync({ skillId: selectedId, input: values });
      toast.success(`${selected?.name} verified with project evidence`);
      navigate("/profile");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
    }
  }

  const optionClass = (active: boolean) =>
    cn(
      "rounded-xl border p-5 text-left transition-colors",
      active ? "border-action bg-accent" : "border-border bg-surface hover:border-action/40",
    );

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Skills verification"
          description="Three steps: choose the skill, choose how you'll prove it, confirm."
        />

        <ol className="flex flex-wrap gap-2" aria-label="Verification steps">
          {steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                i === step
                  ? "border-action bg-accent text-accent-foreground"
                  : i < step
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-border bg-background text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" aria-hidden /> : <span>{i + 1}</span>}
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section className="surface-panel p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  className="pl-9"
                  placeholder="Search skills"
                  aria-label="Search skills"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={cn(
                      "min-h-9 rounded-full border px-3 text-xs font-semibold",
                      category === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((skill) => {
                const verified = mySkills.find((us) => us.skillId === skill.id)?.verified;
                return (
                  <button
                    key={skill.id}
                    onClick={() => setSelectedId(skill.id)}
                    aria-pressed={selectedId === skill.id}
                    disabled={verified}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors disabled:opacity-60",
                      selectedId === skill.id
                        ? "border-action bg-accent"
                        : "border-border bg-surface hover:border-action/40",
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">{skill.category}</p>
                    {verified && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <BadgeCheck className="size-3.5" aria-hidden /> Verified
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="action" disabled={!selectedId} onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 1 && selected && (
          <section className="surface-panel p-6">
            <h2 className="text-lg font-semibold text-foreground">How would you like to verify {selected.name}?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setMethod("assessment")}
                aria-pressed={method === "assessment"}
                className={optionClass(method === "assessment")}
              >
                <FileCheckCorner className="size-5 text-action" aria-hidden />
                <h3 className="mt-3 text-base font-semibold text-foreground">Technical Assessment</h3>
                <p className="mt-1 text-sm text-muted-foreground">Take a timed auto-graded assessment.</p>
                {assessment ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {assessment.questionCount} questions · {assessment.minutes} minutes · pass mark {assessment.passMark}%
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-warning-foreground">
                    No assessment for this skill yet — use project evidence.
                  </p>
                )}
              </button>
              <button
                onClick={() => setMethod("project")}
                aria-pressed={method === "project"}
                className={optionClass(method === "project")}
              >
                <FolderGit2 className="size-5 text-action" aria-hidden />
                <h3 className="mt-3 text-base font-semibold text-foreground">Project Evidence</h3>
                <p className="mt-1 text-sm text-muted-foreground">Submit a project demonstrating the skill.</p>
              </button>
            </div>

            {method === "project" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pname">Project name</Label>
                  <Input id="pname" {...form.register("projectName")} />
                  <FieldError message={errors.projectName?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo">Repository URL</Label>
                  <Input id="repo" placeholder="github.com/you/project" {...form.register("repoUrl")} />
                  <FieldError message={errors.repoUrl?.message} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="pdesc">Description</Label>
                  <Textarea id="pdesc" rows={4} {...form.register("description")} />
                  <FieldError message={errors.description?.message} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="artefact">Upload project artefact</Label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input bg-surface px-4 text-sm text-muted-foreground">
                    <Upload className="size-4" aria-hidden />
                    {evidence.artefactName || "Choose a file (PDF, ZIP or image)"}
                    <input
                      id="artefact"
                      type="file"
                      className="sr-only"
                      onChange={(e) => form.setValue("artefactName", e.target.files?.[0]?.name ?? "")}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Only the file name is stored for now; file storage (S3) is planned for a later sprint.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              {method === "assessment" ? (
                assessment ? (
                  <Button variant="action" asChild>
                    <Link to={`/assessments/${assessment.id}`}>Start assessment</Link>
                  </Button>
                ) : (
                  <Button variant="action" disabled>
                    Start assessment
                  </Button>
                )
              ) : (
                <Button
                  variant="action"
                  disabled={!method}
                  onClick={async () => {
                    if (await form.trigger(["projectName", "repoUrl", "description"])) setStep(2);
                  }}
                >
                  Continue
                </Button>
              )}
            </div>
          </section>
        )}

        {step === 2 && selected && (
          <form className="surface-panel p-6" onSubmit={form.handleSubmit(confirm)} noValidate>
            <h2 className="text-lg font-semibold text-foreground">Confirm verification</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your verified skill will be added to your public profile.</p>
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <SkillBadge name={selected.name} verified />
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="font-medium text-foreground">Project evidence</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Project</dt>
                  <dd className="font-medium text-foreground">{evidence.projectName}</dd>
                </div>
                {evidence.repoUrl && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Repository</dt>
                    <dd className="font-medium text-foreground">{evidence.repoUrl}</dd>
                  </div>
                )}
                {evidence.artefactName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Artefact</dt>
                    <dd className="font-medium text-foreground">{evidence.artefactName}</dd>
                  </div>
                )}
              </dl>
            </div>

            <Controller
              control={form.control}
              name="consent"
              render={({ field }) => (
                <label className="mt-5 flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-label="Confirm this is my own work"
                  />
                  <span className="text-muted-foreground">
                    I confirm this project is my own work, and I agree to show this verified skill and project on my
                    profile.
                  </span>
                </label>
              )}
            />
            <div className="mt-2">
              <FieldError message={errors.consent?.message} />
            </div>

            <div className="mt-6 flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" variant="success" disabled={verify.isPending}>
                {verify.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}{" "}
                Confirm Verification
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

export default function Skills() {
  return (
    <RequireRole roles={["graduate"]}>
      <SkillsContent />
    </RequireRole>
  );
}
