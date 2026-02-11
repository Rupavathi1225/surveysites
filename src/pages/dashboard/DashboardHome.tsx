import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  DollarSign, Star, Lock, TrendingUp, Users, Gift, ClipboardList,
  Wallet, ArrowLeftRight, Copy, CheckCircle, AlertCircle, Send, MessageCircle, Activity
} from "lucide-react";
import { Link } from "react-router-dom";

const DashboardHome = () => {
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastCredited, setLastCredited] = useState<any[]>([]);
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const referralLink = profile ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "";

  useEffect(() => {
    if (!profile) return;
    // Fetch data
    supabase.from("notifications").select("*").lte("created_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotifications(data || []));
    supabase.from("earning_history").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setLastCredited(data || []));
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveyProviders(data || []));
    supabase.from("survey_links").select("*").eq("status", "active").then(({ data }) => setSurveyLinks(data || []));
    supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setChatMessages((data || []).reverse()));
  }, [profile]);

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
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
    // Refresh
    const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(50);
    setChatMessages((data || []).reverse());
  };

  if (!profile) return <div className="text-center py-10 text-muted-foreground">Loading...</div>;

  const walletCards = [
    { icon: DollarSign, label: "Cash Balance", value: `$${Number(profile.cash_balance).toFixed(2)}`, color: "text-primary" },
    { icon: Star, label: "Points", value: profile.points.toString(), color: "text-info" },
    { icon: Lock, label: "Locked Points", value: profile.locked_points.toString(), color: "text-muted-foreground" },
    { icon: TrendingUp, label: "Lifetime Payouts", value: "$0.00", color: "text-success" },
    { icon: Users, label: "Referral Count", value: "0", color: "text-info" },
    { icon: Gift, label: "Referral Earnings", value: "$0.00", color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, <span className="text-primary">{profile.first_name || profile.username}!</span></h1>
            <p className="text-muted-foreground text-sm mt-1">
              Member since {new Date(profile.created_at).toLocaleDateString()} &nbsp;
              {profile.is_verified ? (
                <span className="inline-flex items-center gap-1 text-success"><CheckCircle className="h-3.5 w-3.5" /> Verified</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-warning"><AlertCircle className="h-3.5 w-3.5" /> Unverified</span>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Available Balance</p>
            <p className="text-3xl font-bold text-primary">${Number(profile.cash_balance).toFixed(2)}</p>
            <Link to="/dashboard/withdrawal"><Button size="sm" className="mt-2">Withdraw</Button></Link>
          </div>
        </CardContent>
      </Card>

      {/* Refer & Earn */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Refer & Earn</h2>
          <p className="text-muted-foreground text-sm mb-3">Share your referral link and earn points from new members</p>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="flex-1 text-xs" />
            <Button onClick={copyReferral} variant="outline" size="sm"><Copy className="h-4 w-4 mr-1" /> Copy</Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: ClipboardList, label: "Daily Surveys", to: "/dashboard/daily-surveys", bg: "bg-info" },
          { icon: Gift, label: "Exclusive Offers", to: "/dashboard/offers", bg: "bg-success" },
          { icon: Wallet, label: "Withdraw Cash", to: "/dashboard/withdrawal", bg: "bg-primary" },
          { icon: ArrowLeftRight, label: "Convert Points", to: "/dashboard/convert-points", bg: "bg-warning" },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`${action.bg} p-3 rounded-full`}>
                  <action.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Wallet Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {walletCards.map((card) => (
          <div key={card.label} className="stat-card">
            <card.icon className={`h-5 w-5 ${card.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`font-bold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recommended Offerwalls */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Recommended Offerwalls</CardTitle><p className="text-sm text-muted-foreground">Complete offers to earn points</p></CardHeader>
          <CardContent>
            {surveyProviders.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No offerwalls available</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {surveyProviders.map((p) => (
                  <Card key={p.id} className="hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-3 text-center">
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.content || "Complete offers"}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Surveys */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Daily Surveys</CardTitle><p className="text-sm text-muted-foreground">Complete surveys to earn quick points</p></CardHeader>
          <CardContent>
            {surveyLinks.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No surveys available</p>
            ) : (
              <div className="space-y-3">
                {surveyLinks.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.content || "Answer questions"}</p>
                    </div>
                    <span className="text-primary font-bold text-sm">{s.payout} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Live Activity Feed
          </CardTitle>
          <p className="text-sm text-muted-foreground">Recent activity across the platform</p>
        </CardHeader>
        <CardContent>
          <div className="h-48 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No activity yet</p>
            ) : (
              notifications.map((n) => {
                const iconMap: Record<string, string> = {
                  signup: "🎉", login: "👋", offer_completed: "✅", promo_redeemed: "🎁", promo_added: "🔥",
                  offer_added: "🆕", credits: "💰", payment_requested: "💸", payment_completed: "✅", announcement: "📢", contest_created: "🏆",
                };
                return (
                  <div key={n.id} className="flex items-start gap-2 p-2 bg-accent/40 rounded-lg text-sm">
                    <span className="text-base mt-0.5">{iconMap[n.type] || "📢"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{n.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Chat */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Live Chat</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto space-y-2 mb-3 bg-accent/30 rounded-lg p-3">
              {chatMessages.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No messages yet</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={`text-xs p-2 rounded ${m.is_admin ? "bg-primary/20" : "bg-card"}`}>
                    <span className="font-medium">{m.is_admin ? "Admin" : "User"}</span>: {m.message}
                    <span className="text-muted-foreground ml-2">{new Date(m.created_at).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === "Enter" && sendChat()} />
              <Button onClick={sendChat} size="sm"><Send className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profile.free_messages_remaining > 0 ? `${profile.free_messages_remaining} free messages left` : "1 point per message"}
            </p>
          </CardContent>
        </Card>

        {/* Last Credited */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Last Credited</CardTitle></CardHeader>
          <CardContent>
            {lastCredited.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No earnings yet</p>
            ) : (
              <div className="space-y-2">
                {lastCredited.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{e.description || e.offer_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-success font-bold text-sm">+{e.amount} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
