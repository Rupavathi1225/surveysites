import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("x-real-ip") 
      || "unknown";

    // Fetch geo info server-side (no CORS issues)
    let geoData: any = {};
    try {
      const res = await fetch(`http://ip-api.com/json/${clientIp}?fields=query,country,countryCode,proxy,isp`);
      geoData = await res.json();
    } catch {
      // Fallback
      geoData = { query: clientIp, country: "Unknown", proxy: false };
    }

    return new Response(JSON.stringify({
      ip: geoData.query || clientIp,
      country: geoData.country || "Unknown",
      countryCode: geoData.countryCode || "",
      proxy: geoData.proxy || false,
      isp: geoData.isp || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ip: "unknown", country: "Unknown", proxy: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});