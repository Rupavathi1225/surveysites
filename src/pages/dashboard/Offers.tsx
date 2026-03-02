import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Search, Globe, Filter, Zap, Clock, Network, X, Star, Monitor, Smartphone, Tablet, ChevronRight } from "lucide-react";

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
  const [showAllBoostedOffers, setShowAllBoostedOffers] = useState(false);
  const [showAllRegularOffers, setShowAllRegularOffers] = useState(false);
  const [showAllOfferWalls, setShowAllOfferWalls] = useState(false);

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

  // API image integration function
  const getImageUrl = (title: string, existingUrl?: string) => {
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    // Use a placeholder API for better image quality
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/200/150.jpg`;
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
            {/* CoinLooty Style Cards */}
            {!showAllBoostedOffers && filteredBoostedOffers.length > 10 ? (
              <div className="flex gap-1 overflow-hidden items-start">
                {filteredBoostedOffers.slice(0, 10).map((o, index) => {
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

                  // Platform icon mapping
                  const getPlatformIcon = (platform?: string) => {
                    switch (platform?.toLowerCase()) {
                      case 'desktop':
                      case 'pc':
                        return Monitor;
                      case 'mobile':
                      case 'android':
                      case 'ios':
                        return Smartphone;
                      case 'tablet':
                      case 'ipad':
                        return Tablet;
                      default:
                        return Monitor;
                    }
                  };

                  const PlatformIcon = getPlatformIcon(o.platform);

                  return (
                    <Card key={o.id} className={`w-40 h-56 bg-gradient-to-br ${currentGradient} border-4 ${currentBorder} rounded-2xl cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl ${currentShadow} backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40 flex-shrink-0`}
                      onClick={() => openOfferModal(o)}>

                      {/* Gradient Overlay with transparency */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none"></div>
                      
                      {/* Inner shadow for thickness effect */}
                      <div className="absolute inset-0 rounded-2xl shadow-inner shadow-black/30 pointer-events-none"></div>

                      {/* Boost Badge */}
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full border-0 shadow-lg flex items-center gap-1">
                        <Zap className="h-3 w-3" /> +{o.percent}%
                      </div>

                      <CardContent className="p-3 h-full flex flex-col text-center relative z-10">

                        {/* Offer Image */}
                        <div className="relative mb-3">
                          {o.image_url ? (
                            <div className="w-full h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                              <img 
                                src={getImageUrl(o.title, o.image_url)} 
                                alt={o.title} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  e.currentTarget.src = `https://picsum.photos/seed/offer/160/80.jpg`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-20 rounded-xl bg-gradient-to-br ${currentGradient.replace('/30', '/60')} flex items-center justify-center`}>
                              <span className="text-2xl font-bold text-white">{o.title?.[0] || 'O'}</span>
                            </div>
                          )}
                        </div>

                        {/* Offer Title */}
                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-tight">{o.title}</h3>

                        {/* Subtitle */}
                        <p className="text-xs text-gray-300 mb-2 line-clamp-1">{o.description || 'Complete this boosted offer to earn extra rewards'}</p>

                        {/* Payout */}
                        <div className="mb-2">
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-0">
                            ${calculateBoostedPayout(o).toFixed(2)}
                          </Badge>
                        </div>

                        {/* Platform Icons */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className={`flex items-center gap-1 text-xs ${currentBorder.replace('border-', 'text-').replace('/80', '/60')}`}>
                            <PlatformIcon className="h-3 w-3" />
                            <span>{o.platform || 'Desktop'}</span>
                          </div>
                          {o.device && (
                            <div className={`flex items-center gap-1 text-xs ${currentBorder.replace('border-', 'text-').replace('/80', '/60')}`}>
                              <Monitor className="h-3 w-3" />
                              <span>{o.device}</span>
                            </div>
                          )}
                        </div>

                        {/* Countries */}
                        {o.countries && (
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-2">
                            <Globe className="h-3 w-3" />
                            <span>{o.countries.split(',')[0]}</span>
                          </div>
                        )}

                        {/* Time Left */}
                        {timeLeft[o.id] > 0 && (
                          <div className="flex items-center justify-center gap-1 text-xs text-red-400 mb-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeLeft(timeLeft[o.id])}</span>
                          </div>
                        )}

                        {/* Start Button */}
                        <div className="mt-auto">
                          <Button 
                            className="w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 border-0 rounded-lg" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openOfferModal(o);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Start
                          </Button>
                        </div>

                      </CardContent>

                    </Card>
                  );
                })}
                
                {/* Show More Button */}
                <Button 
                  onClick={() => setShowAllBoostedOffers(true)}
                  className="w-40 h-56 bg-gradient-to-br from-gray-700/30 to-gray-800/30 border-4 border-gray-600/80 rounded-2xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-500/40 backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40 flex flex-col items-center justify-center gap-3 flex-shrink-0"
                >
                  <ChevronRight className="h-8 w-8 text-gray-300" />
                  <span className="text-white font-bold">Show All</span>
                  <span className="text-gray-300 text-sm">+{filteredBoostedOffers.length - 10} more</span>
                </Button>
              </div>
            ) : (
              /* Grid View for All Boosted Offers */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 items-start">
                {filteredBoostedOffers.map((o, index) => {
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

                  // Platform icon mapping
                  const getPlatformIcon = (platform?: string) => {
                    switch (platform?.toLowerCase()) {
                      case 'desktop':
                      case 'pc':
                        return Monitor;
                      case 'mobile':
                      case 'android':
                      case 'ios':
                        return Smartphone;
                      case 'tablet':
                      case 'ipad':
                        return Tablet;
                      default:
                        return Monitor;
                    }
                  };

                  const PlatformIcon = getPlatformIcon(o.platform);

                  return (
                    <Card key={o.id} className={`w-40 h-56 bg-gradient-to-br ${currentGradient} border-4 ${currentBorder} rounded-2xl cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl ${currentShadow} backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40`}
                      onClick={() => openOfferModal(o)}>

                      {/* Gradient Overlay with transparency */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none"></div>
                      
                      {/* Inner shadow for thickness effect */}
                      <div className="absolute inset-0 rounded-2xl shadow-inner shadow-black/30 pointer-events-none"></div>

                      {/* Boost Badge */}
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full border-0 shadow-lg flex items-center gap-1">
                        <Zap className="h-3 w-3" /> +{o.percent}%
                      </div>

                      <CardContent className="p-3 h-full flex flex-col text-center relative z-10">

                        {/* Offer Image */}
                        <div className="relative mb-3">
                          {o.image_url ? (
                            <div className="w-full h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                              <img 
                                src={getImageUrl(o.title, o.image_url)} 
                                alt={o.title} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  e.currentTarget.src = `https://picsum.photos/seed/offer/160/80.jpg`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-20 rounded-xl bg-gradient-to-br ${currentGradient.replace('/30', '/60')} flex items-center justify-center`}>
                              <span className="text-2xl font-bold text-white">{o.title?.[0] || 'O'}</span>
                            </div>
                          )}
                        </div>

                        {/* Offer Title */}
                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-tight">{o.title}</h3>

                        {/* Subtitle */}
                        <p className="text-xs text-gray-300 mb-2 line-clamp-1">{o.description || 'Complete this boosted offer to earn extra rewards'}</p>

                        {/* Payout */}
                        <div className="mb-2">
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-0">
                            ${calculateBoostedPayout(o).toFixed(2)}
                          </Badge>
                        </div>

                        {/* Platform Icons */}
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className={`flex items-center gap-1 text-xs ${currentBorder.replace('border-', 'text-').replace('/80', '/60')}`}>
                            <PlatformIcon className="h-3 w-3" />
                            <span>{o.platform || 'Desktop'}</span>
                          </div>
                          {o.device && (
                            <div className={`flex items-center gap-1 text-xs ${currentBorder.replace('border-', 'text-').replace('/80', '/60')}`}>
                              <Monitor className="h-3 w-3" />
                              <span>{o.device}</span>
                            </div>
                          )}
                        </div>

                        {/* Countries */}
                        {o.countries && (
                          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mb-2">
                            <Globe className="h-3 w-3" />
                            <span>{o.countries.split(',')[0]}</span>
                          </div>
                        )}

                        {/* Time Left */}
                        {timeLeft[o.id] > 0 && (
                          <div className="flex items-center justify-center gap-1 text-xs text-red-400 mb-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimeLeft(timeLeft[o.id])}</span>
                          </div>
                        )}

                        {/* Start Button */}
                        <div className="mt-auto">
                          <Button 
                            className="w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 border-0 rounded-lg" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openOfferModal(o);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Start
                          </Button>
                        </div>

                      </CardContent>

                    </Card>
                  );
                })}
              </div>
            )}

            {/* Show Less Button */}
            {showAllBoostedOffers && (
              <div className="mt-4 text-center">
                <Button 
                  onClick={() => setShowAllBoostedOffers(false)}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2 rounded-lg"
                >
                  Show Less
                </Button>
              </div>
            )}
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
            {/* CoinLooty Style Cards */}
                        {!showAllRegularOffers && regularOffers.length > 0 ? (
              <div className="flex gap-1 overflow-x-auto items-start scrollbar-hide">
                {regularOffers.slice(0, 10).map((o, index) => {
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

                  // Platform icon mapping
                  const getPlatformIcon = (platform?: string) => {
                    switch (platform?.toLowerCase()) {
                      case 'desktop':
                      case 'pc':
                        return Monitor;
                      case 'mobile':
                      case 'android':
                      case 'ios':
                        return Smartphone;
                      case 'tablet':
                      case 'ipad':
                        return Tablet;
                      default:
                        return Monitor;
                    }
                  };

                  const PlatformIcon = getPlatformIcon(o.platform);

                  return (
                    <Card key={o.id} className={`w-40 h-56 bg-gradient-to-br ${currentGradient} border-4 ${currentBorder} rounded-2xl cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl ${currentShadow} backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40 flex-shrink-0`}
                      onClick={() => openOfferModal(o)}>

                      {/* Gradient Overlay with transparency */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none"></div>
                      
                      {/* Inner shadow for thickness effect */}
                      <div className="absolute inset-0 rounded-2xl shadow-inner shadow-black/30 pointer-events-none"></div>

                      <CardContent className="p-3 h-full flex flex-col text-center relative z-10">

                        {/* Offer Image */}
                        <div className="relative mb-3">
                          {o.image_url ? (
                            <div className="w-full h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                              <img 
                                src={getImageUrl(o.title, o.image_url)} 
                                alt={o.title} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  e.currentTarget.src = `https://picsum.photos/seed/offer/160/80.jpg`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-20 rounded-xl bg-gradient-to-br ${currentGradient.replace('/30', '/60')} flex items-center justify-center`}>
                              <span className="text-2xl font-bold text-white">{o.title?.[0] || 'O'}</span>
                            </div>
                          )}
                        </div>

                        {/* Offer Title */}
                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-tight">{o.title}</h3>

                        {/* Subtitle */}
                        <p className="text-xs text-gray-300 mb-2 line-clamp-1">{o.description || 'Complete this offer to earn rewards'}</p>

                        {/* Payout */}
                        <div className="mb-2">
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-0">
                            ${Number(o.payout).toFixed(2)}
                          </Badge>
                        </div>

                        {/* Start Button */}
                        <div className="mt-auto">
                          <Button 
                            className="w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 border-0 rounded-lg" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openOfferModal(o);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Start
                          </Button>
                        </div>

                      </CardContent>

                    </Card>
                  );
                })}
                {/* Show More Button */}
                <Button 
                  onClick={() => setShowAllRegularOffers(true)}
                  className="w-40 h-56 bg-gradient-to-br from-gray-700/30 to-gray-800/30 border-4 border-gray-600/80 rounded-2xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-500/40 backdrop-blur-sm relative overflow-hidden opacity-100 shadow-2xl shadow-black/40 flex flex-col items-center justify-center gap-3 flex-shrink-0 z-50"
                >
                  <ChevronRight className="h-8 w-8 text-gray-300" />
                  <span className="text-white font-bold">Show All</span>
                  <span className="text-gray-300 text-sm">+{regularOffers.length - 10} more</span>
                </Button>
              </div>
            ) : (
              /* Grid View for All Regular Offers */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0.5 items-start">
                {regularOffers.map((o, index) => {
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

                  // Platform icon mapping
                  const getPlatformIcon = (platform?: string) => {
                    switch (platform?.toLowerCase()) {
                      case 'desktop':
                      case 'pc':
                        return Monitor;
                      case 'mobile':
                      case 'android':
                      case 'ios':
                        return Smartphone;
                      case 'tablet':
                      case 'ipad':
                        return Tablet;
                      default:
                        return Monitor;
                    }
                  };

                  const PlatformIcon = getPlatformIcon(o.platform);

                  return (
                    <Card key={o.id} className={`w-40 h-56 bg-gradient-to-br ${currentGradient} border-4 ${currentBorder} rounded-2xl cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl ${currentShadow} backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40`}
                      onClick={() => openOfferModal(o)}>

                      {/* Gradient Overlay with transparency */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none"></div>
                      
                      {/* Inner shadow for thickness effect */}
                      <div className="absolute inset-0 rounded-2xl shadow-inner shadow-black/30 pointer-events-none"></div>

                      <CardContent className="p-3 h-full flex flex-col text-center relative z-10">

                        {/* Offer Image */}
                        <div className="relative mb-3">
                          {o.image_url ? (
                            <div className="w-full h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                              <img 
                                src={getImageUrl(o.title, o.image_url)} 
                                alt={o.title} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                onError={(e) => {
                                  e.currentTarget.src = `https://picsum.photos/seed/offer/160/80.jpg`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-20 rounded-xl bg-gradient-to-br ${currentGradient.replace('/30', '/60')} flex items-center justify-center`}>
                              <span className="text-2xl font-bold text-white">{o.title?.[0] || 'O'}</span>
                            </div>
                          )}
                        </div>

                        {/* Offer Title */}
                        <h3 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-tight">{o.title}</h3>

                        {/* Subtitle */}
                        <p className="text-xs text-gray-300 mb-2 line-clamp-1">{o.description || 'Complete this offer to earn rewards'}</p>

                        {/* Payout */}
                        <div className="mb-2">
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-0">
                            ${Number(o.payout).toFixed(2)}
                          </Badge>
                        </div>

                        {/* Start Button */}
                        <div className="mt-auto">
                          <Button 
                            className="w-full h-8 text-xs bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30 border-0 rounded-lg" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openOfferModal(o);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Start
                          </Button>
                        </div>

                      </CardContent>

                    </Card>
                  );
                })}
              </div>
            )}

            </CardContent>
        </Card>
      )}

        {/* Show Less Button */}
        {showAllRegularOffers && (
          <div className="text-center relative z-50">
            <Button 
              onClick={() => setShowAllRegularOffers(false)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-lg shadow-lg"
            >
              Show Less
            </Button>
          </div>
        )}

      {/* Offer Walls Section - CoinLooty Style Design */}
      {providers.length > 0 && (
        <>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Network className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Offer Walls</h2>
                  <p className="text-sm text-gray-400">Premium offer networks with hundreds of tasks</p>
                </div>
              </div>
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs border-0">
                {providers.length} Networks
              </Badge>
            </div>
          </div>

          {/* EarnLab Style OfferWalls */}
                    {!showAllOfferWalls && providers.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {providers.slice(0, 12).map((p, index) => {
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
                  <div 
                    key={p.id}
                    className="relative w-[180px] h-[140px] bg-black border-2 border-gray-600 rounded-[12px] p-4 cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30"
                    onClick={() => {
                      // Handle offer wall click - open in new tab or iframe
                      if (p.iframe_url || p.iframe_code) {
                        window.open(p.iframe_url || '#', '_blank');
                      } else if (p.url) {
                        window.open(p.url, '_blank');
                      }
                    }}
                  >
                    {/* Bonus Badge */}
                    {p.point_percentage > 100 && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs px-2 py-1 rounded-full border-0 shadow-lg z-10">
                        +{p.point_percentage - 100}%
                      </div>
                    )}

                    {/* Provider Logo and Name - EarnLab Style */}
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      {p.image_url ? (
                        <img 
                          src={getImageUrl(p.name, p.image_url)} 
                          alt={p.name} 
                          className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to provider-specific logos
                            const providerLogos: Record<string, string> = {
                              'Freecash': 'https://freecash.com/logo.png',
                              'AdGate': 'https://cdn.adgate-media.com/offerwall-logo.png',
                              'Adscend': 'https://www.adscendmedia.com/logo.png',
                              'CPAGrip': 'https://cpagrip.com/logo.png',
                              'Notik': 'https://notik.me/logo.png',
                              'RevenueUniverse': 'https://revenueuniverse.com/logo.png',
                              'Timewall': 'https://timewall.com/logo.png',
                              'BitLabs': 'https://bitlabs.io/logo.png',
                              'AyetStudios': 'https://ayetstudios.com/logo.png',
                              'FusionCash': 'https://fusioncash.com/logo.png',
                              'OfferToro': 'https://offertoro.com/logo.png',
                              'RevenueWall': 'https://revenuewall.com/logo.png',
                              'AdWorkMedia': 'https://adworkmedia.com/logo.png',
                              'KiwiWall': 'https://kiwiwall.com/logo.png',
                              'MyLead': 'https://mylead.com/logo.png',
                              'SuperRewards': 'https://superrewards.com/logo.png',
                              'RewardingWays': 'https://rewardingways.com/logo.png',
                              'CPXResearch': 'https://cpxresearch.com/logo.png',
                              'Heypiggy': 'https://heypiggy.com/logo.png',
                              'PeanutLabs': 'https://peanutlabs.com/logo.png',
                              'incarese': 'https://incarese.com/logo.png',
                              'AdGem': 'https://adgem.com/logo.png',
                              'CPALead': 'https://cpalead.com/logo.png',
                              'MonuMatic': 'https://monumate.com/logo.png',
                              'RevU': 'https://revu.com/logo.png',
                              'AdWork': 'https://adwork.com/logo.png',
                              'CPABuild': 'https://cpabuild.com/logo.png',
                              'AdShift': 'https://adshift.com/logo.png',
                              'RevenueJet': 'https://revenuejet.com/logo.png',
                              'CPALocker': 'https://cpalocker.com/logo.png',
                              'AdCapital': 'https://adcapital.com/logo.png',
                              'CPAStrike': 'https://cpastrike.com/logo.png',
                              'AdVerse': 'https://adverse.com/logo.png',
                              'RevenueGiant': 'https://revenuegiant.com/logo.png',
                              'CPAFusion': 'https://cpafusion.com/logo.png',
                              'AdPrime': 'https://adprime.com/logo.png',
                              'RevenueFlow': 'https://revenueflow.com/logo.png',
                              'CPAEvolution': 'https://cpaevolution.com/logo.png',
                              'AdCore': 'https://adcore.com/logo.png',
                              'RevenueZen': 'https://revenuezen.com/logo.png',
                              'CPAEpic': 'https://cpaepic.com/logo.png',
                              'AdNova': 'https://adnova.com/logo.png',
                              'RevenuePeak': 'https://revenuepeak.com/logo.png',
                              'CPAVelocity': 'https://cpavelocity.com/logo.png',
                              'AdVortex': 'https://advortex.com/logo.png',
                              'RevenueSurge': 'https://revenuesurge.com/logo.png',
                              'CPAFury': 'https://cpafury.com/logo.png',
                              'AdEclipse': 'https://adeclipse.com/logo.png',
                              'RevenueWave': 'https://revenuewave.com/logo.png',
                              'CPALegend': 'https://cpalegend.com/logo.png',
                              'AdCosmos': 'https://adcosmos.com/logo.png',
                              'RevenueNova': 'https://revenuenova.com/logo.png',
                              'CPANebula': 'https://cpanebula.com/logo.png',
                              'AdStellar': 'https://adstellar.com/logo.png',
                              'RevenueComet': 'https://revenuecomet.com/logo.png',
                              'CPAInfinity': 'https://cpainfinity.com/logo.png',
                              'AdInfinity': 'https://adinfinity.com/logo.png',
                              'RevenueEternal': 'https://revenueeternal.com/logo.png',
                              'CPACosmos': 'https://cpacosmos.com/logo.png',
                              'AdUniverse': 'https://aduniverse.com/logo.png',
                              'RevenueGalaxy': 'https://revenuegalaxy.com/logo.png',
                              'CPAOmega': 'https://cpaomega.com/logo.png'
                            };
                            e.currentTarget.src = providerLogos[p.name] || `https://picsum.photos/seed/provider/80/80.jpg`;
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-bold text-white">{p.name[0]}</span>
                      )}

                                          </div>

                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
                  </div>
                );
              })}
              
              {/* Show More Button */}
              <div 
                onClick={() => setShowAllOfferWalls(true)}
                className="relative w-[180px] h-[140px] bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-[12px] p-4 cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30 flex flex-col items-center justify-center"
              >
                <ChevronRight className="h-8 w-8 text-gray-300 mb-2" />
                <span className="text-white font-semibold text-[16px] text-center">View All</span>
                <span className="text-gray-400 text-xs text-center">+{providers.length - 12} more</span>
                
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
              </div>
            </div>
          ) : (
            /* Grid View for All Offer Walls */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
                  <div 
                    key={p.id}
                    className="relative w-[180px] h-[140px] bg-black border-2 border-gray-600 rounded-[12px] p-4 cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30"
                    onClick={() => {
                      // Handle offer wall click - open in new tab or iframe
                      if (p.iframe_url || p.iframe_code) {
                        window.open(p.iframe_url || '#', '_blank');
                      } else if (p.url) {
                        window.open(p.url, '_blank');
                      }
                    }}
                  >
                    {/* Bonus Badge */}
                    {p.point_percentage > 100 && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs px-2 py-1 rounded-full border-0 shadow-lg z-10">
                        +{p.point_percentage - 100}%
                      </div>
                    )}

                    {/* Provider Logo and Name - EarnLab Style */}
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      {p.image_url ? (
                        <img 
                          src={getImageUrl(p.name, p.image_url)} 
                          alt={p.name} 
                          className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback to provider-specific logos
                            const providerLogos: Record<string, string> = {
                              'Freecash': 'https://freecash.com/logo.png',
                              'AdGate': 'https://cdn.adgate-media.com/offerwall-logo.png',
                              'Adscend': 'https://www.adscendmedia.com/logo.png',
                              'CPAGrip': 'https://cpagrip.com/logo.png',
                              'Notik': 'https://notik.me/logo.png',
                              'RevenueUniverse': 'https://revenueuniverse.com/logo.png',
                              'Timewall': 'https://timewall.com/logo.png',
                              'BitLabs': 'https://bitlabs.io/logo.png',
                              'AyetStudios': 'https://ayetstudios.com/logo.png',
                              'FusionCash': 'https://fusioncash.com/logo.png',
                              'OfferToro': 'https://offertoro.com/logo.png',
                              'RevenueWall': 'https://revenuewall.com/logo.png',
                              'AdWorkMedia': 'https://adworkmedia.com/logo.png',
                              'KiwiWall': 'https://kiwiwall.com/logo.png',
                              'MyLead': 'https://mylead.com/logo.png',
                              'SuperRewards': 'https://superrewards.com/logo.png',
                              'RewardingWays': 'https://rewardingways.com/logo.png',
                              'CPXResearch': 'https://cpxresearch.com/logo.png',
                              'Heypiggy': 'https://heypiggy.com/logo.png',
                              'PeanutLabs': 'https://peanutlabs.com/logo.png',
                              'incarese': 'https://incarese.com/logo.png',
                              'AdGem': 'https://adgem.com/logo.png',
                              'CPALead': 'https://cpalead.com/logo.png',
                              'MonuMatic': 'https://monumate.com/logo.png',
                              'RevU': 'https://revu.com/logo.png',
                              'AdWork': 'https://adwork.com/logo.png',
                              'CPABuild': 'https://cpabuild.com/logo.png',
                              'AdShift': 'https://adshift.com/logo.png',
                              'RevenueJet': 'https://revenuejet.com/logo.png',
                              'CPALocker': 'https://cpalocker.com/logo.png',
                              'AdCapital': 'https://adcapital.com/logo.png',
                              'CPAStrike': 'https://cpastrike.com/logo.png',
                              'AdVerse': 'https://adverse.com/logo.png',
                              'RevenueGiant': 'https://revenuegiant.com/logo.png',
                              'CPAFusion': 'https://cpafusion.com/logo.png',
                              'AdPrime': 'https://adprime.com/logo.png',
                              'RevenueFlow': 'https://revenueflow.com/logo.png',
                              'CPAEvolution': 'https://cpaevolution.com/logo.png',
                              'AdCore': 'https://adcore.com/logo.png',
                              'RevenueZen': 'https://revenuezen.com/logo.png',
                              'CPAEpic': 'https://cpaepic.com/logo.png',
                              'AdNova': 'https://adnova.com/logo.png',
                              'RevenuePeak': 'https://revenuepeak.com/logo.png',
                              'CPAVelocity': 'https://cpavelocity.com/logo.png',
                              'AdVortex': 'https://advortex.com/logo.png',
                              'RevenueSurge': 'https://revenuesurge.com/logo.png',
                              'CPAFury': 'https://cpafury.com/logo.png',
                              'AdEclipse': 'https://adeclipse.com/logo.png',
                              'RevenueWave': 'https://revenuewave.com/logo.png',
                              'CPALegend': 'https://cpalegend.com/logo.png',
                              'AdCosmos': 'https://adcosmos.com/logo.png',
                              'RevenueNova': 'https://revenuenova.com/logo.png',
                              'CPANebula': 'https://cpanebula.com/logo.png',
                              'AdStellar': 'https://adstellar.com/logo.png',
                              'RevenueComet': 'https://revenuecomet.com/logo.png',
                              'CPAInfinity': 'https://cpainfinity.com/logo.png',
                              'AdInfinity': 'https://adinfinity.com/logo.png',
                              'RevenueEternal': 'https://revenueeternal.com/logo.png',
                              'CPACosmos': 'https://cpacosmos.com/logo.png',
                              'AdUniverse': 'https://aduniverse.com/logo.png',
                              'RevenueGalaxy': 'https://revenuegalaxy.com/logo.png',
                              'CPAOmega': 'https://cpaomega.com/logo.png'
                            };
                            e.currentTarget.src = providerLogos[p.name] || `https://picsum.photos/seed/provider/80/80.jpg`;
                          }}
                        />
                      ) : (
                        <span className="text-2xl font-bold text-white">{p.name[0]}</span>
                      )}

                                          </div>

                    {/* Subtle glow effect */}
                    <div className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show Less Button */}
          {showAllOfferWalls && (
            <div className="text-center">
              <Button 
                onClick={() => setShowAllOfferWalls(false)}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2 rounded-lg"
              >
                Show Less
              </Button>
            </div>
          )}

        </>
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
