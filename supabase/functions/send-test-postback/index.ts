import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { partner_id, username, offer_name, points, status } = await req.json();

    if (!partner_id || !username || !points) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the downward partner
    const { data: partner, error: pErr } = await supabase
      .from("downward_partners")
      .select("*")
      .eq("id", partner_id)
      .single();

    if (pErr || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!partner.postback_url) {
      return new Response(JSON.stringify({ error: "Partner has no postback URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txnId = `test_${Date.now()}`;
    const statusValue = status || "1";

    // Build the URL with partner's param mappings
    const forwardUrl = new URL(partner.postback_url);
    forwardUrl.searchParams.set(partner.username_param || "user_id", username);
    forwardUrl.searchParams.set(partner.status_param || "status", statusValue);
    forwardUrl.searchParams.set(partner.payout_param || "payout", String(points));
    forwardUrl.searchParams.set(partner.txn_param || "txn_id", txnId);
    forwardUrl.searchParams.set(partner.offer_param || "offer_id", offer_name || "test_offer");

    // Add custom params
    if (partner.custom_params && typeof partner.custom_params === "object") {
      for (const [k, v] of Object.entries(partner.custom_params as Record<string, string>)) {
        forwardUrl.searchParams.set(k, v);
      }
    }

    const method = (partner.postback_method || "GET").toUpperCase();
    
    console.log(`[Test Postback] Sending to ${partner.name}: ${method} ${forwardUrl.toString()}`);

    const forwardResponse = await fetch(forwardUrl.toString(), { method });
    const responseBody = await forwardResponse.text();

    // Log outgoing postback
    await supabase.from("postback_logs").insert({
      direction: "outgoing",
      provider_type: "test",
      provider_name: "Test Postback",
      downward_partner_id: partner.id,
      username: username,
      txn_id: txnId,
      status: statusValue === "1" ? "success" : "failed",
      payout: Number(points),
      payout_type: "points",
      raw_params: { forward_url: forwardUrl.toString(), test: true },
      response_code: forwardResponse.status,
      response_body: responseBody.substring(0, 500),
    });

    return new Response(JSON.stringify({
      success: true,
      partner_name: partner.name,
      url_sent: forwardUrl.toString(),
      response_code: forwardResponse.status,
      response_body: responseBody.substring(0, 200),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Test Postback Error]", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
