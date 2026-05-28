import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge, PriorityBadge, SentimentBadge } from "@/components/TicketBadges";
import { STATUSES, PRIORITIES, CATEGORIES } from "@/lib/ticket-utils";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Lock, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/portal/ticket/$id")({
  head: () => ({ meta: [{ title: "Ticket — Helix" }] }),
  component: () => <RequireAuth><AppShell area="portal"><TicketDetail backTo="/portal" /></AppShell></RequireAuth>,
});

export function TicketDetail({ backTo }: { backTo: string }) {
  const { id } = useParams({ strict: false }) as { id: string };
  const { user, isStaff } = useAuth();
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: t } = await supabase.from("tickets").select("*, profile:profiles!tickets_user_id_fkey(email,full_name)").eq("id", id).maybeSingle();
    setTicket(t);
    const { data: m } = await supabase.from("ticket_messages").select("*, profile:profiles(email,full_name)").eq("ticket_id", id).order("created_at");
    setMessages(m ?? []);
    const { data: a } = await supabase.from("ticket_attachments").select("*").eq("ticket_id", id);
    setAttachments(a ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`ticket-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sendReply = async () => {
    if (!reply.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: id, user_id: user.id, message: reply.trim(), is_internal_note: isStaff ? internal : false,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setReply(""); setInternal(false);
  };

  const updateTicket = async (patch: any) => {
    const { error } = await supabase.from("tickets").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
  };

  const downloadAttachment = async (a: any) => {
    const { data, error } = await supabase.storage.from("ticket-attachments").createSignedUrl(a.storage_path, 60);
    if (error || !data) return toast.error("Could not get file");
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (!ticket) return <div className="p-6">Ticket not found.</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link to={backTo as any} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_number}</p>
                  <CardTitle className="mt-1">{ticket.subject}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.description}</p>
              {attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Attachments</p>
                  {attachments.map((a) => (
                    <button key={a.id} onClick={() => downloadAttachment(a)} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Paperclip className="h-3.5 w-3.5" /> {a.file_name}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Conversation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {messages.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`rounded-lg p-3 border ${m.is_internal_note ? "bg-amber-500/5 border-amber-500/30" : "bg-muted/40 border-border"}`}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{m.profile?.full_name ?? m.profile?.email ?? "User"}</span>
                    {m.is_internal_note && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><Lock className="h-3 w-3" /> Internal note</span>}
                    <span>· {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                </div>
              ))}

              <Separator />
              <div className="space-y-2">
                <Textarea rows={4} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <div className="flex items-center justify-between">
                  {isStaff ? (
                    <div className="flex items-center gap-2">
                      <Switch id="internal" checked={internal} onCheckedChange={setInternal} />
                      <Label htmlFor="internal" className="text-xs">Internal note (hidden from customer)</Label>
                    </div>
                  ) : <span />}
                  <Button onClick={sendReply} disabled={busy || !reply.trim()}>Send reply</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Classification</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {ticket.ai_classification ? (
                <>
                  <Row label="Category"><span className="capitalize">{ticket.category}</span></Row>
                  <Row label="Priority"><PriorityBadge priority={ticket.priority} /></Row>
                  <Row label="Sentiment"><SentimentBadge sentiment={ticket.sentiment} /></Row>
                  <Row label="Department">{ticket.suggested_department ?? "—"}</Row>
                  <Row label="Confidence">{ticket.ai_confidence ? `${Math.round(ticket.ai_confidence * 100)}%` : "—"}</Row>
                  {ticket.ai_classification?.summary && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Summary</p>
                      <p>{ticket.ai_classification.summary}</p>
                    </div>
                  )}
                  {isStaff && ticket.ai_classification?.reasoning && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Reasoning</p>
                      <p className="text-xs">{ticket.ai_classification.reasoning}</p>
                    </div>
                  )}
                </>
              ) : <p className="text-muted-foreground">No AI data.</p>}
            </CardContent>
          </Card>

          {isStaff && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Manage</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={ticket.status} onValueChange={(v) => updateTicket({ status: v, resolved_at: v === "resolved" ? new Date().toISOString() : null })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={ticket.priority} onValueChange={(v) => updateTicket({ priority: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={ticket.category} onValueChange={(v) => updateTicket({ category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Submitted by">{ticket.profile?.full_name ?? ticket.profile?.email ?? "—"}</Row>
              <Row label="Created">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</Row>
              <Row label="Updated">{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</Row>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
