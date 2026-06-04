import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Input {
  subject: string;
  description: string;
  main_category?: string;
  category?: string;
  priority?: string;
  sentiment?: string;
  suggested_department?: string;
  audience?: "customer" | "staff";
  tone?: "formal" | "friendly" | "urgent" | "auto";
}

function pickTone(input: Input): "formal" | "friendly" | "urgent" {
  if (input.tone && input.tone !== "auto") return input.tone;
  const cat = input.category ?? "";
  const pri = input.priority ?? "medium";
  if (pri === "urgent" || ["security_incident", "theft", "responsible_gambling"].includes(cat)) return "urgent";
  if (["verification", "finance", "withdrawals", "customer_complaint"].includes(cat) || pri === "high") return "formal";
  return "friendly";
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
    const toneGuide = {
      formal: "Professional, compliance-aware, measured. Use full sentences and avoid casual phrasing. Suitable for finance, verification, and escalated complaints.",
      friendly: "Warm, approachable, concise. Suitable for general enquiries, promotions, and routine support.",
      urgent: "Direct, action-oriented, reassuring. Acknowledge severity, confirm escalation, and set a clear next step.",
    }[tone];

    const systemPrompt = `You are a senior support agent for a regulated casino operator that runs BOTH online gambling and physical venues. Draft ONE concise reply (90-140 words) to the customer or employee who raised the ticket. Tone: ${tone}. Tone guidance: ${toneGuide}

Rules:
- Acknowledge the issue specifically (reference the situation, not generic phrasing).
- Confirm classification and which team is handling it (use the provided department).
- Set a clear, realistic next step or expected timeline.
- Never promise refunds, payouts, account changes, or legal outcomes.
- Never request passwords, full card numbers, or full ID numbers.
- No greetings like "Dear Sir/Madam"; start with "Thank you for…" or "We've received…".
- No sign-off name; end with "Helix Support".`;

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

    return new Response(JSON.stringify({ response, tone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-response error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
