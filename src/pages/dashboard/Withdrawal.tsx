import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    supabase.from("payment_methods").select("*").eq("status", "active").then(({ data }) => setMethods(data || []));
  }, []);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const method = methods.find((m) => m.name === selectedMethod);
    const amt = parseFloat(amount);
    if (!method) { toast({ title: "Select a payment method", variant: "destructive" }); return; }
    if (amt < Number(method.min_amount)) { toast({ title: `Minimum is $${method.min_amount}`, variant: "destructive" }); return; }
    if (amt > Number(profile.cash_balance)) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    const fee = amt * (Number(method.fee_percentage) / 100);
    await supabase.from("withdrawals").insert({ user_id: profile.id, payment_method: selectedMethod, account_id: accountId, amount: amt, fee });
    toast({ title: "Withdrawal requested!" });
    setAmount(""); setAccountId("");
  };

  const defaultMethods = [
    { name: "UPI", min: "$4", fee: "2%" },
    { name: "Bank", min: "$7", fee: "2%" },
    { name: "PayPal", min: "$10", fee: "2%" },
    { name: "Skrill", min: "$10", fee: "2%" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdrawal</h1>
      <div className="grid md:grid-cols-4 gap-3">
        {defaultMethods.map((m) => (
          <Card key={m.name}><CardContent className="p-4 text-center">
            <p className="font-medium">{m.name}</p>
            <p className="text-xs text-muted-foreground">Min: {m.min} · Fee: {m.fee}</p>
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
