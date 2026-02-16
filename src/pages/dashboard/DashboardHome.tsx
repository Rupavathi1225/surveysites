import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign, Star, Lock, TrendingUp, Users, Gift, ClipboardList,
  Wallet, ArrowLeftRight, Copy, CheckCircle, AlertCircle, Send, MessageCircle, X
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardHome = () => {
  const { profile, user } = useAuth();
  const [lastCredited, setLastCredited] = useState<any[]>([]);
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("earning_history").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setLastCredited(data || []));
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveyProviders(data || []));
    supabase.from("survey_links").select("*").eq("status", "active").then(({ data }) => setSurveyLinks(data || []));
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
    <div className="space-y-4">
      {/* Welcome */}
      <Card className="border-0 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Welcome back, <span className="text-primary">{profile.first_name || profile.username}!</span></h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Member since {new Date(profile.created_at).toLocaleDateString()} &nbsp;
              {profile.is_verified ? (
                <span className="inline-flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" /> Verified</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warning"><AlertCircle className="h-3 w-3" /> Unverified</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-[10px]">Available Balance</p>
            <p className="text-2xl font-bold text-primary">${Number(profile.cash_balance).toFixed(2)}</p>
            <Link to="/dashboard/withdrawal"><Button size="sm" className="mt-1 h-7 text-xs">Withdraw</Button></Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: ClipboardList, label: "Surveys", to: "/dashboard/daily-surveys", bg: "bg-info" },
          { icon: Gift, label: "Offers", to: "/dashboard/offers", bg: "bg-success" },
          { icon: Wallet, label: "Withdraw", to: "/dashboard/withdrawal", bg: "bg-primary" },
          { icon: ArrowLeftRight, label: "Convert", to: "/dashboard/convert-points", bg: "bg-warning" },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer border-0">
              <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                <div className={`${action.bg} p-2 rounded-full`}>
                  <action.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-[11px] font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Wallet Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {walletCards.map((card) => (
          <Card key={card.label} className="border-0">
            <CardContent className="p-3 flex items-center gap-2">
              <card.icon className={`h-4 w-4 ${card.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{card.label}</p>
                <p className={`text-sm font-bold ${card.color}`}>{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recommended Offerwalls */}
        <Card className="border-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Recommended Offerwalls</CardTitle>
            <p className="text-[10px] text-muted-foreground">Complete offers to earn points</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {surveyProviders.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No offerwalls available</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {surveyProviders.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-lg bg-accent/40 hover:bg-accent/60 transition-colors cursor-pointer text-center">
                    <p className="font-medium text-xs">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.content || "Complete offers"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Surveys */}
        <Card className="border-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Daily Surveys</CardTitle>
            <p className="text-[10px] text-muted-foreground">Complete surveys to earn quick points</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {surveyLinks.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No surveys available</p>
            ) : (
              <div className="space-y-2">
                {surveyLinks.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/40">
                    <div>
                      <p className="font-medium text-xs">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.content || "Answer questions"}</p>
                    </div>
                    <span className="text-primary font-bold text-xs">{s.payout} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Credited */}
      <Card className="border-0">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Last Credited</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {lastCredited.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-4">No earnings yet</p>
          ) : (
            <div className="space-y-1.5">
              {lastCredited.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2.5 bg-accent/40 rounded-lg">
                  <div>
                    <p className="font-medium text-xs">{e.description || e.offer_name}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-success font-bold text-xs">+{e.amount} pts</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating Chat Button */}
      <button
        onClick={() => { setChatOpen(!chatOpen); if (!chatOpen) loadChat(); }}
        className="fixed bottom-5 right-5 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
      >
        {chatOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Floating Affiliates Button */}
      <Link
        to="/dashboard/affiliates"
        className="fixed bottom-5 right-20 z-50 bg-info text-primary-foreground p-3 rounded-full shadow-lg hover:bg-info/90 transition-colors"
      >
        <Users className="h-5 w-5" />
      </Link>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          <div className="p-3 bg-primary/10 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-primary" /> Live Chat</h3>
            <button onClick={() => setChatOpen(false)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
          </div>
          <div className="h-56 overflow-y-auto p-3 space-y-1.5">
            {chatMessages.length === 0 ? (
              <p className="text-muted-foreground text-[10px] text-center py-6">No messages yet</p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className={`text-[11px] p-1.5 rounded ${m.is_admin ? "bg-primary/15" : "bg-accent/50"}`}>
                  <span className="font-medium">{m.is_admin ? "Admin" : "You"}</span>: {m.message}
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t border-border flex gap-1.5">
            <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type..." className="h-7 text-xs" onKeyDown={(e) => e.key === "Enter" && sendChat()} />
            <Button onClick={sendChat} size="sm" className="h-7 w-7 p-0"><Send className="h-3 w-3" /></Button>
          </div>
          <p className="text-[9px] text-muted-foreground px-2 pb-1.5">
            {profile.free_messages_remaining > 0 ? `${profile.free_messages_remaining} free left` : "1 pt/msg"}
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
