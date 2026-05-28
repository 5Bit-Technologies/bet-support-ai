import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin"><UsersPage /></AppShell></RequireAuth>,
});

type Row = { id: string; email: string; full_name: string | null; roles: string[] };

function UsersPage() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: profs } = await supabase.from("profiles").select("id,email,full_name").order("created_at", { ascending: false }).limit(500);
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    const map = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => { const arr = map.get(r.user_id) ?? []; arr.push(r.role); map.set(r.user_id, arr); });
    setRows((profs ?? []).map((p: any) => ({ ...p, roles: map.get(p.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleRole = async (userId: string, role: "staff" | "admin", has: boolean) => {
    if (userId === me?.id && role === "admin") return toast.error("You cannot remove your own admin role.");
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Role updated");
    load();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Users</h1>
      <p className="text-sm text-muted-foreground mb-6">Manage staff and admin access.</p>
      {loading ? <p>Loading…</p> : (
        <Card><CardContent className="p-0">
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                  <div className="flex gap-1 mt-1">
                    {r.roles.length === 0 && <Badge variant="outline">customer</Badge>}
                    {r.roles.map((rl) => <Badge key={rl} variant={rl === "admin" ? "default" : "secondary"} className="capitalize">{rl}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={r.roles.includes("staff") ? "secondary" : "outline"} onClick={() => toggleRole(r.id, "staff", r.roles.includes("staff"))}>
                    {r.roles.includes("staff") ? "Revoke staff" : "Make staff"}
                  </Button>
                  <Button size="sm" variant={r.roles.includes("admin") ? "default" : "outline"} onClick={() => toggleRole(r.id, "admin", r.roles.includes("admin"))}>
                    {r.roles.includes("admin") ? "Revoke admin" : "Make admin"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}
