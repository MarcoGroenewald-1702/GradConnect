import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { homeForRole } from "@/lib/api";
import type { Role } from "@/lib/types";
import { useStore } from "@/lib/store";

/** Only shows the page if someone is logged in with one of the allowed roles. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, ready } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`, { replace: true });
    } else if (!roles.includes(user.role)) {
      navigate(homeForRole(user.role), { replace: true });
    }
  }, [ready, user, roles, navigate]);

  if (!ready || !user || !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-sm text-muted-foreground">Checking your access…</p>
      </div>
    );
  }
  return <>{children}</>;
}
