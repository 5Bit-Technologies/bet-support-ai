import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, PriorityBadge, SentimentBadge } from "@/components/TicketBadges";
import { STATUSES, PRIORITIES, CATEGORIES, STAFF_CATEGORIES, CUSTOMER_CATEGORIES } from "@/lib/ticket-utils";
import { Search, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  basePath: "/staff/ticket" | "/admin/ticket";
  /** Restrict the list to internal staff tickets or customer tickets. Omit for all (admin). */
  audience?: "staff" | "customer";
}

export function TicketsTable({ basePath, audience }: Props) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const allowedCategories = audience === "staff" ? STAFF_CATEGORIES : audience === "customer" ? CUSTOMER_CATEGORIES : null;
  const categoryOptions = allowedCategories
    ? CATEGORIES.filter((c) => (allowedCategories as readonly string[]).includes(c.value))
    : CATEGORIES;

  const load = async () => {
    let query = supabase.from("tickets").select("*, profile:profiles!tickets_user_id_fkey(email,full_name)").order("created_at", { ascending: false }).limit(200);
    if (allowedCategories) query = query.in("category", allowedCategories as any);
    if (status !== "all") query = query.eq("status", status as any);
    if (priority !== "all") query = query.eq("priority", priority as any);
    if (category !== "all") query = query.eq("category", category as any);
    const { data } = await query;
    setTickets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [status, priority, category]);

  useEffect(() => {
    const ch = supabase.channel("tickets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = tickets.filter((t) => t.subject.toLowerCase().includes(q.toLowerCase()) || t.ticket_number.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search subject or #…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No tickets match.</p>}
              {filtered.map((t) => (
                <Link key={t.id} to={`${basePath}/$id`} params={{ id: t.id }}>
                  <div className="flex items-center gap-4 p-4 hover:bg-accent/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{t.ticket_number}</span>
                        <span>·</span>
                        <span>{t.profile?.full_name ?? t.profile?.email ?? "Unknown"}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                        {t.ai_classification && <><span>·</span><span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> AI</span></>}
                      </div>
                      <h3 className="mt-1 font-medium truncate">{t.subject}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{t.category.replace("_", " ")}{t.suggested_department ? ` → ${t.suggested_department}` : ""}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <SentimentBadge sentiment={t.sentiment} />
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
