import type { ReactNode } from "react";
import { BadgeCheck, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          variant === "dark" ? "bg-primary text-primary-foreground" : "bg-action text-action-foreground",
        )}
      >
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span
        className={cn(
          "text-lg font-bold tracking-tight",
          variant === "dark" ? "text-foreground" : "text-sidebar-foreground",
        )}
      >
        Grad<span className="text-action">Connect</span>
      </span>
    </span>
  );
}

export function SkillBadge({ name, verified = false, className }: { name: string; verified?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        verified
          ? "border-success/30 bg-success-soft text-success"
          : "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {verified && <BadgeCheck className="size-3.5" aria-hidden />}
      {name}
      <span className="sr-only">{verified ? " (verified skill)" : " (self-declared skill)"}</span>
    </span>
  );
}

export function MatchBadge({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-semibold",
        value >= 85
          ? "border-success/30 bg-success-soft text-success"
          : value >= 70
            ? "border-action/25 bg-accent text-accent-foreground"
            : "border-warning/30 bg-warning-soft text-warning-foreground",
        className,
      )}
    >
      {value}% Match
    </span>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function DemoNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Demo data — companies, people and opportunities shown here are fictional examples.
    </p>
  );
}
