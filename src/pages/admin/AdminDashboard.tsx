import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Users, History, Star, Wallet, Activity, MessageCircle, Tag, Gift,
  CreditCard, Bell, UserPlus, LogIn, DollarSign, Lock, TrendingUp,
  ClipboardList, ArrowLeftRight, Copy, CheckCircle, AlertCircle, Network
} from "lucide-react";
import { Link } from "react-router-dom";
import ActivityTicker from "@/components/ActivityTicker";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ totalUsers: 0, totalTransactions: 0, totalPoints: 0, totalWithdrawals: 0, activeUsers: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastCredited, setLastCredited] = useState<any[]>([]);
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [feedSettings, setFeedSettings] = useState({
    signups: true, logins: true, promoRedeemed: true, promoAdded: true,
    offerCompleted: true, offersAdded: true, paymentRequested: true, paymentCompleted: true, global: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [users, transactions, withdrawals] = await Promise.all([
        supabase.from("profiles").select("points", { count: "exact" }),
        supabase.from("earning_history").select("amount", { count: "exact" }),
        supabase.from("withdrawals").select("*", { count: "exact" }).eq("status", "success"),
      ]);
      const totalPoints = (users.data || []).reduce((sum, u) => sum + (u.points || 0), 0);
      setStats({
        totalUsers: users.count || 0,
        totalTransactions: transactions.count || 0,
        totalPoints,
        totalWithdrawals: withdrawals.count || 0,
        activeUsers: users.count || 0,
      });
    };
    fetchStats();
    supabase.from("notifications").select("*").lte("created_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotifications(data || []));

    if (profile) {
      supabase.from("earning_history").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setLastCredited(data || []));
      supabase.from("profiles").select("id", { count: "exact" }).eq("referred_by", profile.id).then(({ count }) => setReferralCount(count || 0));
    }
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).then(({ data }) => setSurveyProviders(data || []));
    supabase.from("survey_links").select("*").eq("status", "active").then(({ data }) => setSurveyLinks(data || []));
  }, [profile]);

  const referralLink = profile ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "";
  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  // API image integration function
  const getImageUrl = (title: string, existingUrl?: string) => {
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    // Use a placeholder API for better image quality
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/200/150.jpg`;
  };

  const statCards = [
    { icon: Users, label: "Total Users", value: stats.totalUsers, color: "text-primary" },
    { icon: History, label: "Total Transactions", value: stats.totalTransactions, color: "text-info" },
    { icon: Star, label: "Total Points Earned", value: stats.totalPoints, color: "text-warning" },
    { icon: Wallet, label: "Total Withdrawals", value: stats.totalWithdrawals, color: "text-success" },
    { icon: Activity, label: "Active Users", value: stats.activeUsers, color: "text-primary" },
  ];

  const getIcon = (type: string) => {
    const map: Record<string, any> = {
      signup: UserPlus, login: LogIn, promo: Tag, offer: Gift, payment: CreditCard, chat: MessageCircle
    };
    return map[type] || Bell;
  };

  const walletCards = profile ? [
    { icon: DollarSign, label: "Cash", value: `$${Number(profile.cash_balance).toFixed(2)}`, color: "text-primary" },
    { icon: Star, label: "Points", value: profile.points.toString(), color: "text-info" },
    { icon: Lock, label: "Locked", value: profile.locked_points.toString(), color: "text-muted-foreground" },
    { icon: TrendingUp, label: "Payouts", value: "$0.00", color: "text-success" },
    { icon: Users, label: "Referrals", value: referralCount.toString(), color: "text-info" },
    { icon: Gift, label: "Ref. Earn", value: "$0.00", color: "text-primary" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Activity Ticker */}
      <ActivityTicker />

      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and statistics</p>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome + Wallet (personal) */}
      {profile && (
        <>
          <Card className="border-0 bg-gradient-to-r from-primary/10 to-transparent">
            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Welcome, <span className="text-primary">{profile.first_name || profile.username}!</span></h2>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {profile.is_verified ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle className="h-3 w-3" /> Verified</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-warning"><AlertCircle className="h-3 w-3" /> Unverified</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-[10px]">Your Balance</p>
                <p className="text-2xl font-bold text-primary">${Number(profile.cash_balance).toFixed(2)}</p>
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
        </>
      )}

      {/* Offerwalls + Surveys */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-0">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Network className="h-3 w-3 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-white">Recommended Offerwalls</CardTitle>
                <p className="text-[10px] text-gray-400">Complete offers to earn points</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {surveyProviders.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-4">No offerwalls available</p>
            ) : (
              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max" style={{ scrollSnapType: 'x mandatory' }}>
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
                      <div key={p.id} className="flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>
                        <Card className={`w-28 h-44 bg-gradient-to-br ${currentGradient} border-4 ${currentBorder} rounded-2xl cursor-pointer group hover:scale-105 transition-all duration-300 hover:shadow-2xl ${currentShadow} backdrop-blur-sm relative overflow-hidden opacity-80 hover:opacity-100 shadow-2xl shadow-black/40`}>
                          {/* Gradient Overlay with transparency */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 pointer-events-none"></div>
                          
                          {/* Inner shadow for thickness effect */}
                          <div className="absolute inset-0 rounded-2xl shadow-inner shadow-black/30 pointer-events-none"></div>

                          <CardContent className="p-2 h-full flex flex-col items-center justify-between text-center relative z-10">
                            {/* Bonus Badge */}
                            {p.point_percentage > 100 && (
                              <div className="absolute top-1 right-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[8px] px-1.5 py-0.5 rounded-full border-0 shadow-lg">
                                +{p.point_percentage - 100}%
                              </div>
                            )}

                            {/* Provider Logo */}
                            <div className="flex-1 flex flex-col items-center justify-center">
                              {p.image_url ? (
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentGradient.replace('/30', '/40')} p-0.5 mb-1.5 group-hover:scale-110 transition-transform duration-300 border-2 ${currentBorder} shadow-xl shadow-black/30`}>
                                  <img 
                                    src={getImageUrl(p.name, p.image_url)} 
                                    alt={p.name} 
                                    className="w-full h-full object-contain rounded-lg"
                                    onError={(e) => {
                                      e.currentTarget.src = `https://picsum.photos/seed/provider/40/40.jpg`;
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 bg-gradient-to-br ${currentGradient.replace('/30', '/60')} rounded-xl flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform duration-300 border-2 ${currentBorder} shadow-xl shadow-black/30`}>
                                  <span className="text-sm font-bold text-white">{p.name[0]}</span>
                                </div>
                              )}

                              {/* Provider Name */}
                              <h3 className="font-semibold text-white text-[10px] mb-1 line-clamp-2 leading-tight">{p.name}</h3>

                              {/* Level Badge */}
                              {p.level && p.level > 0 && (
                                <div className={`text-[8px] bg-gradient-to-r ${currentGradient.replace('/30', '/50')} text-white px-1.5 py-0.5 rounded-full border ${currentBorder}`}>
                                  Level {p.level}+
                                </div>
                              )}
                            </div>

                            {/* Star Rating */}
                            <div className="flex items-center gap-0.5 mb-1">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-2 w-2 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} 
                                />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Refer & Earn */}
      {profile && (
        <Card className="border-0 bg-gradient-to-r from-success/10 to-transparent">
          <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5"><Gift className="h-4 w-4 text-success" /> Refer & Earn</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Your unique referral link</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Input value={referralLink} readOnly className="h-7 text-[10px] bg-accent/50 w-full md:w-64" />
              <Button onClick={copyReferral} size="sm" variant="outline" className="h-7 px-2 shrink-0"><Copy className="h-3 w-3" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Credited */}
      {profile && (
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
      )}

      {/* Activity Feed + Controls */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Live Activity Feed</CardTitle>
              <p className="text-sm text-muted-foreground">Showing real-time platform activity</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">No activity yet</p>
                ) : (
                  notifications.map((n) => {
                    const Icon = getIcon(n.type);
                    return (
                      <div key={n.id} className="flex items-start gap-3 p-3 bg-accent/50 rounded-lg">
                        <Icon className="h-4 w-4 mt-0.5 text-primary" />
                        <div>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5" /> Activity Feed Controls</CardTitle>
            <p className="text-sm text-muted-foreground">Toggle which activities appear</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "signups", label: "New user signups", icon: UserPlus },
              { key: "logins", label: "User logins", icon: LogIn },
              { key: "promoRedeemed", label: "Promocode redeemed", icon: Tag },
              { key: "promoAdded", label: "New promocode added", icon: Tag },
              { key: "offerCompleted", label: "Offer/Survey completed", icon: Gift },
              { key: "offersAdded", label: "New offers added", icon: Gift },
              { key: "paymentRequested", label: "Payment requested", icon: CreditCard },
              { key: "paymentCompleted", label: "Payment completed", icon: CreditCard },
              { key: "global", label: "Global notifications", icon: Bell },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.label}</span>
                </div>
                <Switch
                  checked={(feedSettings as any)[item.key]}
                  onCheckedChange={(v) => setFeedSettings((p) => ({ ...p, [item.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
