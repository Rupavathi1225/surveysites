import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Activity, UserPlus, LogIn, Gift, Tag, CheckCircle, Plus, CreditCard, Bell } from "lucide-react";

interface TickerItem {
  id: string;
  username: string;
  source: string;
  amount: string;
  icon: "earning" | "signup" | "login" | "promocode" | "offer" | "payment" | "notification" | "offer_added" | "offer_completed";
  imageUrl?: string;
  notificationType?: string;
  created_at?: string;
}

const iconMap = {
  earning: TrendingUp,
  signup: UserPlus,
  login: LogIn,
  promocode: Gift,
  offer: CheckCircle,
  payment: CreditCard,
  notification: Bell,
  offer_added: Plus,
  offer_completed: CheckCircle,
};

const defaultLogos: Record<string, string> = {
  signup: "https://img.icons8.com/color/48/user-registration.png",
  login: "https://img.icons8.com/color/48/login.png",
  promocode: "https://img.icons8.com/color/48/gift.png",
  payment: "https://img.icons8.com/color/48/money-transfer.png",
  notification: "https://img.icons8.com/color/48/announcement.png",
  earning: "https://img.icons8.com/color/48/money-bag.png",
};

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const allItems: TickerItem[] = [];

      // Fetch all data in parallel
      const [earningsRes, recentUsersRes, loginsRes, promoRes, withdrawalsRes, globalNotifRes, allNotifRes, surveyProvidersRes] = await Promise.all([
        supabase.from("earning_history").select("id, amount, offer_name, user_id, description, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("profiles").select("id, username, first_name, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("login_logs").select("id, user_id, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("promocode_redemptions").select("id, user_id, promocode_id, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("withdrawals").select("id, user_id, amount, status, payment_method, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id, message, type, created_at, user_id, is_global").eq("is_global", true).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id, message, type, created_at, user_id, is_global").order("created_at", { ascending: false }).limit(20),
        supabase.from("survey_providers").select("id, name, image_url").limit(50),
      ]);

      const earnings = earningsRes.data || [];
      const recentUsers = recentUsersRes.data || [];
      const logins = loginsRes.data || [];
      const promoRedemptions = promoRes.data || [];
      const withdrawals = withdrawalsRes.data || [];
      const globalNotifications = globalNotifRes.data || [];
      const allNotifications = allNotifRes.data || [];
      const surveyProviders = surveyProvidersRes.data || [];

      // Collect user IDs & offer names
      const allUserIds = new Set<string>();
      const offerNames = new Set<string>();
      earnings.forEach(e => { allUserIds.add(e.user_id); if (e.offer_name) offerNames.add(e.offer_name); });
      logins.forEach(l => { if (l.user_id) allUserIds.add(l.user_id); });
      promoRedemptions.forEach(p => allUserIds.add(p.user_id));
      withdrawals.forEach(w => allUserIds.add(w.user_id));
      [...globalNotifications, ...allNotifications].forEach(n => {
        const name = extractOfferName(n.message || "");
        if (name) offerNames.add(name);
      });

      const [profilesRes, offerImagesRes] = await Promise.all([
        supabase.from("profiles").select("id, username, first_name, avatar_url").in("id", [...allUserIds]),
        supabase.from("offers").select("title, image_url").in("title", [...offerNames]),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.username || p.first_name || "Anonymous"]));
      const offerImageMap = new Map((offerImagesRes.data || []).map(o => [o.title?.toLowerCase(), o.image_url]));
      const surveyProviderMap = new Map(surveyProviders.map(sp => [sp.name.toLowerCase(), sp.image_url]));

      // Helper: find best image for an activity
      const findImage = (description: string, offerName?: string | null): string | undefined => {
        const desc = (description || "").toLowerCase();
        // 1. Check survey providers by name match in description
        for (const sp of surveyProviders) {
          if (desc.includes(sp.name.toLowerCase()) && sp.image_url) return sp.image_url;
        }
        // 2. Check offer images by offer name
        if (offerName) {
          const img = offerImageMap.get(offerName.toLowerCase());
          if (img) return img;
          // Partial match
          for (const [key, url] of offerImageMap.entries()) {
            if (key && offerName.toLowerCase().includes(key) || key?.includes(offerName.toLowerCase())) {
              if (url) return url;
            }
          }
        }
        return undefined;
      };

      // Earnings
      earnings.forEach(e => {
        const username = profileMap.get(e.user_id) || "Anonymous";
        const imageUrl = findImage(e.description || "", e.offer_name);
        allItems.push({
          id: `e-${e.id}`, username,
          source: e.offer_name || e.description || "Completed a task",
          amount: `$ ${(e.amount || 0).toFixed(2)}`,
          icon: "earning", imageUrl, created_at: e.created_at,
        });
      });

      // Signups
      recentUsers.forEach(u => {
        allItems.push({
          id: `s-${u.id}`, username: u.username || u.first_name || "New User",
          source: "Just joined!", amount: "🎉", icon: "signup",
        });
      });

      // Logins - NO location
      logins.forEach(l => {
        const username = l.user_id ? profileMap.get(l.user_id) || "User" : "User";
        allItems.push({
          id: `l-${l.id}`, username, source: "Logged in",
          amount: "✅", icon: "login", created_at: l.created_at,
        });
      });

      // Promocode
      promoRedemptions.forEach(p => {
        const username = profileMap.get(p.user_id) || "User";
        allItems.push({
          id: `p-${p.id}`, username, source: "Redeemed a promocode",
          amount: "🎁", icon: "promocode",
        });
      });

      // Withdrawals
      withdrawals.forEach(w => {
        const username = profileMap.get(w.user_id) || "User";
        const isPaid = w.status === "approved" || w.status === "completed";
        allItems.push({
          id: `w-${w.id}`, username,
          source: isPaid ? `Payment via ${w.payment_method}` : `Withdrawal via ${w.payment_method}`,
          amount: `$ ${(w.amount || 0).toFixed(2)}`, icon: "payment",
        });
      });

      // Process notifications helper
      const processNotification = (n: any) => {
        let iconType: TickerItem['icon'] = "notification";
        let amount = "📢";
        switch (n.type) {
          case "offer_added": iconType = "offer_added"; amount = "🆕"; break;
          case "offer_completed": case "survey_completed": iconType = "offer_completed"; amount = "✅"; break;
          case "announcement": iconType = "notification"; amount = "📢"; break;
          case "credits": iconType = "earning"; amount = "💰"; break;
          case "signup": iconType = "signup"; amount = "🎉"; break;
          case "promo_redeemed": iconType = "promocode"; amount = "🎁"; break;
          case "payment_requested": case "payment_completed": iconType = "payment"; amount = "💸"; break;
        }
        const offerName = extractOfferName(n.message || "");
        const imageUrl = findImage(n.message || "", offerName);
        return { id: `n-${n.id}`, username: "System", source: n.message, amount, icon: iconType, notificationType: n.type, created_at: n.created_at, imageUrl };
      };

      // Global notifications
      globalNotifications.forEach(n => allItems.push(processNotification(n)));

      // User notifications (skip globals already processed)
      allNotifications.forEach(n => { if (!n.is_global) allItems.push(processNotification(n)); });

      // Shuffle
      for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
      }

      setItems(allItems);
    };

    fetchAll();

    const ch1 = supabase
      .channel("ticker-all-activities")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "login_logs" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "promocode_redemptions" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(ch1); };
  }, [userId]);

  if (items.length === 0) return null;

  const tripled = [...items, ...items, ...items];

  const getRelativeTime = (created_at?: string): string => {
    if (!created_at) return "";
    const diffMs = Date.now() - new Date(created_at).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const truncateText = (text: string, max = 50): string => {
    if (!text || text.length <= max) return text || "";
    return text.substring(0, max) + "...";
  };

  const getImageSrc = (item: TickerItem): string | null => {
    if (item.imageUrl) return item.imageUrl;
    return defaultLogos[item.icon] || null;
  };

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
            const imgSrc = getImageSrc(item);
            return (
              <div
                key={`${item.id}-${i}`}
                className={`inline-flex items-center gap-3 shrink-0 bg-gradient-to-r ${gradients[i % gradients.length]} rounded-2xl px-5 py-3 w-[280px] h-[80px] shadow-xl`}
              >
                {/* Logo - square rounded, no circle */}
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {imgSrc ? (
                    <img src={imgSrc} alt="" className="w-10 h-10 object-cover rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Icon className="h-6 w-6 text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white truncate">{item.username}</span>
                    {item.created_at && (
                      <>
                        <span className="text-xs text-white/40">•</span>
                        <span className="text-xs text-white/60 shrink-0">{getRelativeTime(item.created_at)}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-white/80 whitespace-normal line-clamp-2 leading-tight mt-0.5">{truncateText(item.source, 60)}</span>
                </div>

                {/* Amount */}
                <span className="text-base font-bold text-white shrink-0">{item.amount}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper to extract offer name from notification message
function extractOfferName(message: string): string | null {
  const patterns = [
    /New offer added:\s*([^—]+) —/i,
    /completed\s+["']([^"']+)["']/i,
    /completed\s+([^"]+?)\s+and\s+earned/i,
    /Offer\s+Completed:\s*([^:—]+)/i,
    /offer\s+["']([^"']+)["']/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export default ActivityTicker;
