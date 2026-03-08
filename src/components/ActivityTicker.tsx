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
  feed_box_size: string;
  feed_box_width: string;
  feed_box_height: string;
  feed_box_padding: string;
  feed_box_font_size: string;
  feed_box_border_radius: string;
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
  feed_box_size: "medium",
  feed_box_width: "200",
  feed_box_height: "60",
  feed_box_padding: "16",
  feed_box_font_size: "14",
  feed_box_border_radius: "12",
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
          feed_box_size: getStr("feed_box_size", "medium"),
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

  const getBoxSize = () => {
    switch (settings.feed_box_size) {
      case "small":
        return { minW: "min-w-[160px]", px: "px-3", py: "py-2", imgSize: "w-6 h-6", nameSize: "text-xs", amountSize: "text-sm", countrySize: "text-[9px]", offerSize: "text-[10px]" };
      case "large":
        return { minW: "min-w-[280px]", px: "px-5", py: "py-4", imgSize: "w-10 h-10", nameSize: "text-base", amountSize: "text-xl", countrySize: "text-xs", offerSize: "text-sm" };
      default:
        return { minW: "min-w-[200px]", px: "px-4", py: "py-3", imgSize: "w-8 h-8", nameSize: "text-sm", amountSize: "text-lg", countrySize: "text-xs", offerSize: "text-xs" };
    }
  };

  const sz = getBoxSize();

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
          className="flex gap-3 whitespace-nowrap ticker-scroll items-stretch"
          style={{ width: "max-content", animationDuration: scrollDuration }}
        >
          {looped.map((item, i) => {
            return (
              <div
                key={`${item.id}-${i}`}
                className={`inline-flex items-center shrink-0 rounded-xl ${sz.px} ${sz.py} ${sz.minW} border border-foreground/5 transition-all`}
                style={{ background: boxGradient }}
              >
                {item.offerwallLogo && (
                  <img src={item.offerwallLogo} alt={item.offerwallName} className={`${sz.imgSize} object-contain shrink-0 mr-2`} />
                )}
                <div className="flex flex-col min-w-0 flex-1 gap-0.5 mr-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`${sz.nameSize} font-semibold text-white truncate`}>{item.username}</span>
                    <span className="text-[10px] text-white/50">• {getRelativeTime(item.created_at)}</span>
                  </div>
                  <span className={`${sz.offerSize} text-white/60 truncate`}>{item.offerwallName}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`${sz.amountSize} font-bold text-white whitespace-nowrap`}>{item.amount}</span>
                  {item.country && (
                    <div className={`${sz.countrySize} text-white/50 whitespace-nowrap`}>{getCountryFlag(item.country)} {item.country}</div>
                  )}
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
