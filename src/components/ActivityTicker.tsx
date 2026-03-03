import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Activity, UserPlus, LogIn, Gift, Tag, CheckCircle, Plus, CreditCard, Bell } from "lucide-react";

interface TickerItem {
  id: string;
  username: string;
  source: string;
  amount: string;
  icon: "earning" | "signup" | "login" | "promocode" | "offer" | "payment" | "notification";
  avatarUrl?: string;
}

const iconMap = {
  earning: TrendingUp,
  signup: UserPlus,
  login: LogIn,
  promocode: Gift,
  offer: CheckCircle,
  payment: CreditCard,
  notification: Bell,
};

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const allItems: TickerItem[] = [];

      // 1. Earning history (offer/survey completed)
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      // 2. Recent signups (profiles)
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, username, first_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Login logs
      const { data: logins } = await supabase
        .from("login_logs")
        .select("id, user_id, created_at, location")
        .order("created_at", { ascending: false })
        .limit(5);

      // 4. Promocode redemptions
      const { data: promoRedemptions } = await supabase
        .from("promocode_redemptions")
        .select("id, user_id, promocode_id, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 5. Withdrawals (payment requested / completed)
      const { data: withdrawals } = await supabase
        .from("withdrawals")
        .select("id, user_id, amount, status, payment_method, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 6. Global notifications
      const { data: notifications } = await supabase
        .from("notifications")
        .select("id, message, type, created_at, user_id, is_global")
        .eq("is_global", true)
        .order("created_at", { ascending: false })
        .limit(5);

      // Collect all user IDs for profile lookup
      const allUserIds = new Set<string>();
      earnings?.forEach(e => allUserIds.add(e.user_id));
      logins?.forEach(l => { if (l.user_id) allUserIds.add(l.user_id); });
      promoRedemptions?.forEach(p => allUserIds.add(p.user_id));
      withdrawals?.forEach(w => allUserIds.add(w.user_id));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name, avatar_url")
        .in("id", [...allUserIds]);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, { name: p.username || p.first_name || "Anonymous", avatar: p.avatar_url }])
      );

      // Earnings
      earnings?.forEach((e) => {
        const prof = profileMap.get(e.user_id);
        allItems.push({
          id: `e-${e.id}`,
          username: prof?.name || "Anonymous",
          source: e.offer_name || e.description || "Completed a task",
          amount: `$ ${(e.amount || 0).toFixed(2)}`,
          icon: "earning",
          avatarUrl: prof?.avatar || undefined,
        });
      });

      // Signups
      recentUsers?.forEach((u) => {
        allItems.push({
          id: `s-${u.id}`,
          username: u.username || u.first_name || "New User",
          source: "Just joined the platform!",
          amount: "🎉",
          icon: "signup",
        });
      });

      // Logins
      logins?.forEach((l) => {
        const prof = l.user_id ? profileMap.get(l.user_id) : null;
        allItems.push({
          id: `l-${l.id}`,
          username: prof?.name || "User",
          source: `Logged in${l.location ? ` from ${l.location}` : ""}`,
          amount: "✅",
          icon: "login",
        });
      });

      // Promocode redemptions
      promoRedemptions?.forEach((p) => {
        const prof = profileMap.get(p.user_id);
        allItems.push({
          id: `p-${p.id}`,
          username: prof?.name || "User",
          source: "Redeemed a promocode",
          amount: "🎁",
          icon: "promocode",
        });
      });

      // Withdrawals
      withdrawals?.forEach((w) => {
        const prof = profileMap.get(w.user_id);
        const isPaid = w.status === "approved" || w.status === "completed";
        allItems.push({
          id: `w-${w.id}`,
          username: prof?.name || "User",
          source: isPaid ? `Payment completed via ${w.payment_method}` : `Requested withdrawal via ${w.payment_method}`,
          amount: `$ ${(w.amount || 0).toFixed(2)}`,
          icon: "payment",
        });
      });

      // Global notifications
      notifications?.forEach((n) => {
        allItems.push({
          id: `n-${n.id}`,
          username: "System",
          source: n.message,
          amount: "📢",
          icon: "notification",
        });
      });

      // Shuffle to mix activity types
      for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
      }

      setItems(allItems);
    };

    fetchAll();

    // Real-time subscriptions
    const ch1 = supabase
      .channel("ticker-all-activities")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "login_logs" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "promocode_redemptions" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
    };
  }, [userId]);

  if (items.length === 0) return null;

  const tripled = [...items, ...items, ...items];

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  const gradients = [
    "from-purple-600 to-blue-600",
    "from-blue-600 to-purple-600",
    "from-violet-600 to-indigo-600",
    "from-indigo-600 to-purple-600",
    "from-purple-700 to-blue-500",
    "from-blue-500 to-violet-600",
  ];

  return (
    <div className="w-full overflow-hidden bg-card/50 border border-border rounded-xl py-3 px-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Live Activity Feed</span>
        <p className="text-xs text-muted-foreground hidden sm:block">Real-time activity from our community</p>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className="flex gap-4 animate-scroll-slow whitespace-nowrap" style={{ width: "max-content" }}>
          {tripled.map((item, i) => {
            const Icon = iconMap[item.icon] || TrendingUp;
            return (
              <div
                key={`${item.id}-${i}`}
                className={`inline-flex items-center gap-3 shrink-0 bg-gradient-to-r ${gradients[i % gradients.length]} rounded-xl px-4 py-3 min-w-[220px] shadow-lg`}
              >
                <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{getInitial(item.username)}</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold text-white truncate">{item.username}</span>
                  <span className="text-xs text-white/70 truncate">{item.source}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-lg font-bold text-white">{item.amount}</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
