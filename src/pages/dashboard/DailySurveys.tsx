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

    // Different tracking based on type
    if (type === "offer") {
      payload.offer_id = item.id;
    } else if (type === "survey") {
      payload.survey_link_id = item.id;
    } else if (type === "provider") {
      payload.provider_id = providerId;
    }

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

  /**
   * Handle opening offerwall provider
   * First tries iframe, falls back to new tab if iframe fails
   */
  const handleOpenProvider = async (provider: any) => {
    await trackClick(provider, "provider", provider.id);
    
    // If provider has iframe_url or iframe_code, use iframe modal
    // Otherwise open in new tab
    if (provider.iframe_url || provider.iframe_code) {
      setSelectedProvider(provider);
    } else {
      // Fallback: open in new tab
      const url = provider.external_url || provider.url;
      if (url) window.open(url, "_blank");
    }
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

  // API image integration function
  const getImageUrl = (title: string, existingUrl?: string) => {
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    // Use a placeholder API for better image quality
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/200/150.jpg`;
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

      {/* Offer Walls - CoinLooty Style Design */}
      {providers.length > 0 && (
        <>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Network className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Offer Walls</h2>
                  <p className="text-sm text-gray-400">Premium offer networks with hundreds of tasks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal Scroll Layout - CoinLooty Style */}
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max" style={{ scrollSnapType: 'x mandatory' }}>

              {providers.map((p, index) => {

                // Define different gradient colors for each card
                const gradients = [
                  'from-purple-600/30 via-purple-800/20 to-purple-900/30',
                  'from-blue-600/30 via-blue-800/20 to-blue-900/30',
                  'from-green-600/30 via-green-800/20 to-green-900/30',
                  'from-red-600/30 via-red-800/20 to-red-900/30',
                  'from-yellow-600/30 via-yellow-800/20 to-yellow-900/30',
                  'from-pink-600/30 via-pink-800/20 to-pink-900/30',
                  'from-indigo-600/30 via-indigo-800/20 to-indigo-900/30',
                  'from-teal-600/30 via-teal-800/20 to-teal-900/30',
                  'from-orange-600/30 via-orange-800/20 to-orange-900/30',
                  'from-cyan-600/30 via-cyan-800/20 to-cyan-900/30',
                ];

                const borderColors = [
                  'border-purple-400/80',
                  'border-blue-400/80',
                  'border-green-400/80',
                  'border-red-400/80',
                  'border-yellow-400/80',
                  'border-pink-400/80',
                  'border-indigo-400/80',
                  'border-teal-400/80',
                  'border-orange-400/80',
                  'border-cyan-400/80',
                ];

                const shadowColors = [
                  'hover:shadow-purple-500/40',
                  'hover:shadow-blue-500/40',
                  'hover:shadow-green-500/40',
                  'hover:shadow-red-500/40',
                  'hover:shadow-yellow-500/40',
                  'hover:shadow-pink-500/40',
                  'hover:shadow-indigo-500/40',
                  'hover:shadow-teal-500/40',
                  'hover:shadow-orange-500/40',
                  'hover:shadow-cyan-500/40',
                ];

                const currentGradient = gradients[index % gradients.length];
                const currentBorder = borderColors[index % borderColors.length];
                const currentShadow = shadowColors[index % shadowColors.length];

                return (

                <div key={p.id} className="flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>

                  <Card className={`w-32 h-48 bg-gradient-to-br ${currentGradient} border-4 ${currentBorder} rounded-2xl cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl ${currentShadow} backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40`}

                    onClick={() => {
                      console.log("Provider clicked:", p.name);
                      handleOpenProvider(p);
                    }}

                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleOpenProvider(p);
                      }
                    }}>

                    {/* Gradient Overlay with transparency */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none"></div>
                    
                    {/* Inner shadow for thickness effect */}
                    <div className="absolute inset-0 rounded-2xl shadow-inner shadow-black/30 pointer-events-none"></div>

                    <CardContent className="p-3 h-full flex flex-col items-center justify-between text-center relative z-10">

                      {/* Bonus Badge */}
                      {p.point_percentage > 100 && (

                        <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs px-2 py-1 rounded-full border-0 shadow-lg">

                          +{p.point_percentage - 100}%

                        </div>

                      )}

                      {/* Provider Logo */}
                      <div className="flex-1 flex flex-col items-center justify-center">

                        {p.image_url ? (

                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentGradient.replace('/30', '/40')} p-1 mb-2 group-hover:scale-110 transition-transform duration-300 border-2 ${currentBorder} shadow-xl shadow-black/30`}>

                            <img 

                              src={getImageUrl(p.name, p.image_url)} 

                              alt={p.name} 

                              className="w-full h-full object-contain rounded-lg"

                              onError={(e) => {

                                e.currentTarget.src = `https://picsum.photos/seed/provider/48/48.jpg`;

                              }}

                            />

                          </div>

                        ) : (

                          <div className={`w-12 h-12 bg-gradient-to-br ${currentGradient.replace('/30', '/60')} rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 ${currentBorder} shadow-xl shadow-black/30`}>

                            <span className="text-lg font-bold text-white">{p.name[0]}</span>

                          </div>

                        )}

                        {/* Provider Name */}
                        <h3 className="font-semibold text-white text-xs mb-1 line-clamp-2 leading-tight">{p.name}</h3>

                        {/* Level Badge */}
                        {p.level && p.level > 0 && (

                          <div className={`text-xs bg-gradient-to-r ${currentGradient.replace('/30', '/50')} text-white px-2 py-0.5 rounded-full border ${currentBorder}`}>

                            Level {p.level}+

                          </div>

                        )}

                      </div>

                      {/* Star Rating */}
                      <div className="flex items-center gap-0.5 mb-1">

                        {[...Array(5)].map((_, i) => (

                          <Star 

                            key={i} 

                            className={`h-2.5 w-2.5 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 

                          />

                        ))}

                      </div>

                    </CardContent>

                  </Card>

                </div>

                );
              })}

            </div>

          </div>

        </>
      )}

      {featuredTasks.length === 0 && providers.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-xs">No tasks available. Check back later!</CardContent></Card>
      )}

      {/* Featured Task Details Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md pointer-events-auto">
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

      {/* Offerwall Provider iframe Modal */}
      {selectedProvider && (
        <OfferWallIframe
          provider={selectedProvider}
          isOpen={!!selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onframeLoad={() => {
            // Optional: Do something when iframe loads
            console.log(`Iframe loaded: ${selectedProvider.name}`);
          }}
          onFrameError={() => {
            // If iframe fails, offer alternative
            console.error(`Iframe failed: ${selectedProvider.name}`);
            // Optionally auto-open in new tab on error
            // const url = selectedProvider.external_url || selectedProvider.url;
            // if (url) window.open(url, "_blank");
          }}
        />
      )}
    </div>
  );
};
export default DailySurveys;
