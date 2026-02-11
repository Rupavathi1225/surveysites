import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminPromocodes = () => {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", reward: 0, status: "active" });

  const load = () => supabase.from("promocodes").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditingId(null); setForm({ code: "", reward: 0, status: "active" }); setOpen(true); };
  const openEdit = (item: any) => { setEditingId(item.id); setForm({ code: item.code, reward: item.reward || 0, status: item.status || "active" }); setOpen(true); };

  const save = async () => {
    if (!form.code.trim()) return;
    if (editingId) {
      await supabase.from("promocodes").update(form).eq("id", editingId);
      toast({ title: "Promocode updated!" });
    } else {
      await supabase.from("promocodes").insert(form);
      toast({ title: "Promocode created!" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => { await supabase.from("promocodes").delete().eq("id", id); toast({ title: "Promocode deleted" }); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Promocodes</h1>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Promocode</Button>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Reward (pts)</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No promocodes</TableCell></TableRow> : items.map(p => (
          <TableRow key={p.id}>
            <TableCell className="font-mono font-medium">{p.code}</TableCell>
            <TableCell>{p.reward}</TableCell>
            <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
            <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
            <TableCell><div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button>
            </div></TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingId ? "Edit Promocode" : "Add Promocode"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Code</label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAVE20" /></div>
            <div><label className="text-xs text-muted-foreground">Reward (Points)</label><Input type="number" value={form.reward} onChange={e => setForm({ ...form, reward: parseInt(e.target.value) || 0 })} /></div>
            <div><label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full">{editingId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminPromocodes;
