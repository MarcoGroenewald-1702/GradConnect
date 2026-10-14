import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/brand";
import { Empty, LoadState } from "@/components/common";
import { RequireRole } from "@/components/RequireRole";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const roles: { value: Role | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "graduate", label: "Graduates" },
  { value: "employer", label: "Employers" },
  { value: "mentor", label: "Mentors" },
  { value: "admin", label: "Admins" },
];

function AdminUsersContent() {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [query, setQuery] = useState("");
  const { data, error } = useAdminUsers(role);
  const q = query.toLowerCase();
  const list = (data ?? []).filter((u) => `${u.name} ${u.email} ${u.detail}`.toLowerCase().includes(q));

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader title="Users" description="Everyone with a GradConnect account." />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r.label}
                aria-pressed={role === r.value}
                onClick={() => setRole(r.value)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold",
                  role === r.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input className="pl-9" placeholder="Search name or email" aria-label="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {!data ? (
          <LoadState error={error} label="users" />
        ) : list.length === 0 ? (
          <Empty>No users found.</Empty>
        ) : (
          <div className="surface-panel overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Details</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-medium text-foreground">{u.name}</span>
                      <span className="block text-xs text-muted-foreground">{u.email}</span>
                    </td>
                    <td className="px-5 py-3 capitalize">{u.role}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.detail}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{list.length} shown</p>
      </div>
    </AppShell>
  );
}

export default function AdminUsers() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminUsersContent />
    </RequireRole>
  );
}
