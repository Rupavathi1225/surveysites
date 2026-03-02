import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Activity } from "lucide-react";

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

  const tripled = [...items, ...items, ...items];

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  // Purple/blue gradient colors for each box
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
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Live Activity Feed</span>
        <p className="text-xs text-muted-foreground hidden sm:block">Real-time earnings from our community</p>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Scrolling items - bigger purple/blue boxes */}
      <div className="relative overflow-hidden">
        <div className="flex gap-4 animate-scroll-slow whitespace-nowrap" style={{ width: "max-content" }}>
          {tripled.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className={`inline-flex items-center gap-3 shrink-0 bg-gradient-to-r ${gradients[i % gradients.length]} rounded-xl px-4 py-3 min-w-[220px] shadow-lg`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">{getInitial(item.username)}</span>
              </div>

              {/* Info */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-bold text-white truncate">{item.username}</span>
                <span className="text-xs text-white/70 truncate">{item.source}</span>
              </div>

              {/* Amount + icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-lg font-bold text-white">{item.amount}</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
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