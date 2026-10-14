import { Link } from "react-router-dom";
import { BadgeCheck, Briefcase, CalendarCheck, GraduationCap, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Empty, LoadState, StatCard } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Progress } from "@/components/ui/progress";
import { useAdminOverview } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";

/** Simple horizontal bar list: label, count, bar relative to the largest */
function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between text-sm">
            <span className="text-foreground">{r.label}</span>
            <span className="font-semibold text-foreground">{r.value}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-action" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdminOverviewContent() {
  const { data, error } = useAdminOverview();

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Platform overview" description="Live numbers from the GradConnect database. Read-only." />
        {!data ? (
          <LoadState error={error} label="platform numbers" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Users" value={data.users.total} icon={Users} hint={`${data.users.onboarded} graduates onboarded`} />
              <StatCard
                label="Verified skills"
                value={data.verifiedSkills.total}
                icon={BadgeCheck}
                hint={`${data.verifiedSkills.byAssessment} by assessment · ${data.verifiedSkills.byProject} by project`}
              />
              <StatCard
                label="Opportunities"
                value={data.opportunities.open + data.opportunities.closed}
                icon={Briefcase}
                hint={`${data.opportunities.open} open · ${data.opportunities.closed} closed`}
              />
              <StatCard
                label="Learning enrolments"
                value={data.learning.enrolments}
                icon={GraduationCap}
                hint={`${data.learning.completed} completed · avg ${data.learning.averageProgress}%`}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="surface-panel p-6">
                <h2 className="mb-4 text-base font-semibold text-foreground">Users by role</h2>
                <Bars
                  rows={(["graduate", "employer", "mentor", "admin"] as const).map((r) => ({
                    label: r[0].toUpperCase() + r.slice(1) + "s",
                    value: data.users.byRole[r] ?? 0,
                  }))}
                />
                <p className="mt-4 text-xs text-muted-foreground">{data.users.visibleToEmployers} graduates visible to employers (POPIA opt-in)</p>
              </section>
              <section className="surface-panel p-6">
                <h2 className="mb-4 text-base font-semibold text-foreground">Applications by status</h2>
                <Bars
                  rows={[
                    ["submitted", "Submitted"],
                    ["under_review", "Under review"],
                    ["interview", "Interview"],
                    ["offer", "Offer"],
                    ["rejected", "Rejected"],
                  ].map(([k, label]) => ({ label, value: data.applications[k as keyof typeof data.applications] ?? 0 }))}
                />
              </section>
              <section className="surface-panel p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                  <CalendarCheck className="size-4 text-action" /> Mentor sessions
                </h2>
                <Bars
                  rows={[
                    { label: "Requested", value: data.sessions.requested ?? 0 },
                    { label: "Accepted", value: data.sessions.accepted ?? 0 },
                    { label: "Completed", value: data.sessions.completed ?? 0 },
                  ]}
                />
              </section>
            </div>

            <section className="surface-panel overflow-x-auto p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">Assessments</h2>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 font-semibold">Assessment</th>
                    <th className="py-2 font-semibold">Attempts</th>
                    <th className="py-2 font-semibold">Passed</th>
                    <th className="w-48 py-2 font-semibold">Pass rate</th>
                    <th className="py-2 font-semibold">Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assessments.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0">
                      <td className="py-2.5">
                        <span className="font-medium text-foreground">{a.title}</span>
                        <span className="block text-xs text-muted-foreground">{a.skill}</span>
                      </td>
                      <td>{a.attempts}</td>
                      <td>{a.passed}</td>
                      <td>
                        {a.passRate == null ? (
                          <span className="text-muted-foreground">No attempts</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Progress value={a.passRate} className="h-2 w-24" /> {a.passRate}%
                          </span>
                        )}
                      </td>
                      <td>{a.averageScore == null ? "–" : `${a.averageScore}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="surface-panel p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Newest users</h2>
                <Link to="/admin/users" className="text-sm font-medium text-action hover:underline">
                  All users
                </Link>
              </div>
              {data.recentUsers.length === 0 ? (
                <Empty>No users yet.</Empty>
              ) : (
                <ul className="mt-3 divide-y divide-border">
                  {data.recentUsers.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                      <span>
                        <span className="font-medium text-foreground">{u.name}</span>
                        <span className="text-muted-foreground"> · {u.email}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <span className="capitalize">{u.role}</span> · joined {timeAgo(u.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function AdminOverview() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminOverviewContent />
    </RequireRole>
  );
}
