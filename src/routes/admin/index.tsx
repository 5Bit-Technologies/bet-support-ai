import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Ticket, AlertTriangle, CheckCircle2, Sparkles, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Analytics — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin"><AdminDash /></AppShell></RequireAuth>,
});

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const COLOR_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function AdminDash() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: tickets } = await supabase.from("tickets").select("id,status,priority,category,sentiment,ai_confidence,created_at,resolved_at,assigned_to").limit(2000);
      const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const list = tickets ?? [];

      const total = list.length;
      const open = list.filter((t) => !["resolved", "closed"].includes(t.status)).length;
      const closed = total - open;
      const urgent = list.filter((t) => t.priority === "urgent").length;
      const aiClassified = list.filter((t) => t.ai_confidence != null).length;
      const avgConfidence = aiClassified ? list.reduce((s, t) => s + (Number(t.ai_confidence) || 0), 0) / aiClassified : 0;

      // 14-day trend
      const days: { day: string; opened: number; resolved: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const opened = list.filter((t) => { const ct = new Date(t.created_at); return ct >= d && ct < next; }).length;
        const resolved = list.filter((t) => t.resolved_at && new Date(t.resolved_at) >= d && new Date(t.resolved_at) < next).length;
        days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), opened, resolved });
      }

      const byPriority = ["low", "medium", "high", "urgent"].map((p) => ({ name: p, value: list.filter((t) => t.priority === p).length }));
      const byCategory = ["withdrawals", "deposits", "betting", "verification", "login", "promotions", "other"]
        .map((c) => ({ name: c, value: list.filter((t) => t.category === c).length }));
      const bySentiment = ["positive", "neutral", "negative", "frustrated"].map((s) => ({ name: s, value: list.filter((t) => t.sentiment === s).length }));

      // Agent workload
      const byAgent: Record<string, number> = {};
      list.forEach((t) => { if (t.assigned_to) byAgent[t.assigned_to] = (byAgent[t.assigned_to] || 0) + 1; });
      const agentIds = Object.keys(byAgent);
      let agentRows: { name: string; tickets: number }[] = [];
      if (agentIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", agentIds);
        agentRows = (profs ?? []).map((p: any) => ({ name: p.full_name ?? p.email, tickets: byAgent[p.id] })).sort((a, b) => b.tickets - a.tickets);
      }

      setData({ total, open, closed, urgent, aiClassified, avgConfidence, userCount: userCount ?? 0, days, byPriority, byCategory, bySentiment, agentRows });
    })();
  }, []);

  if (!data) return <div className="p-6">Loading analytics…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Operational overview of the support desk.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI icon={Ticket} label="Total tickets" value={data.total} />
        <KPI icon={TrendingUp} label="Open" value={data.open} tone="text-blue-500" />
        <KPI icon={CheckCircle2} label="Closed" value={data.closed} tone="text-emerald-500" />
        <KPI icon={AlertTriangle} label="Urgent" value={data.urgent} tone="text-red-500" />
        <KPI icon={Sparkles} label="AI classified" value={`${data.aiClassified}`} sub={`${Math.round(data.avgConfidence * 100) || 0}% avg conf.`} tone="text-violet-500" />
        <KPI icon={Users} label="Users" value={data.userCount} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket trend (14 days)</CardTitle>
            <CardDescription>Opened vs resolved</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ opened: { label: "Opened", color: COLOR_VARS[0] }, resolved: { label: "Resolved", color: COLOR_VARS[1] } }} className="h-[260px] w-full">
              <AreaChart data={data.days}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-opened)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-opened)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-resolved)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-resolved)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="opened" stroke="var(--color-opened)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke="var(--color-resolved)" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority breakdown</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: "Tickets" } }} className="h-[260px] w-full">
              <BarChart data={data.byPriority}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="capitalize" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.byPriority.map((_: any, i: number) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI category distribution</CardTitle>
            <CardDescription>Where issues come from</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[260px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={data.byCategory.filter((c: any) => c.value > 0)} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                  {data.byCategory.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="grid grid-cols-2 gap-1 text-xs mt-2">
              {data.byCategory.filter((c: any) => c.value > 0).map((c: any, i: number) => (
                <div key={c.name} className="flex items-center gap-2 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {c.name.replace("_", " ")} · {c.value}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer sentiment</CardTitle>
            <CardDescription>AI-detected from tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: "Tickets" } }} className="h-[260px] w-full">
              <BarChart data={data.bySentiment}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} className="capitalize" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.bySentiment.map((_: any, i: number) => <Cell key={i} fill={COLORS[i + 1]} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent workload</CardTitle>
          <CardDescription>Assigned tickets per staff member</CardDescription>
        </CardHeader>
        <CardContent>
          {data.agentRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {data.agentRows.map((r: any) => {
                const max = Math.max(...data.agentRows.map((x: any) => x.tickets));
                return (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate">{r.name}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(r.tickets / max) * 100}%` }} />
                    </div>
                    <span className="text-sm tabular-nums w-10 text-right">{r.tickets}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className={`h-4 w-4 ${tone ?? ""}`} /> {label}</div>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
