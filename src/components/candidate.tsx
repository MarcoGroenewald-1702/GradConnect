import { useEffect, useState } from "react";
import { BadgeCheck, Code, ExternalLink, GraduationCap, MapPin, Star } from "lucide-react";
import { toast } from "sonner";
import { SkillBadge } from "@/components/brand";
import { Avatar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAddToShortlist, useCandidate, useRemoveFromShortlist } from "@/lib/queries";

/** Shortlist / un-shortlist with an optional private note. */
export function ShortlistButton({ profileId, shortlisted, note }: { profileId: string; shortlisted: boolean; note?: string | null }) {
  const add = useAddToShortlist();
  const remove = useRemoveFromShortlist();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note ?? "");
  useEffect(() => setText(note ?? ""), [note]);

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          rows={2}
          maxLength={300}
          placeholder="Private note (optional), e.g. Strong React portfolio, invite to interview"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="action"
            disabled={add.isPending}
            onClick={() =>
              add.mutate(
                { profileId, note: text.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success(shortlisted ? "Note saved" : "Added to your shortlist");
                    setEditing(false);
                  },
                  onError: (e) => toast.error(e.message),
                },
              )
            }
          >
            {shortlisted ? "Save note" : "Add to shortlist"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return shortlisted ? (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="subtle" onClick={() => setEditing(true)}>
        <Star className="size-4 fill-warning text-warning" /> Shortlisted · edit note
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={remove.isPending}
        onClick={() => remove.mutate(profileId, { onSuccess: () => toast.success("Removed from shortlist"), onError: (e) => toast.error(e.message) })}
      >
        Remove
      </Button>
    </div>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
      <Star className="size-4" /> Shortlist
    </Button>
  );
}

/** Side panel with a candidate's full profile, split into verified vs self-declared skills. */
export function CandidatePanel({ profileId, onClose }: { profileId: string | null; onClose: () => void }) {
  const { data: c, error } = useCandidate(profileId);

  return (
    <Sheet open={!!profileId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetTitle className="sr-only">Candidate profile</SheetTitle>
        {!c ? (
          <p className={error ? "p-2 text-sm text-destructive" : "p-2 text-sm text-muted-foreground"}>
            {error ? error.message : "Loading profile…"}
          </p>
        ) : (
          <div className="space-y-6 p-2">
            <div className="flex items-start gap-4">
              <Avatar initials={c.initials} className="size-14 text-lg" />
              <div>
                <h2 className="text-xl font-bold text-foreground">{c.name}</h2>
                {c.headline && <p className="text-sm text-muted-foreground">{c.headline}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  <a href={`mailto:${c.email}`} className="text-action hover:underline">
                    {c.email}
                  </a>
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground">
              {(c.qualification || c.institution) && (
                <p className="flex items-center gap-2">
                  <GraduationCap className="size-4" aria-hidden /> {[c.qualification, c.institution, c.graduationYear].filter(Boolean).join(" · ")}
                </p>
              )}
              {c.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4" aria-hidden /> {c.location}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {c.githubUrl && (
                  <a href={c.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-action hover:underline">
                    <Code className="size-4" /> GitHub
                  </a>
                )}
                {c.websiteUrl && (
                  <a href={c.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-action hover:underline">
                    <ExternalLink className="size-4" /> Portfolio
                  </a>
                )}
              </div>
            </div>

            <ShortlistButton profileId={c.profileId} shortlisted={c.shortlisted} note={c.note} />
            {c.note && <p className="rounded-lg bg-surface p-3 text-sm text-muted-foreground">Your note: {c.note}</p>}

            <div className="rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Career readiness</p>
              <p className="text-2xl font-bold text-foreground">{c.readiness.total}%</p>
            </div>

            {c.bio && (
              <section>
                <h3 className="text-sm font-semibold text-foreground">About</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.bio}</p>
              </section>
            )}

            <section>
              <h3 className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <BadgeCheck className="size-4 text-success" /> Verified skills
              </h3>
              <p className="text-xs text-muted-foreground">Proven by a GradConnect assessment or a reviewed project.</p>
              {c.verifiedSkills.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {c.verifiedSkills.map((s) => (
                    <li key={s.name} className="flex items-center justify-between rounded-lg bg-success-soft px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.method === "assessment" ? `Assessment${s.score != null ? ` ${s.score}%` : ""}` : "Project"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Self-declared skills</h3>
              <p className="text-xs text-muted-foreground">Listed by the graduate, not yet verified.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.declaredSkills.length === 0 ? <span className="text-sm text-muted-foreground">None.</span> : c.declaredSkills.map((s) => <SkillBadge key={s} name={s} />)}
              </div>
            </section>

            {c.projects.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground">Projects</h3>
                <ul className="mt-2 space-y-2">
                  {c.projects.map((p) => (
                    <li key={p.name} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      {p.repo && (
                        <a href={p.repo} target="_blank" rel="noreferrer" className="text-xs text-action hover:underline">
                          {p.repo}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
