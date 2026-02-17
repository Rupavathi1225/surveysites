import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign, Star, Lock, TrendingUp, Users, Gift, ClipboardList,
  Wallet, ArrowLeftRight, Copy, CheckCircle, AlertCircle, Send, MessageCircle, X,
  Activity, UserPlus, LogIn, Tag, CreditCard, Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import ActivityTicker from "@/components/ActivityTicker";

const DashboardHome = () => {
  const { profile, user } = useAuth();
  const [lastCredited, setLastCredited] = useState<any[]>([]);
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("earning_history").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setLastCredited(data || []));
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveyProviders(data || []));
    supabase.from("survey_links").select("*").eq("status", "active").then(({ data }) => setSurveyLinks(data || []));
    supabase.from("notifications").select("*").lte("created_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(15).then(({ data }) => setActivityFeed(data || []));

    const channel = supabase.channel("activity-feed").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
      setActivityFeed((prev) => [payload.new as any, ...prev].slice(0, 15));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
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

  const referralLink = profile ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "";
  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  if (!profile) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  const walletCards = [
    { icon: DollarSign, label: "Cash", value: `$${Number(profile.cash_balance).toFixed(2)}`, color: "text-primary" },
    { icon: Star, label: "Points", value: profile.points.toString(), color: "text-info" },
    { icon: Lock, label: "Locked", value: profile.locked_points.toString(), color: "text-muted-foreground" },
    { icon: TrendingUp, label: "Payouts", value: "$0.00", color: "text-success" },
    { icon: Users, label: "Referrals", value: "0", color: "text-info" },
    { icon: Gift, label: "Ref. Earn", value: "$0.00", color: "text-primary" },
  ];

  return (
    <div className="space-y-3">
      <ActivityTicker />

      {/* Welcome - compact */}
      <Card className="border-0 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold">Welcome, <span className="text-primary">{profile.first_name || profile.username}</span></h1>
            <p className="text-muted-foreground text-[10px]">
              Since {new Date(profile.created_at).toLocaleDateString()} {" "}
              {profile.is_verified ? (
                <span className="inline-flex items-center gap-0.5 text-success"><CheckCircle className="h-2.5 w-2.5" /> Verified</span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-warning"><AlertCircle className="h-2.5 w-2.5" /> Unverified</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-primary text-lg font-bold">${Number(profile.cash_balance).toFixed(2)}</p>
            <Link to="/dashboard/withdrawal"><Button size="sm" className="h-6 text-[10px] px-2">Withdraw</Button></Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - compact */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { icon: ClipboardList, label: "Surveys", to: "/dashboard/daily-surveys", bg: "bg-info" },
          { icon: Gift, label: "Offers", to: "/dashboard/offers", bg: "bg-success" },
          { icon: Wallet, label: "Withdraw", to: "/dashboard/withdrawal", bg: "bg-primary" },
          { icon: ArrowLeftRight, label: "Convert", to: "/dashboard/convert-points", bg: "bg-warning" },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer border-0">
              <CardContent className="p-2 flex flex-col items-center text-center gap-1">
                <div className={`${action.bg} p-1.5 rounded-full`}>
                  <action.icon className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Wallet Summary - compact inline */}
      <div className="grid grid-cols-6 gap-1.5">
        {walletCards.map((card) => (
          <Card key={card.label} className="border-0">
            <CardContent className="p-2 flex items-center gap-1.5">
              <card.icon className={`h-3 w-3 ${card.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground truncate">{card.label}</p>
                <p className={`text-xs font-bold ${card.color}`}>{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Recommended Offerwalls - compact */}
        <Card className="border-0">
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold mb-0.5">Recommended Offerwalls</h3>
            <p className="text-[9px] text-muted-foreground mb-2">Complete offers to earn points</p>
            {surveyProviders.length === 0 ? (
              <p className="text-muted-foreground text-[10px] text-center py-3">No offerwalls available</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {surveyProviders.slice(0, 6).map((p) => (
                  <div key={p.id} className="p-2 rounded-md bg-accent/40 hover:bg-accent/60 transition-colors cursor-pointer text-center">
                    <p className="font-medium text-[10px] truncate">{p.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Surveys - compact */}
        <Card className="border-0">
          <CardContent className="p-3">
            <h3 className="text-xs font-semibold mb-0.5">Daily Surveys</h3>
            <p className="text-[9px] text-muted-foreground mb-2">Complete surveys to earn quick points</p>
            {surveyLinks.length === 0 ? (
              <p className="text-muted-foreground text-[10px] text-center py-3">No surveys available</p>
            ) : (
              <div className="space-y-1">
                {surveyLinks.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-1.5 rounded-md bg-accent/40">
                    <p className="font-medium text-[10px] truncate">{s.name}</p>
                    <span className="text-primary font-bold text-[10px] shrink-0">{s.payout} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refer & Earn - compact */}
      <Card className="border-0 bg-gradient-to-r from-success/10 to-transparent">
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <div className="shrink-0">
            <h3 className="text-xs font-semibold flex items-center gap-1"><Gift className="h-3 w-3 text-success" /> Refer & Earn</h3>
            <p className="text-[9px] text-muted-foreground">Share & earn when friends join</p>
          </div>
          <div className="flex items-center gap-1.5 flex-1 max-w-xs">
            <Input value={referralLink} readOnly className="h-6 text-[9px] bg-accent/50" />
            <Button onClick={copyReferral} size="sm" variant="outline" className="h-6 w-6 p-0 shrink-0"><Copy className="h-2.5 w-2.5" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Credited - compact */}
      <Card className="border-0">
        <CardContent className="p-3">
          <h3 className="text-xs font-semibold mb-2">Last Credited</h3>
          {lastCredited.length === 0 ? (
            <p className="text-muted-foreground text-[10px] text-center py-3">No earnings yet</p>
          ) : (
            <div className="space-y-1">
              {lastCredited.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-1.5 bg-accent/40 rounded-md">
                  <div className="min-w-0">
                    <p className="font-medium text-[10px] truncate">{e.description || e.offer_name}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-success font-bold text-[10px]">+{e.amount} pts</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Activity - compact */}
      <Card className="border-0">
        <CardContent className="p-3">
          <h3 className="text-xs font-semibold flex items-center gap-1 mb-2"><Activity className="h-3 w-3 text-primary" /> Live Activity</h3>
          {activityFeed.length === 0 ? (
            <p className="text-muted-foreground text-[10px] text-center py-3">No activity yet</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {activityFeed.map((n) => {
                const iconMap: Record<string, any> = { signup: UserPlus, login: LogIn, promo: Tag, offer: Gift, payment: CreditCard, chat: MessageCircle };
                const Icon = iconMap[n.type] || Bell;
                return (
                  <div key={n.id} className="flex items-start gap-2 p-1.5 bg-accent/40 rounded-md">
                    <Icon className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px]">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
