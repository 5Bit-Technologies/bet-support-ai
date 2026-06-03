import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2, TrendingUp, Users, CheckCircle2, Clock } from "lucide-react";
import { formatDuration, rangePresets, type TicketRow } from "@/lib/analytics-utils";

export const Route = createFileRoute("/admin/staff-performance")({
  head: () => ({ meta: [{ title: "Staff performance — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin"><StaffPerf /></AppShell></RequireAuth>,
});

type Row = {
  id: string; name: string;
  assigned: number; resolved: number; open: number;
  avgResolutionMs: number | null;
};

function StaffPerf() {
  const [rangeKey, setRangeKey] = useState<keyof ReturnType<typeof rangePresets>>("30d");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      setRows(null);
      const range = rangePresets()[rangeKey];
      const { data: tickets } = await supabase
        .from("tickets")
        .select("id,status,assigned_to,created_at,resolved_at")
        .gte("created_at", range.from.toISOString())
        .lte("created_at", range.to.toISOString())
        .not("assigned_to", "is", null)
        .limit(5000);

      const list = (tickets ?? []) as TicketRow[];
      const byAgent: Record<string, TicketRow[]> = {};
      list.forEach((t) => {
        if (!t.assigned_to) return;
        (byAgent[t.assigned_to] ||= []).push(t);
      });

      const ids = Object.keys(byAgent);
      let profiles: any[] = [];
      if (ids.length) {
        const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        profiles = data ?? [];
      }

      const computed: Row[] = ids.map((id) => {
        const ts = byAgent[id];
        const resolved = ts.filter((t) => t.resolved_at);
        const avg = resolved.length
          ? resolved.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length
          : null;
        const p = profiles.find((x) => x.id === id);
        return {
          id,
          name: p?.full_name ?? p?.email ?? "Unknown agent",
          assigned: ts.length,
          resolved: resolved.length,
          open: ts.filter((t) => !["resolved", "closed"].includes(t.status)).length,
          avgResolutionMs: avg,
        };
      }).sort((a, b) => b.assigned - a.assigned);

      setRows(computed);
    })();
  }, [rangeKey]);

  const totals = useMemo(() => {
    if (!rows) return { agents: 0, assigned: 0, resolved: 0 };
    return {
      agents: rows.length,
      assigned: rows.reduce((s, r) => s + r.assigned, 0),
      resolved: rows.reduce((s, r) => s + r.resolved, 0),
    };
  }, [rows]);

  if (!rows) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Staff performance</h1>
          <p className="text-sm text-muted-foreground">Workload distribution and resolution speed per staff member.</p>
        </div>
        <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="365d">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Users} label="Active agents" value={totals.agents} />
        <KPI icon={TrendingUp} label="Tickets assigned" value={totals.assigned} tone="text-blue-500" />
        <KPI icon={CheckCircle2} label="Tickets resolved" value={totals.resolved} tone="text-emerald-500" />
        <KPI icon={Clock} label="Resolution rate" value={`${totals.assigned ? Math.round((totals.resolved / totals.assigned) * 100) : 0}%`} tone="text-violet-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workload distribution</CardTitle>
          <CardDescription>Assigned tickets per agent</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No assigned tickets in this period.</p>
          ) : (
            <ChartContainer config={{ assigned: { label: "Assigned", color: "var(--chart-1)" }, resolved: { label: "Resolved", color: "var(--chart-2)" } }} className="h-[280px] w-full">
              <BarChart data={rows.slice(0, 12)}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="assigned" fill="var(--color-assigned)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" fill="var(--color-resolved)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leaderboard</CardTitle>
          <CardDescription>Per-agent breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Resolved</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Resolution rate</TableHead>
                  <TableHead className="text-right">Avg resolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.assigned}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.resolved}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.open}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.assigned ? Math.round((r.resolved / r.assigned) * 100) : 0}%</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDuration(r.avgResolutionMs)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, label, value, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className={`h-4 w-4 ${tone ?? ""}`} /> {label}</div>
        <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
