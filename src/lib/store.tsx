// Who is logged in. On page load we try the refresh cookie to restore the session.
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, refreshSession, session } from "./api";
import type { Role, User } from "./types";

function useAuthValue() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    session.onExpired(() => {
      setUser(null);
      queryClient.clear();
    });
    refreshSession()
      .then((result) => setUser(result?.user ?? null))
      .finally(() => setReady(true));
  }, [queryClient]);

  return useMemo(
    () => ({
      user,
      ready,
      /** Call after login / sign-up. */
      signIn: (accessToken: string, signedInUser: User) => {
        session.setAccessToken(accessToken);
        queryClient.clear();
        setUser(signedInUser);
      },
      signOut: async () => {
        await api.logout().catch(() => {});
        session.setAccessToken(null);
        queryClient.clear();
        setUser(null);
      },
      setUser,
      hasRole: (roles: Role[]) => !!user && roles.includes(user.role),
    }),
    [user, ready, queryClient],
  );
}

type Store = ReturnType<typeof useAuthValue>;
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useAuthValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
