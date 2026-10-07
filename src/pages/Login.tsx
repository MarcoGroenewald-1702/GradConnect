import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schemas";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/form-error";
import { api, homeForRole } from "@/lib/api";
import { useStore } from "@/lib/store";

const demoAccounts = [
  { label: "Graduate", email: "thandi.nkosi@example.co.za" },
  { label: "Employer", email: "lerato@technova.example" },
  { label: "Mentor", email: "sipho@example.co.za" },
  { label: "Admin", email: "admin@gradconnect.example" },
];

const highlights = [
  "Assessment-backed skill verification",
  "Micro-learning that keeps skills current",
  "Mentors from South African IT teams",
  "Opportunities matched to verified skills",
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useStore();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "thandi.nkosi@example.co.za", password: "password123" },
  });

  // Only runs when the form passes the shared Zod schema
  async function onSubmit(values: LoginInput) {
    setError("");
    try {
      const { accessToken, user } = await api.login(values);
      signIn(accessToken, user);
      toast.success(`Welcome back, ${user.firstName}`);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel (desktop only) */}
      <div className="hidden flex-col justify-between bg-primary p-10 lg:flex">
        <Link to="/">
          <span className="text-lg font-bold text-primary-foreground">
            Grad<span className="text-action">Connect</span>
          </span>
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-bold text-primary-foreground">
            Verified skills open doors that CVs cannot.
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-primary-foreground/85">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-success" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Demo accounts use the password password123. Passwords are stored as secure hashes.
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tight text-foreground lg:mt-0">Log in to GradConnect</h1>
          <p className="mt-1 text-sm text-muted-foreground">Continue building your career momentum.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => toast.info("Password reset email sent (demo).")}
                  className="text-xs font-medium text-action hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              <FieldError message={errors.password?.message} />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" variant="action" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />} Log In
            </Button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Continue with a demo account
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <Button
                  key={acc.label}
                  variant="outline"
                  onClick={() => {
                    setValue("email", acc.email);
                    setValue("password", "password123");
                  }}
                >
                  {acc.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-action hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
