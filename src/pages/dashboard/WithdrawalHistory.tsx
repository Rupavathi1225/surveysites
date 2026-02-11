import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const WithdrawalHistory = () => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("withdrawals").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => setHistory(data || []));
  }, [profile]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdrawal History</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>TXN ID</TableHead></TableRow></TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No withdrawals yet</TableCell></TableRow>
            ) : history.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{w.payment_method}</TableCell>
                <TableCell className="font-medium">${Number(w.amount).toFixed(2)}</TableCell>
                <TableCell><Badge variant={w.status === "success" ? "default" : w.status === "rejected" ? "destructive" : "secondary"}>{w.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{w.txn_id || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default WithdrawalHistory;
