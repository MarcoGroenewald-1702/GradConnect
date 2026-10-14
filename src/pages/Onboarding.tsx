import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import { Logo, SkillBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RequireRole } from "@/components/RequireRole";
import { onboardingSchema } from "@shared/schemas";
import { useCompleteOnboarding, useSkills } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const steps = ["About You", "Education", "Skills", "Career Goals", "Portfolio", "Complete"];

function OnboardingContent() {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [step, setStep] = useState(0);
  const skills = useSkills().data ?? [];
  const onboarding = useCompleteOnboarding();
  const saving = onboarding.isPending;
  const [about, setAbout] = useState({ headline: user?.headline ?? "", location: user?.location ?? "", bio: "" });
  const [education, setEducation] = useState({
    institution: user?.institution ?? "",
    qualification: user?.qualification ?? "",
    graduationYear: user?.graduationYear ?? "",
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [goals, setGoals] = useState({ interest: user?.careerInterest ?? "", target: "" });
  const [portfolio, setPortfolio] = useState({ github: "", site: "" });
  const [visible, setVisible] = useState(false);

  // Each completed section adds 12% on top of a 40% base
  const sectionsDone = [
    about.headline || about.location,
    education.institution && education.qualification,
    selectedSkills.length > 0,
    goals.interest,
    portfolio.github || portfolio.site,
  ].filter(Boolean).length;
  const completeness = Math.min(100, 40 + sectionsDone * 12);

  async function finish() {
    const input = {
      headline: about.headline,
      location: about.location,
      bio: about.bio,
      institution: education.institution,
      qualification: education.qualification,
      graduationYear: education.graduationYear,
      skillIds: selectedSkills,
      careerInterest: goals.interest,
      targetRole: goals.target,
      githubUrl: portfolio.github,
      websiteUrl: portfolio.site,
      visibleToEmployers: visible,
    };
    // Same Zod rules as the API, checked before sending
    const check = onboardingSchema.safeParse(input);
    if (!check.success) {
      toast.error(check.error.issues[0]?.message ?? "Please check your answers.");
      return;
    }
    try {
      const updated = await onboarding.mutateAsync(input);
      setUser(updated);
      setStep(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save your profile.");
    }
  }

  const goNext = () => (step === 4 ? finish() : setStep((s) => s + 1));

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          {step < 5 && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              Skip for now
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Let's build your career profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional steps can be skipped — you can finish them any time from your profile.
        </p>

        <ol className="mt-6 flex flex-wrap gap-x-4 gap-y-2" aria-label="Onboarding steps">
          {steps.map((label, i) => (
            <li
              key={label}
              className={cn(
                "text-xs font-semibold",
                i === step ? "text-action" : i < step ? "text-success" : "text-muted-foreground",
              )}
            >
              {label}
            </li>
          ))}
        </ol>
        <Progress value={((step + 1) / steps.length) * 100} className="mt-3" />

        <div className="surface-panel mt-6 p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">About you</h2>
              <div className="space-y-2">
                <Label htmlFor="headline">Professional headline</Label>
                <Input
                  id="headline"
                  value={about.headline}
                  placeholder="BSc IT Graduate · Aspiring Software Developer"
                  onChange={(e) => setAbout({ ...about, headline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc">Location</Label>
                <Input
                  id="loc"
                  value={about.location}
                  placeholder="Johannesburg, Gauteng"
                  onChange={(e) => setAbout({ ...about, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Short bio (optional)</Label>
                <Textarea id="bio" rows={4} value={about.bio} onChange={(e) => setAbout({ ...about, bio: e.target.value })} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Education</h2>
              <div className="space-y-2">
                <Label htmlFor="inst">Institution</Label>
                <Input id="inst" value={education.institution} onChange={(e) => setEducation({ ...education, institution: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qual">Qualification</Label>
                <Input id="qual" value={education.qualification} onChange={(e) => setEducation({ ...education, qualification: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Graduation year</Label>
                <Input id="year" value={education.graduationYear} onChange={(e) => setEducation({ ...education, graduationYear: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground">Skills you can already work with</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select self-declared skills now — you can verify them later with an assessment.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const selected = selectedSkills.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setSelectedSkills((list) =>
                          selected ? list.filter((id) => id !== skill.id) : [...list, skill.id],
                        )
                      }
                      className={cn(
                        "min-h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                        selected
                          ? "border-action bg-action text-action-foreground"
                          : "border-border bg-background text-foreground hover:border-action/40",
                      )}
                    >
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Career goals</h2>
              <div className="space-y-2">
                <Label htmlFor="interest">Career interest</Label>
                <Input
                  id="interest"
                  value={goals.interest}
                  placeholder="Software Development"
                  onChange={(e) => setGoals({ ...goals, interest: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target role in 12 months (optional)</Label>
                <Input
                  id="target"
                  value={goals.target}
                  placeholder="Junior Backend Developer"
                  onChange={(e) => setGoals({ ...goals, target: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Portfolio (optional)</h2>
              <div className="space-y-2">
                <Label htmlFor="gh">GitHub or repository URL</Label>
                <Input
                  id="gh"
                  value={portfolio.github}
                  placeholder="github.com/yourname"
                  onChange={(e) => setPortfolio({ ...portfolio, github: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site">Personal site or project link</Label>
                <Input id="site" value={portfolio.site} onChange={(e) => setPortfolio({ ...portfolio, site: e.target.value })} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4">
                <Checkbox checked={visible} onCheckedChange={(v) => setVisible(v === true)} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-foreground">Let employers find my profile</span>
                  <span className="block text-xs text-muted-foreground">
                    Your name, qualification and skills will appear in employer candidate search. You can change this any time in Settings.
                  </span>
                </span>
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
                <CircleCheck className="size-7" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-bold text-foreground">Your GradConnect profile is ready.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Verify a skill next — verified skills raise your match scores immediately.
              </p>
              <div className="mx-auto mt-6 max-w-sm rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Profile completeness</span>
                  <span className="text-action">{user?.profileCompleteness ?? completeness}%</span>
                </div>
                <Progress value={user?.profileCompleteness ?? completeness} className="mt-3" />
              </div>
              {selectedSkills.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {selectedSkills.slice(0, 6).map((id) => (
                    <SkillBadge key={id} name={skills.find((s) => s.id === id)?.name ?? id} />
                  ))}
                </div>
              )}
              <Button className="mt-7" size="lg" variant="action" onClick={() => navigate("/dashboard")}>
                Go to Dashboard <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {step < 5 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" onClick={goNext}>
                    Skip
                  </Button>
                )}
                <Button variant="action" onClick={goNext} disabled={saving}>
                  {step === 4 ? (saving ? "Saving…" : "Finish") : "Continue"} <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <RequireRole roles={["graduate"]}>
      <OnboardingContent />
    </RequireRole>
  );
}
