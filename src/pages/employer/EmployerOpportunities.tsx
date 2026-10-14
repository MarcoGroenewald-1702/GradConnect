import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useSearchParams } from "react-router-dom";
import { LoaderCircle, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { opportunitySchema, opportunityTypes, workModes, type OpportunityInput } from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Empty, LoadState, StatusBadge } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteOpportunity,
  useEmployerOpportunities,
  useSaveOpportunity,
  useSetOpportunityOpen,
  useSkills,
} from "@/lib/queries";
import type { EmployerOpportunity } from "@/lib/types";
import { selectClass, timeAgo } from "@/lib/utils";

const blank: OpportunityInput = {
  title: "",
  type: "Job",
  location: "",
  workMode: "Hybrid",
  experience: "Graduate / 0–1 years",
  salary: "",
  description: "",
  skills: [],
  responsibilities: "",
  requirements: "",
};

/** Pick skills from the shared catalogue (so match scores work), up to 10. */
function SkillPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const skills = useSkills().data ?? [];
  const options = skills.filter((s) => !value.includes(s.name));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((x) => x !== s))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-muted-foreground">No skills chosen yet.</span>}
      </div>
      <select
        aria-label="Add a required skill"
        className={selectClass}
        value=""
        disabled={value.length >= 10}
        onChange={(e) => e.target.value && onChange([...value, e.target.value])}
      >
        <option value="">{value.length >= 10 ? "Maximum of 10 skills" : "Add a required skill…"}</option>
        {[...new Set(options.map((s) => s.category))].map((cat) => (
          <optgroup key={cat} label={cat}>
            {options
              .filter((s) => s.category === cat)
              .map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function OpportunityDialog({ editing, open, onClose }: { editing: EmployerOpportunity | null; open: boolean; onClose: () => void }) {
  const save = useSaveOpportunity();
  const form = useForm<OpportunityInput>({ resolver: zodResolver(opportunitySchema), defaultValues: blank });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            ...editing,
            type: editing.type as OpportunityInput["type"],
            workMode: editing.workMode as OpportunityInput["workMode"],
            responsibilities: editing.responsibilities.join("\n"),
            requirements: editing.requirements.join("\n"),
          }
        : blank,
    );
  }, [open, editing, form]);

  async function submit(values: OpportunityInput) {
    try {
      await save.mutateAsync({ id: editing?.id, input: values });
      toast.success(editing ? "Opportunity updated" : "Opportunity posted. Graduates can see it now.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  }

  const field = (name: keyof OpportunityInput, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} placeholder={placeholder} {...form.register(name)} />
      <FieldError message={errors[name]?.message} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle>{editing ? "Edit opportunity" : "Post an opportunity"}</DialogTitle>
        <DialogDescription>Required skills come from the GradConnect skills list, so graduates get an accurate match score.</DialogDescription>
        <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
          {field("title", "Title", "e.g. Junior Frontend Developer")}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" className={selectClass} {...form.register("type")}>
                {opportunityTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <FieldError message={errors.type?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workMode">Work mode</Label>
              <select id="workMode" className={selectClass} {...form.register("workMode")}>
                {workModes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <FieldError message={errors.workMode?.message} />
            </div>
            {field("location", "Location", "e.g. Cape Town")}
            {field("experience", "Experience")}
            {field("salary", "Salary / stipend", "e.g. R18 000 – R24 000 pm")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...form.register("description")} />
            <FieldError message={errors.description?.message} />
          </div>
          <div className="space-y-2">
            <Label>Required skills</Label>
            <Controller control={form.control} name="skills" render={({ field: f }) => <SkillPicker value={f.value} onChange={f.onChange} />} />
            <FieldError message={errors.skills?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
              <Textarea id="responsibilities" rows={4} {...form.register("responsibilities")} />
              <FieldError message={errors.responsibilities?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements (one per line)</Label>
              <Textarea id="requirements" rows={4} {...form.register("requirements")} />
              <FieldError message={errors.requirements?.message} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="action" disabled={save.isPending}>
              {save.isPending && <LoaderCircle className="size-4 animate-spin" />} {editing ? "Save changes" : "Post opportunity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmployerOpportunitiesContent() {
  const { data, error } = useEmployerOpportunities();
  const setOpen = useSetOpportunityOpen();
  const remove = useDeleteOpportunity();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<EmployerOpportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(params.get("new") === "1");
  const [deleting, setDeleting] = useState<EmployerOpportunity | null>(null);

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    if (params.has("new")) setParams({}, { replace: true });
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="Your opportunities"
          description="Post roles, open or close them, and review who applied."
          action={
            <Button variant="action" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> Post an opportunity
            </Button>
          }
        />

        {!data ? (
          <LoadState error={error} label="opportunities" />
        ) : data.length === 0 ? (
          <Empty>You haven't posted any opportunities yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {data.map((o) => (
              <li key={o.id} className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/employer/opportunities/${o.id}`} className="font-semibold text-foreground hover:underline">
                        {o.title}
                      </Link>
                      <StatusBadge status={o.isOpen ? "open" : "closed"} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {o.type} · {o.location} · {o.workMode} · posted {timeAgo(o.postedAt)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{o.skills.join(" · ")}</p>
                  </div>
                  <Button variant="subtle" size="sm" asChild>
                    <Link to={`/employer/opportunities/${o.id}`}>
                      <Users className="size-4" /> {o.applications} {o.applications === 1 ? "applicant" : "applicants"}
                      {o.newApplications > 0 && ` (${o.newApplications} new)`}
                    </Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(o);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={setOpen.isPending}
                    onClick={() =>
                      setOpen.mutate(
                        { id: o.id, open: !o.isOpen },
                        {
                          onSuccess: () => toast.success(o.isOpen ? "Closed. Graduates can no longer apply." : "Reopened for applications"),
                          onError: (e) => toast.error(e.message),
                        },
                      )
                    }
                  >
                    {o.isOpen ? "Close applications" : "Reopen"}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(o)}>
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <OpportunityDialog open={dialogOpen} editing={editing} onClose={closeDialog} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogTitle>Delete "{deleting?.title}"?</DialogTitle>
          <DialogDescription>
            {deleting?.applications
              ? "This opportunity has applications, so it can't be deleted. Close it instead to stop new applications."
              : "This removes the opportunity permanently."}
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!!deleting?.applications || remove.isPending}
              onClick={() =>
                remove.mutate(deleting!.id, {
                  onSuccess: () => {
                    toast.success("Opportunity deleted");
                    setDeleting(null);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function EmployerOpportunities() {
  return (
    <RequireRole roles={["employer"]}>
      <EmployerOpportunitiesContent />
    </RequireRole>
  );
}
