import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Check, X, Trash2, AlertTriangle, Pause } from "lucide-react";

const AdminWithdrawals = () => {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  const load = () => {
    Promise.all([
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, email"),
    ]).then(([wRes, uRes]) => {
      setItems(wRes.data || []);
      setUsers(uRes.data || []);
    });
  };
  useEffect(() => { load(); }, []);

  const getUsername = (userId: string) => {
    const u = users.find(p => p.id === userId);
    return u?.username || u?.email || userId?.slice(0, 8);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("withdrawals").update({ status }).eq("id", id);
    const w = items.find(i => i.id === id);
    if (w && status === "approved") {
      const username = getUsername(w.user_id);
      await supabase.from("notifications").insert({
        type: "payment_completed",
        message: `✅ ${username}'s withdrawal of $${Number(w.amount).toFixed(2)} via ${w.payment_method} has been approved!`,
        is_global: true, user_id: w.user_id,
      });
    }
    toast({ title: `Withdrawal ${status}` }); load();
  };
  const del = async (id: string) => { await supabase.from("withdrawals").delete().eq("id", id); load(); };

  const filtered = filter === "all" ? items : items.filter(w => w.status === filter);

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      success: "default", approved: "default", rejected: "destructive",
      suspicious: "destructive", paused: "secondary", pending: "secondary"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspicious">Suspicious</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["pending", "approved", "rejected", "suspicious"].map(status => {
          const count = items.filter(w => w.status === status).length;
          return (
            <Card key={status} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setFilter(status)}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Method</TableHead>
        <TableHead>Account</TableHead><TableHead>Amount</TableHead><TableHead>Fee</TableHead>
        <TableHead>Status</TableHead><TableHead>Actions</TableHead>
      </TableRow></TableHeader><TableBody>
        {filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No withdrawals</TableCell></TableRow> : filtered.map((w) => (
          <TableRow key={w.id}>
            <TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="font-medium">{getUsername(w.user_id)}</TableCell>
            <TableCell>{w.payment_method}</TableCell>
            <TableCell className="text-sm">{w.account_id}</TableCell>
            <TableCell className="font-medium">${Number(w.amount).toFixed(2)}</TableCell>
            <TableCell className="text-sm">${Number(w.fee || 0).toFixed(2)}</TableCell>
            <TableCell>{statusBadge(w.status)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                {(w.status === "pending" || w.status === "paused") && (
                  <>
                    <Button size="sm" variant="outline" title="Approve" onClick={() => updateStatus(w.id, "approved")}><Check className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" title="Reject" onClick={() => updateStatus(w.id, "rejected")}><X className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" title="Suspicious" onClick={() => updateStatus(w.id, "suspicious")}><AlertTriangle className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" title="Pause" onClick={() => updateStatus(w.id, "paused")}><Pause className="h-3 w-3" /></Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => del(w.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default AdminWithdrawals;
