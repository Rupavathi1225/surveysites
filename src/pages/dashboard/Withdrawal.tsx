import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const Withdrawal = () => {
  const { profile } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");

  const defaultMethods = [
    { name: "UPI", min: 4, fee: 2 },
    { name: "Bank", min: 7, fee: 2 },
    { name: "PayPal", min: 10, fee: 2 },
    { name: "Skrill", min: 10, fee: 2 },
  ];

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("status", "active").then(({ data }) => setMethods(data || []));
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!selectedMethod) { toast({ title: "Select a payment method", variant: "destructive" }); return; }
    
    const amt = parseFloat(amount);
    // Try DB method first, fall back to defaults
    const dbMethod = methods.find((m) => m.name === selectedMethod);
    const fallback = defaultMethods.find((m) => m.name === selectedMethod);
    const minAmount = dbMethod ? Number(dbMethod.min_amount) : (fallback?.min || 0);
    const feePercent = dbMethod ? Number(dbMethod.fee_percentage) : (fallback?.fee || 0);

    if (amt < minAmount) { toast({ title: `Minimum is $${minAmount}`, variant: "destructive" }); return; }
    if (amt > Number(profile.cash_balance)) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    
    const fee = amt * (feePercent / 100);
    const { error } = await supabase.from("withdrawals").insert({ user_id: profile.id, payment_method: selectedMethod, account_id: accountId, amount: amt, fee });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    
    // Create notification for activity feed
    await supabase.from("notifications").insert({
      type: "payment_requested",
      message: `${profile.first_name || profile.username || "User"} requested a $${amt.toFixed(2)} withdrawal via ${selectedMethod}`,
      is_global: true,
      user_id: profile.id,
    });
    
    toast({ title: "Withdrawal requested!" });
    setAmount(""); setAccountId(""); setSelectedMethod("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdrawal</h1>
      <div className="grid md:grid-cols-4 gap-3">
        {defaultMethods.map((m) => (
          <Card key={m.name}><CardContent className="p-4 text-center">
            <p className="font-medium">{m.name}</p>
            <p className="text-xs text-muted-foreground">Min: ${m.min} · Fee: {m.fee}%</p>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleWithdraw} className="space-y-4 max-w-md">
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
              <SelectContent>{defaultMethods.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Account ID (UPI/Bank/Email)" value={accountId} onChange={(e) => setAccountId(e.target.value)} required />
            <Input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" />
            <p className="text-sm text-muted-foreground">Available: ${Number(profile?.cash_balance || 0).toFixed(2)}</p>
            <Button type="submit">Request Withdrawal</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
export default Withdrawal;
