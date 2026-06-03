import { STAFF_CATEGORIES, CUSTOMER_CATEGORIES } from "./ticket-utils";

export type DateRange = { from: Date; to: Date };

export function rangePresets(): Record<string, DateRange> {
  const now = new Date();
  const start = (days: number) => {
    const d = new Date(now); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d;
  };
  return {
    "7d": { from: start(7), to: now },
    "30d": { from: start(30), to: now },
    "90d": { from: start(90), to: now },
    "365d": { from: start(365), to: now },
  };
}

export function formatDuration(ms: number | null): string {
  if (ms == null || !isFinite(ms) || ms <= 0) return "—";
  const h = ms / 3_600_000;
  if (h < 1) return `${Math.round(ms / 60_000)}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export type TicketRow = {
  id: string;
  status: string;
  priority: string;
  category: string;
  user_id: string;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  first_response_at: string | null;
};

export function isCustomerCategory(c: string) {
  return (CUSTOMER_CATEGORIES as readonly string[]).includes(c);
}
export function isStaffCategory(c: string) {
  return (STAFF_CATEGORIES as readonly string[]).includes(c);
}

export function bucketByDay(rows: TicketRow[], range: DateRange) {
  const days: { day: string; date: Date; opened: number; resolved: number }[] = [];
  const dayMs = 86_400_000;
  const start = new Date(range.from); start.setHours(0, 0, 0, 0);
  const end = new Date(range.to); end.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + dayMs)) {
    days.push({
      day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      date: new Date(d),
      opened: 0,
      resolved: 0,
    });
  }
  const idx = (date: Date) => Math.floor((date.getTime() - start.getTime()) / dayMs);
  rows.forEach((t) => {
    const c = new Date(t.created_at);
    const i = idx(c);
    if (i >= 0 && i < days.length) days[i].opened++;
    if (t.resolved_at) {
      const r = new Date(t.resolved_at);
      const j = idx(r);
      if (j >= 0 && j < days.length) days[j].resolved++;
    }
  });
  return days;
}

export function bucketByHour(rows: TicketRow[]) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }));
  rows.forEach((t) => {
    const h = new Date(t.created_at).getHours();
    hours[h].count++;
  });
  return hours;
}

export function computeMetrics(rows: TicketRow[]) {
  const total = rows.length;
  const open = rows.filter((t) => !["resolved", "closed"].includes(t.status)).length;
  const closed = rows.filter((t) => t.status === "closed").length;
  const resolved = rows.filter((t) => t.status === "resolved").length;
  const escalated = rows.filter((t) => t.status === "escalated").length;
  const backlog = rows.filter((t) => ["open", "pending", "in_progress"].includes(t.status)).length;

  const resolvedRows = rows.filter((t) => t.resolved_at);
  const avgResolutionMs = resolvedRows.length
    ? resolvedRows.reduce((s, t) => s + (new Date(t.resolved_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolvedRows.length
    : null;

  const respondedRows = rows.filter((t) => t.first_response_at);
  const avgResponseMs = respondedRows.length
    ? respondedRows.reduce((s, t) => s + (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()), 0) / respondedRows.length
    : null;

  return { total, open, closed, resolved, escalated, backlog, avgResolutionMs, avgResponseMs };
}

export function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}
