import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const SubAdmins = () => {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [open, setOpen] = useState(false);
  const load = async () => {
    const { data: subs } = await supabase.from("sub_admins").select("*");
    setItems(subs || []);
    const { data: allUsers } = await supabase.from("profiles").select("id, username, email, role");
    setUsers(allUsers || []);
  };
  useEffect(() => { load(); }, []);

  const addSubAdmin = async () => {
    if (!selectedUserId) return;
    await supabase.from("profiles").update({ role: "subadmin" }).eq("id", selectedUserId);
    await supabase.from("sub_admins").insert({ user_id: selectedUserId });
    toast({ title: "Sub-admin created!" }); setOpen(false); load();
  };

  const removeSubAdmin = async (id: string, userId: string) => {
    await supabase.from("sub_admins").delete().eq("id", id);
    await supabase.from("profiles").update({ role: "user" }).eq("id", userId);
    toast({ title: "Sub-admin removed" }); load();
  };

  const availableUsers = users.filter((u) => u.role === "user");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Sub Admins</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Sub Admin</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add Sub Admin</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <select className="w-full p-2 bg-input border border-border rounded-lg text-sm" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">Select user...</option>
                {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
              </select>
              <Button onClick={addSubAdmin} className="w-full">Make Sub Admin</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No sub-admins</TableCell></TableRow> : items.map((s) => {
          const u = users.find((u) => u.id === s.user_id);
          return <TableRow key={s.id}><TableCell>{u?.username || s.user_id?.slice(0,8)}</TableCell><TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => removeSubAdmin(s.id, s.user_id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>;
        })}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default SubAdmins;
