import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck, Check, Clock, LoaderCircle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { applySchema, type ApplyInput } from "@shared/schemas";
import { MatchBadge, SkillBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/form-error";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApply, useProfileSnapshot } from "@/lib/queries";
import type { Opportunity } from "@/lib/types";

/** Opportunity card used on the dashboard and the Opportunities page. */
export function OpportunityCard({
  opportunity,
  onToggleSave,
  onApply,
}: {
  opportunity: Opportunity;
  onToggleSave: () => void;
  onApply: () => void;
}) {
  const o = opportunity;
  return (
    <article className="surface-panel p-5 transition-shadow hover:shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-muted-foreground">{o.type}</span>
          <h3 className="text-lg font-semibold text-foreground">
            <Link to={`/opportunities/${o.id}`} className="hover:underline">
              {o.title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{o.company}</p>
        </div>
        <MatchBadge value={o.match} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden /> {o.location}
        </span>
        <span>{o.workMode}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden /> {o.postedDate}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {o.skills.map((s) => (
          <SkillBadge key={s} name={s} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {o.applied ? (
          <Button variant="success" disabled>
            <Check className="size-4" /> Applied
          </Button>
        ) : (
          <Button variant="action" onClick={onApply}>
            Apply now
          </Button>
        )}
        <Button variant="outline" onClick={onToggleSave} aria-pressed={o.saved}>
          {o.saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {o.saved ? "Saved" : "Save"}
        </Button>
      </div>
    </article>
  );
}

/** Shows exactly what the employer will receive, plus an optional cover note (max 500 characters). */
export function ApplyDialog({ opportunity, onClose }: { opportunity: Opportunity | null; onClose: () => void }) {
  const snapshot = useProfileSnapshot(!!opportunity);
  const apply = useApply();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ApplyInput>({ resolver: zodResolver(applySchema), defaultValues: { coverNote: "" } });
  const noteLength = watch("coverNote")?.length ?? 0;

  function close() {
    reset();
    onClose();
  }

  async function submit(values: ApplyInput) {
    if (!opportunity) return;
    try {
      await apply.mutateAsync({ id: opportunity.id, input: values });
      toast.success(`Applied for ${opportunity.title}`);
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply.");
    }
  }

  const s = snapshot.data;
  return (
    <Dialog open={!!opportunity} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for {opportunity?.title}</DialogTitle>
          <DialogDescription>
            {opportunity?.company} will receive a copy of your profile as it is right now.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-surface p-4 text-sm">
          {!s ? (
            <p className="text-muted-foreground">Loading your profile…</p>
          ) : (
            <>
              <p className="font-semibold text-foreground">{s.name}</p>
              <p className="text-muted-foreground">{s.headline}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[s.qualification, s.institution, s.location].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.verifiedSkills.map((v) => (
                  <SkillBadge key={v.name} name={v.name} verified />
                ))}
                {s.declaredSkills.map((d) => (
                  <SkillBadge key={d} name={d} />
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Career readiness: {s.readinessScore} / 100</p>
            </>
          )}
        </div>

        <form id="apply-form" onSubmit={handleSubmit(submit)} className="space-y-2" noValidate>
          <div className="flex items-center justify-between">
            <Label htmlFor="coverNote">Cover note (optional)</Label>
            <span className={noteLength > 500 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
              {noteLength}/500
            </span>
          </div>
          <Textarea id="coverNote" rows={4} placeholder="Why are you a good fit?" {...register("coverNote")} />
          <FieldError message={errors.coverNote?.message} />
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="apply-form" variant="action" disabled={apply.isPending || !s}>
            {apply.isPending && <LoaderCircle className="size-4 animate-spin" />} Send application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

