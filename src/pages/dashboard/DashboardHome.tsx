import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Monitor, Smartphone, Tablet, Send, MessageCircle, X, Star, Network, ChevronRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import ActivityTicker from "@/components/ActivityTicker";

const DashboardHome = () => {
  const { profile, user } = useAuth();
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllWalls, setShowAllWalls] = useState(false);

  useEffect(() => {
    if (!profile) return;
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveyProviders(data || []));
    supabase.from("survey_links").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveyLinks(data || []));
    // Only fetch active offers for featured tasks
    supabase.from("offers").select("*").eq("status", "active").eq("is_deleted", false).order("created_at", { ascending: false }).then(({ data }) => setOffers(data || []));
  }, [profile]);

  const loadChat = async () => {
    const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(50);
    setChatMessages((data || []).reverse());
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !profile) return;
    if (profile.free_messages_remaining <= 0 && profile.points < 1) {
      toast({ title: "No credits", description: "You need points to send messages", variant: "destructive" });
      return;
    }
    await supabase.from("chat_messages").insert({ user_id: profile.id, message: chatInput.trim() });
    if (profile.free_messages_remaining > 0) {
      await supabase.from("profiles").update({ free_messages_remaining: profile.free_messages_remaining - 1 }).eq("id", profile.id);
    } else {
      await supabase.from("profiles").update({ points: profile.points - 1 }).eq("id", profile.id);
    }
    setChatInput("");
    loadChat();
  };

  if (!profile) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  // Separate boosted offers (with percent > 0)
  const boostedOffers = offers.filter(o => o.percent && o.percent > 0);
  const featuredTasks = [...surveyLinks, ...offers];
  const TASKS_LIMIT = 7;
  const WALLS_LIMIT = 6;
  const visibleTasks = showAllTasks ? featuredTasks : featuredTasks.slice(0, TASKS_LIMIT);
  const visibleWalls = showAllWalls ? surveyProviders : surveyProviders.slice(0, WALLS_LIMIT);

  const getImageUrl = (title: string, existingUrl?: string) => {
    if (existingUrl && existingUrl.startsWith('http')) return existingUrl;
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/200/150.jpg`;
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

  return (
    <div className="space-y-6 pb-20">
      {/* Activity Ticker */}
      <ActivityTicker userId={profile.id} />

      {/* Featured Tasks - EarnLab Style */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Featured Tasks</h2>
            <p className="text-xs text-muted-foreground">Featured tasks are the best tasks to complete, with the highest rewards</p>
          </div>
          {featuredTasks.length > TASKS_LIMIT && (
            <Button variant="link" className="text-primary text-sm p-0 h-auto" onClick={() => setShowAllTasks(!showAllTasks)}>
              {showAllTasks ? "Show Less" : "View All"}
            </Button>
          )}
        </div>

        {featuredTasks.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No featured tasks available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {visibleTasks.map((item) => {
              const isOffer = "title" in item && "url" in item && !("link" in item);
              const name = isOffer ? item.title : item.name;
              const payout = item.payout;
              const imgUrl = getImageUrl(name, item.image_url);
              return (
                <Link key={item.id} to={isOffer ? "/dashboard/offers" : "/dashboard/daily-surveys"}>
                  <Card className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group overflow-hidden h-full">
                    <CardContent className="p-0">
                      {/* Image */}
                      <div className="aspect-square bg-accent overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/fallback/200/200.jpg`; }}
                        />
                      </div>
                      {/* Info */}
                      <div className="p-2">
                        <h3 className="font-semibold text-xs text-foreground truncate">{name}</h3>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {item.description || item.content || "Complete to earn"}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-primary font-bold text-xs">
                            $ {Number(payout || 0).toFixed(2)}
                          </span>
                          {deviceIcons(item.device || item.devices || "")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Offer Walls Section - CoinLooty Style Design */}
      {surveyProviders.length > 0 && (
        <>
          <div className="mt-4">
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
                {surveyProviders.length} Networks
              </Badge>
            </div>
          </div>

          {/* EarnLab Style OfferWalls */}
          {!showAllWalls && surveyProviders.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {surveyProviders.slice(0, 12).map((p, index) => {
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
                      // Handle offer wall click - open in new tab
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
                onClick={() => setShowAllWalls(true)}
                className="relative w-[180px] h-[140px] bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-[12px] p-4 cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:border-purple-500/30 flex flex-col items-center justify-center"
              >
                <ChevronRight className="h-8 w-8 text-gray-300 mb-2" />
                <span className="text-white font-semibold text-[16px] text-center">View All</span>
                <span className="text-gray-400 text-xs text-center">+{surveyProviders.length - 12} more</span>
                
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none"></div>
              </div>
            </div>
          ) : (
            /* Grid View for All Offer Walls */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {surveyProviders.map((p, index) => {
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
          {showAllWalls && (
            <div className="mt-4 text-center">
              <Button 
                onClick={() => setShowAllWalls(false)}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2 rounded-lg"
              >
                Show Less
              </Button>
            </div>
          )}

        </>
      )}

      {/* Floating Chat */}
      <button
        onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) loadChat(); }}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
      >
        {chatOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {chatOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 bg-accent border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Live Chat
            </h3>
            <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-64 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className={`text-sm p-2 rounded-lg ${m.is_admin ? "bg-primary/20" : "bg-accent"}`}>
                  <span className="font-medium text-primary">{m.is_admin ? "Admin" : "You"}</span>: {m.message}
                </div>
              ))
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type your message..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
            />
            <Button onClick={sendChat} size="sm" className="p-2">
              <Send className="h-3 w-3" />
            </Button>
          </div>
          <div className="px-3 pb-3">
            <p className="text-xs text-muted-foreground">
              {profile.free_messages_remaining > 0 ? `${profile.free_messages_remaining} free messages left` : "1 point per message"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
