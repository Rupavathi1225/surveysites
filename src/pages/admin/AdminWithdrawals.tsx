import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Check, X, Trash2 } from "lucide-react";

const AdminWithdrawals = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = () => supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const updateStatus = async (id: string, status: string) => { await supabase.from("withdrawals").update({ status }).eq("id", id); toast({ title: `Withdrawal ${status}` }); load(); };
  const del = async (id: string) => { await supabase.from("withdrawals").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdrawals</h1>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Method</TableHead><TableHead>Account</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No withdrawals</TableCell></TableRow> : items.map((w) => (
          <TableRow key={w.id}><TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString()}</TableCell><TableCell className="text-xs font-mono">{w.user_id?.slice(0,8)}</TableCell><TableCell>{w.payment_method}</TableCell><TableCell className="text-sm">{w.account_id}</TableCell><TableCell className="font-medium">${Number(w.amount).toFixed(2)}</TableCell><TableCell><Badge variant={w.status === "success" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>{w.status}</Badge></TableCell>
          <TableCell className="flex gap-1">{w.status === "pending" && <><Button size="sm" variant="outline" onClick={() => updateStatus(w.id, "success")}><Check className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => updateStatus(w.id, "rejected")}><X className="h-3 w-3" /></Button></>}<Button size="sm" variant="outline" onClick={() => del(w.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default AdminWithdrawals;
