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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/ticket-utils";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/portal/new")({
  head: () => ({ meta: [{ title: "New ticket — Helix" }] }),
  component: () => <RequireAuth><AppShell area="portal"><NewTicket /></AppShell></RequireAuth>,
});

const schema = z.object({
  subject: z.string().trim().min(5).max(200),
  description: z.string().trim().min(10).max(5000),
  category: z.string(),
});

function NewTicket() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ subject, description, category });
    if (!parsed.success) return toast.error("Please fill all fields (subject ≥ 5 chars, description ≥ 10 chars).");

    setBusy(true);
    try {
      // AI classification (best-effort)
      let ai: any = null;
      try {
        const { data, error } = await supabase.functions.invoke("classify-ticket", {
          body: { subject: parsed.data.subject, description: parsed.data.description },
        });
        if (error) console.warn("AI classify error", error);
        else ai = data;
      } catch (e) { console.warn(e); }

      const insertPayload: any = {
        user_id: user.id,
        subject: parsed.data.subject,
        description: parsed.data.description,
        category: ai?.category ?? parsed.data.category,
        priority: ai?.priority ?? "medium",
        sentiment: ai?.sentiment ?? null,
        suggested_department: ai?.suggested_department ?? null,
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

      toast.success("Ticket submitted. AI has triaged it.");
      nav({ to: "/portal/ticket/$id", params: { id: ticket.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create a new ticket</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI will classify priority, category and routing automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="E.g. Withdrawal pending for 3 days" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (will be re-evaluated by AI)</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={8} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue, include account ID, transaction reference and timestamps if possible." required />
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
