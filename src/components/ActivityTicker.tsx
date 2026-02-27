import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Activity, Users, Star } from "lucide-react";

interface TickerItem {
  id: string;
  username: string;
  source: string;
  amount: string;
  avatarUrl?: string;
}

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const allItems: TickerItem[] = [];

      // Fetch earnings (global) - your original logic
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at")
        .order("created_at", { ascending: false })
        .limit(15);

      if (earnings && earnings.length > 0) {
        const userIds = [...new Set(earnings.map((d) => d.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, first_name, avatar_url")
          .in("id", userIds);
        const profileMap = new Map(
          (profiles || []).map((p) => [p.id, { name: p.username || p.first_name || "Anonymous", avatar: p.avatar_url }])
        );

        earnings.forEach((e) => {
          const prof = profileMap.get(e.user_id);
          allItems.push({
            id: `e-${e.id}`,
            username: prof?.name || "Anonymous",
            source: e.offer_name || e.description || "Task",
            amount: `$ ${(e.amount || 0).toFixed(2)}`,
            avatarUrl: prof?.avatar || undefined,
          });
        });
      }

      // Only set real data - no fallback data
      setItems(allItems);
    };

    fetchAll();

    const ch1 = supabase
      .channel("ticker-earnings")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
    };
  }, [userId]);

  if (items.length === 0) return null;

  // Create multiple copies for continuous scrolling
  const tripled = [...items, ...items, ...items];

  const getCardColor = (index: number) => {
    // Alternating colors: dark purple, light blue, dark purple, light blue...
    return index % 2 === 0 
      ? "bg-gradient-to-r from-purple-600 to-purple-700" 
      : "bg-gradient-to-r from-blue-400 to-blue-500";
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // API image integration for user avatars
  const getAvatarUrl = (username: string, existingUrl?: string) => {
    if (existingUrl && existingUrl.startsWith('http')) {
      return existingUrl;
    }
    // Use a consistent avatar API based on username
    return `https://picsum.photos/seed/${encodeURIComponent(username)}/40/40.jpg`;
  };

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gradient">Live Activity Feed</h3>
          <p className="text-sm text-muted-foreground">Real-time earnings from our community</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Continuous scrolling cards */}
      <div className="relative overflow-hidden">
        <div className="flex gap-4 animate-scroll-slow whitespace-nowrap" style={{ width: "max-content" }}>
          {tripled.map((item, i) => (
            <div 
              key={`${item.id}-${i}`} 
              className={`flex items-center justify-between shrink-0 w-56 h-24 rounded-xl shadow-lg px-4 ${getCardColor(i)} backdrop-blur-sm border border-white/10`}
            >
              {/* Left side - User Avatar and Info */}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  {item.avatarUrl ? (
                    <img
                      src={getAvatarUrl(item.username, item.avatarUrl)}
                      alt={item.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                      onError={(e) => {
                        // Fallback to initials if image fails
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center ${item.avatarUrl ? 'hidden' : ''}`}>
                    <span className="text-sm font-bold text-white">{getInitial(item.username)}</span>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                </div>
                
                {/* User Info */}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{item.username}</span>
                  <span className="text-xs text-white/70">{item.source}</span>
                </div>
              </div>
              
              {/* Right side - Amount with icon */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-lg font-bold text-white">{item.amount}</span>
                  <div className="flex items-center gap-1 text-xs text-emerald-300">
                    <TrendingUp className="h-3 w-3" />
                    <span>Earned</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <DollarSign className="h-4 w-4 text-white" />
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
