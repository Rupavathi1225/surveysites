import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wallet, Search, Users, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [balanceAction, setBalanceAction] = useState("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState("points");
  const [offerName, setOfferName] = useState("");
  const [bonusPercent, setBonusPercent] = useState("0");

  // Add User states
  const [addTab, setAddTab] = useState<"single" | "bulk">("single");
  const [singleForm, setSingleForm] = useState({ first_name: "", last_name: "", username: "", email: "", mobile: "", country: "India", role: "user" });
  const [bulkBase, setBulkBase] = useState("");
  const [bulkPassword, setBulkPassword] = useState("");
  const [bulkCountry, setBulkCountry] = useState("India");
  const [bulkCount, setBulkCount] = useState("1");
  const [creating, setCreating] = useState(false);

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

  const handleSingleCreate = async () => {
    if (!singleForm.username || !singleForm.email) {
      toast({ title: "Username and Email are required", variant: "destructive" }); return;
    }
    setCreating(true);
    try {
      const password = Math.random().toString(36).slice(2, 12) + "A1!";
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast({ title: "Not authenticated", variant: "destructive" }); setCreating(false); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          users: [{ username: singleForm.username, email: singleForm.email, password }],
          country: singleForm.country,
          activityScheduling: false,
          timeGap: 0,
          singleUserData: {
            first_name: singleForm.first_name,
            last_name: singleForm.last_name,
            mobile: singleForm.mobile,
            role: singleForm.role,
          },
        }),
      });
      const result = await res.json();
      if (result.error) { toast({ title: result.error, variant: "destructive" }); }
      else { toast({ title: `User "${singleForm.username}" created!` }); setAddOpen(false); setSingleForm({ first_name: "", last_name: "", username: "", email: "", mobile: "", country: "India", role: "user" }); load(); }
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
    setCreating(false);
  };

  const handleBulkCreate = async () => {
    if (!bulkBase.trim()) { toast({ title: "Enter a base username", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const count = parseInt(bulkCount) || 1;
      const users = Array.from({ length: count }, (_, i) => {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        const username = `${bulkBase}${i + 1}`;
        return {
          username,
          email: `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}${Math.floor(Math.random() * 999)}@generated.local`,
          password: bulkPassword || (Math.random().toString(36).slice(2, 12) + "A1!"),
        };
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast({ title: "Not authenticated", variant: "destructive" }); setCreating(false); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ users, country: bulkCountry, activityScheduling: false, timeGap: 0 }),
      });
      const result = await res.json();
      if (result.error) { toast({ title: result.error, variant: "destructive" }); }
      else { toast({ title: `${result.total} users created!` }); setAddOpen(false); load(); }
    } catch (err: any) { toast({ title: "Failed", description: err.message, variant: "destructive" }); }
    setCreating(false);
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.username || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || (u.first_name || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage platform users</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> User List ({filtered.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  ) : filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username || "—"}</TableCell>
                      <TableCell className="text-sm">{u.email || "—"}</TableCell>
                      <TableCell className="text-sm">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
                      <TableCell className="text-sm">{u.mobile || "—"}</TableCell>
                      <TableCell>{u.points || 0}</TableCell>
                      <TableCell>${Number(u.cash_balance || 0).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" title="Manage Balance" onClick={() => { setSelectedUser(u); setBalanceOpen(true); }}><Wallet className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" title="Delete" onClick={() => del(u.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Balance Dialog */}
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

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <p className="text-sm text-muted-foreground">Create single or bulk users</p>
          </DialogHeader>
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-accent/40 rounded-lg p-1">
              <button onClick={() => setAddTab("single")} className={`flex-1 py-2 text-sm rounded-md transition-colors ${addTab === "single" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}>Single User</button>
              <button onClick={() => setAddTab("bulk")} className={`flex-1 py-2 text-sm rounded-md transition-colors ${addTab === "bulk" ? "bg-background shadow font-medium" : "text-muted-foreground"}`}>Bulk Creation</button>
            </div>

            {addTab === "single" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">First Name</label><Input value={singleForm.first_name} onChange={e => setSingleForm(p => ({ ...p, first_name: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Last Name</label><Input value={singleForm.last_name} onChange={e => setSingleForm(p => ({ ...p, last_name: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Username *</label><Input value={singleForm.username} onChange={e => setSingleForm(p => ({ ...p, username: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Email *</label><Input value={singleForm.email} onChange={e => setSingleForm(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Mobile</label><Input value={singleForm.mobile} onChange={e => setSingleForm(p => ({ ...p, mobile: e.target.value }))} /></div>
                  <div><label className="text-sm font-medium">Country</label><Input value={singleForm.country} onChange={e => setSingleForm(p => ({ ...p, country: e.target.value }))} /></div>
                </div>
                <div><label className="text-sm font-medium">Role</label>
                  <Select value={singleForm.role} onValueChange={v => setSingleForm(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="subadmin">Sub Admin</SelectItem></SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Note: A random password will be generated. The user can reset it via email.</p>
                <Button onClick={handleSingleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create User
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Base Username *</label><Input value={bulkBase} onChange={e => setBulkBase(e.target.value)} placeholder="e.g., user" /><p className="text-xs text-muted-foreground mt-1">Users will be: user1, user2, user3...</p></div>
                  <div><label className="text-sm font-medium">Common Password</label><Input value={bulkPassword} onChange={e => setBulkPassword(e.target.value)} placeholder="Auto-generated if empty" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Country</label><Input value={bulkCountry} onChange={e => setBulkCountry(e.target.value)} /></div>
                  <div><label className="text-sm font-medium">How Many Users *</label><Input type="number" min="1" max="100" value={bulkCount} onChange={e => setBulkCount(e.target.value)} /></div>
                </div>
                <Button onClick={handleBulkCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Create {bulkCount} Users
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={() => setAddOpen(false)} className="w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminUsers;
