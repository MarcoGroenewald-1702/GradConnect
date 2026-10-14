import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { mentorProfileSchema, weekDays, type MentorProfileInput } from "@shared/schemas";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { LoadState } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMentorProfile, useUpdateMentorProfile } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Day = (typeof weekDays)[number];
type Slots = Record<Day, string[]>;
const emptySlots = (): Slots => Object.fromEntries(weekDays.map((d) => [d, []])) as unknown as Slots;
const suggested = ["08:00", "12:00", "17:00", "18:00", "19:00"];

/** Weekly slot editor: add/remove 1-hour start times per day. */
function SlotEditor({ slots, onChange }: { slots: Slots; onChange: (s: Slots) => void }) {
  const [adding, setAdding] = useState<Record<string, string>>({});
  const add = (day: Day, time: string) => {
    if (!/^\d{2}:\d{2}$/.test(time) || slots[day].includes(time)) return;
    onChange({ ...slots, [day]: [...slots[day], time].sort() });
    setAdding({ ...adding, [day]: "" });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {weekDays.map((day) => (
        <div key={day} className={cn("rounded-xl border p-3", slots[day].length ? "border-action/30 bg-accent/30" : "border-border")}>
          <p className="text-sm font-semibold text-foreground">{day}</p>
          <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
            {slots[day].map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-sm font-medium shadow-sm">
                {t}
                <button type="button" aria-label={`Remove ${day} ${t}`} onClick={() => onChange({ ...slots, [day]: slots[day].filter((x) => x !== t) })}>
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </span>
            ))}
            {slots[day].length === 0 && <span className="text-xs text-muted-foreground">Not available</span>}
          </div>
          <div className="mt-2 flex gap-1.5">
            <Input
              type="time"
              step={900}
              aria-label={`Add a time on ${day}`}
              className="h-8"
              value={adding[day] ?? ""}
              onChange={(e) => setAdding({ ...adding, [day]: e.target.value })}
            />
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => add(day, adding[day] ?? "")}>
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {suggested
              .filter((t) => !slots[day].includes(t))
              .map((t) => (
                <button key={t} type="button" onClick={() => add(day, t)} className="rounded px-1.5 text-xs text-action hover:bg-accent">
                  +{t}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MentorAvailabilityContent() {
  const { data, error } = useMentorProfile();
  const update = useUpdateMentorProfile();
  const [slots, setSlots] = useState<Slots>(emptySlots);
  const form = useForm<MentorProfileInput>({ resolver: zodResolver(mentorProfileSchema) });
  const errors = form.formState.errors;

  useEffect(() => {
    if (!data) return;
    form.reset({
      jobTitle: data.jobTitle,
      company: data.company,
      years: data.years,
      bio: data.bio,
      availability: data.availability,
      specialisations: data.specialisations.join("\n"),
      languages: data.languages.join("\n"),
      slots: [],
    });
    const s = emptySlots();
    for (const d of data.slots) if (d.day in s) s[d.day as Day] = [...d.times].sort();
    setSlots(s);
  }, [data, form]);

  async function save(values: MentorProfileInput) {
    try {
      await update.mutateAsync({
        ...values,
        slots: weekDays.filter((d) => slots[d].length).map((d) => ({ day: d, times: slots[d] })),
      });
      toast.success("Profile and availability saved. Graduates see the new times straight away.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    }
  }

  if (!data) {
    return (
      <AppShell>
        <LoadState error={error} label="your profile" />
      </AppShell>
    );
  }

  const totalSlots = weekDays.reduce((n, d) => n + slots[d].length, 0);

  return (
    <AppShell>
      <form className="space-y-6" onSubmit={form.handleSubmit(save)} noValidate>
        <PageHeader
          title="Availability & profile"
          description="What graduates see when they choose a mentor. Sessions are 1 hour, in South African time."
          action={
            <Button type="submit" variant="action" disabled={update.isPending}>
              {update.isPending && <LoaderCircle className="size-4 animate-spin" />} Save changes
            </Button>
          }
        />

        <section className="surface-panel p-6">
          <h2 className="text-base font-semibold text-foreground">Weekly time slots</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {totalSlots} {totalSlots === 1 ? "slot" : "slots"} a week. Removing a time doesn't cancel sessions already booked.
          </p>
          <SlotEditor slots={slots} onChange={setSlots} />
        </section>

        <section className="surface-panel grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input id="jobTitle" {...form.register("jobTitle")} />
            <FieldError message={errors.jobTitle?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" {...form.register("company")} />
            <FieldError message={errors.company?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">Years of experience</Label>
            <Input id="years" type="number" min={0} max={60} {...form.register("years")} />
            <FieldError message={errors.years?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="availability">Availability summary</Label>
            <Input id="availability" placeholder="e.g. Weekday evenings" {...form.register("availability")} />
            <FieldError message={errors.availability?.message} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={4} {...form.register("bio")} />
            <FieldError message={errors.bio?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialisations">Specialisations (one per line)</Label>
            <Textarea id="specialisations" rows={4} {...form.register("specialisations")} />
            <FieldError message={errors.specialisations?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="languages">Languages (one per line)</Label>
            <Textarea id="languages" rows={4} {...form.register("languages")} />
            <FieldError message={errors.languages?.message} />
          </div>
        </section>
      </form>
    </AppShell>
  );
}

export default function MentorAvailability() {
  return (
    <RequireRole roles={["mentor"]}>
      <MentorAvailabilityContent />
    </RequireRole>
  );
}
