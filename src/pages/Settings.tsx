import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Download, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  accountUpdateSchema,
  changePasswordSchema,
  type AccountUpdateInput,
  type ChangePasswordInput,
} from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { RequireRole } from "@/components/RequireRole";
import { VisibilityToggle } from "@/components/visibility";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { downloadJson } from "@/lib/sessions";
import { useStore } from "@/lib/store";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="surface-panel grid gap-4 p-6 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function AccountForm() {
  const { user, setUser } = useStore();
  const form = useForm<AccountUpdateInput>({
    resolver: zodResolver(accountUpdateSchema),
    defaultValues: { firstName: user!.firstName, lastName: user!.lastName },
  });
  const errors = form.formState.errors;

  async function save(values: AccountUpdateInput) {
    try {
      setUser(await api.updateAccount(values));
      form.reset(values);
      toast.success("Name updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(save)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" {...form.register("firstName")} />
          <FieldError message={errors.firstName?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" {...form.register("lastName")} />
          <FieldError message={errors.lastName?.message} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user!.email} disabled />
        <p className="text-xs text-muted-foreground">Your email is your login and can't be changed here.</p>
      </div>
      <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
        Save name
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { signIn } = useStore();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const errors = form.formState.errors;

  async function save(values: ChangePasswordInput) {
    try {
      const { accessToken, user } = await api.changePassword(values);
      signIn(accessToken, user);
      form.reset();
      toast.success("Password changed. Other devices have been signed out.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change the password.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(save)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register("currentPassword")} />
        <FieldError message={errors.currentPassword?.message} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" autoComplete="new-password" {...form.register("newPassword")} />
          <FieldError message={errors.newPassword?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input id="confirm" type="password" autoComplete="new-password" {...form.register("confirm")} />
          <FieldError message={errors.confirm?.message} />
        </div>
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <LoaderCircle className="size-4 animate-spin" />} Change password
      </Button>
    </form>
  );
}

function PrivacySection() {
  const { user, signOut } = useStore();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setExporting(true);
    try {
      downloadJson(await api.exportMyData(), `gradconnect-my-data-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export your data.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await api.deleteAccount(password);
      navigate("/");
      await signOut();
      toast.success("Your account and data have been deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete the account.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {user!.role === "graduate" && <VisibilityToggle />}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportData} disabled={exporting}>
          <Download className="size-4" /> Download my data
        </Button>
        {user!.role !== "admin" && (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
            <Trash2 className="size-4" /> Delete my account
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Under POPIA you can get a copy of everything we store about you, and ask us to delete it.
      </p>

      <Dialog open={deleting} onOpenChange={(o) => { setDeleting(o); if (!o) setPassword(""); }}>
        <DialogContent>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently removes your profile, skills, applications and sessions. It can't be undone. Enter your password to confirm.
          </DialogDescription>
          <div className="space-y-2">
            <Label htmlFor="delete-password">Password</Label>
            <Input id="delete-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!password || busy} onClick={deleteAccount}>
              {busy && <LoaderCircle className="size-4 animate-spin" />} Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsContent() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title="Settings" description="Your account, password and privacy." />
        <Section title="Account" description="The name shown on your profile and to employers or mentors.">
          <AccountForm />
        </Section>
        <Section title="Password" description="At least 8 characters. Changing it signs you out everywhere else.">
          <PasswordForm />
        </Section>
        <Section title="Privacy & data" description="Control who sees your profile and what we keep.">
          <PrivacySection />
        </Section>
      </div>
    </AppShell>
  );
}

export default function Settings() {
  return (
    <RequireRole roles={["graduate", "employer", "mentor", "admin"]}>
      <SettingsContent />
    </RequireRole>
  );
}
