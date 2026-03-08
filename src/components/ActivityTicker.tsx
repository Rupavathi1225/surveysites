import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface TickerItem {
  id: string;
  username: string;
  amount: string;
  country: string;
  offerwallName: string;
  offerwallLogo: string;
  created_at: string;
  type: string;
}

interface FeedSettings {
  feed_show_offers: boolean;
  feed_show_surveys: boolean;
  feed_show_signups: boolean;
  feed_show_withdrawals: boolean;
  feed_show_logins: boolean;
  feed_show_contests: boolean;
  feed_show_referrals: boolean;
  feed_show_promocodes: boolean;
  feed_show_payment_completed: boolean;
  feed_show_new_promocodes: boolean;
  feed_show_new_offers: boolean;
  feed_show_global_notifications: boolean;
  feed_show_feed_generator: boolean;
  feed_scroll_speed: number;
  feed_box_color1: string;
  feed_box_color2: string;
  feed_total_count: number;
  feed_count_offers: number;
  feed_count_surveys: number;
  feed_count_signups: number;
  feed_count_withdrawals: number;
  feed_count_logins: number;
  feed_count_contests: number;
  feed_count_referrals: number;
  feed_count_promocodes: number;
  feed_count_payment_completed: number;
  feed_count_new_promocodes: number;
  feed_count_new_offers: number;
  feed_count_global_notifications: number;
  feed_count_feed_generator: number;
  feed_size_offers: string;
  feed_size_surveys: string;
  feed_size_signups: string;
  feed_size_withdrawals: string;
  feed_size_logins: string;
  feed_size_contests: string;
  feed_size_referrals: string;
  feed_size_promocodes: string;
  feed_size_payment_completed: string;
  feed_size_new_promocodes: string;
  feed_size_new_offers: string;
  feed_size_global_notifications: string;
  feed_size_feed_generator: string;
}

