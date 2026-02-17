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

  const iconMap: Record<string, any> = { signup: UserPlus, login: LogIn, promo: Tag, offer: Gift, payment: CreditCard, chat: MessageCircle };

  return (
    <div className="space-y-1.5">
      {/* 1. Activity Ticker */}
      <ActivityTicker />

      {/* 2. Welcome row — name left, cash+withdraw right */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold">Hi, <span className="text-primary">{profile.first_name || profile.username}</span></span>
          {profile.is_verified ? <CheckCircle className="h-2.5 w-2.5 text-success" /> : <AlertCircle className="h-2.5 w-2.5 text-warning" />}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-muted-foreground">Cash Balance</span>
          <span className="text-primary text-xs font-bold">${Number(profile.cash_balance).toFixed(2)}</span>
          <span className="text-[9px] text-muted-foreground">Points</span>
          <span className="text-info text-xs font-bold">{profile.points}</span>
          <Link to="/dashboard/withdrawal"><Button size="sm" className="h-5 text-[8px] px-1.5 rounded">Withdraw</Button></Link>
        </div>
      </div>

      {/* 3. Quick Actions */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { icon: ClipboardList, label: "Surveys", to: "/dashboard/daily-surveys", bg: "bg-info" },
          { icon: Gift, label: "Offers", to: "/dashboard/offers", bg: "bg-success" },
          { icon: Wallet, label: "Withdraw", to: "/dashboard/withdrawal", bg: "bg-primary" },
          { icon: ArrowLeftRight, label: "Convert", to: "/dashboard/convert-points", bg: "bg-warning" },
        ].map((a) => (
          <Link key={a.to} to={a.to}>
            <div className="flex flex-col items-center gap-0.5 p-1 rounded-md hover:bg-accent/50 transition-colors cursor-pointer">
              <div className={`${a.bg} p-1 rounded-full`}>
                <a.icon className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
              <span className="text-[8px] font-medium">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 4. Wallet Summary */}
      <div className="grid grid-cols-6 gap-1">
        {walletCards.map((c) => (
          <div key={c.label} className="flex items-center gap-0.5 p-0.5 px-1 rounded bg-card border border-border/50">
            <c.icon className={`h-2 w-2 ${c.color} shrink-0`} />
            <div className="min-w-0">
              <p className="text-[7px] text-muted-foreground truncate leading-tight">{c.label}</p>
              <p className={`text-[9px] font-bold ${c.color} leading-tight`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Refer & Earn */}
      <div className="flex items-center gap-1.5 p-1.5 rounded bg-success/10 border border-success/20">
        <Gift className="h-2.5 w-2.5 text-success shrink-0" />
        <span className="text-[8px] font-semibold shrink-0">Refer & Earn</span>
        <Input value={referralLink} readOnly className="h-4 text-[7px] bg-accent/50 flex-1 min-w-0 px-1 py-0" />
        <Button onClick={copyReferral} size="sm" variant="outline" className="h-4 w-4 p-0 shrink-0"><Copy className="h-2 w-2" /></Button>
      </div>

      {/* 6. Offerwalls + Surveys side by side */}
      <div className="grid lg:grid-cols-2 gap-1.5">
        <Card className="border-0">
          <CardContent className="p-1.5">
            <h3 className="text-[9px] font-semibold mb-1">Recommended Offerwalls</h3>
            {surveyProviders.length === 0 ? (
              <p className="text-muted-foreground text-[8px] text-center py-1">No offerwalls available</p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {surveyProviders.slice(0, 6).map((p) => (
                  <div key={p.id} className="p-1 rounded bg-accent/40 hover:bg-accent/60 transition-colors cursor-pointer text-center">
                    <p className="font-medium text-[8px] truncate">{p.name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="p-1.5">
            <h3 className="text-[9px] font-semibold mb-1">Daily Surveys</h3>
            {surveyLinks.length === 0 ? (
              <p className="text-muted-foreground text-[8px] text-center py-1">No surveys available</p>
            ) : (
              <div className="space-y-0.5">
                {surveyLinks.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-0.5 px-1 rounded bg-accent/40">
                    <p className="font-medium text-[8px] truncate">{s.name}</p>
                    <span className="text-primary font-bold text-[8px] shrink-0">{s.payout} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Last Credited + Live Activity side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
        <Card className="border-0">
          <CardContent className="p-1.5">
            <h3 className="text-[9px] font-semibold mb-0.5">Last Credited</h3>
            {lastCredited.length === 0 ? (
              <p className="text-muted-foreground text-[8px] text-center py-1">No earnings yet</p>
            ) : (
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {lastCredited.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-0.5 px-1 bg-accent/40 rounded">
                    <div className="min-w-0">
                      <p className="font-medium text-[8px] truncate">{e.description || e.offer_name}</p>
                      <p className="text-[7px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-success font-bold text-[8px]">+{e.amount} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="p-1.5">
            <h3 className="text-[9px] font-semibold flex items-center gap-0.5 mb-0.5"><Activity className="h-2 w-2 text-primary" /> Live Activity</h3>
            {activityFeed.length === 0 ? (
              <p className="text-muted-foreground text-[8px] text-center py-1">No activity yet</p>
            ) : (
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {activityFeed.map((n) => {
                  const Icon = iconMap[n.type] || Bell;
                  return (
                    <div key={n.id} className="flex items-start gap-0.5 p-0.5 px-1 bg-accent/40 rounded">
                      <Icon className="h-2 w-2 mt-0.5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[8px] truncate">{n.message}</p>
                        <p className="text-[7px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
