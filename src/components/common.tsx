import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  submitted: "border-border bg-muted text-foreground",
  under_review: "border-action/25 bg-accent text-accent-foreground",
  interview: "border-warning/30 bg-warning-soft text-warning-foreground",
  offer: "border-success/30 bg-success-soft text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  requested: "border-warning/30 bg-warning-soft text-warning-foreground",
  accepted: "border-success/30 bg-success-soft text-success",
  completed: "border-border bg-muted text-muted-foreground",
  open: "border-success/30 bg-success-soft text-success",
  closed: "border-border bg-muted text-muted-foreground",
};

/** Accepts a key ("under_review") or a label ("Under Review"). */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        statusTone[key] ?? statusTone.submitted,
      )}
    >
      {label ?? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
    </span>
  );
}

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string }) {
  return (
    <div className="surface-panel flex items-start justify-between p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-action">
        <Icon className="size-5" aria-hidden />
      </span>
    </div>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function LoadState({ error, label }: { error?: Error | null; label: string }) {
  return <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{error ? error.message : `Loading ${label}…`}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
