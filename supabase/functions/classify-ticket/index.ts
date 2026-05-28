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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerCategories = ["withdrawals", "deposits", "betting", "verification", "login", "promotions", "other"];
    const staffCategories = ["hr", "it", "finance", "facilities", "internal_security", "other"];
    const allowedCategories = audience === "staff" ? staffCategories : customerCategories;

    const departmentHint = audience === "staff"
      ? "Best-fit internal team: HR, IT, Finance, Facilities, Internal Security, or General Operations."
      : "Best-fit team: Payments, Compliance/KYC, Trading/Sportsbook, Account Security, VIP/Promotions, or General Support.";

    const systemPrompt = audience === "staff"
      ? "You are a triage classifier for INTERNAL employee support tickets at an online gambling/betting operator. Route to the correct internal department. 'urgent' = production outage, security incident, payroll blocker. 'high' = blocks an employee from working. 'medium' = standard request. 'low' = informational."
      : "You are a triage classifier for a regulated online gambling/betting operator's CUSTOMER support desk. Be precise. Urgency rubric: 'urgent' = money stuck, account locked, KYC blocking active play, suspected fraud. 'high' = repeated failed deposit/withdraw, betting void disputes. 'medium' = general account/bonus questions. 'low' = informational.";

    const tools = [
      {
        type: "function",
        function: {
          name: "classify_ticket",
          description: "Classify a support ticket.",
          parameters: {
            type: "object",
            properties: {
              category: { type: "string", enum: allowedCategories },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative", "frustrated"] },
              suggested_department: { type: "string", description: departmentHint },
              confidence: { type: "number", description: "0.0 - 1.0" },
              summary: { type: "string", description: "1-sentence summary." },
              reasoning: { type: "string", description: "Why this classification." },
            },
            required: ["category", "priority", "sentiment", "suggested_department", "confidence", "summary", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "No classification returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-ticket error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
