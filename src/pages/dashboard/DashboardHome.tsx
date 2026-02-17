import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign, Star, Lock, TrendingUp, Users, Gift, ClipboardList,
  Wallet, ArrowLeftRight, Copy, CheckCircle, AlertCircle, Send, MessageCircle, X
} from "lucide-react";
import { Link } from "react-router-dom";
import ActivityTicker from "@/components/ActivityTicker";

const DashboardHome = () => {
  const { profile, user } = useAuth();
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    if (!profile) return;
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
    <div className="space-y-1">
      {/* 1. Single top bar: username + cash + points + referral + withdraw */}
      <div className="flex items-center gap-1.5 px-1 py-0.5 bg-card/80 rounded border border-border/50 overflow-x-auto">
        <span className="text-[9px] font-semibold whitespace-nowrap">Hi, <span className="text-primary">{profile.first_name || profile.username}</span></span>
        {profile.is_verified ? <CheckCircle className="h-2 w-2 text-success shrink-0" /> : <AlertCircle className="h-2 w-2 text-warning shrink-0" />}
        <span className="text-[7px] text-muted-foreground">|</span>
        <span className="text-primary text-[9px] font-bold whitespace-nowrap">${Number(profile.cash_balance).toFixed(2)}</span>
        <span className="text-[7px] text-muted-foreground">|</span>
        <span className="text-info text-[9px] font-bold whitespace-nowrap">{profile.points} pts</span>
        <span className="text-[7px] text-muted-foreground">|</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <Input value={referralLink} readOnly className="h-4 text-[6px] bg-accent/50 w-20 px-1 py-0" />
          <Button onClick={copyReferral} size="sm" variant="outline" className="h-4 w-4 p-0 shrink-0"><Copy className="h-1.5 w-1.5" /></Button>
        </div>
        <Link to="/dashboard/withdrawal" className="shrink-0"><Button size="sm" className="h-4 text-[7px] px-1.5 rounded">Withdraw</Button></Link>
      </div>

      {/* 2. Activity Ticker (earnings + last credited + notifications combined) */}
      <ActivityTicker userId={profile.id} />
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
