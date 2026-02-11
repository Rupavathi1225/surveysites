import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const SurveyLinks = () => {
  const [items, setItems] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", payout: 0, link: "", link_offer_id: "", survey_provider_id: null, country: "", is_recommended: false, button_text: "Start Survey", color_code: "", button_gradient: "", rating: 0, image_url: "", content: "", level: 1, status: "active" });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const load = () => { supabase.from("survey_links").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || [])); supabase.from("survey_providers").select("id, name").then(({ data }) => setProviders(data || [])); };
  useEffect(() => { load(); }, []);
  const save = async () => { if (editing) await supabase.from("survey_links").update(form).eq("id", editing); else await supabase.from("survey_links").insert(form); toast({ title: "Saved!" }); setOpen(false); setEditing(null); load(); };
  const del = async (id: string) => { await supabase.from("survey_links").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Survey Links</h1><p className="text-sm text-muted-foreground">Manage individual survey links</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Link</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Survey Link</DialogTitle>
              <p className="text-sm text-muted-foreground">Configure the survey link settings</p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Payout (points)</label><Input type="number" value={form.payout} onChange={(e) => setForm({ ...form, payout: Number(e.target.value) })} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Link URL</label><Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Survey Provider</label>
                  <Select value={form.survey_provider_id || ""} onValueChange={v => setForm({ ...form, survey_provider_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground">Country</label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="All countries" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Button Text</label><Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_recommended} onCheckedChange={(v) => setForm({ ...form, is_recommended: v })} /> Is Recommended</label>
              <div><label className="text-xs text-muted-foreground">Description</label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4"><p className="text-sm font-medium">🔗 Links List</p></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Payout</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No survey links</TableCell></TableRow> : items.map((s) => (
          <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.payout} pts</TableCell><TableCell>{s.country || "All"}</TableCell><TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge></TableCell><TableCell className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setForm(s); setEditing(s.id); setOpen(true); }}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => del(s.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default SurveyLinks;
