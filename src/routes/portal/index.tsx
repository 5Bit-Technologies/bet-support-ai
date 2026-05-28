import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, PriorityBadge } from "@/components/TicketBadges";
import { Plus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/portal/")({
  head: () => ({ meta: [{ title: "My tickets — Helix" }] }),
  component: () => <RequireAuth><AppShell area="portal"><Portal /></AppShell></RequireAuth>,
});

interface Ticket {
  id: string; ticket_number: string; subject: string; category: string;
  priority: string; status: string; created_at: string; updated_at: string;
}

function Portal() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("tickets").select("id,ticket_number,subject,category,priority,status,created_at,updated_at")
      .eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setTickets(data ?? []); setLoading(false); });
  }, [user]);

  const filtered = tickets.filter((t) => t.subject.toLowerCase().includes(q.toLowerCase()) || t.ticket_number.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My tickets</h1>
          <p className="text-sm text-muted-foreground">Track and reply to your support requests.</p>
        </div>
        <Link to="/portal/new"><Button><Plus className="h-4 w-4 mr-1" /> New ticket</Button></Link>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search tickets…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <p>No tickets yet.</p>
          <Link to="/portal/new"><Button className="mt-4">Create your first ticket</Button></Link>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Link key={t.id} to="/portal/ticket/$id" params={{ id: t.id }}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{t.ticket_number}</span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                    </div>
                    <h3 className="mt-1 font-medium truncate">{t.subject}</h3>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{t.category.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
