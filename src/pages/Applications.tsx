import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { MatchBadge, PageHeader } from "@/components/brand";
import { Empty, LoadState, StatusBadge } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { useApplications, useWithdrawApplication } from "@/lib/queries";
import type { Application } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const filters = ["All", "Submitted", "Under Review", "Interview", "Offer", "Rejected"];

function ApplicationsContent() {
  const { data, error } = useApplications();
  const withdraw = useWithdrawApplication();
  const [filter, setFilter] = useState("All");
  const [confirming, setConfirming] = useState<Application | null>(null);

  const list = (data ?? []).filter((a) => filter === "All" || a.status === filter);
  const countFor = (f: string) => (f === "All" ? (data?.length ?? 0) : (data ?? []).filter((a) => a.status === f).length);

  async function doWithdraw() {
    if (!confirming) return;
    try {
      await withdraw.mutateAsync(confirming.id);
      toast.success(`Withdrew your application for ${confirming.title}`);
      setConfirming(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not withdraw.");
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title="My applications"
          description="Track where each application stands. Employers update the status as they review."
          action={
            <Button variant="action" asChild>
              <Link to="/opportunities">Find opportunities</Link>
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
          {filters.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-9 rounded-full border px-3 text-xs font-semibold",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {f} ({countFor(f)})
            </button>
          ))}
        </div>

        {!data ? (
          <LoadState error={error} label="applications" />
        ) : list.length === 0 ? (
          <Empty>
            {data.length === 0 ? (
              <>
                You haven't applied yet.{" "}
                <Link to="/opportunities" className="font-medium text-action hover:underline">
                  Browse opportunities
                </Link>
              </>
            ) : (
              "No applications with this status."
            )}
          </Empty>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => (
              <li key={a.id} className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link to={`/opportunities/${a.opportunityId}`} className="font-semibold text-foreground hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {a.company} · applied {timeAgo(a.appliedOn)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <MatchBadge value={a.match} />
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                {a.coverNote && (
                  <p className="mt-3 rounded-lg bg-surface p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Your note: </span>
                    {a.coverNote}
                  </p>
                )}
                {(a.status === "Submitted" || a.status === "Under Review") && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setConfirming(a)}>
                      Withdraw
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogTitle>Withdraw this application?</DialogTitle>
          <DialogDescription>
            {confirming?.title} at {confirming?.company}. The employer will no longer see it. You can apply again later while the role is open.
          </DialogDescription>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Keep it
            </Button>
            <Button variant="destructive" disabled={withdraw.isPending} onClick={doWithdraw}>
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function Applications() {
  return (
    <RequireRole roles={["graduate"]}>
      <ApplicationsContent />
    </RequireRole>
  );
}
