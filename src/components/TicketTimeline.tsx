import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, ArrowRightLeft, MessageSquare, UserPlus, UserMinus,
  AlertTriangle, CheckCircle2, RotateCcw, Lock, FilePlus2, Tag,
} from "lucide-react";

const ACTION_META: Record<string, { icon: any; label: string; tone: string }> = {
  created: { icon: FilePlus2, label: "Ticket created", tone: "text-blue-500" },
  status_changed: { icon: ArrowRightLeft, label: "Status changed", tone: "text-violet-500" },
  priority_changed: { icon: AlertTriangle, label: "Priority changed", tone: "text-amber-500" },
  category_changed: { icon: Tag, label: "Category changed", tone: "text-sky-500" },
  assigned: { icon: UserPlus, label: "Assigned", tone: "text-emerald-500" },
  unassigned: { icon: UserMinus, label: "Unassigned", tone: "text-slate-500" },
  escalated: { icon: AlertTriangle, label: "Escalated", tone: "text-orange-500" },
  resolved: { icon: CheckCircle2, label: "Resolved", tone: "text-emerald-500" },
  reopened: { icon: RotateCcw, label: "Reopened", tone: "text-amber-500" },
  closed: { icon: Lock, label: "Closed", tone: "text-slate-500" },
  message_added: { icon: MessageSquare, label: "Reply added", tone: "text-blue-500" },
};

export function TicketTimeline({ ticketId }: { ticketId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("ticket_activity")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
      if (!active) return;
      setItems(data ?? []);
      setLoading(false);
    };
    load();
    const ch = supabase.channel(`activity-${ticketId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_activity", filter: `ticket_id=eq.${ticketId}` },
        () => load())
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [ticketId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Activity timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-3">
            {items.map((a) => {
              const meta = ACTION_META[a.action] ?? { icon: Activity, label: a.action, tone: "text-muted-foreground" };
              const Icon = meta.icon;
              return (
                <li key={a.id} className="ml-4">
                  <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-background border-2 border-current ${meta.tone}`} />
                  <div className="flex items-start gap-2 text-sm">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${meta.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="leading-snug">
                        <span className="font-medium">{meta.label}</span>
                        {a.from_value && a.to_value && (
                          <span className="text-muted-foreground"> · {a.from_value.replace("_", " ")} → {a.to_value.replace("_", " ")}</span>
                        )}
                        {!a.from_value && a.to_value && a.action !== "created" && (
                          <span className="text-muted-foreground capitalize"> · {a.to_value.replace("_", " ")}</span>
                        )}
                        {a.metadata?.internal && (
                          <span className="text-amber-600 dark:text-amber-400"> · internal note</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
