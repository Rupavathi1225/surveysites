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
            amount: `$${(e.amount || 0).toFixed(2)}`,
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

  return (
    <div className="w-full overflow-hidden bg-card/50 border border-border rounded-xl py-3 px-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Live Activity Feed</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      {/* Scrolling items */}
      <div className="relative overflow-hidden">
        <div className="flex gap-3 animate-scroll-slow whitespace-nowrap" style={{ width: "max-content" }}>
          {tripled.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="inline-flex items-center gap-2.5 shrink-0 bg-accent/60 border border-border rounded-lg px-3 py-2"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{getInitial(item.username)}</span>
              </div>

              {/* Info */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">{item.username}</span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{item.source}</span>
              </div>

              {/* Amount */}
              <div className="flex items-center gap-1 ml-1">
                <span className="text-sm font-bold text-emerald-400">{item.amount}</span>
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
