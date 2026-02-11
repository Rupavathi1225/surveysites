import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminContests = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: "", amount: 0, start_date: "", end_date: "", description: "", status: "active", excluded_users: [] });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const load = () => supabase.from("contests").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const payload = { ...form, start_date: form.start_date || null, end_date: form.end_date || null };
    if (editing) await supabase.from("contests").update(payload).eq("id", editing);
    else await supabase.from("contests").insert(payload);
    toast({ title: "Saved!" }); setOpen(false); setEditing(null); load();
  };
  const del = async (id: string) => { await supabase.from("contests").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Contests</h1>
        <Button onClick={() => { setForm({ title: "", amount: 0, start_date: "", end_date: "", description: "", status: "active", excluded_users: [] }); setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Contest</Button>
      </div>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Contest</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Title</label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Amount ($)</label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-muted-foreground">Start Date</label><Input type="datetime-local" value={form.start_date?.slice(0,16)} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">End Date</label><Input type="datetime-local" value={form.end_date?.slice(0,16)} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} /> Active</label>
            <Button onClick={save} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Amount</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No contests</TableCell></TableRow> : items.map((c) => (
          <TableRow key={c.id}><TableCell className="font-medium">{c.title}</TableCell><TableCell>${Number(c.amount).toFixed(2)}</TableCell><TableCell className="text-sm">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "-"}</TableCell><TableCell className="text-sm">{c.end_date ? new Date(c.end_date).toLocaleDateString() : "-"}</TableCell><TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell><TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setForm(c); setEditing(c.id); setOpen(true); }}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => del(c.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default AdminContests;
