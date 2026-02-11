import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tag } from "lucide-react";

const Promocode = () => {
  const { profile, user, fetchProfile } = useAuth();
  const [code, setCode] = useState("");

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    const { data: promo } = await supabase.from("promocodes").select("*").eq("code", code.trim().toUpperCase()).eq("status", "active").single();
    if (!promo) { toast({ title: "Invalid or expired code", variant: "destructive" }); return; }
    // Check if already redeemed
    const { data: existing } = await supabase.from("promocode_redemptions").select("id").eq("user_id", profile.id).eq("promocode_id", promo.id).single();
    if (existing) { toast({ title: "Already redeemed", variant: "destructive" }); return; }
    await supabase.from("promocode_redemptions").insert({ user_id: profile.id, promocode_id: promo.id });
    await supabase.from("profiles").update({ points: profile.points + promo.reward }).eq("id", profile.id);
    await supabase.from("earning_history").insert({ user_id: profile.id, description: `Promocode: ${promo.code}`, amount: promo.reward, type: "promo" });
    await supabase.from("notifications").insert({ user_id: profile.id, type: "promo", message: `${profile.username} redeemed promocode ${promo.code} (${promo.reward} pts)`, is_global: true });
    toast({ title: `Redeemed! +${promo.reward} points` });
    setCode("");
    fetchProfile(user.id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Promocode</h1>
      <Card><CardContent className="p-6">
        <form onSubmit={handleRedeem} className="max-w-md space-y-4">
          <p className="text-muted-foreground text-sm">Enter a promo code to earn bonus points</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter promo code" className="pl-9" required />
            </div>
            <Button type="submit">Redeem</Button>
          </div>
        </form>
      </CardContent></Card>
    </div>
  );
};
export default Promocode;
