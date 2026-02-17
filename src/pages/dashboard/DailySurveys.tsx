import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Monitor, Smartphone, Tablet, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DailySurveys = () => {
  const { profile } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"survey" | "offer">("survey");

  useEffect(() => {
    supabase.from("survey_links").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveys(data || []));
    supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => setOffers(data || []));
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setProviders(data || []));
  }, []);

  const fetchIpInfo = async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-ip-info`;
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      return await res.json();
    } catch {
      return { ip: null, country: null, proxy: false };
    }
  };

  const trackClick = async (item: any, type: "survey" | "offer") => {
    if (!profile) return;
    const ipInfo = await fetchIpInfo();
    const utmParams: Record<string, string> = {};
    const urlParams = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(k => {
      const v = urlParams.get(k);
      if (v) utmParams[k] = v;
    });
    if (Object.keys(utmParams).length === 0 && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        const refParams = new URLSearchParams(refUrl.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(k => {
          const v = refParams.get(k);
          if (v) utmParams[k] = v;
        });
        if (Object.keys(utmParams).length === 0) utmParams["referrer"] = refUrl.hostname;
      } catch {}
    }
    utmParams["page"] = window.location.pathname;

    const sessionStart = new Date().toISOString();
    const payload: any = {
      user_id: profile.id,
      session_id: sessionStorage.getItem("session_id") || crypto.randomUUID(),
      user_agent: navigator.userAgent,
      device_type: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop",
      browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[0] || "Unknown",
      os: navigator.platform || "Unknown",
      source: document.referrer || window.location.href,
      completion_status: "clicked",
      ip_address: ipInfo.ip || null,
      country: ipInfo.country || null,
      vpn_proxy_flag: ipInfo.proxy || false,
      utm_params: utmParams,
      session_start: sessionStart,
      session_end: sessionStart,
    };
    if (type === "offer") payload.offer_id = item.id;
    else payload.survey_link_id = item.id;

    const { data: inserted } = await supabase.from("offer_clicks").insert(payload).select("id").single();
    if (inserted?.id) {
      const updateEnd = () => {
        const endTime = new Date().toISOString();
        const timeSpent = Math.round((Date.now() - new Date(sessionStart).getTime()) / 1000);
        supabase.from("offer_clicks").update({ session_end: endTime, time_spent: timeSpent }).eq("id", inserted.id).then(() => {});
      };
      window.addEventListener("beforeunload", updateEnd, { once: true });
      setTimeout(async () => {
        const endTime = new Date().toISOString();
        const timeSpent = Math.round((Date.now() - new Date(sessionStart).getTime()) / 1000);
        await supabase.from("offer_clicks").update({ session_end: endTime, time_spent: timeSpent }).eq("id", inserted.id);
      }, 30000);
    }
  };

  const handleStart = async (item: any, type: "survey" | "offer") => {
    await trackClick(item, type);
    const url = type === "offer" ? item.url : item.link;
    if (url) window.open(url, "_blank");
  };

  const deviceIcons = (device: string) => {
    const d = (device || "").toLowerCase();
    return (
      <div className="flex gap-0.5">
        {(d.includes("desktop") || d.includes("all") || !d) && <Monitor className="h-2.5 w-2.5 text-muted-foreground" />}
        {(d.includes("mobile") || d.includes("all") || !d) && <Smartphone className="h-2.5 w-2.5 text-muted-foreground" />}
        {(d.includes("tablet") || d.includes("all")) && <Tablet className="h-2.5 w-2.5 text-muted-foreground" />}
      </div>
    );
  };

  // Featured Tasks = survey_links (single link providers)
  const featuredTasks = [...surveys, ...offers];

  return (
    <div className="space-y-4">
      {/* Featured Tasks - compact cards like EarnLab */}
      <div>
        <h2 className="text-lg font-bold">Featured Tasks</h2>
        <p className="text-xs text-muted-foreground">Featured tasks are the best tasks to complete, with the highest rewards</p>
      </div>

      {featuredTasks.length === 0 ? (
        <p className="text-muted-foreground text-xs text-center py-6">No featured tasks available. Check back later!</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {featuredTasks.map((item) => {
            const isOffer = 'title' in item && 'url' in item && !('link' in item);
            const name = isOffer ? item.title : item.name;
            const payout = item.payout;
            const imgUrl = item.image_url;

            return (
              <Card
                key={item.id}
                className="hover:border-primary/50 transition-all cursor-pointer group overflow-hidden border-0"
                onClick={() => { setSelected(item); setSelectedType(isOffer ? "offer" : "survey"); }}
              >
                <CardContent className="p-0">
                  {imgUrl ? (
                    <div className="aspect-[4/3] bg-accent overflow-hidden">
                      <img src={imgUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                      <span className="text-xl font-bold text-primary/40">{(name || "?")[0]}</span>
                    </div>
                  )}
                  <div className="p-1.5">
                    <p className="font-medium text-[10px] truncate">{name}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{item.description || item.content || "Complete to earn"}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-primary font-bold text-[10px]">
                        $ {Number(payout || 0).toFixed(2)}
                      </span>
                      {deviceIcons(item.device || item.devices || "")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Offer Walls = survey_providers (iframes) */}
      {providers.length > 0 && (
        <>
          <div className="mt-4">
            <h2 className="text-lg font-bold">Offer Walls</h2>
            <p className="text-xs text-muted-foreground">Each offer wall contains hundreds of offers to complete</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {providers.map((p) => (
              <Card key={p.id} className="hover:border-primary/50 transition-colors cursor-pointer border-0 relative">
                <CardContent className="p-3 text-center">
                  {p.point_percentage > 100 && (
                    <Badge className="absolute top-1 right-1 text-[8px] px-1 py-0 bg-primary/90">+{p.point_percentage - 100}%</Badge>
                  )}
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-10 object-contain mb-1.5" />
                  ) : (
                    <div className="h-10 flex items-center justify-center mb-1.5">
                      <span className="text-sm font-bold text-primary/60">{p.name[0]}</span>
                    </div>
                  )}
                  <p className="font-medium text-[10px] truncate">{p.name}</p>
                  {p.level && p.level > 0 && (
                    <p className="text-[8px] text-muted-foreground">Level {p.level}+</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {featuredTasks.length === 0 && providers.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-xs">No tasks available. Check back later!</CardContent></Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Task Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {selected.image_url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-accent">
                    <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary/40">{(selected.title || selected.name || "?")[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-bold">{selected.title || selected.name}</h3>
                  <p className="text-primary font-bold text-sm">
                    {selectedType === "offer" ? `${selected.currency || "$"} ${selected.payout}` : `${selected.payout} pts`}
                  </p>
                  <div className="mt-0.5">{deviceIcons(selected.device || selected.devices || "")}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {selectedType === "offer" && (
                  <>
                    {selected.offer_id && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Offer ID</p><p className="text-xs font-medium">{selected.offer_id}</p></div>}
                    {selected.payout_model && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Model</p><p className="text-xs font-medium">{selected.payout_model}</p></div>}
                    {selected.countries && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Countries</p><p className="text-xs font-medium">{selected.countries}</p></div>}
                    {selected.platform && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Platform</p><p className="text-xs font-medium">{selected.platform}</p></div>}
                  </>
                )}
                {selectedType === "survey" && (
                  <>
                    {selected.country && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Country</p><p className="text-xs font-medium">{selected.country}</p></div>}
                    {selected.level && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Level</p><p className="text-xs font-medium">{selected.level}</p></div>}
                    {selected.rating > 0 && <div className="bg-accent/50 rounded-md p-2"><p className="text-[9px] text-muted-foreground">Rating</p><p className="text-xs font-medium">⭐ {selected.rating}</p></div>}
                  </>
                )}
              </div>

              {(selected.description || selected.content) && (
                <div className="bg-accent/30 rounded-md p-2 text-xs">{selected.description || selected.content}</div>
              )}

              <Button className="w-full h-8 text-xs" onClick={() => handleStart(selected, selectedType)}
                style={selected.button_gradient ? { background: selected.button_gradient } : undefined}>
                <ExternalLink className="h-3 w-3 mr-1.5" />
                {selected.button_text || "Start Task"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DailySurveys;
