import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Monitor, Smartphone, Tablet, Send, MessageCircle, X } from "lucide-react";
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
  const TASKS_PER_ROW = 7;
  const WALLS_PER_ROW = 7;
  const visibleTasks = showAllTasks ? featuredTasks : featuredTasks.slice(0, TASKS_PER_ROW);
  const visibleWalls = showAllWalls ? surveyProviders : surveyProviders.slice(0, WALLS_PER_ROW);

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
    <div className="space-y-4">
      {/* Live Activity Ticker - full width */}
      <ActivityTicker userId={profile.id} />

      {/* Featured Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold">Featured Tasks</h2>
            <p className="text-xs text-muted-foreground">Featured tasks are the best tasks to complete, with the highest rewards</p>
          </div>
          {featuredTasks.length > TASKS_PER_ROW && (
            <Button variant="link" size="sm" className="text-xs text-primary" onClick={() => setShowAllTasks(!showAllTasks)}>
              {showAllTasks ? "Show Less" : "View All"}
            </Button>
          )}
        </div>

        {featuredTasks.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-6">No featured tasks available. Check back later!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {visibleTasks.map((item) => {
              const isOffer = "title" in item && "url" in item && !("link" in item);
              const name = isOffer ? item.title : item.name;
              const payout = item.payout;
              const imgUrl = item.image_url;

              return (
                <Link key={item.id} to={isOffer ? "/dashboard/offers" : "/dashboard/daily-surveys"}>
                  <Card className="overflow-hidden hover:border-primary/50 transition-all cursor-pointer group border-0">
                    <CardContent className="p-0">
                      {imgUrl ? (
                        <div className="aspect-square bg-accent overflow-hidden">
                          <img src={imgUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary/40">{(name || "?")[0]}</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="font-semibold text-xs truncate">{name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.description || item.content || "Complete to earn"}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-primary font-bold text-xs">$ {Number(payout || 0).toFixed(2)}</span>
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

      {/* Offer Walls */}
      {surveyProviders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold">Offer Walls</h2>
              <p className="text-xs text-muted-foreground">Each offer wall contains hundreds of offers to complete</p>
            </div>
            {surveyProviders.length > WALLS_PER_ROW && (
              <Button variant="link" size="sm" className="text-xs text-primary" onClick={() => setShowAllWalls(!showAllWalls)}>
                {showAllWalls ? "Show Less" : "View All"}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {visibleWalls.map((p) => (
              <Link key={p.id} to="/dashboard/daily-surveys">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer border-0 relative">
                <CardContent className="p-4 text-center">
                  {p.point_percentage > 100 && (
                    <Badge className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 bg-primary/90 text-primary-foreground">+{p.point_percentage - 100}%</Badge>
                  )}
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-12 object-contain mb-2" />
                  ) : (
                    <div className="h-12 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-primary/60">{p.name[0]}</span>
                    </div>
                  )}
                  <p className="font-medium text-xs truncate">{p.name}</p>
                  {p.level && p.level > 0 && (
                    <p className="text-[9px] text-muted-foreground">Level {p.level}+</p>
                  )}
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
        className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground p-2.5 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
      >
        {chatOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
      </button>

      {chatOpen && (
        <div className="fixed bottom-16 right-5 z-50 w-72 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 bg-primary/10 border-b border-border flex items-center justify-between">
            <h3 className="text-[10px] font-semibold flex items-center gap-1"><MessageCircle className="h-3 w-3 text-primary" /> Live Chat</h3>
            <button onClick={() => setChatOpen(false)}><X className="h-3 w-3 text-muted-foreground" /></button>
          </div>
          <div className="h-48 overflow-y-auto p-2 space-y-1">
            {chatMessages.length === 0 ? (
              <p className="text-muted-foreground text-[9px] text-center py-6">No messages yet</p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className={`text-[10px] p-1 rounded ${m.is_admin ? "bg-primary/15" : "bg-accent/50"}`}>
                  <span className="font-medium">{m.is_admin ? "Admin" : "You"}</span>: {m.message}
                </div>
              ))
            )}
          </div>
          <div className="p-1.5 border-t border-border flex gap-1">
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type..." className="h-6 text-[10px]" onKeyDown={(e) => e.key === "Enter" && sendChat()} />
            <Button onClick={sendChat} size="sm" className="h-6 w-6 p-0"><Send className="h-2.5 w-2.5" /></Button>
          </div>
          <p className="text-[8px] text-muted-foreground px-2 pb-1">
            {profile.free_messages_remaining > 0 ? `${profile.free_messages_remaining} free left` : "1 pt/msg"}
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
