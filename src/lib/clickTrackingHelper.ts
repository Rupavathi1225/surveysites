import { supabase } from "@/integrations/supabase/client";

interface TrackPayload {
  user_id: string;
  username: string | null;
  offer_id?: string;
  survey_link_id?: string;
  provider_id?: string;
}

/**
 * Simple, reliable click tracking using Supabase SDK.
 * No .select() to avoid RLS rollback issues.
 */
export async function trackClickRobust(payload: TrackPayload): Promise<string | null> {
  const clickId = crypto.randomUUID();
  const now = new Date().toISOString();

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
    utm_params: { page: window.location.pathname, referrer: document.referrer || "" },
    session_start: now,
    session_end: now,
    attempt_count: 1,
    risk_score: 0,
    vpn_proxy_flag: false,
  };

  if (payload.offer_id) record.offer_id = payload.offer_id;
  if (payload.survey_link_id) record.survey_link_id = payload.survey_link_id;
  if (payload.provider_id) record.provider_id = payload.provider_id;

  console.log("[ClickTrack] Inserting click:", clickId, payload.provider_id || payload.offer_id || payload.survey_link_id);

  try {
    // Use SDK .insert() WITHOUT .select() to avoid RLS rollback
    const { error } = await supabase.from("offer_clicks").insert(record);

    if (error) {
      console.error("[ClickTrack] ❌ INSERT failed:", error.message, error.code, error.details, error.hint);
      return null;
    }

    console.log("[ClickTrack] ✅ SUCCESS:", clickId);

    // Enrich with IP info asynchronously
    enrichClickAsync(clickId, now);
    return clickId;
  } catch (err) {
    console.error("[ClickTrack] ❌ Exception:", err);
    return null;
  }
}

function enrichClickAsync(clickId: string, sessionStart: string) {
  // Fetch IP info in background
  fetchIpInfo().then(ipInfo => {
    if (ipInfo?.ip) {
      supabase.from("offer_clicks")
        .update({ ip_address: ipInfo.ip, country: ipInfo.country, vpn_proxy_flag: ipInfo.proxy || false })
        .eq("id", clickId)
        .then(({ error }) => {
          if (error) console.warn("[ClickTrack] IP update failed:", error.message);
        });
    }
  }).catch(() => {});

  // Update session_end after 30s
  setTimeout(() => {
    const timeSpent = Math.round((Date.now() - new Date(sessionStart).getTime()) / 1000);
    supabase.from("offer_clicks")
      .update({ session_end: new Date().toISOString(), time_spent: timeSpent })
      .eq("id", clickId)
      .then(({ error }) => {
        if (error) console.warn("[ClickTrack] Session update failed:", error.message);
      });
  }, 30000);
}

async function fetchIpInfo() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const { data } = await supabase.functions.invoke("get-ip-info", {
      body: {},
    });
    clearTimeout(timeoutId);
    return data || { ip: null, country: null, proxy: false };
  } catch {
    return { ip: null, country: null, proxy: false };
  }
}
