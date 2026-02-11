import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const BalanceHistory = () => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("earning_history").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => setHistory(data || []));
  }, [profile]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Balance History</h1>
      <p className="text-muted-foreground">Track all your earnings and deductions</p>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No balance history yet</TableCell></TableRow>
              ) : history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">{new Date(h.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{h.description || h.offer_name}</TableCell>
                  <TableCell className="text-sm font-medium">{Number(h.amount) > 0 ? "+" : ""}{h.amount}</TableCell>
                  <TableCell><Badge variant={h.status === "approved" ? "default" : "secondary"}>{h.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default BalanceHistory;
