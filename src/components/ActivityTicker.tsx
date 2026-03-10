import { useEffect, useState, useRef } from "react";
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
  feed_box_logo_size: string;
  feed_box_logo_width: string;
  feed_box_logo_height: string;
  feed_username_color: string;
  feed_points_color: string;
  feed_username_font_size: string;
  feed_points_font_size: string;
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
  feed_show_feed_generator: true,
  feed_scroll_speed: 30,
  feed_box_color1: "#1e293b",
  feed_box_color2: "#334155",
  feed_box_size: "medium",
  feed_box_width: "360",
  feed_box_height: "90",
  feed_box_padding: "16",
  feed_box_font_size: "14",
  feed_box_border_radius: "10",
  feed_box_logo_size: "44",
  feed_box_logo_width: "40",
  feed_box_logo_height: "40",
  feed_username_color: "#ffffff",
  feed_points_color: "#fbbf24",
  feed_username_font_size: "14",
  feed_points_font_size: "16",
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
  if (type === "feed_generator" || text.includes("feed generator")) return "feed_generator";
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
  const [displayItems, setDisplayItems] = useState<TickerItem[]>([]);
  const [settings, setSettings] = useState<FeedSettings>(DEFAULT_SETTINGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transform, setTransform] = useState('translateX(0)');
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef<TickerItem[]>([]);

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
          feed_show_feed_generator: getBool("feed_show_feed_generator", true),
          feed_scroll_speed: getNum("feed_scroll_speed", 30),
          feed_box_color1: getStr("feed_box_color1", DEFAULT_SETTINGS.feed_box_color1),
          feed_box_color2: getStr("feed_box_color2", DEFAULT_SETTINGS.feed_box_color2),
          feed_box_size: getStr("feed_box_size", "medium"),
          feed_box_width: getStr("feed_box_width", "360"),
          feed_box_height: getStr("feed_box_height", "90"),
          feed_box_padding: getStr("feed_box_padding", "16"),
          feed_box_font_size: getStr("feed_box_font_size", "14"),
          feed_box_border_radius: getStr("feed_box_border_radius", "10"),
          feed_box_logo_size: getStr("feed_box_logo_size", "44"),
          feed_box_logo_width: getStr("feed_box_logo_width", "40"),
          feed_box_logo_height: getStr("feed_box_logo_height", "40"),
          feed_username_color: getStr("feed_username_color", "#ffffff"),
          feed_points_color: getStr("feed_points_color", "#fbbf24"),
          feed_username_font_size: getStr("feed_username_font_size", "14"),
          feed_points_font_size: getStr("feed_points_font_size", "16"),
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
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const fetchLimit = Math.max(settings.feed_total_count * 3, 100);
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at, status, type")
        .eq("status", "approved")
        .gte("created_at", since)
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

        let displayUsername = prof?.name || "User";
        let displayCountry = prof?.country || "";
        
        if (itemType === "feed_generator" && e.description) {
          const usernameMatch = e.description.match(/Feed Generator:\s*([^\s]+)\s*earned/);
          const countryMatch = e.description.match(/\[([^\]]+)\]$/);
          if (usernameMatch) displayUsername = usernameMatch[1];
          if (countryMatch) displayCountry = countryMatch[1];
        }

        return {
          id: e.id,
          username: displayUsername,
          amount: `${(e.amount || 0).toFixed(0)} pts`,
          country: displayCountry,
          offerwallName: matchedProvider?.name || e.offer_name || "Activity",
          offerwallLogo: matchedProvider?.image_url || "",
          created_at: e.created_at || "",
          type: itemType,
        };
      });

      const typeCounts: Record<string, number> = {};
      const filtered = tickerItems.filter(item => {
        const showKey = TYPE_TO_SHOW_KEY[item.type];
        if (!showKey || !settings[showKey]) return false;

        const countKey = TYPE_TO_COUNT_KEY[item.type];
        const maxForType = countKey ? (settings[countKey] as number) : 20;
        const currentCount = typeCounts[item.type] || 0;
        if (currentCount >= maxForType) return false;
        typeCounts[item.type] = currentCount + 1;
        return true;
      });

      const sliced = filtered.slice(0, settings.feed_total_count);
      setItems(sliced);
      itemsRef.current = sliced;
      
      // Initialize display items with first 3 items
      if (sliced.length > 0) {
        const initialItems = [];
        for (let i = 0; i < 6; i++) {
          initialItems.push(sliced[i % sliced.length]);
        }
        setDisplayItems(initialItems);
      }
    };

    fetchAll();

    const ch = supabase
      .channel("ticker-earnings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId, settings]);

  // Setup carousel animation (one box at a time)
  useEffect(() => {
    if (items.length === 0) return;

    // Clear any existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const BOX_WIDTH = parseInt(settings.feed_box_width) + (parseInt(settings.feed_box_padding) * 2) + 16; // width + padding + gap
    const MOVE_DISTANCE = BOX_WIDTH; // Move one box width at a time
    const TRANSITION_DURATION = 600; // 600ms for smooth slide
    const PAUSE_DURATION = 3000; // 3 second pause between movements
    
    let timeoutId: NodeJS.Timeout;

    const moveToNext = () => {
      if (isTransitioning || items.length === 0) return;
      
      setIsTransitioning(true);
      
      // Slide left by one box width
      setTransform(`translateX(-${MOVE_DISTANCE}px)`);
      
      // After transition completes, update the items and reset position
      setTimeout(() => {
        // Update current index
        const nextIndex = (currentIndex + 1) % items.length;
        setCurrentIndex(nextIndex);
        
        // Create new display items starting from nextIndex
        const nextDisplayItems = [];
        for (let i = 0; i < 6; i++) {
          const idx = (nextIndex + i) % items.length;
          nextDisplayItems.push(items[idx]);
        }
        
        // Update display items and reset transform without animation
        setDisplayItems(nextDisplayItems);
        setTransform('translateX(0)');
        
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    };

    // Start the cycle: move, then wait, then move again
    const startCycle = () => {
      if (isPaused) return;
      
      // Move
      moveToNext();
      
      // Schedule next move after pause + transition
      timeoutId = setTimeout(() => {
        startCycle();
      }, PAUSE_DURATION + TRANSITION_DURATION);
    };

    // Initial delay before first move
    timeoutId = setTimeout(() => {
      startCycle();
    }, 3000); // Wait 3 seconds before first move

    // Pause on hover
    const handleMouseEnter = () => {
      setIsPaused(true);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const handleMouseLeave = () => {
      setIsPaused(false);
      // Resume cycle after a short delay
      timeoutId = setTimeout(() => {
        startCycle();
      }, 1000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [items, currentIndex, isTransitioning, isPaused, settings.feed_box_width, settings.feed_box_padding]);

  if (items.length === 0 || displayItems.length === 0) return null;

  const getRelativeTime = (d: string) => {
    if (!d) return "";
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 1) return "now";
    if (diff < 60) return `${diff}m`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const getCountryCode = (country: string): string => {
    if (!country) return "xx";
    const countryToCode: Record<string, string> = {
      india: "in", "united states": "us", usa: "us", uk: "gb", "united kingdom": "gb",
      canada: "ca", australia: "au", germany: "de", france: "fr", brazil: "br",
      japan: "jp", china: "cn", russia: "ru", mexico: "mx", spain: "es",
      italy: "it", netherlands: "nl", sweden: "se", norway: "no", denmark: "dk",
      finland: "fi", poland: "pl", turkey: "tr", "south korea": "kr", indonesia: "id",
      philippines: "ph", thailand: "th", vietnam: "vn", malaysia: "my", singapore: "sg",
      pakistan: "pk", bangladesh: "bd", "sri lanka": "lk", nepal: "np",
      nigeria: "ng", "south africa": "za", egypt: "eg", kenya: "ke",
      argentina: "ar", colombia: "co", chile: "cl", peru: "pe",
      "saudi arabia": "sa", uae: "ae", "united arab emirates": "ae", israel: "il",
    };
    const lower = country.toLowerCase().trim();
    if (lower.length === 2) return lower;
    return countryToCode[lower] || "xx";
  };

  const w = parseInt(settings.feed_box_width) || 360;
  const h = parseInt(settings.feed_box_height) || 90;
  const pad = parseInt(settings.feed_box_padding) || 16;
  const br = parseInt(settings.feed_box_border_radius) || 10;
  const logoSize = parseInt(settings.feed_box_logo_size) || 44;
  const usernameColor = settings.feed_username_color || "#ffffff";
  const pointsColor = settings.feed_points_color || "#fbbf24";
  const usernameFontSize = parseInt(settings.feed_username_font_size) || 14;
  const pointsFontSize = parseInt(settings.feed_points_font_size) || 16;
  const subFs = usernameFontSize - 2;
  const boxGradient = `linear-gradient(135deg, ${settings.feed_box_color1}, ${settings.feed_box_color2})`;

  // Calculate available width for username after accounting for other elements
  const logoWidth = logoSize + 12; // logo + margin
  const pointsWidth = 70; // Approximate width for points and time
  const flagWidth = 20; // Width for flag
  const availableWidthForText = w - (pad * 2) - logoWidth - pointsWidth - flagWidth - 20; // 20px buffer

  return (
    <div className="w-full overflow-hidden bg-card/60 border border-border rounded-lg py-3 px-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Live Activity Feed</span>
        <span className="text-[10px] text-foreground/60 hidden sm:block">Real-time earnings from our community</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-2 h-2 ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'} rounded-full ${!isPaused && !isTransitioning ? 'animate-pulse' : ''}`} />
          <span className={`text-[10px] font-medium ${isPaused ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isPaused ? 'PAUSED' : isTransitioning ? 'MOVING' : 'LIVE'}
          </span>
        </div>
      </div>

      <div ref={containerRef} className="relative overflow-hidden cursor-pointer" style={{ width: '100%' }}>
        <div 
          className="flex gap-4 transition-transform ease-in-out"
          style={{ 
            transform: transform,
            transition: isTransitioning ? `transform 600ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
            willChange: 'transform'
          }}
        >
          {displayItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="inline-flex items-center shrink-0 border border-foreground/5 shadow-sm hover:shadow-md transition-shadow"
              style={{
                background: boxGradient,
                width: `${w}px`,
                height: `${h}px`,
                padding: `${pad}px`,
                borderRadius: `${br}px`,
              }}
            >
              {item.offerwallLogo ? (
                <img 
                  src={item.offerwallLogo} 
                  alt={item.offerwallName}
                  className="object-contain shrink-0 mr-3 rounded"
                  style={{ width: `${logoSize}px`, height: `${logoSize}px` }} 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div 
                  className="shrink-0 mr-3 rounded bg-white/10 flex items-center justify-center"
                  style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                >
                  <span className="text-lg text-white/50">💰</span>
                </div>
              )}
              
              <div className="flex flex-col flex-1 min-w-0" style={{ maxWidth: `${availableWidthForText}px` }}>
                <div className="flex items-center gap-1.5 w-full">
                  <span 
                    className="font-medium whitespace-nowrap" 
                    style={{ 
                      fontSize: `${usernameFontSize}px`, 
                      color: usernameColor,
                    }}
                    title={item.username}
                  >
                    {item.username}
                  </span>
                </div>
                
                <span 
                  className="opacity-80 mt-0.5 whitespace-nowrap" 
                  style={{ 
                    fontSize: `${subFs}px`, 
                    color: usernameColor,
                  }}
                  title={item.offerwallName}
                >
                  {item.offerwallName}
                </span>
              </div>
              
              <div className="shrink-0 text-right ml-auto flex flex-col items-end">
                <span 
                  className="font-bold whitespace-nowrap" 
                  style={{ fontSize: `${pointsFontSize}px`, color: pointsColor }}
                >
                  {item.amount}
                </span>
                <div className="flex items-center justify-end mt-0.5 gap-1">
                  {item.country && (
                    <img
                      src={`https://flagcdn.com/20x15/${getCountryCode(item.country)}.png`}
                      alt={item.country}
                      className="inline-block object-contain rounded-sm"
                      style={{ width: '18px', height: '12px' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span 
                    className="shrink-0 opacity-70 whitespace-nowrap" 
                    style={{ fontSize: `${subFs}px`, color: usernameColor }}
                  >
                    {getRelativeTime(item.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;