const DEFAULT_SETTINGS: FeedSettings = {
  feed_show_offers: true,
  feed_show_surveys: true,
  feed_show_signups: false,
  feed_show_withdrawals: false,
  feed_show_logins: false,
  feed_show_contests: false,
  feed_show_referrals: false,
  feed_show_promocodes: false,
  feed_show_payment_completed: false,
  feed_show_new_promocodes: false,
  feed_show_new_offers: false,
  feed_show_global_notifications: false,
  feed_show_feed_generator: false,
  feed_scroll_speed: 120,
  feed_box_color1: "#1e293b",
  feed_box_color2: "#334155",
  feed_total_count: 20,
  feed_count_offers: 20,
  feed_count_surveys: 20,
  feed_count_signups: 20,
  feed_count_withdrawals: 20,
  feed_count_logins: 20,
  feed_count_contests: 20,
  feed_count_referrals: 20,
  feed_count_promocodes: 20,
  feed_count_payment_completed: 20,
  feed_count_new_promocodes: 20,
  feed_count_new_offers: 20,
  feed_count_global_notifications: 20,
  feed_count_feed_generator: 20,
  feed_size_offers: "medium",
  feed_size_surveys: "medium",
  feed_size_signups: "medium",
  feed_size_withdrawals: "medium",
  feed_size_logins: "medium",
  feed_size_contests: "medium",
  feed_size_referrals: "medium",
  feed_size_promocodes: "medium",
  feed_size_payment_completed: "medium",
  feed_size_new_promocodes: "medium",
  feed_size_new_offers: "medium",
  feed_size_global_notifications: "medium",
  feed_size_feed_generator: "medium",
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

function classifyEarning(desc: string, offerName: string, type: string): string {
  const text = `${desc} ${offerName} ${type}`.toLowerCase();
  if (text.includes("referral") || text.includes("affiliate")) return "referral";
  if (text.includes("contest") || text.includes("rank")) return "contest";
  if (text.includes("promo") && (text.includes("redeem") || text.includes("code"))) return "promocode";
  if (text.includes("new promo")) return "new_promocodes";
  if (text.includes("new offer")) return "new_offers";
  if (text.includes("payment completed") || text.includes("paid")) return "payment_completed";
  if (text.includes("survey")) return "survey";
  if (text.includes("withdraw") || text.includes("payment request")) return "withdrawal";
  if (text.includes("signup") || text.includes("sign up") || text.includes("welcome")) return "signup";
  if (text.includes("login") || text.includes("log in")) return "login";
  if (text.includes("notification") || text.includes("announcement")) return "global_notifications";
  return "offer";
}

const TYPE_TO_SHOW_KEY: Record<string, keyof FeedSettings> = {
  offer: "feed_show_offers",
  survey: "feed_show_surveys",
  signup: "feed_show_signups",
  withdrawal: "feed_show_withdrawals",
  login: "feed_show_logins",
  contest: "feed_show_contests",
  referral: "feed_show_referrals",
  promocode: "feed_show_promocodes",
  payment_completed: "feed_show_payment_completed",
  new_promocodes: "feed_show_new_promocodes",
  new_offers: "feed_show_new_offers",
  global_notifications: "feed_show_global_notifications",
  feed_generator: "feed_show_feed_generator",
};

const TYPE_TO_COUNT_KEY: Record<string, keyof FeedSettings> = {
  offer: "feed_count_offers",
  survey: "feed_count_surveys",
  signup: "feed_count_signups",
  withdrawal: "feed_count_withdrawals",
  login: "feed_count_logins",
  contest: "feed_count_contests",
  referral: "feed_count_referrals",
  promocode: "feed_count_promocodes",
  payment_completed: "feed_count_payment_completed",
  new_promocodes: "feed_count_new_promocodes",
  new_offers: "feed_count_new_offers",
  global_notifications: "feed_count_global_notifications",
  feed_generator: "feed_count_feed_generator",
};

const TYPE_TO_SIZE_KEY: Record<string, keyof FeedSettings> = {
  offer: "feed_size_offers",
  survey: "feed_size_surveys",
  signup: "feed_size_signups",
  withdrawal: "feed_size_withdrawals",
  login: "feed_size_logins",
  contest: "feed_size_contests",
  referral: "feed_size_referrals",
  promocode: "feed_size_promocodes",
  payment_completed: "feed_size_payment_completed",
  new_promocodes: "feed_size_new_promocodes",
  new_offers: "feed_size_new_offers",
  global_notifications: "feed_size_global_notifications",
  feed_generator: "feed_size_feed_generator",
};

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [settings, setSettings] = useState<FeedSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("website_settings")
        .select("key, value")
        .in("key", SETTING_KEYS);

      if (data && data.length > 0) {
        const m = new Map(data.map(s => [s.key, s.value]));
        const getBool = (k: string, def: boolean) => m.has(k) ? m.get(k) === "true" : def;
        const getNum = (k: string, def: number) => parseInt(m.get(k) || String(def)) || def;
        const getStr = (k: string, def: string) => m.get(k) || def;

        setSettings({
          feed_show_offers: getBool("feed_show_offers", true),
          feed_show_surveys: getBool("feed_show_surveys", true),
          feed_show_signups: getBool("feed_show_signups", false),
          feed_show_withdrawals: getBool("feed_show_withdrawals", false),
          feed_show_logins: getBool("feed_show_logins", false),
          feed_show_contests: getBool("feed_show_contests", false),
          feed_show_referrals: getBool("feed_show_referrals", false),
          feed_show_promocodes: getBool("feed_show_promocodes", false),
          feed_show_payment_completed: getBool("feed_show_payment_completed", false),
          feed_show_new_promocodes: getBool("feed_show_new_promocodes", false),
          feed_show_new_offers: getBool("feed_show_new_offers", false),
          feed_show_global_notifications: getBool("feed_show_global_notifications", false),
          feed_show_feed_generator: getBool("feed_show_feed_generator", false),
          feed_scroll_speed: getNum("feed_scroll_speed", 120),
          feed_box_color1: getStr("feed_box_color1", DEFAULT_SETTINGS.feed_box_color1),
          feed_box_color2: getStr("feed_box_color2", DEFAULT_SETTINGS.feed_box_color2),
          feed_total_count: getNum("feed_total_count", 20),
          feed_count_offers: getNum("feed_count_offers", 20),
          feed_count_surveys: getNum("feed_count_surveys", 20),
          feed_count_signups: getNum("feed_count_signups", 20),
          feed_count_withdrawals: getNum("feed_count_withdrawals", 20),
          feed_count_logins: getNum("feed_count_logins", 20),
          feed_count_contests: getNum("feed_count_contests", 20),
          feed_count_referrals: getNum("feed_count_referrals", 20),
          feed_count_promocodes: getNum("feed_count_promocodes", 20),
          feed_count_payment_completed: getNum("feed_count_payment_completed", 20),
          feed_count_new_promocodes: getNum("feed_count_new_promocodes", 20),
          feed_count_new_offers: getNum("feed_count_new_offers", 20),
          feed_count_global_notifications: getNum("feed_count_global_notifications", 20),
          feed_count_feed_generator: getNum("feed_count_feed_generator", 20),
          feed_size_offers: getStr("feed_size_offers", "medium"),
          feed_size_surveys: getStr("feed_size_surveys", "medium"),
          feed_size_signups: getStr("feed_size_signups", "medium"),
          feed_size_withdrawals: getStr("feed_size_withdrawals", "medium"),
          feed_size_logins: getStr("feed_size_logins", "medium"),
          feed_size_contests: getStr("feed_size_contests", "medium"),
          feed_size_referrals: getStr("feed_size_referrals", "medium"),
          feed_size_promocodes: getStr("feed_size_promocodes", "medium"),
          feed_size_payment_completed: getStr("feed_size_payment_completed", "medium"),
          feed_size_new_promocodes: getStr("feed_size_new_promocodes", "medium"),
          feed_size_new_offers: getStr("feed_size_new_offers", "medium"),
          feed_size_global_notifications: getStr("feed_size_global_notifications", "medium"),
          feed_size_feed_generator: getStr("feed_size_feed_generator", "medium"),
        });
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch more than needed so we can apply per-type limits
      const fetchLimit = Math.max(settings.feed_total_count * 3, 100);
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at, status, type")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(fetchLimit);

      if (!earnings?.length) return;

      const userIds = [...new Set(earnings.map(e => e.user_id))];

      const [profilesRes, providersRes] = await Promise.all([
        supabase.from("profiles").select("id, username, country").in("id", userIds),
        supabase.from("survey_providers").select("id, name, image_url"),
      ]);

      const profileMap = new Map(
        (profilesRes.data || []).map(p => [p.id, { name: p.username || "User", country: p.country || "" }])
      );
      const providerList = providersRes.data || [];

      const tickerItems: TickerItem[] = earnings.map(e => {
        const prof = profileMap.get(e.user_id);
        const searchText = `${e.description || ""} ${e.offer_name || ""}`.toLowerCase();
        const matchedProvider = providerList.find(sp => searchText.includes(sp.name.toLowerCase()));
        const itemType = classifyEarning(e.description || "", e.offer_name || "", e.type || "");

        return {
          id: e.id,
          username: prof?.name || "User",
          amount: `${(e.amount || 0).toFixed(0)} pts`,
          country: prof?.country || "",
          offerwallName: matchedProvider?.name || e.offer_name || "",
          offerwallLogo: matchedProvider?.image_url || "",
          created_at: e.created_at || "",
          type: itemType,
        };
      });

      // Apply per-type visibility filter & per-type count limits
      const typeCounts: Record<string, number> = {};
      const filtered = tickerItems.filter(item => {
        // Check if type is enabled using the map
        const showKey = TYPE_TO_SHOW_KEY[item.type];
        if (!showKey || !settings[showKey]) return false;

        // Check per-type count limit
        const countKey = TYPE_TO_COUNT_KEY[item.type];
        const maxForType = countKey ? (settings[countKey] as number) : 20;
        const currentCount = typeCounts[item.type] || 0;
        if (currentCount >= maxForType) return false;
        typeCounts[item.type] = currentCount + 1;
        return true;
      });

      // Apply total mixed limit
      setItems(filtered.slice(0, settings.feed_total_count));
    };

    fetchAll();

    const ch = supabase
      .channel("ticker-earnings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId, settings]);

  if (items.length === 0) return null;

  const looped = [...items, ...items, ...items, ...items];

  const getRelativeTime = (d: string) => {
    if (!d) return "";
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1) return "now";
    if (diff < 60) return `${diff}m`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const getCountryFlag = (country: string) => {
    if (!country) return "";
    const countryFlags: Record<string, string> = {
      india: "🇮🇳", "united states": "🇺🇸", usa: "🇺🇸", uk: "🇬🇧", "united kingdom": "🇬🇧",
      canada: "🇨🇦", australia: "🇦🇺", germany: "🇩🇪", france: "🇫🇷", brazil: "🇧🇷",
      japan: "🇯🇵", china: "🇨🇳", russia: "🇷🇺", mexico: "🇲🇽", spain: "🇪🇸",
      italy: "🇮🇹", netherlands: "🇳🇱", sweden: "🇸🇪", norway: "🇳🇴", denmark: "🇩🇰",
      finland: "🇫🇮", poland: "🇵🇱", turkey: "🇹🇷", "south korea": "🇰🇷", indonesia: "🇮🇩",
      philippines: "🇵🇭", thailand: "🇹🇭", vietnam: "🇻🇳", malaysia: "🇲🇾", singapore: "🇸🇬",
      pakistan: "🇵🇰", bangladesh: "🇧🇩", "sri lanka": "🇱🇰", nepal: "🇳🇵",
      nigeria: "🇳🇬", "south africa": "🇿🇦", egypt: "🇪🇬", kenya: "🇰🇪",
      argentina: "🇦🇷", colombia: "🇨🇴", chile: "🇨🇱", peru: "🇵🇪",
      "saudi arabia": "🇸🇦", uae: "🇦🇪", "united arab emirates": "🇦🇪", israel: "🇮🇱",
    };
    return countryFlags[country.toLowerCase()] || "🌍";
  };

  const scrollDuration = `${settings.feed_scroll_speed}s`;
  const boxGradient = `linear-gradient(135deg, ${settings.feed_box_color1}, ${settings.feed_box_color2})`;

  return (
    <div className="w-full overflow-hidden bg-card/60 border border-border rounded-lg py-2 px-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Live Activity Feed</span>
        <span className="text-[9px] text-foreground/60 hidden sm:block">Real-time activity from our community</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="flex gap-3 whitespace-nowrap ticker-scroll"
          style={{ width: "max-content", animationDuration: scrollDuration }}
        >
          {looped.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="inline-flex items-center shrink-0 rounded-xl px-4 py-3 min-w-[200px] border border-foreground/5"
              style={{ background: boxGradient }}
            >
              {item.offerwallLogo && (
                <img src={item.offerwallLogo} alt={item.offerwallName} className="w-8 h-8 object-contain shrink-0 mr-2" />
              )}
              <div className="flex flex-col min-w-0 flex-1 gap-0.5 mr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">{item.username}</span>
                  <span className="text-[10px] text-white/50">• {getRelativeTime(item.created_at)}</span>
                </div>
                <span className="text-xs text-white/60 truncate">{item.offerwallName}</span>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-lg font-bold text-white whitespace-nowrap">{item.amount}</span>
                {item.country && (
                  <div className="text-xs text-white/50 whitespace-nowrap">{getCountryFlag(item.country)} {item.country}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
