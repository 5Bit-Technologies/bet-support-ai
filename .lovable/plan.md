
# Sprint 2 — Data Tracking & Analytics Module

Build on the existing Helix Support platform. No existing functionality is removed. All new surfaces are Admin-gated (with one shared activity timeline visible to Staff on their own tickets).

## 1. Database enhancements

New migration adds audit/history tracking + reporting support:

- `public.ticket_activity` — immutable activity log
  - `ticket_id`, `actor_id`, `action` (enum: `created`, `status_changed`, `priority_changed`, `assigned`, `unassigned`, `escalated`, `resolved`, `closed`, `reopened`, `message_added`, `category_changed`), `from_value`, `to_value`, `metadata jsonb`, `created_at`
- `public.tickets` — add `first_response_at timestamptz`, `closed_at timestamptz` (resolved_at already exists)
- Trigger `log_ticket_changes()` on `tickets` — writes status/priority/assignment/category changes into `ticket_activity`, sets `first_response_at` / `closed_at` / `resolved_at` automatically
- Trigger `log_ticket_message()` on `ticket_messages` — writes `message_added` activity and sets `first_response_at` on the first staff/admin reply
- RLS: customers see activity on their own tickets (non-internal only); staff/admin see all
- Indexes on `tickets(created_at, status, category)` and `ticket_activity(ticket_id, created_at)` for analytics queries

## 2. Server functions (`src/lib/analytics.functions.ts`)

All protected with `requireSupabaseAuth` + admin check (helper `assertAdmin`). Single source of truth for analytics reads:

- `getTicketMetrics({ from, to, category?, audience? })` → totals, open/closed/escalated/resolved counts, backlog, avg resolution & first-response time (computed in SQL via `extract(epoch ...)`)
- `getCategoryBreakdown({ from, to, audience })` → counts per category
- `getTrendSeries({ from, to, bucket: 'day'|'week'|'month' })` → time series
- `getPeakHours({ from, to })` → counts per hour-of-day
- `getStaffPerformance({ from, to })` → per-assignee: assigned, resolved, avg resolution, open/completed
- `getAIInsights({ from, to })` → calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with aggregated stats, returns 4-6 bullet insights (cached server-side per (from,to) for 10 min via simple in-memory map keyed by date range — acceptable, regenerated on demand)
- `getTicketActivity({ ticketId })` → activity timeline (RLS-respecting via `requireSupabaseAuth`)
- `generateReport({ period: 'daily'|'weekly'|'monthly', format: 'json' })` → structured report payload for client-side CSV/PDF export

## 3. UI — Admin analytics surfaces

New routes (all under `RequireAuth role="admin"` + `AppShell area="admin"`):

- `src/routes/admin/analytics.tsx` — main analytics dashboard
  - Date range picker (default: last 30 days), category + audience filters
  - KPI cards row: Total, Open, Closed, Escalated, Resolved, Avg Resolution, Avg First Response, Backlog
  - Charts (recharts, already installed):
    - Trend line: daily volume (toggle day/week/month)
    - Pie: customer category distribution
    - Pie: staff category distribution
    - Bar: peak hours (0-23h)
  - AI Insights panel (collapsible card, regenerate button)
- `src/routes/admin/staff-performance.tsx` — staff leaderboard table + workload bar chart
- `src/routes/admin/reports.tsx` — pick period → preview → Download PDF / Export CSV
- `src/components/TicketTimeline.tsx` — activity timeline component, embedded into existing `src/routes/admin/ticket.$id.tsx` and `src/routes/staff/ticket.$id.tsx`

Admin sidebar (`AppShell.tsx`) gets new links: Analytics, Staff Performance, Reports.

## 4. Reporting export

Client-side, no extra server cost:
- CSV: build string from report payload, `Blob` download
- PDF: use `jspdf` + `jspdf-autotable` (install) — render KPIs + tables + AI insights summary

## 5. AI Insights implementation

Aggregate the metrics + category + trend data server-side into a compact JSON, send to Lovable AI Gateway with a system prompt: "You are an analytics assistant. Produce 4-6 short, specific business insights as bullet points referencing concrete numbers and week-over-week deltas." Stream-less single response, JSON tool-calling for structured `{ insights: string[] }`.

## 6. Technical details

- All queries scoped via filters; indexes added for performance
- Real-time: subscribe to `tickets` + `ticket_activity` postgres_changes on analytics page → invalidate React Query keys on change (already using react-query)
- Responsive grid (md/lg breakpoints) using existing Tailwind tokens — no new design tokens needed
- Charts use semantic colors from `src/styles.css` via CSS vars (chart-1..5 already in theme)

## 7. Out of scope (explicit)

- Predictive forecasting (data structure supports it for future)
- Customer-facing analytics
- SLA configuration UI (resolution time is informational only)
- Email-scheduled report delivery

## Order of execution

1. Migration (activity table, columns, triggers, indexes, RLS)
2. Install `jspdf`, `jspdf-autotable`
3. Server functions
4. AppShell nav additions
5. Analytics page + components
6. Staff performance page
7. Reports page + export
8. Timeline component + integrate into ticket detail pages
9. Verify build
