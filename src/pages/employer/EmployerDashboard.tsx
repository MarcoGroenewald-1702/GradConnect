import { Link } from "react-router-dom";
import { Briefcase, CalendarCheck, Inbox, Plus, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Avatar, Empty, LoadState, StatCard, StatusBadge } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Button } from "@/components/ui/button";
import { useEmployerOverview } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

function EmployerDashboardContent() {
  const { user } = useStore();
  const { data, error } = useEmployerOverview();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${user?.firstName}`}
          description={data ? `${data.employer.name}${data.employer.industry ? ` · ${data.employer.industry}` : ""}` : undefined}
          action={
            <Button variant="action" asChild>
              <Link to="/employer/opportunities?new=1">
                <Plus className="size-4" /> Post an opportunity
              </Link>
            </Button>
          }
        />

        {!data ? (
          <LoadState error={error} label="your dashboard" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Open opportunities" value={data.stats.openOpportunities} icon={Briefcase} />
              <StatCard label="Applications" value={data.stats.applications} icon={Inbox} hint={`${data.stats.newApplications} new, not yet reviewed`} />
              <StatCard label="Interviews" value={data.stats.interviews} icon={CalendarCheck} />
              <StatCard label="Shortlisted candidates" value={data.stats.shortlisted} icon={Star} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <section className="surface-panel p-6">
                <h2 className="text-base font-semibold text-foreground">Recent applications</h2>
                {data.recentApplications.length === 0 ? (
                  <Empty>No applications yet. They'll appear here as graduates apply.</Empty>
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {data.recentApplications.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-3">
                        <Avatar initials={a.initials} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{a.candidate}</p>
                          <Link to={`/employer/opportunities/${a.opportunityId}`} className="text-xs text-muted-foreground hover:underline">
                            {a.opportunityTitle} · {timeAgo(a.appliedAt)}
                          </Link>
                        </div>
                        <StatusBadge status={a.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="surface-panel p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Your opportunities</h2>
                  <Link to="/employer/opportunities" className="text-sm font-medium text-action hover:underline">
                    Manage
                  </Link>
                </div>
                {data.opportunities.length === 0 ? (
                  <Empty>You haven't posted anything yet.</Empty>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {data.opportunities.map((o) => (
                      <li key={o.id}>
                        <Link
                          to={`/employer/opportunities/${o.id}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 hover:border-action/40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">{o.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {o.applications} {o.applications === 1 ? "applicant" : "applicants"}
                            </span>
                          </span>
                          <StatusBadge status={o.isOpen ? "open" : "closed"} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="outline" className="mt-4 w-full" asChild>
                  <Link to="/employer/candidates">Search candidates</Link>
                </Button>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function EmployerDashboard() {
  return (
    <RequireRole roles={["employer"]}>
      <EmployerDashboardContent />
    </RequireRole>
  );
}
