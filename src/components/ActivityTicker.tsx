import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";

interface TickerItem {
  id: string;
  username: string;
  offer_name: string;
  amount: number;
}

const ActivityTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        // Show placeholder data if no earnings exist yet
        setItems([
          { id: "1", username: "Anonymous", offer_name: "Survey Completed", amount: 2.11 },
          { id: "2", username: "Anonymous", offer_name: "Offer Completed", amount: 1.38 },
          { id: "3", username: "Anonymous", offer_name: "Daily Survey", amount: 0.68 },
          { id: "4", username: "Anonymous", offer_name: "Task Completed", amount: 0.73 },
          { id: "5", username: "Anonymous", offer_name: "Referral Bonus", amount: 1.43 },
        ]);
        return;
      }

      // Fetch usernames for each earning
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || p.first_name || "Anonymous"]));

      setItems(
        data.map((d) => ({
          id: d.id,
          username: profileMap.get(d.user_id) || "Anonymous",
          offer_name: d.offer_name || d.description || "Earned",
          amount: d.amount || 0,
        }))
      );
    };

    fetchRecent();

    // Listen for new earnings
    const channel = supabase
      .channel("ticker-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => {
        fetchRecent();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (items.length === 0) return null;

  // Double items for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-card/80 backdrop-blur-sm border-b border-border py-2 mb-4 rounded-lg">
      <div className="relative overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-6 animate-scroll whitespace-nowrap"
          style={{ width: "max-content" }}
        >
          {doubled.map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex items-center gap-2 px-3 shrink-0">
              <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-muted-foreground">
                  {item.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                  {item.username}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {item.offer_name}
                </span>
              </div>
              <span className="text-xs font-bold text-success ml-1">
                $ {item.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
