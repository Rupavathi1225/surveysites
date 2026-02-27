import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Search, Globe, Filter, Zap, Clock, Network, X } from "lucide-react";

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
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const openOfferModal = async (offer: any) => {
    setSelectedOffer(offer);
    setIsModalOpen(true);
    await trackClick(offer);
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

      {/* Boosted Offers Section - BadBoysAI Style */}
      {filteredBoostedOffers.length > 0 && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Limited Time Offers!</h2>
                <p className="text-xs text-gray-400">Exclusive boosted rewards</p>
              </div>
              <Badge className="ml-auto bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs border-0">
                <Clock className="h-3 w-3 mr-1" />
                {filteredBoostedOffers.length} Active
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredBoostedOffers.map((o) => (
                <Card key={o.id} className="overflow-hidden bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20 group relative backdrop-blur-sm rounded-xl">
                  <CardContent className="p-0">
                    {o.image_url && (
                      <div className="h-32 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden relative">
                        <img src={o.image_url} alt={o.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold shadow-lg">
                          <Zap className="h-3 w-3" /> +{o.percent}%
                        </div>
                      </div>
                    )}
                    <div className="p-4 bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-sm">
                      <h3 className="font-semibold text-sm text-white truncate mb-3 leading-tight">{o.title}</h3>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-md">
                          {o.payout_model || "CPA"}
                        </Badge>
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-3 py-1 rounded-md font-bold shadow-md">
                          ${calculateBoostedPayout(o).toFixed(2)}
                        </Badge>
                      </div>
                      {o.percent > 0 && (
                        <div className="mb-3">
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-md font-semibold">
                            +{o.percent}% Bonus
                          </Badge>
                        </div>
                      )}
                      <div className="space-y-2 mb-4">
                        {o.countries && (
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <Globe className="h-3 w-3 text-purple-400" /> {o.countries}
                          </p>
                        )}
                        {o.network_id && (
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <Network className="h-3 w-3 text-purple-400" />
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-xs hover:text-purple-400 text-purple-300 font-medium"
                              onClick={() => setNetworkFilter(o.network_id)}
                            >
                              {o.network_id}
                            </Button>
                          </p>
                        )}
                      </div>
                      {timeLeft[o.id] > 0 && (
                        <div className="mb-3 text-xs text-red-400 font-medium flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatTimeLeft(timeLeft[o.id])}
                        </div>
                      )}
                      {o.url && (
                        <Button 
                          className="w-full h-9 text-sm bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 border-0 rounded-lg" 
                          onClick={() => openOfferModal(o)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" /> Start Earning
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

      {/* Regular Offers Section - BadBoysAI Style */}
      {regularOffers.length > 0 && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Available Offers</h2>
                <p className="text-xs text-gray-400">Complete tasks to earn rewards</p>
              </div>
              <Badge className="ml-auto bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs border-0">
                {regularOffers.length} Available
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {regularOffers.map((o) => (
                <Card key={o.id} className="overflow-hidden bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20 group relative backdrop-blur-sm rounded-xl">
                  <CardContent className="p-0">
                    {o.image_url && (
                      <div className="h-32 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden relative">
                        <img src={o.image_url} alt={o.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                      </div>
                    )}
                    <div className="p-4 bg-gradient-to-b from-gray-800/95 to-gray-900/95 backdrop-blur-sm">
                      <h3 className="font-semibold text-sm text-white truncate mb-3 leading-tight">{o.title}</h3>
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-md">
                          {o.payout_model || "CPA"}
                        </Badge>
                        <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-3 py-1 rounded-md font-bold shadow-md">
                          ${Number(o.payout).toFixed(2)}
                        </Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        {o.countries && (
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <Globe className="h-3 w-3 text-purple-400" /> {o.countries}
                          </p>
                        )}
                        {o.network_id && (
                          <p className="text-xs text-gray-400 flex items-center gap-2">
                            <Network className="h-3 w-3 text-purple-400" />
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="h-auto p-0 text-xs hover:text-purple-400 text-purple-300 font-medium"
                              onClick={() => setNetworkFilter(o.network_id)}
                            >
                              {o.network_id}
                            </Button>
                          </p>
                        )}
                      </div>
                      {o.url && (
                        <Button 
                          className="w-full h-9 text-sm bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 border-0 rounded-lg" 
                          onClick={() => openOfferModal(o)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" /> Start Earning
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

      {/* Offer Walls Section - BadBoysAI Style */}
      {providers.length > 0 && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Network className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Offer Walls</h2>
                <p className="text-xs text-gray-400">Premium offer networks with hundreds of tasks</p>
              </div>
              <Badge className="ml-auto bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs border-0">
                {providers.length} Networks
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {providers.map((p) => (
                <Card key={p.id} className="bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/20 group relative backdrop-blur-sm rounded-xl">
                  <CardContent className="p-4 text-center">
                    {p.image_url && (
                      <div className="relative mb-3">
                        <img src={p.image_url} alt={p.name} className="w-full h-16 object-contain transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none rounded" />
                      </div>
                    )}
                    <h3 className="font-semibold text-sm text-white truncate mb-3 leading-tight">{p.name}</h3>
                    {p.point_percentage > 100 && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-3 py-1 rounded-md font-semibold shadow-md">
                        +{p.point_percentage - 100}% Bonus
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && providers.length === 0 && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No Offers Available</h3>
            <p className="text-sm text-gray-400">Check back later for new earning opportunities!</p>
          </CardContent>
        </Card>
      )}

      {/* Offer Modal - BadBoysAI Style */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-purple-500/30">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <ExternalLink className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    {selectedOffer?.title}
                  </DialogTitle>
                  <p className="text-sm text-gray-400">Complete this offer to earn rewards</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedOffer && (
            <div className="space-y-6">
              {/* Offer Header */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
                {selectedOffer.image_url && (
                  <img 
                    src={selectedOffer.image_url} 
                    alt={selectedOffer.title}
                    className="w-24 h-24 object-contain rounded-lg border border-purple-500/30 bg-gray-800/50"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-sm px-3 py-1">
                      {selectedOffer.payout_model || "CPA"}
                    </Badge>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm px-3 py-1 font-bold">
                      ${calculateBoostedPayout(selectedOffer).toFixed(2)}
                    </Badge>
                    {selectedOffer.percent > 0 && (
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm px-3 py-1 font-semibold">
                        +{selectedOffer.percent}% Bonus
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-gray-300">
                    {selectedOffer.countries && (
                      <p className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-400" />
                        <span className="text-white">{selectedOffer.countries}</span>
                      </p>
                    )}
                    {selectedOffer.platform && (
                      <p className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-purple-400" />
                        <span className="text-white">Platform: {selectedOffer.platform}</span>
                      </p>
                    )}
                    {selectedOffer.device && (
                      <p className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-purple-400" />
                        <span className="text-white">Device: {selectedOffer.device}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedOffer.description && (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-purple-400" />
                    Description
                  </h3>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {selectedOffer.description}
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-center">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-10 py-4 text-lg font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 border-0"
                  onClick={() => {
                    window.open(selectedOffer.url, "_blank");
                    setIsModalOpen(false);
                  }}
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Start Earning Now
                </Button>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-400" />
                    Offer Details
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p><span className="text-gray-500">Offer ID:</span> <span className="text-white">{selectedOffer.offer_id || "-"}</span></p>
                    <p><span className="text-gray-500">Network:</span> <span className="text-white">{selectedOffer.network_id || "-"}</span></p>
                    <p><span className="text-gray-500">Category:</span> <span className="text-white">{selectedOffer.category || "-"}</span></p>
                    <p><span className="text-gray-500">Vertical:</span> <span className="text-white">{selectedOffer.vertical || "-"}</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    Timing & Status
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    {timeLeft[selectedOffer.id] > 0 && (
                      <p className="flex items-center gap-2 text-red-400">
                        <Clock className="h-4 w-4" />
                        <span>Expires in: {formatTimeLeft(timeLeft[selectedOffer.id])}</span>
                      </p>
                    )}
                    <p><span className="text-gray-500">Created:</span> <span className="text-white">{selectedOffer.created_at ? new Date(selectedOffer.created_at).toLocaleDateString() : "-"}</span></p>
                    <p><span className="text-gray-500">Status:</span> <span className="text-green-400 font-medium">Active</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Offers;
