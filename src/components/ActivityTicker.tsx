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
  feed_scroll_speed: number;
  feed_box_color1: string;
  feed_box_color2: string;
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
  feed_scroll_speed: 120,
  feed_box_color1: "#1e293b",
  feed_box_color2: "#334155",
};

const SETTING_KEYS = [
  "feed_show_offers", "feed_show_surveys", "feed_show_signups",
  "feed_show_withdrawals", "feed_show_logins", "feed_show_contests",
  "feed_show_referrals", "feed_show_promocodes", "feed_scroll_speed",
  "feed_box_color1", "feed_box_color2",
];

function classifyEarning(desc: string, offerName: string, type: string): string {
  const text = `${desc} ${offerName} ${type}`.toLowerCase();
  if (text.includes("referral") || text.includes("affiliate")) return "referral";
  if (text.includes("contest") || text.includes("rank")) return "contest";
  if (text.includes("promo") || text.includes("code")) return "promocode";
  if (text.includes("survey")) return "survey";
  if (text.includes("withdraw")) return "withdrawal";
  if (text.includes("signup") || text.includes("sign up") || text.includes("welcome")) return "signup";
  if (text.includes("login") || text.includes("log in")) return "login";
  return "offer";
}

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
        const map = new Map(data.map(s => [s.key, s.value]));
        setSettings({
          feed_show_offers: map.get("feed_show_offers") !== "false",
          feed_show_surveys: map.get("feed_show_surveys") !== "false",
          feed_show_signups: map.get("feed_show_signups") === "true",
          feed_show_withdrawals: map.get("feed_show_withdrawals") === "true",
          feed_show_logins: map.get("feed_show_logins") === "true",
          feed_show_contests: map.get("feed_show_contests") === "true",
          feed_show_referrals: map.get("feed_show_referrals") === "true",
          feed_show_promocodes: map.get("feed_show_promocodes") === "true",
          feed_scroll_speed: parseInt(map.get("feed_scroll_speed") || "120") || 120,
          feed_box_color1: map.get("feed_box_color1") || DEFAULT_SETTINGS.feed_box_color1,
          feed_box_color2: map.get("feed_box_color2") || DEFAULT_SETTINGS.feed_box_color2,
        });
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at, status, type")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(40);

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

      const filtered = tickerItems.filter(item => {
        switch (item.type) {
          case "offer": return settings.feed_show_offers;
          case "survey": return settings.feed_show_surveys;
          case "signup": return settings.feed_show_signups;
          case "withdrawal": return settings.feed_show_withdrawals;
          case "login": return settings.feed_show_logins;
          case "contest": return settings.feed_show_contests;
          case "referral": return settings.feed_show_referrals;
          case "promocode": return settings.feed_show_promocodes;
          default: return settings.feed_show_offers;
        }
      });

      setItems(filtered.slice(0, 20));
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
                  <div className="text-xs text-white/50">{getCountryFlag(item.country)} {item.country}</div>
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
