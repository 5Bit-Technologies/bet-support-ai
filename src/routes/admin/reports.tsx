import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Loader2, Sparkles, Table as TableIcon } from "lucide-react";
import {
  computeMetrics, formatDuration, rangePresets, type TicketRow,
} from "@/lib/analytics-utils";
import { CATEGORIES } from "@/lib/ticket-utils";
import { downloadCSV, downloadPDF, type ReportPayload } from "@/lib/report-export";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Helix Admin" }] }),
  component: () => <RequireAuth role="admin"><AppShell area="admin"><Reports /></AppShell></RequireAuth>,
});

type Period = "daily" | "weekly" | "monthly";

const PERIOD_DAYS: Record<Period, number> = { daily: 1, weekly: 7, monthly: 30 };

function Reports() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [includeAI, setIncludeAI] = useState(true);
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true); setReport(null);
    const presets = rangePresets();
    const range = period === "daily" ? presets["7d"]
      : period === "weekly" ? presets["30d"]
      : presets["90d"];
    const days = PERIOD_DAYS[period];
    const from = new Date(); from.setDate(from.getDate() - days); from.setHours(0, 0, 0, 0);
    const to = new Date();

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("id,status,priority,category,user_id,assigned_to,created_at,resolved_at,closed_at,first_response_at")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString())
      .limit(5000);

    if (error) { setBusy(false); toast.error(error.message); return; }

    const list = (tickets ?? []) as TicketRow[];
    const metrics = computeMetrics(list);

    const categories = CATEGORIES
      .map((c) => ({ name: c.label, value: list.filter((t) => t.category === c.value).length }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);

    // Staff performance
    const byAgent: Record<string, TicketRow[]> = {};
    list.forEach((t) => { if (t.assigned_to) (byAgent[t.assigned_to] ||= []).push(t); });
    const ids = Object.keys(byAgent);
    let profs: any[] = [];
    if (ids.length) {
      const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      profs = data ?? [];
    }
    const staff = ids.map((id) => {
      const ts = byAgent[id];
      const resolved = ts.filter((t) => t.resolved_at);
      const avg = resolved.length
        ? resolved.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length
        : null;
      const p = profs.find((x) => x.id === id);
      return {
        name: p?.full_name ?? p?.email ?? "Unknown",
        assigned: ts.length, resolved: resolved.length, avgResolutionMs: avg,
      };
    }).sort((a, b) => b.assigned - a.assigned);

    let insights: { headline: string; detail: string }[] = [];
    if (includeAI && list.length > 0) {
      const { data: ai } = await supabase.functions.invoke("ai-insights", {
        body: {
          stats: {
            period, range: { from: from.toISOString(), to: to.toISOString() },
            metrics, categories, staff,
            avg_resolution_human: formatDuration(metrics.avgResolutionMs),
            avg_response_human: formatDuration(metrics.avgResponseMs),
          },
        },
      });
      insights = (ai?.insights ?? []).map((i: any) => ({ headline: i.headline, detail: i.detail }));
    }

    const titleMap: Record<Period, string> = {
      daily: "Daily support report",
      weekly: "Weekly support report",
      monthly: "Monthly support report",
    };
    setReport({
      title: titleMap[period],
      period: `${from.toLocaleDateString()} → ${to.toLocaleDateString()}`,
      generatedAt: new Date(),
      metrics, categories, staff, insights,
    });
    setBusy(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Generate operational reports with KPIs, categories, staff performance and AI observations.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build a report</CardTitle>
          <CardDescription>Select a period, then preview and export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily (last 24h)</SelectItem>
                <SelectItem value="weekly">Weekly (last 7d)</SelectItem>
                <SelectItem value="monthly">Monthly (last 30d)</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeAI} onChange={(e) => setIncludeAI(e.target.checked)} className="accent-primary" />
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" /> Include AI insights
            </label>
            <Button onClick={build} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TableIcon className="h-4 w-4 mr-1" />}
              Generate report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 flex-wrap">
            <div>
              <CardTitle className="text-base">{report.title}</CardTitle>
              <CardDescription>{report.period} · generated {report.generatedAt.toLocaleString()}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadCSV(report)}><FileDown className="h-4 w-4 mr-1" /> CSV</Button>
              <Button size="sm" onClick={() => downloadPDF(report)}><FileText className="h-4 w-4 mr-1" /> PDF</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <Stat label="Total" value={report.metrics.total} />
                <Stat label="Open" value={report.metrics.open} />
                <Stat label="Resolved" value={report.metrics.resolved} />
                <Stat label="Closed" value={report.metrics.closed} />
                <Stat label="Escalated" value={report.metrics.escalated} />
                <Stat label="Backlog" value={report.metrics.backlog} />
                <Stat label="Avg resolution" value={formatDuration(report.metrics.avgResolutionMs)} />
                <Stat label="Avg first response" value={formatDuration(report.metrics.avgResponseMs)} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Top categories</h3>
              {report.categories.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
                <ul className="text-sm space-y-1">
                  {report.categories.slice(0, 8).map((c) => (
                    <li key={c.name} className="flex justify-between border-b py-1"><span className="capitalize">{c.name}</span><span className="tabular-nums">{c.value}</span></li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Staff performance</h3>
              {report.staff.length === 0 ? <p className="text-sm text-muted-foreground">No assigned tickets.</p> : (
                <ul className="text-sm space-y-1">
                  {report.staff.slice(0, 10).map((s) => (
                    <li key={s.name} className="flex justify-between border-b py-1">
                      <span>{s.name}</span>
                      <span className="tabular-nums text-muted-foreground">{s.resolved}/{s.assigned} resolved · {formatDuration(s.avgResolutionMs)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {report.insights.length > 0 && (
              <section>
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-fuchsia-500" /> AI observations</h3>
                <ul className="space-y-2">
                  {report.insights.map((i, idx) => (
                    <li key={idx} className="rounded border bg-muted/30 p-2 text-sm">
                      <p className="font-medium">{i.headline}</p>
                      <p className="text-xs text-muted-foreground">{i.detail}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded border bg-muted/30 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
