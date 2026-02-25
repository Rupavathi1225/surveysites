import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Search, Globe, Filter, Zap, Clock, Network } from "lucide-react";

const Offers = () => {
  const { profile } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});

  useEffect(() => {
    console.log("Offers page loading...");
    
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false })
      .then(({ data, error }) => {
        console.log("Providers loaded:", data?.length, "error:", error);
        setProviders(data || []);
      });
    
    // Fetch only active offers - exclude deleted and inactive offers
    const fetchOffers = async () => {
      try {
        const { data, error } = await supabase
          .from("offers")
          .select("*")
          .eq("is_deleted", false)
          .eq("status", "active")
          .order("created_at", { ascending: false }) as any;
        
        console.log("Offers response:", data?.length, "error:", error);
        
        if (error) {
          console.error("Offers error details:", JSON.stringify(error));
        }
        
        setOffers(data || []);
      } catch (err) {
        console.error("Offers fetch exception:", err);
        setOffers([]);
      }
    };
    
    fetchOffers();
  }, []);

  // Timer for boosted offers
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const newTimeLeft: Record<string, number> = {};
      
      offers.forEach(offer => {
        if (offer.expiry_date && new Date(offer.expiry_date).getTime() > now) {
          newTimeLeft[offer.id] = new Date(offer.expiry_date).getTime() - now;
        }
      });
      
      setTimeLeft(newTimeLeft);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [offers]);

  const formatTimeLeft = (ms: number): string => {
    if (ms <= 0) return "Expired";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m ${seconds}s`;
  };

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

  const trackClick = async (offer: any) => {
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
    const { data: inserted } = await supabase.from("offer_clicks").insert({
      user_id: profile.id, offer_id: offer.id,
      session_id: sessionStorage.getItem("session_id") || crypto.randomUUID(),
      user_agent: navigator.userAgent,
      device_type: /Mobile|Android/i.test(navigator.userAgent) ? "mobile" : /Tablet|iPad/i.test(navigator.userAgent) ? "tablet" : "desktop",
      browser: navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[0] || "Unknown",
      os: navigator.platform || "Unknown",
      source: document.referrer || window.location.href,
      completion_status: "clicked",
      ip_address: ipInfo.ip || null, country: ipInfo.country || null,
      vpn_proxy_flag: ipInfo.proxy || false,
      utm_params: utmParams, session_start: sessionStart, session_end: sessionStart,
    }).select("id").single();

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

  const filtered = offers.filter(o => {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (countryFilter !== "all" && o.countries && !o.countries.toLowerCase().includes(countryFilter.toLowerCase())) return false;
    if (platformFilter !== "all" && o.platform && !o.platform.toLowerCase().includes(platformFilter.toLowerCase())) return false;
    if (deviceFilter !== "all" && o.device && !o.device.toLowerCase().includes(deviceFilter.toLowerCase())) return false;
    if (categoryFilter !== "all" && o.category && !o.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
    if (networkFilter !== "all" && o.network_id !== networkFilter) return false;
    return true;
  });

  // Separate boosted offers (with expiry_date and percent > 0)
  const allBoostedOffers = offers.filter(o => o.expiry_date && o.percent && o.percent > 0 && timeLeft[o.id] > 0);
  
  // Apply filters to boosted offers separately
  const filteredBoostedOffers = allBoostedOffers.filter(o => {
    if (search && !o.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (countryFilter !== "all" && o.countries && !o.countries.toLowerCase().includes(countryFilter.toLowerCase())) return false;
    if (platformFilter !== "all" && o.platform && !o.platform.toLowerCase().includes(platformFilter.toLowerCase())) return false;
    if (deviceFilter !== "all" && o.device && !o.device.toLowerCase().includes(deviceFilter.toLowerCase())) return false;
    if (categoryFilter !== "all" && o.category && !o.category.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
    if (networkFilter !== "all" && o.network_id !== networkFilter) return false;
    return true;
  });
  
  const regularOffers = filtered.filter(o => !o.expiry_date || !o.percent || o.percent === 0 || timeLeft[o.id] <= 0);

  const countries = [...new Set(offers.flatMap(o => (o.countries || "").split(",").map((c: string) => c.trim())).filter(Boolean))];
  const platforms = [...new Set(offers.map(o => o.platform).filter(Boolean))];
  const devices = [...new Set(offers.map(o => o.device).filter(Boolean))];
  const categories = [...new Set(offers.map(o => o.category).filter(Boolean))];
  const networks = [...new Set(offers.map(o => o.network_id).filter(Boolean))];

  const calculateBoostedPayout = (offer: any): number => {
    if (!offer.percent || offer.percent === 0) return Number(offer.payout) || 0;
    return (Number(offer.payout) || 0) * (1 + (Number(offer.percent) || 0) / 100);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Offers</h1>
        <p className="text-xs text-muted-foreground">
          Complete offers to earn rewards
          {networkFilter !== "all" && (
            <span className="ml-2 text-blue-600">
              (Filtered by network: <strong>{networkFilter}</strong>)
            </span>
          )}
        </p>
      </div>

      {/* Compact filters */}
      <Card className="border-0">
        <CardContent className="p-2 flex flex-col md:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search offers..." className="pl-8 h-7 text-xs" />
          </div>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-36 h-7 text-xs"><Globe className="h-3 w-3 mr-1" /><SelectValue placeholder="All Countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-36 h-7 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="All Platforms" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className="w-36 h-7 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="All Devices" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-7 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="w-36 h-7 text-xs"><Network className="h-3 w-3 mr-1" /><SelectValue placeholder="All Networks">{networkFilter !== "all" ? networkFilter : "All Networks"}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          {networkFilter !== "all" && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setNetworkFilter("all")}
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Boosted Offers Section */}
      {filteredBoostedOffers.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-600" />
              <h2 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Limited Time Offers!</h2>
              <Badge variant="outline" className="ml-auto border-yellow-500 text-yellow-700 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {filteredBoostedOffers.length} Active
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredBoostedOffers.map((o) => (
                <Card key={o.id} className="overflow-hidden hover:border-yellow-500/50 transition-colors border-yellow-500 border-2">
                  <CardContent className="p-0">
                    {o.image_url && (
                      <div className="h-24 bg-accent overflow-hidden relative">
                        <img src={o.image_url} alt={o.title} className="w-full h-full object-cover" />
                        <div className="absolute top-1 right-1 bg-yellow-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" /> +{o.percent}%
                        </div>
                      </div>
                    )}
                    <div className="p-2">
                      <h3 className="font-semibold text-xs truncate">{o.title}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="secondary" className="text-[8px] px-1 py-0">{o.payout_model || "CPA"}</Badge>
                        <Badge className="bg-yellow-500 text-white text-[8px] px-1 py-0">
                          ${calculateBoostedPayout(o).toFixed(2)}
                        </Badge>
                        {o.percent > 0 && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-yellow-500 text-yellow-700">
                            +{o.percent}%
                          </Badge>
                        )}
                      </div>
                      {o.countries && (
                        <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5 truncate">
                          <Globe className="h-2.5 w-2.5 shrink-0" /> {o.countries}
                        </p>
                      )}
                      {o.network_id && (
                        <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5 truncate">
                          <Network className="h-2.5 w-2.5 shrink-0" />
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-[9px] hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => setNetworkFilter(o.network_id)}
                          >
                            {o.network_id}
                          </Button>
                        </p>
                      )}
                      {timeLeft[o.id] > 0 && (
                        <div className="mt-1 text-[10px] text-red-600 font-medium flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTimeLeft(timeLeft[o.id])}
                        </div>
                      )}
                      {o.url && (
                        <Button className="mt-1.5 w-full h-6 text-[10px] bg-yellow-500 hover:bg-yellow-600" onClick={async () => { await trackClick(o); window.open(o.url, "_blank"); }}>
                          <ExternalLink className="h-2.5 w-2.5 mr-1" /> Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compact offer cards */}
      {regularOffers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {regularOffers.map((o) => (
            <Card key={o.id} className="overflow-hidden hover:border-primary/50 transition-colors border-0">
              <CardContent className="p-0">
                {o.image_url && (
                  <div className="h-24 bg-accent overflow-hidden">
                    <img src={o.image_url} alt={o.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-2">
                  <h3 className="font-semibold text-xs truncate">{o.title}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="secondary" className="text-[8px] px-1 py-0">{o.payout_model || "CPA"}</Badge>
                    <Badge className="bg-primary text-primary-foreground text-[8px] px-1 py-0">
                      ${Number(o.payout).toFixed(2)}
                    </Badge>
                  </div>
                  {o.countries && (
                    <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5 truncate">
                      <Globe className="h-2.5 w-2.5 shrink-0" /> {o.countries}
                    </p>
                  )}
                  {o.network_id && (
                    <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5 truncate">
                      <Network className="h-2.5 w-2.5 shrink-0" />
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-[9px] hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => setNetworkFilter(o.network_id)}
                      >
                        {o.network_id}
                      </Button>
                    </p>
                  )}
                  {o.url && (
                    <Button className="mt-1.5 w-full h-6 text-[10px]" onClick={async () => { await trackClick(o); window.open(o.url, "_blank"); }}>
                      <ExternalLink className="h-2.5 w-2.5 mr-1" /> Start
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compact Offer Walls */}
      {providers.length > 0 && (
        <>
          <h2 className="text-sm font-semibold mt-4">Offer Walls</h2>
          <p className="text-[10px] text-muted-foreground">Each offer wall contains hundreds of offers to complete</p>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {providers.map((p) => (
              <Card key={p.id} className="hover:border-primary/50 transition-colors border-0">
                <CardContent className="p-2.5 text-center">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-10 object-contain mb-1" />}
                  <h3 className="font-semibold text-[10px] truncate">{p.name}</h3>
                  {p.point_percentage > 100 && (
                    <Badge className="bg-primary/20 text-primary text-[8px] px-1 py-0 mt-0.5">+{p.point_percentage - 100}%</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && providers.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground text-xs">No offers available. Check back later!</CardContent></Card>
      )}
    </div>
  );
};
export default Offers;
