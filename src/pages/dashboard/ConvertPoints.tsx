import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeftRight } from "lucide-react";

const ConvertPoints = () => {
  const { profile, user, fetchProfile } = useAuth();
  const [pointsToConvert, setPointsToConvert] = useState("");
  const rate = 0.01; // 1 point = $0.01

  const handleConvert = async () => {
    if (!profile || !user) return;
    const pts = parseInt(pointsToConvert);
    if (isNaN(pts) || pts <= 0) { toast({ title: "Enter valid points", variant: "destructive" }); return; }
    if (pts > profile.points) { toast({ title: "Insufficient points", variant: "destructive" }); return; }
    const cash = pts * rate;
    await supabase.from("profiles").update({ points: profile.points - pts, cash_balance: Number(profile.cash_balance) + cash }).eq("id", profile.id);
    await supabase.from("earning_history").insert({ user_id: profile.id, description: `Converted ${pts} points to $${cash.toFixed(2)}`, amount: cash, type: "conversion" });
    toast({ title: `Converted ${pts} points to $${cash.toFixed(2)}` });
    fetchProfile(user.id);
    setPointsToConvert("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Convert Points</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Points → Cash</p>
          <p className="text-2xl font-bold text-primary">1 point = $0.01</p>
        </CardContent></Card>
        <Card><CardContent className="p-6 text-center">
          <p className="text-muted-foreground text-sm">Cash → Points</p>
          <p className="text-2xl font-bold text-info">$1 = 100 points</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="max-w-md space-y-4">
            <p className="text-sm text-muted-foreground">Your points: <span className="font-bold text-foreground">{profile?.points || 0}</span></p>
            <Input type="number" placeholder="Points to convert" value={pointsToConvert} onChange={(e) => setPointsToConvert(e.target.value)} />
            {pointsToConvert && <p className="text-sm">You'll receive: <span className="text-primary font-bold">${(parseInt(pointsToConvert || "0") * rate).toFixed(2)}</span></p>}
            <Button onClick={handleConvert}><ArrowLeftRight className="h-4 w-4 mr-2" /> Convert</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default ConvertPoints;
