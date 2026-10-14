import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader, SkillBadge } from "@/components/brand";
import { CandidatePanel, ShortlistButton } from "@/components/candidate";
import { Avatar, Empty, LoadState } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { useShortlist } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";

function EmployerShortlistContent() {
  const { data, error } = useShortlist();
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Shortlisted candidates" description="Graduates you've saved, with your private notes. Only your company can see this list." />
        {!data ? (
          <LoadState error={error} label="your shortlist" />
        ) : data.length === 0 ? (
          <Empty>
            Your shortlist is empty.{" "}
            <Link to="/employer/candidates" className="font-medium text-action hover:underline">
              Search candidates
            </Link>
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.map((c) => (
              <article key={c.profileId} className="surface-panel flex flex-col p-5">
                <div className="flex items-start gap-4">
                  <Avatar initials={c.initials} />
                  <div className="min-w-0 flex-1">
                    <button className="font-semibold text-foreground hover:underline" onClick={() => setViewing(c.profileId)}>
                      {c.name}
                    </button>
                    <p className="text-sm text-muted-foreground">{c.qualification ?? c.headline}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {c.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" /> {c.location}
                        </span>
                      )}
                      <span>added {timeAgo(c.addedAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.verifiedSkills.map((s) => (
                    <SkillBadge key={s} name={s} verified />
                  ))}
                  {c.declaredSkills.map((s) => (
                    <SkillBadge key={s} name={s} />
                  ))}
                </div>
                {c.note && <p className="mt-3 rounded-lg bg-surface p-3 text-sm text-muted-foreground">{c.note}</p>}
                <div className="mt-auto flex flex-wrap items-start justify-between gap-2 border-t border-border pt-3 [&:not(:first-child)]:mt-4">
                  <ShortlistButton profileId={c.profileId} shortlisted note={c.note} />
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${c.email}`}>Email</a>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <CandidatePanel profileId={viewing} onClose={() => setViewing(null)} />
    </AppShell>
  );
}

export default function EmployerShortlist() {
  return (
    <RequireRole roles={["employer"]}>
      <EmployerShortlistContent />
    </RequireRole>
  );
}
