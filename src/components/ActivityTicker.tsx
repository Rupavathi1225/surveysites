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
}

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      // Fetch earning history (completed offers/surveys only)
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at, status")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!earnings?.length) return;

      // Collect user IDs
      const userIds = [...new Set(earnings.map(e => e.user_id))];

      // Fetch profiles and survey providers in parallel
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

        // Find matching survey provider
        const matchedProvider = providerList.find(sp => searchText.includes(sp.name.toLowerCase()));

        return {
          id: e.id,
          username: prof?.name || "User",
          amount: `${(e.amount || 0).toFixed(0)} pts`,
          country: prof?.country || "",
          offerwallName: matchedProvider?.name || e.offer_name || "",
          offerwallLogo: matchedProvider?.image_url || "",
          created_at: e.created_at || "",
        };
      });

      setItems(tickerItems);
    };

    fetchAll();

    const ch = supabase
      .channel("ticker-earnings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  if (items.length === 0) return null;

  // Duplicate items for seamless loop
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

  return (
    <div className="w-full overflow-hidden bg-card/60 border border-border rounded-lg py-2 px-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Live Activity Feed</span>
        <span className="text-[9px] text-foreground/60 hidden sm:block">Real-time activity from our community</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Scrolling ticker */}
      <div className="relative overflow-hidden">
        <div className="flex gap-3 animate-ticker whitespace-nowrap" style={{ width: "max-content" }}>
          {looped.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="inline-flex items-center shrink-0 bg-primary/15 rounded-xl px-4 py-3 min-w-[240px] border border-primary/10"
            >
              {/* Left: Logo */}
              <div className="w-12 h-12 rounded-lg shrink-0 bg-primary/20 flex items-center justify-center overflow-hidden mr-3">
                {item.offerwallLogo ? (
                  <img src={item.offerwallLogo} alt={item.offerwallName} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm font-bold text-foreground/70">{item.offerwallName?.charAt(0) || "?"}</span>
                )}
              </div>

              {/* Middle: User info */}
              <div className="flex flex-col min-w-0 flex-1 gap-0.5 mr-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">{item.username}</span>
                  <span className="text-[10px] text-foreground/50">• {getRelativeTime(item.created_at)}</span>
                </div>
                <span className="text-xs text-foreground/60 truncate">{item.offerwallName}</span>
              </div>

              {/* Right: Amount */}
              <div className="shrink-0 text-right">
                <span className="text-lg font-bold text-foreground whitespace-nowrap">{item.amount}</span>
                {item.country && (
                  <div className="text-xs text-foreground/50">{getCountryFlag(item.country)} {item.country}</div>
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
