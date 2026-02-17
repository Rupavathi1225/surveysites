import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

      // Fetch earnings (global)
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

      if (allItems.length === 0) {
        allItems.push(
          { id: "p1", username: "FlorianHostieriC", source: "Gamdom", amount: "$ 1.27" },
          { id: "p2", username: "Nitro", source: "Gamdom", amount: "$ 1.63" },
          { id: "p3", username: "MY7_Gamer", source: "Gamdom", amount: "$ 115.33" },
          { id: "p4", username: "LeviMorris", source: "PayPal USA", amount: "$ 15.30" },
          { id: "p5", username: "flyingfox", source: "PayPal International", amount: "$ 7.28" },
        );
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

  const doubled = [...items, ...items];

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="w-full overflow-hidden bg-card border-b border-border py-2">
      <div className="relative overflow-hidden">
        <div className="flex gap-6 animate-scroll whitespace-nowrap" style={{ width: "max-content" }}>
          {doubled.map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex items-center gap-2 shrink-0">
              {/* Avatar */}
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt={item.username}
                  className="h-8 w-8 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-accent border-2 border-border flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground">{getInitial(item.username)}</span>
                </div>
              )}
              {/* Info */}
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-foreground">{item.username}</span>
                <span className="text-[10px] text-muted-foreground">{item.source}</span>
              </div>
              {/* Amount */}
              <span className="text-sm font-bold text-foreground ml-1">{item.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
