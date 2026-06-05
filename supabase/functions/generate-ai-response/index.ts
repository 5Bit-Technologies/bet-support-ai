import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface Input {
  ticket_id?: string;
  subject: string;
  description: string;
  main_category?: string;
  category?: string;
  priority?: string;
  sentiment?: string;
  suggested_department?: string;
  audience?: "customer" | "staff";
  auto_insert?: boolean;
}

type Tone = "formal" | "friendly" | "urgent";

/** Tone is fully derived from sentiment + priority + category. No human override. */
function pickTone(input: Input): Tone {
  const cat = input.category ?? "";
  const pri = input.priority ?? "medium";
  const sent = input.sentiment ?? "neutral";
  if (
    pri === "urgent" ||
    sent === "frustrated" ||
    ["security_incident", "theft", "responsible_gambling"].includes(cat)
  ) return "urgent";
  if (
    ["verification", "finance", "withdrawals", "customer_complaint"].includes(cat) ||
    pri === "high"
  ) return "formal";
  return "friendly";
}

/** Hard escalation rule: anything urgent or frustrated goes to a human admin. */
function shouldEscalate(input: Input): boolean {
  const cat = input.category ?? "";
  return (
    input.priority === "urgent" ||
    input.sentiment === "frustrated" ||
    ["security_incident", "theft", "responsible_gambling"].includes(cat)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const input = (await req.json()) as Input;
    if (!input.subject || !input.description) {
      return new Response(JSON.stringify({ error: "subject and description required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tone = pickTone(input);
    const escalate = shouldEscalate(input);
    const toneGuide = {
      formal: "Professional, compliance-aware, measured. Use full sentences and avoid casual phrasing. Suitable for finance, verification, and escalated complaints.",
      friendly: "Warm, approachable, concise. Suitable for general enquiries, promotions, and routine support.",
      urgent: "Direct, action-oriented, reassuring. Acknowledge severity, confirm escalation to a senior agent, and set a clear next step.",
    }[tone];

    const escalationLine = escalate
      ? " This ticket has been auto-escalated to a senior agent — make that explicit in the reply."
      : "";

    const systemPrompt = `You are an automated first-response agent for a regulated casino operator (online + physical venues). Draft ONE concise reply (90-140 words) to the customer or employee who raised the ticket. Tone: ${tone}. Tone guidance: ${toneGuide}${escalationLine}

Rules:
- Acknowledge the issue specifically (reference the situation, not generic phrasing).
- Confirm which team is handling it (use the provided department).
- Set a clear, realistic next step or expected timeline.
- Never promise refunds, payouts, account changes, or legal outcomes.
- Never request passwords, full card numbers, or full ID numbers.
- No greetings like "Dear Sir/Madam"; start with "Thank you for…" or "We've received…".
- Sign off as "Helix Support (Automated)".`;

    const userMsg = `Audience: ${input.audience ?? "customer"}
Main category: ${input.main_category ?? "—"}
Sub-category: ${input.category ?? "—"}
Priority: ${input.priority ?? "—"}
Sentiment: ${input.sentiment ?? "—"}
Department: ${input.suggested_department ?? "—"}

Subject: ${input.subject}
Description: ${input.description}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const response: string = (data.choices?.[0]?.message?.content ?? "").trim();

    // Auto-insert as a real reply + persist tone + escalate if needed.
    if (input.auto_insert && input.ticket_id && response) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);

      // The author of the AI message is the ticket owner (acts as a system bot
      // owned by their record); UI uses is_ai to label it as Helix Support (AI).
      const { data: t } = await admin.from("tickets").select("user_id").eq("id", input.ticket_id).maybeSingle();
      const authorId = t?.user_id ?? null;

      if (authorId) {
        await admin.from("ticket_messages").insert({
          ticket_id: input.ticket_id,
          user_id: authorId,
          message: response,
          is_internal_note: false,
          is_ai: true,
        });
      }

      const patch: Record<string, unknown> = {
        ai_response: response,
        ai_response_tone: tone,
        ai_response_edited: false,
      };
      if (escalate) patch.status = "escalated";
      await admin.from("tickets").update(patch).eq("id", input.ticket_id);
    }

    return new Response(JSON.stringify({ response, tone, escalated: escalate }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-response error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
