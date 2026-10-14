import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetVisibility } from "@/lib/queries";
import { useStore } from "@/lib/store";

/** POPIA opt-in: whether employers can find this graduate in candidate search. */
export function VisibilityToggle() {
  const { user, setUser } = useStore();
  const setVisibility = useSetVisibility();
  const visible = user!.visibleToEmployers;

  return (
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox
        checked={visible}
        disabled={setVisibility.isPending}
        onCheckedChange={(v) =>
          setVisibility.mutate(v === true, {
            onSuccess: () => {
              setUser({ ...user!, visibleToEmployers: v === true });
              toast.success(v === true ? "Employers can now find your profile" : "Your profile is hidden from employer search");
            },
            onError: (e) => toast.error(e.message),
          })
        }
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">Let employers find my profile</span>
        <span className="block text-sm text-muted-foreground">
          When this is on, your name, qualification and skills appear in employer candidate search. Employers you apply to can always see the
          profile snapshot you sent them.
        </span>
      </span>
    </label>
  );
}
