import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  Ticket, AlertTriangle, CheckCircle2, Sparkles, Clock, Inbox, ArrowUpRight, Loader2, RefreshCw, TrendingUp, Hourglass,
} from "lucide-react";
import {
  bucketByDay, bucketByHour, computeMetrics, formatDuration, rangePresets, type TicketRow,
} from "@/lib/analytics-utils";
import { STAFF_CATEGORIES, CUSTOMER_CATEGORIES, CATEGORIES } from "@/lib/ticket-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Analytics — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin"><AdminDash /></AppShell></RequireAuth>,
});

const COLOR_VARS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
];


function AdminDash() {
  const [rangeKey, setRangeKey] = useState<keyof ReturnType<typeof rangePresets>>("30d");
  const [audience, setAudience] = useState<"all" | "customer" | "staff">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [insights, setInsights] = useState<{ headline: string; detail: string; tone: string }[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const range = useMemo(() => rangePresets()[rangeKey], [rangeKey]);

  const load = async () => {
    let q = supabase.from("tickets")
      .select("id,status,priority,category,user_id,assigned_to,created_at,resolved_at,closed_at,first_response_at")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .limit(5000);
    if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    setTickets((data ?? []) as TicketRow[]);
  };

  useEffect(() => { load(); }, [rangeKey, statusFilter]);

  useEffect(() => {
    const ch = supabase.channel("admin-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [rangeKey, statusFilter]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    if (audience === "customer") return tickets.filter((t) => (CUSTOMER_CATEGORIES as readonly string[]).includes(t.category));
    if (audience === "staff") return tickets.filter((t) => (STAFF_CATEGORIES as readonly string[]).includes(t.category));
    return tickets;
  }, [tickets, audience]);

  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);
  const trendDays = useMemo(() => bucketByDay(filtered, range), [filtered, range]);
  const peakHours = useMemo(() => bucketByHour(filtered), [filtered]);

  const categoriesBreakdown = useMemo(() => {
    const cats = audience === "staff" ? STAFF_CATEGORIES : audience === "customer" ? CUSTOMER_CATEGORIES : CATEGORIES.map((c) => c.value);
    return (cats as readonly string[]).map((c) => ({
      name: c.replace(/_/g, " "),
      value: filtered.filter((t) => t.category === c).length,
    })).filter((c) => c.value > 0);
  }, [filtered, audience]);

  const generateInsights = async () => {
    if (!filtered.length) { toast.message("No data in range to analyse."); return; }
    setInsightsLoading(true);
    const compact = {
      range: { from: range.from.toISOString(), to: range.to.toISOString(), days: trendDays.length },
      totals: metrics,
      avg_resolution_human: formatDuration(metrics.avgResolutionMs),
      avg_response_human: formatDuration(metrics.avgResponseMs),
      categories: categoriesBreakdown,
      daily_volume: trendDays.map((d) => ({ day: d.day, opened: d.opened, resolved: d.resolved })),
      peak_hours: peakHours,
    };
    const { data, error } = await supabase.functions.invoke("ai-insights", { body: { stats: compact } });
    setInsightsLoading(false);
    if (error) { toast.error(error.message ?? "Failed to generate insights"); return; }
    setInsights(data?.insights ?? []);
  };

  if (!tickets) return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Real-time operational intelligence across the support desk.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Select value={audience} onValueChange={(v) => setAudience(v as any)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All audiences</SelectItem>
              <SelectItem value="customer">Customer tickets</SelectItem>
              <SelectItem value="staff">Staff tickets</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPI icon={Ticket} label="Total" value={metrics.total} />
        <KPI icon={Inbox} label="Open" value={metrics.open} tone="text-blue-500" />
        <KPI icon={CheckCircle2} label="Resolved" value={metrics.resolved} tone="text-emerald-500" />
        <KPI icon={CheckCircle2} label="Closed" value={metrics.closed} tone="text-slate-500" />
        <KPI icon={ArrowUpRight} label="Escalated" value={metrics.escalated} tone="text-orange-500" />
        <KPI icon={Hourglass} label="Backlog" value={metrics.backlog} tone="text-amber-500" />
        <KPI icon={Clock} label="Avg resolution" value={formatDuration(metrics.avgResolutionMs)} tone="text-violet-500" />
        <KPI icon={Clock} label="Avg response" value={formatDuration(metrics.avgResponseMs)} tone="text-cyan-500" />
      </div>

      <Card className="border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/5 via-violet-500/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-500" /> AI Insights
            </CardTitle>
            <CardDescription>AI-generated business observations from your ticket data.</CardDescription>
          </div>
          <Button size="sm" onClick={generateInsights} disabled={insightsLoading}>
            {insightsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {insights ? "Regenerate" : "Generate"}
          </Button>
        </CardHeader>
        <CardContent>
          {!insights && !insightsLoading && (
            <p className="text-sm text-muted-foreground">Click <strong>Generate</strong> to ask the AI to surface trends, anomalies and bottlenecks from the current data slice.</p>
          )}
          {insights && (
            <ul className="grid md:grid-cols-2 gap-3">
              {insights.map((i, idx) => (
                <li key={idx} className={`rounded-md border p-3 ${toneClass(i.tone)}`}>
                  <p className="text-sm font-medium leading-snug">{i.headline}</p>
                  <p className="text-xs text-muted-foreground mt-1">{i.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Daily volume trend</CardTitle>
            <CardDescription>Opened vs resolved per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ opened: { label: "Opened", color: COLOR_VARS[0] }, resolved: { label: "Resolved", color: COLOR_VARS[1] } }} className="h-[280px] w-full">
              <AreaChart data={trendDays}>
                <defs>
                  <linearGradient id="aOpened" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-opened)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-opened)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="aResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-resolved)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-resolved)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="opened" stroke="var(--color-opened)" fill="url(#aOpened)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" stroke="var(--color-resolved)" fill="url(#aResolved)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category distribution</CardTitle>
            <CardDescription>{audience === "all" ? "All categories" : audience === "staff" ? "Internal staff categories" : "Customer categories"}</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriesBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No data in this slice.</p>
            ) : (
              <>
                <ChartContainer config={{}} className="h-[230px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie data={categoriesBreakdown} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45}>
                      {categoriesBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                  {categoriesBreakdown.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 capitalize">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate">{c.name} · {c.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Peak support hours</CardTitle>
            <CardDescription>Ticket creation volume by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Tickets", color: COLOR_VARS[2] } }} className="h-[240px] w-full">
              <BarChart data={peakHours}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={10} interval={1} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, tone }: any) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]"><Icon className={`h-3.5 w-3.5 ${tone ?? ""}`} /> {label}</div>
        <p className="text-xl font-semibold mt-1 tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function toneClass(tone: string) {
  switch (tone) {
    case "positive": return "border-emerald-500/30 bg-emerald-500/5";
    case "warning": return "border-amber-500/30 bg-amber-500/5";
    case "critical": return "border-red-500/30 bg-red-500/5";
    default: return "border-border bg-muted/30";
  }
}
