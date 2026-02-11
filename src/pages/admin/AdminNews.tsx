import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminNews = () => {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  const load = () => supabase.from("news").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditingId(null); setForm({ title: "", content: "" }); setOpen(true); };
  const openEdit = (item: any) => { setEditingId(item.id); setForm({ title: item.title, content: item.content || "" }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) return;
    if (editingId) {
      await supabase.from("news").update(form).eq("id", editingId);
      toast({ title: "News updated!" });
    } else {
      await supabase.from("news").insert(form);
      toast({ title: "News created!" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => { await supabase.from("news").delete().eq("id", id); toast({ title: "News deleted" }); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">News & Announcements</h1>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add News</Button>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Title</TableHead><TableHead>Content</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No news</TableCell></TableRow> : items.map(n => (
          <TableRow key={n.id}>
            <TableCell className="text-sm">{new Date(n.created_at).toLocaleDateString()}</TableCell>
            <TableCell className="font-medium">{n.title}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{n.content}</TableCell>
            <TableCell><div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => openEdit(n)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="outline" onClick={() => del(n.id)}><Trash2 className="h-3 w-3" /></Button>
            </div></TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingId ? "Edit News" : "Add News"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-muted-foreground">Title</label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Content</label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} /></div>
            <Button onClick={save} className="w-full">{editingId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminNews;
