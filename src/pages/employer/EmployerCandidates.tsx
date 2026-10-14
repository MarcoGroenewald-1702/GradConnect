import { useState } from "react";
import { BadgeCheck, MapPin, Star, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MatchBadge, PageHeader, SkillBadge } from "@/components/brand";
import { CandidatePanel } from "@/components/candidate";
import { Avatar, Empty, LoadState } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCandidates, useSkills } from "@/lib/queries";
import { selectClass } from "@/lib/utils";

const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + 1 - i));

function EmployerCandidatesContent() {
  const allSkills = useSkills().data ?? [];
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const { data, error, isFetching } = useCandidates({ skills, location: location.trim(), graduationYear, verifiedOnly });

  const reset = () => {
    setSkills([]);
    setLocation("");
    setGraduationYear("");
    setVerifiedOnly(false);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Find candidates"
          description="Search graduates who chose to be visible to employers. Verified skills were proven on GradConnect; self-declared skills were not."
        />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filter rail */}
          <aside className="surface-panel h-fit space-y-5 p-5 lg:sticky lg:top-24">
            <div className="space-y-2">
              <Label htmlFor="skill-filter">Skills</Label>
              <select
                id="skill-filter"
                className={selectClass}
                value=""
                onChange={(e) => e.target.value && setSkills([...skills, e.target.value])}
              >
                <option value="">Add a skill…</option>
                {allSkills
                  .filter((s) => !skills.includes(s.name))
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                    {s}
                    <button aria-label={`Remove ${s}`} onClick={() => setSkills(skills.filter((x) => x !== s))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              {skills.length > 0 && <p className="text-xs text-muted-foreground">Ranked by match: verified skills count fully, self-declared half.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-filter">Location</Label>
              <Input id="location-filter" placeholder="e.g. Johannesburg" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-filter">Graduation year</Label>
              <select id="year-filter" className={selectClass} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)}>
                <option value="">Any year</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox checked={verifiedOnly} onCheckedChange={(v) => setVerifiedOnly(v === true)} className="mt-0.5" />
              <span>
                <span className="font-medium text-foreground">Verified skills only</span>
                <span className="block text-xs text-muted-foreground">Only candidates who verified every chosen skill</span>
              </span>
            </label>
            <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
              Clear filters
            </Button>
          </aside>

          {/* Results */}
          <section className="space-y-3">
            {!data ? (
              <LoadState error={error} label="candidates" />
            ) : data.length === 0 ? (
              <Empty>No visible candidates match these filters.</Empty>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {data.length} {data.length === 1 ? "candidate" : "candidates"}
                  {isFetching && " · updating…"}
                </p>
                {data.map((c) => (
                  <article key={c.profileId} className="surface-panel p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <Avatar initials={c.initials} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button className="font-semibold text-foreground hover:underline" onClick={() => setViewing(c.profileId)}>
                            {c.name}
                          </button>
                          {c.shortlisted && <Star className="size-4 fill-warning text-warning" aria-label="Shortlisted" />}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {[c.qualification, c.institution, c.graduationYear].filter(Boolean).join(" · ") || c.headline}
                        </p>
                        {c.location && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3.5" /> {c.location}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {c.match != null ? <MatchBadge value={c.match} /> : null}
                        <p className="mt-1 text-xs text-muted-foreground">Readiness {c.readiness}%</p>
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
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BadgeCheck className="size-3.5 text-success" /> {c.verifiedSkills.length} verified · {c.declaredSkills.length} self-declared
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setViewing(c.profileId)}>
                        View profile
                      </Button>
                    </div>
                  </article>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
      <CandidatePanel profileId={viewing} onClose={() => setViewing(null)} />
    </AppShell>
  );
}

export default function EmployerCandidates() {
  return (
    <RequireRole roles={["employer"]}>
      <EmployerCandidatesContent />
    </RequireRole>
  );
}
