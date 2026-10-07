import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateInput } from "@shared/schemas";
import { Link } from "react-router-dom";
import { BadgeCheck, ExternalLink, FolderGit2, GraduationCap, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SkillBadge } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/api";
import { useProfile, useUpdateProfile } from "@/lib/queries";
import { useStore } from "@/lib/store";

const withProtocol = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

function ProfileContent() {
  const { setUser } = useStore();
  const { data, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const [editOpen, setEditOpen] = useState(false);
  const form = useForm<ProfileUpdateInput>({ resolver: zodResolver(profileUpdateSchema) });

  function openEdit() {
    if (!data) return;
    form.reset({
      headline: data.user.headline ?? "",
      location: data.user.location ?? "",
      careerInterest: data.user.careerInterest ?? "",
    });
    setEditOpen(true);
  }

  async function save(values: ProfileUpdateInput) {
    try {
      const updated = await updateProfile.mutateAsync(values);
      setUser(updated);
      setEditOpen(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  }

  if (!data) {
    return (
      <AppShell>
        <p className={error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {error ? error.message : "Loading your profile…"}
        </p>
      </AppShell>
    );
  }

  const { user, verifiedSkills, declaredSkills, projects, readiness } = data;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="surface-panel p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
                {user.avatarInitials}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-sm text-muted-foreground">{user.headline ?? "IT Graduate"}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {user.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden /> {user.location}
                    </span>
                  )}
                  {user.institution && (
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="size-3.5" aria-hidden /> {user.institution}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-success">
                    <BadgeCheck className="size-3.5" aria-hidden /> {verifiedSkills.length} verified skills
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={openEdit}>
              <Pencil className="size-4" /> Edit Profile
            </Button>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Profile completeness</span>
              <span className="text-action">{user.profileCompleteness}%</span>
            </div>
            <Progress value={user.profileCompleteness} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">Career readiness score: {readiness.total} / 100</p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">About</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {user.bio ??
                  `${user.qualification ?? "IT"} graduate focused on ${user.careerInterest ?? "software development"}, looking for a graduate role where I can keep learning from a strong engineering team.`}
              </p>
            </section>

            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">Education</h2>
              {user.qualification || user.institution ? (
                <div className="mt-3 rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-foreground">{user.qualification}</p>
                  <p className="text-sm text-muted-foreground">{user.institution}</p>
                  {user.graduationYear && (
                    <p className="text-xs text-muted-foreground">Graduated {user.graduationYear}</p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No education added yet.</p>
              )}
            </section>

            <section className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Technical skills</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/skills">Verify a skill</Link>
                </Button>
              </div>
              <h3 className="mt-4 text-xs font-semibold tracking-wide text-success uppercase">Verified</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {verifiedSkills.length ? (
                  verifiedSkills.map((s) => <SkillBadge key={s.skillId} name={s.name} verified />)
                ) : (
                  <p className="text-sm text-muted-foreground">No verified skills yet.</p>
                )}
              </div>
              <h3 className="mt-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Self-declared</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {declaredSkills.length ? (
                  declaredSkills.map((s) => <SkillBadge key={s.skillId} name={s.name} />)
                ) : (
                  <p className="text-sm text-muted-foreground">No self-declared skills yet.</p>
                )}
              </div>
            </section>

            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">Projects</h2>
              {projects.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Projects you submit as skill evidence will show here.
                </p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {projects.map((p) => (
                    <li key={p.name + p.skill} className="rounded-xl border border-border bg-surface p-4">
                      <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                      {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.skill && <SkillBadge name={p.skill} verified />}
                      </div>
                      {p.repo && (
                        <a
                          href={withProtocol(p.repo)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 text-xs text-action hover:underline"
                        >
                          <FolderGit2 className="size-3.5" aria-hidden /> {p.repo}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">Verification history</h2>
              {verifiedSkills.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing verified yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {verifiedSkills.map((s) => (
                    <li key={s.skillId} className="rounded-lg border border-border bg-surface p-3">
                      <p className="text-sm font-medium text-foreground">GradConnect Verified: {s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.method === "assessment" ? `Assessment · ${s.score}%` : "Project evidence"} ·{" "}
                        {formatDate(s.verifiedOn)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="surface-panel p-6">
              <h2 className="text-base font-semibold text-foreground">Portfolio links</h2>
              {!user.githubUrl && !user.websiteUrl ? (
                <p className="mt-3 text-sm text-muted-foreground">No links added yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {user.githubUrl && (
                    <li>
                      <a className="inline-flex items-center gap-2 text-action hover:underline" href={withProtocol(user.githubUrl)} target="_blank" rel="noreferrer">
                        <FolderGit2 className="size-4" aria-hidden /> {user.githubUrl}
                      </a>
                    </li>
                  )}
                  {user.websiteUrl && (
                    <li>
                      <a className="inline-flex items-center gap-2 text-action hover:underline" href={withProtocol(user.websiteUrl)} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" aria-hidden /> {user.websiteUrl}
                      </a>
                    </li>
                  )}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <form id="profile-form" onSubmit={form.handleSubmit(save)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" {...form.register("headline")} />
              <FieldError message={form.formState.errors.headline?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...form.register("location")} />
              <FieldError message={form.formState.errors.location?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest">Career interest</Label>
              <Input id="interest" {...form.register("careerInterest")} />
              <FieldError message={form.formState.errors.careerInterest?.message} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="profile-form" variant="action" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function Profile() {
  return (
    <RequireRole roles={["graduate"]}>
      <ProfileContent />
    </RequireRole>
  );
}
