import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    // Also accept POST body
    if (req.method === "POST") {
      try {
        const body = await req.json();
        Object.assign(params, body);
      } catch (_) {}
    }

    const { offer_id, survey_link_id, user_id, redirect_url, source } = params;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    // Detect device type
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const deviceType = isMobile ? "mobile" : "desktop";

    // Detect browser
    let browser = "unknown";
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) browser = "Chrome";
    else if (/firefox/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
    else if (/edge/i.test(userAgent)) browser = "Edge";

    // Detect OS
    let os = "unknown";
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/mac/i.test(userAgent)) os = "macOS";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/linux/i.test(userAgent)) os = "Linux";
    else if (/iphone|ipad/i.test(userAgent)) os = "iOS";

    // Parse UTM params
    const utmParams: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      if (params[key]) utmParams[key] = params[key];
    }

    // Find user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .or(`id.eq.${user_id},user_id.eq.${user_id},username.eq.${user_id}`)
      .maybeSingle();

    // Check for duplicate clicks (same user + same offer in last 5 min)
    let attemptCount = 1;
    if (profile) {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("offer_clicks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .gte("created_at", fiveMinAgo);
      attemptCount = (count || 0) + 1;
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Store the click
    const { data: click } = await supabase.from("offer_clicks").insert({
      user_id: profile?.id || null,
      offer_id: offer_id || null,
      survey_link_id: survey_link_id || null,
      ip_address: clientIp,
      user_agent: userAgent,
      browser,
      os,
      device_type: deviceType,
      source: source || "direct",
      session_id: sessionId,
      session_start: new Date().toISOString(),
      attempt_count: attemptCount,
      completion_status: "clicked",
      utm_params: Object.keys(utmParams).length > 0 ? utmParams : null,
    }).select("id").single();

    // If redirect URL provided, return it
    if (redirect_url) {
      // Append click_id and session_id to redirect URL for tracking
      const redirectTarget = new URL(redirect_url);
      redirectTarget.searchParams.set("click_id", click?.id || "");
      redirectTarget.searchParams.set("session_id", sessionId);

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: redirectTarget.toString(),
        },
      });
    }

    return new Response(JSON.stringify({
      status: "ok",
      click_id: click?.id,
      session_id: sessionId,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Click Handler Error]", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
