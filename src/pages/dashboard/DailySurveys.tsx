import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Monitor, Smartphone, Tablet, ExternalLink } from "lucide-react";

const DailySurveys = () => {
  const { profile } = useAuth();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"survey" | "offer">("survey");

  useEffect(() => {
    supabase.from("survey_links").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveys(data || []));
    supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => setOffers(data || []));
  }, []);

  const trackClick = async (item: any, type: "survey" | "offer") => {
    if (!profile) return;
    const payload: any = {
      user_id: profile.id,
      session_id: sessionStorage.getItem("login_log_id") || crypto.randomUUID(),
      user_agent: navigator.userAgent,
      device_type: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop",
      browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[0] || "Unknown",
      os: navigator.platform || "Unknown",
      source: document.referrer || "direct",
      completion_status: "clicked",
    };
    if (type === "offer") payload.offer_id = item.id;
    else payload.survey_link_id = item.id;
    await supabase.from("offer_clicks").insert(payload);
  };

  const openDetail = (item: any, type: "survey" | "offer") => {
    setSelected(item);
    setSelectedType(type);
  };

  const handleStart = async (item: any, type: "survey" | "offer") => {
    await trackClick(item, type);
    const url = type === "offer" ? item.url : item.link;
    if (url) window.open(url, "_blank");
  };

  const deviceIcons = (device: string) => {
    const d = (device || "").toLowerCase();
    return (
      <div className="flex gap-1">
        {(d.includes("desktop") || d.includes("all") || !d) && <Monitor className="h-4 w-4" />}
        {(d.includes("mobile") || d.includes("all") || !d) && <Smartphone className="h-4 w-4" />}
        {(d.includes("tablet") || d.includes("all")) && <Tablet className="h-4 w-4" />}
      </div>
    );
  };

  const allItems = [
    ...offers.map(o => ({ ...o, _type: "offer" as const })),
    ...surveys.map(s => ({ ...s, _type: "survey" as const })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Featured Tasks</h1>
        <p className="text-muted-foreground">Featured tasks are the best tasks to complete, with the highest rewards</p>
      </div>

      {allItems.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No tasks available. Check back later!</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {allItems.map((item) => (
            <Card
              key={item.id}
              className="hover:border-primary/50 transition-all cursor-pointer group overflow-hidden"
              onClick={() => openDetail(item, item._type)}
            >
              <CardContent className="p-0">
                {item.image_url ? (
                  <div className="aspect-square bg-accent overflow-hidden">
                    <img src={item.image_url} alt={item.title || item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary/40">{(item.title || item.name || "?")[0]}</span>
                  </div>
                )}
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{item.title || item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description || item.content || "Complete to earn"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-primary font-bold text-sm">
                      {item._type === "offer" ? `${item.currency || "$"} ${item.payout}` : `${item.payout} pts`}
                    </span>
                    {deviceIcons(item.device || item.devices || "")}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {selected.image_url ? (
                  <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-accent">
                    <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-primary/40">{(selected.title || selected.name || "?")[0]}</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{selected.title || selected.name}</h3>
                  <p className="text-primary font-bold text-lg">
                    {selectedType === "offer" ? `${selected.currency || "$"} ${selected.payout}` : `${selected.payout} pts`}
                  </p>
                  <div className="mt-1">{deviceIcons(selected.device || selected.devices || "")}</div>
                </div>
              </div>

              {/* All available fields */}
              <div className="grid grid-cols-2 gap-3">
                {selectedType === "offer" && (
                  <>
                    {selected.offer_id && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Offer ID</p><p className="text-sm font-medium">{selected.offer_id}</p></div>}
                    {selected.payout_model && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Payout Model</p><p className="text-sm font-medium">{selected.payout_model}</p></div>}
                    {selected.currency && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Currency</p><p className="text-sm font-medium">{selected.currency}</p></div>}
                    {selected.vertical && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Category</p><p className="text-sm font-medium">{selected.vertical}</p></div>}
                    {selected.countries && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Countries</p><p className="text-sm font-medium">{selected.countries}</p></div>}
                    {selected.allowed_countries && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Allowed Countries</p><p className="text-sm font-medium">{selected.allowed_countries}</p></div>}
                    {selected.platform && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Platform</p><p className="text-sm font-medium">{selected.platform}</p></div>}
                    {selected.device && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Device</p><p className="text-sm font-medium">{selected.device}</p></div>}
                    {selected.traffic_sources && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Traffic Sources</p><p className="text-sm font-medium">{selected.traffic_sources}</p></div>}
                    {selected.percent > 0 && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Percent</p><p className="text-sm font-medium">{selected.percent}%</p></div>}
                    {selected.expiry_date && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Expires</p><p className="text-sm font-medium">{new Date(selected.expiry_date).toLocaleDateString()}</p></div>}
                  </>
                )}
                {selectedType === "survey" && (
                  <>
                    {selected.country && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Country</p><p className="text-sm font-medium">{selected.country}</p></div>}
                    {selected.level && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Level</p><p className="text-sm font-medium">{selected.level}</p></div>}
                    {selected.rating > 0 && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Rating</p><p className="text-sm font-medium">⭐ {selected.rating}</p></div>}
                    {selected.is_recommended && <div className="bg-accent/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Status</p><p className="text-sm font-medium">⭐ Recommended</p></div>}
                  </>
                )}
              </div>

              {/* Description */}
              {(selected.description || selected.content) && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Description</h4>
                  <div className="bg-accent/30 rounded-lg p-3 text-sm">
                    {selected.description || selected.content}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => handleStart(selected, selectedType)}
                style={selected.button_gradient ? { background: selected.button_gradient } : undefined}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {selected.button_text || "Sign Up"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DailySurveys;
