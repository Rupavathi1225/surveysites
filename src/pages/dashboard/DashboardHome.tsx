import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      {/* Offer Walls - EarnLab Style Grid */}
      {surveyProviders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Offer Walls</h2>
              <p className="text-xs text-muted-foreground">Each offer wall contains hundreds of offers to complete</p>
            </div>
            {surveyProviders.length > WALLS_LIMIT && (
              <Button variant="link" className="text-primary text-sm p-0 h-auto" onClick={() => setShowAllWalls(!showAllWalls)}>
                {showAllWalls ? "Show Less" : "View All"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {visibleWalls.map((p) => (
              <Link key={p.id} to="/dashboard/daily-surveys">
                <Card className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    {/* Bonus badge */}
                    {p.point_percentage > 100 && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        +{p.point_percentage - 100}%
                      </div>
                    )}

                    {/* Logo */}
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

                    {/* Name */}
                    <h3 className="font-semibold text-xs text-foreground line-clamp-2">{p.name}</h3>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
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
