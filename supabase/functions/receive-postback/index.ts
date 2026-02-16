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
    const url = new URL(req.url);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract provider code from path: /receive-postback/{provider_code}
    const pathParts = url.pathname.split("/").filter(Boolean);
    const providerCode = pathParts[pathParts.length - 1];

    // Get all query params
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    // Also parse body params for POST requests
    if (req.method === "POST") {
      try {
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await req.json();
          Object.assign(params, body);
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          const text = await req.text();
          const formParams = new URLSearchParams(text);
          formParams.forEach((value, key) => { params[key] = value; });
        }
      } catch (_) { /* ignore body parse errors */ }
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";

    console.log(`[Postback] Code: ${providerCode}, Params:`, JSON.stringify(params));

    // Try to find the provider - first in survey_providers, then single_link_providers
    let provider: any = null;
    let providerType = "";

    const { data: surveyProvider } = await supabase
      .from("survey_providers")
      .select("*")
      .eq("code", providerCode)
      .eq("status", "active")
      .maybeSingle();

    if (surveyProvider) {
      provider = surveyProvider;
      providerType = "survey_provider";
    } else {
      const { data: singleProvider } = await supabase
        .from("single_link_providers")
        .select("*")
        .eq("code", providerCode)
        .eq("status", "active")
        .maybeSingle();

      if (singleProvider) {
        provider = singleProvider;
        providerType = "single_link_provider";
      }
    }

    if (!provider) {
      // Log unknown postback
      await supabase.from("postback_logs").insert({
        direction: "incoming",
        provider_type: "unknown",
        provider_name: providerCode,
        status: "failed",
        raw_params: params,
        ip_address: clientIp,
        error_message: `Unknown provider code: ${providerCode}`,
      });
      return new Response(JSON.stringify({ error: "Unknown provider" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract values using provider's key mappings
    const usernameKey = provider.postback_username_key || "user_id";
    const statusKey = provider.postback_status_key || "status";
    const payoutKey = provider.postback_payout_key || "payout";
    const txnKey = provider.postback_txn_key || "txn_id";
    const successValue = provider.success_value || "1";

    const username = params[usernameKey] || "";
    const postbackStatus = params[statusKey] || "";
    const payout = parseFloat(params[payoutKey] || "0") || 0;
    const txnId = params[txnKey] || "";

    // Determine if this is a success, failure, or reversal
    const statusLower = postbackStatus.toLowerCase().trim();
    let normalizedStatus = "failed";
    const successValues = [successValue.toLowerCase(), "1", "2", "success", "approved", "complete", "completed", "true", "yes", "ok", "done"];
    const reversalValues = ["reversed", "reversal", "-1", "3", "chargeback", "refund", "refunded"];
    if (successValues.includes(statusLower)) {
      normalizedStatus = "success";
    } else if (reversalValues.includes(statusLower)) {
      normalizedStatus = "reversed";
    }

    // Find the user by username first, then try by id/user_id if it looks like a UUID
    let userProfile: any = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Try username first
    const { data: byUsername } = await supabase
      .from("profiles")
      .select("id, user_id, username, points, cash_balance")
      .eq("username", username)
      .maybeSingle();
    
    if (byUsername) {
      userProfile = byUsername;
    } else if (uuidRegex.test(username)) {
      // Try by id or user_id if it looks like a UUID
      const { data: byId } = await supabase
        .from("profiles")
        .select("id, user_id, username, points, cash_balance")
        .or(`id.eq.${username},user_id.eq.${username}`)
        .maybeSingle();
      userProfile = byId;
    }

    // Calculate points based on provider settings
    const pointPercentage = provider.point_percentage || 100;
    const payoutType = provider.payout_type || "points";
    const calculatedPayout = Math.round(payout * (pointPercentage / 100));

    // Log incoming postback
    const { data: logEntry } = await supabase.from("postback_logs").insert({
      direction: "incoming",
      provider_type: providerType,
      provider_id: provider.id,
      provider_name: provider.name,
      user_id: userProfile?.id || null,
      username: username,
      txn_id: txnId,
      status: normalizedStatus,
      payout: calculatedPayout,
      payout_type: payoutType,
      raw_params: params,
      ip_address: clientIp,
    }).select("id").single();

    if (!userProfile) {
      // Update log with error
      if (logEntry) {
        await supabase.from("postback_logs")
          .update({ error_message: `User not found: ${username}` })
          .eq("id", logEntry.id);
      }
      return new Response(JSON.stringify({ error: "User not found", status: "error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process the postback
    if (normalizedStatus === "success" && calculatedPayout > 0) {
      // Credit user
      if (payoutType === "cash") {
        await supabase.from("profiles")
          .update({ cash_balance: (userProfile.cash_balance || 0) + calculatedPayout })
          .eq("id", userProfile.id);
      } else {
        await supabase.from("profiles")
          .update({ points: (userProfile.points || 0) + calculatedPayout })
          .eq("id", userProfile.id);
      }

      // Record earning
      await supabase.from("earning_history").insert({
        user_id: userProfile.id,
        amount: calculatedPayout,
        type: payoutType,
        description: `Postback from ${provider.name} (TXN: ${txnId})`,
        offer_name: provider.name,
        status: "approved",
      });

      // Update offer_click if exists
      await supabase.from("offer_clicks")
        .update({ completion_status: "completed" })
        .eq("user_id", userProfile.id)
        .eq("completion_status", "clicked")
        .order("created_at", { ascending: false })
        .limit(1);

    } else if (normalizedStatus === "reversed" && calculatedPayout > 0) {
      // Reverse: deduct from user
      if (payoutType === "cash") {
        await supabase.from("profiles")
          .update({ cash_balance: Math.max(0, (userProfile.cash_balance || 0) - calculatedPayout) })
          .eq("id", userProfile.id);
      } else {
        await supabase.from("profiles")
          .update({ points: Math.max(0, (userProfile.points || 0) - calculatedPayout) })
          .eq("id", userProfile.id);
      }

      // Record reversal
      await supabase.from("earning_history").insert({
        user_id: userProfile.id,
        amount: -calculatedPayout,
        type: payoutType,
        description: `Reversal from ${provider.name} (TXN: ${txnId})`,
        offer_name: provider.name,
        status: "reversed",
      });

      // Update offer_click
      await supabase.from("offer_clicks")
        .update({ completion_status: "reversed" })
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    // Forward to downward partners
    const { data: downwardPartners } = await supabase
      .from("downward_partners")
      .select("*")
      .eq("status", "active");

    let forwardCount = 0;
    if (downwardPartners && downwardPartners.length > 0) {
      for (const partner of downwardPartners) {
        if (!partner.postback_url) continue;

        try {
          // Build the forward URL with partner's param mappings
          const forwardUrl = new URL(partner.postback_url);
          forwardUrl.searchParams.set(partner.username_param || "user_id", username);
          forwardUrl.searchParams.set(partner.status_param || "status", normalizedStatus === "success" ? "1" : normalizedStatus === "reversed" ? "2" : "0");
          forwardUrl.searchParams.set(partner.payout_param || "payout", String(calculatedPayout));
          forwardUrl.searchParams.set(partner.txn_param || "txn_id", txnId);
          forwardUrl.searchParams.set(partner.offer_param || "offer_id", provider.code || provider.id);

          // Add custom params
          if (partner.custom_params && typeof partner.custom_params === "object") {
            for (const [k, v] of Object.entries(partner.custom_params as Record<string, string>)) {
              forwardUrl.searchParams.set(k, v);
            }
          }

          const method = (partner.postback_method || "GET").toUpperCase();
          const forwardResponse = await fetch(forwardUrl.toString(), { method });
          const responseBody = await forwardResponse.text();

          // Log outgoing postback
          await supabase.from("postback_logs").insert({
            direction: "outgoing",
            provider_type: providerType,
            provider_id: provider.id,
            provider_name: provider.name,
            downward_partner_id: partner.id,
            user_id: userProfile?.id,
            username: username,
            txn_id: txnId,
            status: normalizedStatus,
            payout: calculatedPayout,
            payout_type: payoutType,
            raw_params: { forward_url: forwardUrl.toString() },
            response_code: forwardResponse.status,
            response_body: responseBody.substring(0, 500),
            ip_address: clientIp,
          });

          forwardCount++;
        } catch (fwdError) {
          // Log forward failure
          await supabase.from("postback_logs").insert({
            direction: "outgoing",
            provider_type: providerType,
            provider_id: provider.id,
            provider_name: provider.name,
            downward_partner_id: partner.id,
            username: username,
            txn_id: txnId,
            status: "failed",
            error_message: String(fwdError),
            ip_address: clientIp,
          });
        }
      }
    }

    // Update the incoming log with forward info
    if (logEntry) {
      await supabase.from("postback_logs")
        .update({ forwarded: forwardCount > 0, forward_count: forwardCount })
        .eq("id", logEntry.id);
    }

    return new Response(JSON.stringify({
      status: "ok",
      normalized_status: normalizedStatus,
      payout: calculatedPayout,
      forwarded_to: forwardCount,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Postback Error]", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
