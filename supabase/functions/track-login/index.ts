import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth");

    const { data: { user }, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    }).auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const userAgent = body.user_agent || req.headers.get("user-agent") || "";

    // Parse browser and device from user agent
    let browser = "Unknown";
    let device = "desktop";
    let os = "Unknown";

    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Edg")) browser = "Edge";
    else if (userAgent.includes("Opera") || userAgent.includes("OPR")) browser = "Opera";

    if (userAgent.includes("Mobile") || userAgent.includes("Android")) device = "mobile";
    else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) device = "tablet";

    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac OS")) os = "macOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iOS") || userAgent.includes("iPhone")) os = "iOS";

    const deviceStr = `${device} – ${os}`;

    // Get IP from request headers (forwarded by proxy)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") ||
               req.headers.get("cf-connecting-ip") || 
               "Unknown";

    // Fetch IP geolocation data
    let location = "Unknown";
    let isp = "Unknown";
    
    if (ip && ip !== "Unknown" && ip !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,isp`);
        const geo = await geoRes.json();
        if (geo.status === "success") {
          location = [geo.city, geo.regionName, geo.country].filter(Boolean).join(", ");
          isp = geo.isp || "Unknown";
        }
      } catch (e) {
        console.error("Geo lookup failed:", e);
      }
    }

    // Generate fingerprint
    const fingerprint = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userAgent + ip)))
    ).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 8);

    // Check if new device
    const { data: prevLogs } = await supabase
      .from("login_logs")
      .select("fingerprint")
      .eq("user_id", user.id)
      .limit(20);
    
    const knownFingerprints = new Set((prevLogs || []).map(l => l.fingerprint));
    const isNewDevice = !knownFingerprints.has(fingerprint);

    // Calculate risk score
    let riskScore = 0;
    if (isNewDevice) riskScore += 20;
    if (ip === "Unknown") riskScore += 15;
    if (location === "Unknown") riskScore += 10;

    // Get profile id - wait briefly if profile doesn't exist yet (new signup)
    let profileId: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
      if (profile?.id) { profileId = profile.id; break; }
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }

    if (!profileId) {
      return new Response(JSON.stringify({ success: true, login_log_id: null, note: "profile not ready" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert login log
    const { data: loginLog, error: insertError } = await supabase.from("login_logs").insert({
      user_id: profileId,
      ip_address: ip,
      location,
      isp,
      browser,
      device: deviceStr,
      os,
      method: body.method || "PASSWORD",
      user_agent: userAgent,
      fingerprint,
      is_new_device: isNewDevice,
      risk_score: riskScore,
    }).select("id").single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, login_log_id: loginLog?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
