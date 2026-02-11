import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Users, History, Star, Wallet, Activity, ArrowRight, MessageCircle, Tag, Gift, CreditCard, Bell, UserPlus, LogIn } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalTransactions: 0, totalPoints: 0, totalWithdrawals: 0, activeUsers: 0 });
  const [notifications, setNotifications] = useState<any[]>([]);
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
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and statistics</p>
      </div>

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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Live Activity Feed</CardTitle>
              </div>
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
            <p className="text-sm text-muted-foreground">Toggle which activities appear in the feed</p>
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
