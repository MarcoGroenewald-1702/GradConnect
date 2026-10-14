import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DemoNote, PageHeader } from "@/components/brand";
import { ApplyDialog, OpportunityCard } from "@/components/opportunities";
import { RequireRole } from "@/components/RequireRole";
import { Input } from "@/components/ui/input";
import { useOpportunities, useToggleSaved } from "@/lib/queries";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

const types = ["All", "Job", "Internship", "Learnership", "Freelance Project"];
const modes = ["Any", "On-site", "Hybrid", "Remote"];
const sorts = { match: "Best match", newest: "Newest" } as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3 text-xs font-semibold",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function OpportunitiesContent() {
  const { data, error } = useOpportunities();
  const toggleSaved = useToggleSaved();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [mode, setMode] = useState("Any");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<keyof typeof sorts>("match");
  const [applyingTo, setApplyingTo] = useState<Opportunity | null>(null);

  const list = useMemo(() => {
    const q = query.toLowerCase();
    const rows = (data ?? []).filter(
      (o) =>
        (type === "All" || o.type === type) &&
        (mode === "Any" || o.workMode === mode) &&
        (!savedOnly || o.saved) &&
        `${o.title} ${o.company} ${o.location} ${o.skills.join(" ")}`.toLowerCase().includes(q),
    );
    // the API already sorts by match; "newest" keeps the posting order instead
    return sort === "match" ? rows : [...rows].sort((a, b) => a.postedDate.localeCompare(b.postedDate));
  }, [data, query, type, mode, savedOnly, sort]);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Opportunities"
          description="Jobs, internships, learnerships and projects. The match % compares each one with your verified and self-declared skills."
        />

        <div className="surface-panel space-y-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                className="pl-9"
                placeholder="Search by title, company, location or skill"
                aria-label="Search opportunities"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sort</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value as keyof typeof sorts)}
              >
                {Object.entries(sorts).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {t}
              </Chip>
            ))}
            <span className="mx-1 hidden w-px bg-border sm:block" />
            {modes.map((m) => (
              <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
                {m}
              </Chip>
            ))}
            <span className="mx-1 hidden w-px bg-border sm:block" />
            <Chip active={savedOnly} onClick={() => setSavedOnly((v) => !v)}>
              Saved only
            </Chip>
          </div>
        </div>

        {!data ? (
          <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {error ? error.message : "Loading opportunities…"}
          </p>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No opportunities match your filters.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {list.length} {list.length === 1 ? "opportunity" : "opportunities"}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((o) => (
                <OpportunityCard
                  key={o.id}
                  opportunity={o}
                  onApply={() => setApplyingTo(o)}
                  onToggleSave={() => toggleSaved.mutate(o.id, { onError: (e) => toast.error(e.message) })}
                />
              ))}
            </div>
          </>
        )}
        <DemoNote />
      </div>
      <ApplyDialog opportunity={applyingTo} onClose={() => setApplyingTo(null)} />
    </AppShell>
  );
}

export default function Opportunities() {
  return (
    <RequireRole roles={["graduate"]}>
      <OpportunitiesContent />
    </RequireRole>
  );
}
