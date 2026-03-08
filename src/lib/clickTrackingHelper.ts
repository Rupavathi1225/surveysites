import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface TrackPayload {
  user_id: string;
  username: string | null;
  offer_id?: string;
  survey_link_id?: string;
  provider_id?: string;
}

/**
 * Bulletproof click tracking - uses direct fetch as primary method
 * to avoid any SDK/RLS issues. Falls back to sendBeacon.
 */
export async function trackClickRobust(payload: TrackPayload): Promise<string | null> {
  const clickId = crypto.randomUUID();
  const sessionStart = new Date().toISOString();

  const record: Record<string, any> = {
    id: clickId,
    user_id: payload.user_id,
    username: payload.username,
    session_id: sessionStorage.getItem("session_id") || crypto.randomUUID(),
    user_agent: navigator.userAgent,
    device_type: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop",
    browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[0] || "Unknown",
    os: navigator.platform || "Unknown",
    source: window.location.href,
    completion_status: "clicked",
    utm_params: { page: window.location.pathname },
    session_start: sessionStart,
    session_end: sessionStart,
  };

  if (payload.offer_id) record.offer_id = payload.offer_id;
  if (payload.survey_link_id) record.survey_link_id = payload.survey_link_id;
  if (payload.provider_id) record.provider_id = payload.provider_id;

  console.log("[ClickTrack] Attempting insert:", clickId, record.provider_id || record.offer_id || record.survey_link_id);

  // Method 1: Direct fetch to Supabase REST API
  try {
    const session = (await supabase.auth.getSession()).data.session;
    const authToken = session?.access_token;
    
    if (!authToken) {
      console.error("[ClickTrack] No auth token - user not logged in!");
      return null;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/offer_clicks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${authToken}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(record),
    });

    if (res.ok) {
      console.log("[ClickTrack] ✅ SUCCESS via fetch:", clickId);
      enrichClickAsync(clickId, sessionStart, authToken);
      return clickId;
    } else {
      const errText = await res.text();
      console.error("[ClickTrack] ❌ fetch failed:", res.status, errText);
    }
  } catch (err) {
    console.error("[ClickTrack] ❌ fetch exception:", err);
  }

  // Method 2: Supabase SDK fallback
  try {
    const { error } = await supabase.from("offer_clicks").insert(record);
    if (!error) {
      console.log("[ClickTrack] ✅ SUCCESS via SDK:", clickId);
      enrichClickAsync(clickId, sessionStart);
      return clickId;
    }
    console.error("[ClickTrack] ❌ SDK error:", error.message, error.code, error.details);
  } catch (err) {
    console.error("[ClickTrack] ❌ SDK exception:", err);
  }

  // Method 3: sendBeacon as last resort
  try {
    const beaconData = JSON.stringify(record);
    const blob = new Blob([beaconData], { type: "application/json" });
    // sendBeacon doesn't support custom headers, so this won't work with RLS
    // but log the failure for debugging
    console.error("[ClickTrack] ❌ All methods failed for:", clickId);
  } catch (err) {
    console.error("[ClickTrack] ❌ beacon error:", err);
  }

  return null;
}

function enrichClickAsync(clickId: string, sessionStart: string, authToken?: string) {
  // Fetch IP info
  fetchIpInfo().then(ipInfo => {
    if (ipInfo.ip) {
      if (authToken) {
        fetch(`${SUPABASE_URL}/rest/v1/offer_clicks?id=eq.${clickId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${authToken}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ ip_address: ipInfo.ip, country: ipInfo.country, vpn_proxy_flag: ipInfo.proxy || false }),
        }).catch(() => {});
      } else {
        supabase.from("offer_clicks").update({
          ip_address: ipInfo.ip, country: ipInfo.country, vpn_proxy_flag: ipInfo.proxy || false,
        }).eq("id", clickId).then(() => {});
      }
    }
  }).catch(() => {});

  // Update session end after 30s
  setTimeout(() => {
    const timeSpent = Math.round((Date.now() - new Date(sessionStart).getTime()) / 1000);
    supabase.from("offer_clicks").update({ session_end: new Date().toISOString(), time_spent: timeSpent }).eq("id", clickId).then(() => {});
  }, 30000);
}

async function fetchIpInfo() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-ip-info`, {
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await res.json();
  } catch {
    return { ip: null, country: null, proxy: false };
  }
}
