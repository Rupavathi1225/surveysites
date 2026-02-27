import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";

import { Card, CardContent } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";

import { toast } from "@/hooks/use-toast";

import { Monitor, Smartphone, Tablet, Send, MessageCircle, X, Star, Network } from "lucide-react";

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

    supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => setOffers(data || []));

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



  const featuredTasks = [...surveyLinks, ...offers];

  const TASKS_PER_ROW = 6; // Reduced for larger cards

  const WALLS_PER_ROW = 6;  // Reduced for larger cards

  const visibleTasks = showAllTasks ? featuredTasks : featuredTasks.slice(0, TASKS_PER_ROW);

  const visibleWalls = showAllWalls ? surveyProviders : surveyProviders.slice(0, WALLS_PER_ROW);



  const deviceIcons = (device: string) => {

    const d = (device || "").toLowerCase();

    return (

      <div className="flex gap-1">

        {(d.includes("desktop") || d.includes("all") || !d) && <Monitor className="h-3 w-3 text-primary/70" />}

        {(d.includes("mobile") || d.includes("all") || !d) && <Smartphone className="h-3 w-3 text-primary/70" />}

        {(d.includes("tablet") || d.includes("all")) && <Tablet className="h-3 w-3 text-primary/70" />}

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



  return (

    <div className="space-y-8 p-6">

      {/* Live Activity Ticker - Premium Design */}

      <ActivityTicker userId={profile.id} />



      {/* Featured Tasks - Premium Design */}

      <div>

        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center gap-3">

            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">

              <Star className="h-4 w-4 text-white" />

            </div>

            <div>

              <h2 className="text-2xl font-bold text-gradient">Featured Tasks</h2>

              <p className="text-sm text-muted-foreground">Premium tasks with highest rewards</p>

            </div>

          </div>

          {featuredTasks.length > TASKS_PER_ROW && (

            <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => setShowAllTasks(!showAllTasks)}>

              {showAllTasks ? "Show Less" : "View All"}

            </Button>

          )}

        </div>

        {featuredTasks.length === 0 ? (

          <Card className="premium-card">

            <CardContent className="p-12 text-center">

              <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">

                <Star className="h-8 w-8 text-white" />

              </div>

              <h3 className="text-lg font-bold text-white mb-2">No Featured Tasks</h3>

              <p className="text-sm text-muted-foreground">Check back later for new earning opportunities!</p>

            </CardContent>

          </Card>

        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">

            {visibleTasks.map((item) => {

              const isOffer = "title" in item && "url" in item && !("link" in item);

              const name = isOffer ? item.title : item.name;

              const payout = item.payout;

              const imgUrl = getImageUrl(name, item.image_url);

              return (

                <Link key={item.id} to={isOffer ? "/dashboard/offers" : "/dashboard/daily-surveys"}>

                  <Card className="bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-500/20 group relative backdrop-blur-sm rounded-lg overflow-hidden">

                    <CardContent className="p-4 h-full flex flex-col">

                      {/* Image Section - Perfect Square */}

                      <div className="relative w-full aspect-square overflow-hidden rounded-lg mb-3">

                        {imgUrl ? (

                          <img 

                            src={imgUrl} 

                            alt={name} 

                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 

                            onError={(e) => {

                              e.currentTarget.src = `https://picsum.photos/seed/fallback/200/200.jpg`;

                            }}

                          />

                        ) : (

                          <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center">

                            <span className="text-2xl font-bold text-white/30">{(name || "?")[0]}</span>

                          </div>

                        )}

                      </div>

                      

                      {/* Content Section */}

                      <div className="flex-1 flex flex-col justify-between">

                        {/* Title and Description */}

                        <div className="mb-3">

                          <h3 className="font-semibold text-sm text-white mb-1 leading-tight text-center">

                            {name}

                          </h3>

                          <p className="text-xs text-gray-300 text-center line-clamp-2">

                            {item.description || item.content || "Complete this task to earn rewards"}

                          </p>

                        </div>

                        

                        {/* Payout Amount */}

                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">

                          <span className="text-white font-bold text-sm">

                            ${Number(payout || 0).toFixed(2)}

                          </span>

                          <div className="flex gap-1">

                            {(item.device || item.devices || "").toLowerCase().includes("desktop") && <Monitor className="h-4 w-4 text-white" />}

                            {(item.device || item.devices || "").toLowerCase().includes("mobile") && <Smartphone className="h-4 w-4 text-white" />}

                            {(item.device || item.devices || "").toLowerCase().includes("tablet") && <Tablet className="h-4 w-4 text-white" />}

                          </div>

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

      {/* Offer Walls - Premium Design */}

      {surveyProviders.length > 0 && (

        <div>

          <div className="flex items-center justify-between mb-6">

            <div className="flex items-center gap-3">

              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">

                <Network className="h-4 w-4 text-white" />

              </div>

              <div>

                <h2 className="text-2xl font-bold text-gradient">Offer Walls</h2>

                <p className="text-sm text-muted-foreground">Premium offer networks with hundreds of tasks</p>

              </div>

            </div>

            {surveyProviders.length > WALLS_PER_ROW && (

              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => setShowAllWalls(!showAllWalls)}>

                {showAllWalls ? "Show Less" : "View All"}

              </Button>

            )}

          </div>

          

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">

            {visibleWalls.map((p) => (

              <Link key={p.id} to="/dashboard/daily-surveys">

                <Card className="premium-card-small h-48 cursor-pointer group">

                  <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center relative">

                    {p.point_percentage > 100 && (

                      <Badge className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs border-0">

                        +{p.point_percentage - 100}%

                      </Badge>

                    )}

                    {p.image_url ? (

                      <img 

                        src={getImageUrl(p.name, p.image_url)} 

                        alt={p.name} 

                        className="w-16 h-16 object-contain mb-3 group-hover:scale-110 transition-transform duration-300"

                        onError={(e) => {

                          e.currentTarget.src = `https://picsum.photos/seed/provider/64/64.jpg`;

                        }}

                      />

                    ) : (

                      <div className="w-16 h-16 gradient-primary-subtle rounded-xl flex items-center justify-center mb-3">

                        <span className="text-xl font-bold text-primary">{p.name[0]}</span>

                      </div>

                    )}

                    <h3 className="font-semibold text-white text-sm mb-1 line-clamp-1">{p.name}</h3>

                    {p.level && p.level > 0 && (

                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">

                        Level {p.level}+

                      </Badge>

                    )}

                  </CardContent>

                </Card>

              </Link>

            ))}

          </div>

        </div>

      )}



      {/* Floating Chat - Enhanced Design */}

      <button

        onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) loadChat(); }}

        className="fixed bottom-6 right-6 z-50 gradient-primary text-white p-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"

      >

        {chatOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}

      </button>



      {chatOpen && (

        <div className="fixed bottom-20 right-6 z-50 w-80 premium-card overflow-hidden">

          <div className="p-3 gradient-primary-subtle border-b border-primary/20 flex items-center justify-between">

            <h3 className="text-sm font-semibold flex items-center gap-2 text-gradient">

              <MessageCircle className="h-4 w-4 text-primary" /> 

              Live Chat

            </h3>

            <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-white transition-colors">

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

                <div key={m.id} className={`text-sm p-2 rounded-lg ${m.is_admin ? "bg-primary/20 text-white" : "bg-accent/50 text-white"}`}>

                  <span className="font-medium text-primary">{m.is_admin ? "Admin" : "You"}</span>: {m.message}

                </div>

              ))

            )}

          </div>

          <div className="p-3 border-t border-primary/20 flex gap-2">

            <Input 

              value={chatInput} 

              onChange={(e) => setChatInput(e.target.value)} 

              placeholder="Type your message..." 

              className="bg-accent/50 border-primary/30 text-white placeholder:text-muted-foreground"

              onKeyDown={(e) => e.key === "Enter" && sendChat()} 

            />

            <Button onClick={sendChat} size="sm" className="gradient-primary text-white p-2">

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

