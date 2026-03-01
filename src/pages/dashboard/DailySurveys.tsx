import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Monitor, Smartphone, Tablet, ExternalLink, Star, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import OfferWallIframe from "@/components/OfferWallIframe";

const DailySurveys = () => {
  const { profile } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
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

  const trackClick = async (item: any, type: "survey" | "offer" | "provider", providerId?: string) => {
    if (!profile) return;
    const ipInfo = await fetchIpInfo();
    const utmParams: Record<string, string> = {};
    const urlParams = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(k => {
      const v = urlParams.get(k);
      if (v) utmParams[k] = v;
    });
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
    else if (type === "survey") payload.survey_link_id = item.id;
    else if (type === "provider") payload.provider_id = providerId;

    await supabase.from("offer_clicks").insert(payload).select("id").single();
  };

  const handleStart = async (item: any, type: "survey" | "offer") => {
    await trackClick(item, type);
    const url = type === "offer" ? item.url : item.link;
    if (url) window.open(url, "_blank");
  };

  const handleOpenProvider = async (provider: any) => {
    await trackClick(provider, "provider", provider.id);
    if (provider.iframe_url || provider.iframe_code) {
      setSelectedProvider(provider);
    } else {
      const url = provider.external_url || provider.url;
      if (url) window.open(url, "_blank");
    }
  };

  const deviceIcons = (device: string) => {
    const d = (device || "").toLowerCase();
    return (
      <div className="flex gap-0.5">
        {(d.includes("desktop") || d.includes("all") || !d) && <Monitor className="h-3 w-3 text-muted-foreground" />}
        {(d.includes("mobile") || d.includes("all") || !d) && <Smartphone className="h-3 w-3 text-muted-foreground" />}
        {(d.includes("tablet") || d.includes("all")) && <Tablet className="h-3 w-3 text-muted-foreground" />}
      </div>
    );
  };

  const getImageUrl = (title: string, existingUrl?: string) => {
    if (existingUrl && existingUrl.startsWith('http')) return existingUrl;
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/200/150.jpg`;
  };

  const featuredTasks = [...surveys, ...offers];

  return (
    <div className="space-y-6">
      {/* Featured Tasks */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Featured Tasks</h2>
        <p className="text-xs text-muted-foreground mb-4">Featured tasks are the best tasks to complete, with the highest rewards</p>
      </div>

      {featuredTasks.length === 0 ? (
        <p className="text-muted-foreground text-xs text-center py-6">No featured tasks available.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {featuredTasks.map((item) => {
            const isOffer = 'title' in item && 'url' in item && !('link' in item);
            const name = isOffer ? item.title : item.name;
            const payout = item.payout;
            const imgUrl = getImageUrl(name, item.image_url);

            return (
              <Card
                key={item.id}
                className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group overflow-hidden"
                onClick={() => { setSelected(item); setSelectedType(isOffer ? "offer" : "survey"); }}
              >
                <CardContent className="p-0">
                  <div className="aspect-square bg-accent overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/fallback/200/200.jpg`; }}
                    />
                  </div>
                  <div className="p-2">
                    <p className="font-semibold text-xs text-foreground truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.description || item.content || "Complete to earn"}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-bold text-xs">$ {Number(payout || 0).toFixed(2)}</span>
                      {deviceIcons(item.device || item.devices || "")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Offer Walls - EarnLab Style Grid */}
      {providers.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-foreground">Offer Walls</h2>
          <p className="text-xs text-muted-foreground mb-4">Each offer wall contains hundreds of offers to complete</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {providers.map((p) => (
              <Card
                key={p.id}
                className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => handleOpenProvider(p)}
              >
                <CardContent className="p-4 flex flex-col items-center text-center">
                  {p.point_percentage > 100 && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      +{p.point_percentage - 100}%
                    </div>
                  )}

                  <div className="w-16 h-16 rounded-xl bg-accent border border-border flex items-center justify-center mb-3 overflow-hidden group-hover:scale-105 transition-transform">
                    {p.image_url ? (
                      <img
                        src={getImageUrl(p.name, p.image_url)}
                        alt={p.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-xl font-bold text-primary">{p.name[0]}</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-xs text-foreground line-clamp-2">{p.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {featuredTasks.length === 0 && providers.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-xs">No tasks available.</CardContent></Card>
      )}

      {/* Task Details Dialog */}
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
                  <div className="w-16 h-16 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary">{(selected.title || selected.name || "?")[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-bold">{selected.title || selected.name}</h3>
                  <p className="text-primary font-bold text-sm">$ {Number(selected.payout || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selected.description || selected.content || "Complete this task to earn rewards"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => { handleStart(selected, selectedType); setSelected(null); }}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Start Task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Provider Iframe Dialog */}
      <Dialog open={!!selectedProvider} onOpenChange={(v) => !v && setSelectedProvider(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{selectedProvider?.name}</DialogTitle></DialogHeader>
          {selectedProvider && (
            <div className="h-[70vh]">
              <OfferWallIframe provider={selectedProvider} isOpen={!!selectedProvider} onClose={() => setSelectedProvider(null)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailySurveys;
