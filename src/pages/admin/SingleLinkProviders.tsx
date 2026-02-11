import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const defaultForm = { name: "", code: "", point_percentage: 100, different_postback: false, status: "active", link_keys: "", postback_url: "", postback_username_key: "", postback_status_key: "", postback_payout_key: "", postback_txn_key: "", success_value: "", fail_value: "", payout_type: "points" };

const SingleLinkProviders = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const load = () => supabase.from("single_link_providers").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const save = async () => { if (editing) await supabase.from("single_link_providers").update(form).eq("id", editing); else await supabase.from("single_link_providers").insert(form); toast({ title: "Saved!" }); setOpen(false); setForm(defaultForm); setEditing(null); load(); };
  const del = async (id: string) => { await supabase.from("single_link_providers").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Single Link Providers</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(defaultForm); setEditing(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Single Link Provider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {[["name","Name"],["code","Code"],["link_keys","Link Keys"],["postback_url","Postback URL"],["postback_username_key","Username Key"],["postback_status_key","Status Key"],["postback_payout_key","Payout Key"],["postback_txn_key","TXN Key"],["success_value","Success Value"],["fail_value","Fail Value"],["payout_type","Payout Type"]].map(([k,l]) => (
                <div key={k}><label className="text-xs text-muted-foreground">{l}</label><Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></div>
              ))}
              <div><label className="text-xs text-muted-foreground">Point %</label><Input type="number" value={form.point_percentage} onChange={(e) => setForm({ ...form, point_percentage: Number(e.target.value) })} /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.different_postback} onCheckedChange={(v) => setForm({ ...form, different_postback: v })} /> Different Postback</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} /> Active</label>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No providers</TableCell></TableRow> : items.map((p) => (
          <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.code}</TableCell><TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell><TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setForm(p); setEditing(p.id); setOpen(true); }}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default SingleLinkProviders;
