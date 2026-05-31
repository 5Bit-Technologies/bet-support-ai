import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketsTable } from "@/components/TicketsTable";
import { STAFF_CATEGORIES } from "@/lib/ticket-utils";
import { Inbox, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/staff/")({
  head: () => ({ meta: [{ title: "Staff inbox — Helix" }] }),
  component: () => <RequireAuth role="staff"><AppShell area="staff"><StaffHome /></AppShell></RequireAuth>,
});

function StaffHome() {
  const [stats, setStats] = useState({ open: 0, urgent: 0, inProgress: 0, resolvedToday: 0 });

  const load = async () => {
    const cats = STAFF_CATEGORIES as unknown as string[];
    const [open, urgent, inProg, resolved] = await Promise.all([
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("category", cats).in("status", ["open", "pending"]),
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("category", cats).eq("priority", "urgent").not("status", "in", "(resolved,closed)"),
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("category", cats).eq("status", "in_progress"),
      supabase.from("tickets").select("id", { count: "exact", head: true }).in("category", cats).eq("status", "resolved").gte("resolved_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    ]);
    setStats({ open: open.count ?? 0, urgent: urgent.count ?? 0, inProgress: inProg.count ?? 0, resolvedToday: resolved.count ?? 0 });
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Staff inbox</h1>
      <p className="text-sm text-muted-foreground mb-6">All active tickets, prioritized by AI.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KPI icon={Inbox} label="Open / pending" value={stats.open} tone="text-blue-500" />
        <KPI icon={AlertTriangle} label="Urgent" value={stats.urgent} tone="text-red-500" />
        <KPI icon={Clock} label="In progress" value={stats.inProgress} tone="text-violet-500" />
        <KPI icon={CheckCircle2} label="Resolved (24h)" value={stats.resolvedToday} tone="text-emerald-500" />
      </div>

      <TicketsTable basePath="/staff/ticket" />
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg bg-muted grid place-items-center ${tone}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
