import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAction, setBalanceAction] = useState("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState("points");
  const [offerName, setOfferName] = useState("");
  const [bonusPercent, setBonusPercent] = useState("0");
  const [form, setForm] = useState({ first_name: "", last_name: "", username: "", email: "", mobile: "", country: "India", role: "user", status: "active" });

  const load = () => supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setUsers(data || []));
  useEffect(() => { load(); }, []);

  const del = async (id: string) => { await supabase.from("profiles").delete().eq("id", id); load(); };

  const handleBalance = async () => {
    if (!selectedUser) return;
    const amt = parseFloat(balanceAmount);
    const bonus = parseFloat(bonusPercent) / 100;
    const finalAmt = amt + (amt * bonus);
    if (balanceType === "points") {
      const newPoints = balanceAction === "add" ? selectedUser.points + finalAmt : selectedUser.points - finalAmt;
      await supabase.from("profiles").update({ points: Math.max(0, newPoints) }).eq("id", selectedUser.id);
    } else {
      const newCash = balanceAction === "add" ? Number(selectedUser.cash_balance) + finalAmt : Number(selectedUser.cash_balance) - finalAmt;
      await supabase.from("profiles").update({ cash_balance: Math.max(0, newCash) }).eq("id", selectedUser.id);
    }
    await supabase.from("earning_history").insert({ user_id: selectedUser.id, description: `Admin ${balanceAction}: ${balanceType}`, amount: balanceAction === "add" ? finalAmt : -finalAmt, offer_name: offerName, bonus_percentage: parseFloat(bonusPercent), type: balanceType });
    toast({ title: `Balance ${balanceAction}ed!` }); setBalanceOpen(false); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Users</h1></div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Points</TableHead><TableHead>Cash</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {users.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users</TableCell></TableRow> : users.map((u) => (
          <TableRow key={u.id}><TableCell>{u.first_name} {u.last_name}</TableCell><TableCell>{u.username}</TableCell><TableCell className="text-sm">{u.email}</TableCell><TableCell>{u.points}</TableCell><TableCell>${Number(u.cash_balance).toFixed(2)}</TableCell><TableCell><Badge>{u.role}</Badge></TableCell><TableCell><Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge></TableCell>
          <TableCell className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => { setSelectedUser(u); setBalanceOpen(true); }}><Wallet className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" onClick={() => del(u.id)}><Trash2 className="h-3 w-3" /></Button>
          </TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>

      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent><DialogHeader><DialogTitle>Manage Balance: {selectedUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={balanceAction} onValueChange={setBalanceAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="add">Add</SelectItem><SelectItem value="deduct">Deduct</SelectItem></SelectContent></Select>
            <Select value={balanceType} onValueChange={setBalanceType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="points">Points</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent></Select>
            <div><label className="text-xs text-muted-foreground">Amount</label><Input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Offer Name (optional)</label><Input value={offerName} onChange={(e) => setOfferName(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Bonus % (optional)</label><Input type="number" value={bonusPercent} onChange={(e) => setBonusPercent(e.target.value)} /></div>
            {balanceAmount && <p className="text-sm">Final: {parseFloat(balanceAmount || "0") + (parseFloat(balanceAmount || "0") * parseFloat(bonusPercent || "0") / 100)} {balanceType}</p>}
            <Button onClick={handleBalance} className="w-full">{balanceAction === "add" ? "Add" : "Deduct"} Balance</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminUsers;
