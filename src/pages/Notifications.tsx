import { Bell, BriefcaseBusiness, CalendarCheck, CheckCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Empty, LoadState } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { useMarkAllRead, useMarkRead, useNotifications } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/utils";

const iconFor = (kind: string) =>
  kind.includes("session") || kind.includes("mentor")
    ? CalendarCheck
    : kind.includes("application") || kind.includes("opportunit")
      ? BriefcaseBusiness
      : kind.includes("verif") || kind.includes("assessment")
        ? ShieldCheck
        : kind.includes("learn")
          ? GraduationCap
          : Bell;

function NotificationsContent() {
  const { data, error } = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Notifications"
          description={unread ? `${unread} unread` : "You're all caught up."}
          action={
            unread > 0 && (
              <Button
                variant="outline"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate(undefined, { onError: (e) => toast.error(e.message) })}
              >
                <CheckCheck className="size-4" /> Mark all as read
              </Button>
            )
          }
        />
        {!data ? (
          <LoadState error={error} label="notifications" />
        ) : data.length === 0 ? (
          <Empty>No notifications yet.</Empty>
        ) : (
          <ul className="surface-panel divide-y divide-border">
            {data.map((n) => {
              const Icon = iconFor(n.kind);
              return (
                <li key={n.id} className={cn("flex gap-4 p-4", !n.read && "bg-accent/40")}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-action">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm text-foreground", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.time)}</p>
                  </div>
                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Mark "${n.title}" as read`}
                      onClick={() => markRead.mutate(n.id, { onError: (e) => toast.error(e.message) })}
                    >
                      Mark read
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

export default function Notifications() {
  return (
    <RequireRole roles={["graduate", "employer", "mentor", "admin"]}>
      <NotificationsContent />
    </RequireRole>
  );
}
