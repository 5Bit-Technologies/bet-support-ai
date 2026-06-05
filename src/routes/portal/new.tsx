import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AppShell, RequireAuth } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/portal/new")({
  head: () => ({ meta: [{ title: "New ticket — Helix" }] }),
  component: () => <RequireAuth><AppShell area="portal"><NewTicket audience="customer" /></AppShell></RequireAuth>,
});

const schema = z.object({
  subject: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(5000),
});

export function NewTicket({ audience }: { audience: "customer" | "staff" }) {
  const { user, isStaff } = useAuth();
  const nav = useNavigate();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ subject, description });
    if (!parsed.success) return toast.error("Subject ≥ 5 chars, description ≥ 10 chars.");

    setBusy(true);
    try {
      // AI classification — required for auto-routing. Failure falls back to "other".
      let ai: any = null;
      try {
        const { data, error } = await supabase.functions.invoke("classify-ticket", {
          body: { subject: parsed.data.subject, description: parsed.data.description, audience },
        });
        if (error) console.warn("AI classify error", error);
        else ai = data;
      } catch (e) { console.warn(e); }

      const insertPayload: any = {
        user_id: user.id,
        subject: parsed.data.subject,
        description: parsed.data.description,
        category: ai?.category ?? "other",
        priority: ai?.priority ?? "medium",
        sentiment: ai?.sentiment ?? null,
        suggested_department: ai?.suggested_department ?? null,
        main_category: ai?.main_category ?? (audience === "staff" ? "Internal Staff" : "Online Gambling"),
        ai_classification: ai ?? null,
        ai_confidence: ai?.confidence ?? null,
      };

      const { data: ticket, error } = await supabase.from("tickets").insert(insertPayload).select().single();
      if (error) throw error;

      if (file && ticket) {
        const path = `${user.id}/${ticket.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, file);
        if (!upErr) {
          await supabase.from("ticket_attachments").insert({
            ticket_id: ticket.id, uploaded_by: user.id, storage_path: path,
            file_name: file.name, file_size: file.size, mime_type: file.type,
          });
        }
      }

      // Fire-and-forget AI auto-response. The edge function picks the tone,
      // posts the reply as a real message, and escalates to admin if needed.
      if (ticket && ai) {
        supabase.functions.invoke("generate-ai-response", {
          body: {
            ticket_id: ticket.id, auto_insert: true,
            subject: parsed.data.subject, description: parsed.data.description,
            main_category: ai.main_category, category: ai.category, priority: ai.priority,
            sentiment: ai.sentiment, suggested_department: ai.suggested_department, audience,
          },
        });
      }

      toast.success("Ticket submitted. AI has triaged and routed it.");
      nav({ to: isStaff ? "/staff/ticket/$id" : "/portal/ticket/$id", params: { id: ticket.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally { setBusy(false); }
  };

  const placeholder = audience === "staff"
    ? "E.g. Laptop won't connect to VPN since this morning"
    : "E.g. Withdrawal pending for 3 days";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create a new ticket</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Just describe the issue — our AI assigns category, priority and the right team automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={placeholder} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={8} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail. Include any references, account ID, timestamps." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Attachment (optional)</Label>
              <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting & classifying…" : "Submit ticket"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
