import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "customer" | "staff" | "admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Dynamic import keeps the browser-only Supabase client out of SSR
      const { supabase } = await import("@/integrations/supabase/client");
      if (cancelled) return;
      setClient(supabase);

      const fetchRoles = async (uid: string) => {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        setRoles((data ?? []).map((r) => r.role as AppRole));
      };

      const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) setTimeout(() => fetchRoles(s.user.id), 0);
        else setRoles([]);
      });
      unsub = () => sub.subscription.unsubscribe();

      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) await fetchRoles(data.session.user.id);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const signOut = async () => {
    await client?.auth.signOut();
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");
  const isStaff = isAdmin || roles.includes("staff");

  return (
    <Ctx.Provider value={{ user, session, roles, loading, isStaff, isAdmin, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
