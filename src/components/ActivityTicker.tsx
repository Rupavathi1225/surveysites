import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Bell, UserPlus, LogIn, Tag, Gift, CreditCard, MessageCircle, TrendingUp } from "lucide-react";

interface TickerItem {
  id: string;
  type: "earning" | "activity" | "notification";
  text: string;
  subtext: string;
  badge?: string;
  icon?: string;
}

const iconMap: Record<string, any> = {
  signup: UserPlus, login: LogIn, promo: Tag, offer: Gift,
  payment: CreditCard, chat: MessageCircle, earning: DollarSign,
};

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const allItems: TickerItem[] = [];

      // Fetch earnings (global)
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (earnings && earnings.length > 0) {
        const userIds = [...new Set(earnings.map((d) => d.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, username, first_name").in("id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.id, p.username || p.first_name || "Anonymous"]));

        earnings.forEach((e) => {
          allItems.push({
            id: `e-${e.id}`,
            type: "earning",
            text: `${profileMap.get(e.user_id) || "Anonymous"} earned`,
            subtext: e.offer_name || e.description || "Task",
            badge: `+$${(e.amount || 0).toFixed(2)}`,
            icon: "earning",
          });
        });
      }

      // Fetch user's last credited
      if (userId) {
        const { data: credited } = await supabase
          .from("earning_history")
          .select("id, amount, offer_name, description, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

        (credited || []).forEach((c) => {
          allItems.push({
            id: `c-${c.id}`,
            type: "earning",
            text: "You earned",
            subtext: c.offer_name || c.description || "Credit",
            badge: `+${c.amount} pts`,
            icon: "earning",
          });
        });
      }

      // Fetch notifications (activity)
      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .lte("created_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      (notifications || []).forEach((n) => {
        allItems.push({
          id: `n-${n.id}`,
          type: "notification",
          text: n.message,
          subtext: new Date(n.created_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          icon: n.type || "offer",
        });
      });

      if (allItems.length === 0) {
        allItems.push(
          { id: "p1", type: "earning", text: "Anonymous earned", subtext: "Survey Completed", badge: "+$2.11", icon: "earning" },
          { id: "p2", type: "notification", text: "New offer available!", subtext: "Just now", icon: "offer" },
          { id: "p3", type: "earning", text: "Anonymous earned", subtext: "Referral Bonus", badge: "+$1.43", icon: "earning" },
        );
      }

      setItems(allItems);
    };

    fetchAll();

    const ch1 = supabase.channel("ticker-earnings").on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll()).subscribe();
    const ch2 = supabase.channel("ticker-notifs").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchAll()).subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId]);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-card/80 backdrop-blur-sm border-b border-border py-1 rounded-lg">
      <div className="relative overflow-hidden">
        <div ref={scrollRef} className="flex gap-4 animate-scroll whitespace-nowrap" style={{ width: "max-content" }}>
          {doubled.map((item, i) => {
            const Icon = iconMap[item.icon || ""] || Bell;
            return (
              <div key={`${item.id}-${i}`} className="flex items-center gap-1.5 px-2 shrink-0">
                <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[9px] font-medium text-foreground truncate max-w-[100px]">{item.text}</span>
                  <span className="text-[8px] text-muted-foreground truncate max-w-[100px]">{item.subtext}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold text-success ml-0.5">{item.badge}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
