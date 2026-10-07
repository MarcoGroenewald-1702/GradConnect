import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, Check, GraduationCap, LoaderCircle, Users } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { registerSchema, signupAccountSchema, type SignupAccountInput } from "@shared/schemas";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, homeForRole } from "@/lib/api";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type SignupRole = "graduate" | "employer" | "mentor";

const roles: { id: SignupRole; title: string; body: string; icon: typeof GraduationCap }[] = [
  { id: "graduate", title: "Graduate", body: "Build your skills, portfolio and career.", icon: GraduationCap },
  { id: "employer", title: "Employer", body: "Find verified IT talent.", icon: Briefcase },
  { id: "mentor", title: "Mentor", body: "Help the next generation of IT professionals.", icon: Users },
];

const steps = ["Your account", "Your role", "Your details"];

// Step 3 uses part of the shared register schema: the details plus the two consents.
const detailsSchema = registerSchema.pick({ details: true, acceptTerms: true, popiaConsent: true });
type DetailsInput = z.input<typeof detailsSchema>;

const detailFields: Record<SignupRole, { name: keyof NonNullable<DetailsInput["details"]>; label: string; placeholder?: string; wide?: boolean }[]> = {
  graduate: [
    { name: "institution", label: "Institution", placeholder: "University of Johannesburg" },
    { name: "qualification", label: "Qualification", placeholder: "BSc Information Technology" },
    { name: "graduationYear", label: "Graduation year", placeholder: "2026" },
    { name: "careerInterest", label: "Career interest", placeholder: "Software Development" },
    { name: "location", label: "Location", placeholder: "Johannesburg, Gauteng", wide: true },
  ],
  employer: [
    { name: "company", label: "Company name" },
    { name: "industry", label: "Industry" },
    { name: "jobTitle", label: "Job title", wide: true },
  ],
  mentor: [
    { name: "jobTitle", label: "Job title" },
    { name: "years", label: "Years of experience" },
    { name: "specialisations", label: "Specialisations", placeholder: "Backend, .NET, Cloud", wide: true },
  ],
};

export default function Signup() {
  const navigate = useNavigate();
  const { signIn } = useStore();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<SignupRole>("graduate");
  const [account, setAccount] = useState<SignupAccountInput | null>(null);
  const [error, setError] = useState("");

  // Step 1 form, checked with the shared Zod schema
  const accountForm = useForm<SignupAccountInput>({
    resolver: zodResolver(signupAccountSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirm: "" },
  });

  // Step 3 form
  const detailsForm = useForm<DetailsInput>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { details: {}, acceptTerms: false as unknown as true, popiaConsent: false as unknown as true },
  });

  async function createAccount(values: DetailsInput) {
    if (!account) return;
    setError("");
    try {
      const { accessToken, user } = await api.register({
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        password: account.password,
        role,
        details: values.details,
        acceptTerms: true,
        popiaConsent: true,
      });
      signIn(accessToken, user);
      toast.success("Account created");
      navigate(role === "graduate" ? "/onboarding" : homeForRole(role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your account.");
    }
  }

  const accountErrors = accountForm.formState.errors;
  const detailErrors = detailsForm.formState.errors;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <Link to="/login" className="text-sm font-medium text-action hover:underline">
            Log in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Step indicator */}
        <ol className="flex items-center gap-2" aria-label="Signup progress">
          {steps.map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  i < step
                    ? "bg-success text-success-foreground"
                    : i === step
                      ? "bg-action text-action-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className={cn("hidden text-xs font-medium sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="surface-panel mt-6 p-6 sm:p-8">
          {step === 0 && (
            <form
              noValidate
              onSubmit={accountForm.handleSubmit((values) => {
                setAccount(values);
                setStep(1);
              })}
            >
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">We only ask for what we need to build your profile.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" {...accountForm.register("firstName")} />
                  <FieldError message={accountErrors.firstName?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" {...accountForm.register("lastName")} />
                  <FieldError message={accountErrors.lastName?.message} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" {...accountForm.register("email")} />
                  <FieldError message={accountErrors.email?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" {...accountForm.register("password")} />
                  <FieldError message={accountErrors.password?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" {...accountForm.register("confirm")} />
                  <FieldError message={accountErrors.confirm?.message} />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button type="submit" variant="action">
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">What brings you to GradConnect?</h1>
              <p className="mt-1 text-sm text-muted-foreground">You can change this later in settings.</p>
              <div className="mt-6 grid gap-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    aria-pressed={role === r.id}
                    className={cn(
                      "flex items-start gap-4 rounded-xl border p-4 text-left transition-colors",
                      role === r.id ? "border-action bg-accent" : "border-border bg-background hover:border-action/40",
                    )}
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <r.icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-foreground">{r.title}</span>
                      <span className="block text-sm text-muted-foreground">{r.body}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button type="button" variant="action" onClick={() => setStep(2)}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <form noValidate onSubmit={detailsForm.handleSubmit(createAccount)}>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Tell us a little more</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                This helps us match you with the right {role === "employer" ? "candidates" : "opportunities"}.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {detailFields[role].map((field) => (
                  <div key={field.name} className={cn("space-y-2", field.wide && "sm:col-span-2")}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input id={field.name} placeholder={field.placeholder} {...detailsForm.register(`details.${field.name}`)} />
                    <FieldError message={detailErrors.details?.[field.name]?.message} />
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 rounded-xl border border-border bg-surface p-4">
                <Controller
                  control={detailsForm.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        aria-label="Accept terms and conditions"
                      />
                      <span className="text-muted-foreground">I accept the GradConnect terms and conditions.</span>
                    </label>
                  )}
                />
                <FieldError message={detailErrors.acceptTerms?.message} />
                <Controller
                  control={detailsForm.control}
                  name="popiaConsent"
                  render={({ field }) => (
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        aria-label="Accept POPIA privacy consent"
                      />
                      <span className="text-muted-foreground">
                        I consent to GradConnect processing my personal information in line with POPIA, and I can
                        withdraw this consent in settings.
                      </span>
                    </label>
                  )}
                />
                <FieldError message={detailErrors.popiaConsent?.message} />
              </div>

              {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" /> Back
                </Button>
                <Button type="submit" variant="action" disabled={detailsForm.formState.isSubmitting}>
                  {detailsForm.formState.isSubmitting && <LoaderCircle className="size-4 animate-spin" />} Create Account
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
