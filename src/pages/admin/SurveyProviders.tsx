import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const defaultForm = { name: "", code: "", point_percentage: 100, is_recommended: false, rating: 0, button_text: "Open Survey", color_code: "", button_gradient: "", content: "", image_url: "", level: 1, iframe_code: "", iframe_keys: "", postback_url: "", postback_username_key: "", postback_status_key: "", postback_payout_key: "", postback_txn_key: "", different_postback_link: "", payout_type: "points", status: "active" };

const SurveyProviders = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetch = () => supabase.from("survey_providers").select("*").order("created_at", { ascending: false }).then(({ data }) => setProviders(data || []));
  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (editing) await supabase.from("survey_providers").update(form).eq("id", editing);
    else await supabase.from("survey_providers").insert(form);
    toast({ title: editing ? "Updated!" : "Created!" });
    setOpen(false); setForm(defaultForm); setEditing(null); fetch();
  };

  const del = async (id: string) => { await supabase.from("survey_providers").delete().eq("id", id); fetch(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Survey Providers</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(defaultForm); setEditing(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Provider</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Survey Provider</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Code</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Point %</label><Input type="number" value={form.point_percentage} onChange={(e) => setForm({ ...form, point_percentage: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">Rating</label><Input type="number" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} min={0} max={5} step={0.1} /></div>
                <div><label className="text-xs text-muted-foreground">Button Text</label><Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Color Code</label><Input value={form.color_code} onChange={(e) => setForm({ ...form, color_code: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Button Gradient</label><Input value={form.button_gradient} onChange={(e) => setForm({ ...form, button_gradient: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Image URL</label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Level</label><Input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">Payout Type</label><Input value={form.payout_type} onChange={(e) => setForm({ ...form, payout_type: e.target.value })} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Content</label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Iframe Code</label><Textarea value={form.iframe_code} onChange={(e) => setForm({ ...form, iframe_code: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Iframe Keys</label><Input value={form.iframe_keys} onChange={(e) => setForm({ ...form, iframe_keys: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Postback URL</label><Input value={form.postback_url} onChange={(e) => setForm({ ...form, postback_url: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Postback Username Key</label><Input value={form.postback_username_key} onChange={(e) => setForm({ ...form, postback_username_key: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Postback Status Key</label><Input value={form.postback_status_key} onChange={(e) => setForm({ ...form, postback_status_key: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Postback Payout Key</label><Input value={form.postback_payout_key} onChange={(e) => setForm({ ...form, postback_payout_key: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Postback TXN Key</label><Input value={form.postback_txn_key} onChange={(e) => setForm({ ...form, postback_txn_key: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Different Postback Link</label><Input value={form.different_postback_link} onChange={(e) => setForm({ ...form, different_postback_link: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_recommended} onCheckedChange={(v) => setForm({ ...form, is_recommended: v })} /> Recommended</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} /> Active</label>
              </div>
              <Button onClick={save} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Point %</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {providers.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No providers</TableCell></TableRow> :
            providers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm">{p.code}</TableCell>
                <TableCell>{p.point_percentage}%</TableCell>
                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setForm(p); setEditing(p.id); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default SurveyProviders;
