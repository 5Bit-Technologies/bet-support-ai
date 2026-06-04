import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface ClassifyInput {
  subject: string;
  description: string;
  audience?: "customer" | "staff";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subject, description, audience = "customer" } = (await req.json()) as ClassifyInput;
    if (!subject || !description) {
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

    // Customers can raise Online Gambling OR Physical Casino tickets.
    // Staff raise Internal Staff tickets only.
    const customerCategories = [
      "withdrawals", "deposits", "betting", "verification", "login", "promotions", "responsible_gambling",
      "security_incident", "theft", "lost_found", "customer_complaint", "property_damage", "facility_issue", "venue_services",
      "other",
    ];
    const staffCategories = ["it", "hr", "finance", "operations", "internal_security", "maintenance", "facilities", "other"];
    const allowedCategories = audience === "staff" ? staffCategories : customerCategories;
    const allowedMains = audience === "staff" ? ["Internal Staff"] : ["Online Gambling", "Physical Casino"];

    const systemPrompt = audience === "staff"
      ? "You are a triage classifier for INTERNAL employee tickets at a casino/gambling operator (online + physical venues). main_category is always 'Internal Staff'. Pick the most precise sub-category. Priority: urgent=production outage, security incident, payroll blocker; high=blocks an employee from working; medium=standard request; low=informational."
      : "You are a triage classifier for a regulated casino operator serving BOTH online gambling customers AND physical venue guests. Choose main_category 'Online Gambling' for digital/account/wagering issues, 'Physical Casino' for in-venue incidents (security, theft, lost items, complaints, damage, facilities, venue services). Priority: urgent=money stuck, account locked, KYC blocking play, suspected fraud, active security/theft incident, guest safety; high=repeated failed deposit/withdraw, betting disputes, escalated complaints; medium=general questions; low=informational.";

    const tools = [{
      type: "function",
      function: {
        name: "classify_ticket",
        description: "Classify a support ticket end-to-end.",
        parameters: {
          type: "object",
          properties: {
            main_category: { type: "string", enum: allowedMains },
            category: { type: "string", enum: allowedCategories, description: "Sub-category." },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative", "frustrated"] },
            suggested_department: { type: "string", description: "Best-fit handling team." },
            confidence: { type: "number", description: "0.0 - 1.0" },
            summary: { type: "string", description: "1-sentence summary." },
            reasoning: { type: "string", description: "Why this classification." },
          },
          required: ["main_category", "category", "priority", "sentiment", "suggested_department", "confidence", "summary", "reasoning"],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Subject: ${subject}\n\nDescription: ${description}` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "classify_ticket" } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: "AI gateway error", detail: txt }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "No classification returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-ticket error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
