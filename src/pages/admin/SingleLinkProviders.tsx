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
import { Plus, Pencil, Trash2, Copy, Play } from "lucide-react";

const defaultForm = {
  name: "", code: "", point_percentage: 100, different_postback: false, status: "active",
  link_keys: "", postback_url: "", postback_username_key: "user_id", postback_status_key: "status",
  postback_payout_key: "payout", postback_txn_key: "txn_id", success_value: "1", fail_value: "0",
  payout_type: "points"
};

const SingleLinkProviders = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const load = () => supabase.from("single_link_providers").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const save = async () => { if (editing) await supabase.from("single_link_providers").update(form).eq("id", editing); else await supabase.from("single_link_providers").insert(form); toast({ title: "Saved!" }); setOpen(false); setForm(defaultForm); setEditing(null); load(); };
  const del = async (id: string) => { await supabase.from("single_link_providers").delete().eq("id", id); load(); };

  const supabaseUrl = "https://gyafunimpnzctpfbqkgm.supabase.co/functions/v1/receive-postback";
  const getTestUrl = (code: string, keys?: any) => {
    const uk = keys?.postback_username_key || form.postback_username_key || 'user_id';
    const sk = keys?.postback_status_key || form.postback_status_key || 'status';
    const pk = keys?.postback_payout_key || form.postback_payout_key || 'payout';
    const tk = keys?.postback_txn_key || form.postback_txn_key || 'txn_id';
    return `${supabaseUrl}/${code}?${uk}=badboysai&${sk}=1&${pk}=10&${tk}=test_${Date.now()}`;
  };
  const postbackUrl = form.code ? `${supabaseUrl}/${form.code}?${form.postback_username_key || 'user_id'}={user_id}&${form.postback_status_key || 'status'}={status}&${form.postback_payout_key || 'payout'}={payout}&${form.postback_txn_key || 'txn_id'}={txn_id}` : `${supabaseUrl}/{code}?user_id={user_id}&status={status}&payout={payout}&txn_id={txn_id}`;
  const testPostbackUrl = form.code ? getTestUrl(form.code) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Single Link Providers</h1><p className="text-sm text-muted-foreground">Manage single link survey providers with postback</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(defaultForm); setEditing(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Provider</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Single Link Provider</DialogTitle>
              <p className="text-sm text-muted-foreground">Configure the single link provider with postback settings</p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Provider name" /></div>
                <div><label className="text-xs text-muted-foreground">Code *</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="unique_code" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Point Percentage (%)</label><Input type="number" value={form.point_percentage} onChange={(e) => setForm({ ...form, point_percentage: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">Payout Type</label>
                  <Select value={form.payout_type} onValueChange={v => setForm({ ...form, payout_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="points">Points</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><label className="text-xs text-muted-foreground">Postback URL (Give this to Provider)</label>
                <div className="flex gap-2">
                  <Input value={postbackUrl} readOnly className="text-xs bg-accent" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(postbackUrl); toast({ title: "Copied!" }); }}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
              {testPostbackUrl && (
                <div><label className="text-xs font-medium text-primary">🧪 Test Postback (Click to send test - credits 10 points to badboysai)</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={testPostbackUrl} readOnly className="text-xs bg-accent border-primary/30" />
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { window.open(getTestUrl(form.code), '_blank'); toast({ title: "Test postback sent! Check Postback Logs." }); }}><Play className="h-3 w-3 mr-1" /> Test</Button>
                  </div>
                </div>
              )}

              <div className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm">Postback Keys</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Username Key</label><Input value={form.postback_username_key} onChange={(e) => setForm({ ...form, postback_username_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Status Key</label><Input value={form.postback_status_key} onChange={(e) => setForm({ ...form, postback_status_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Payout Key</label><Input value={form.postback_payout_key} onChange={(e) => setForm({ ...form, postback_payout_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Transaction ID Key</label><Input value={form.postback_txn_key} onChange={(e) => setForm({ ...form, postback_txn_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Success Value</label><Input value={form.success_value} onChange={(e) => setForm({ ...form, success_value: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Failed Value</label><Input value={form.fail_value} onChange={(e) => setForm({ ...form, fail_value: e.target.value })} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground">Level</label><Input type="number" defaultValue={1} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.different_postback} onCheckedChange={(v) => setForm({ ...form, different_postback: v })} /> Is Recommended</label>
              <div><label className="text-xs text-muted-foreground">Content / Description</label><Textarea placeholder="Provider description..." /></div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4"><p className="text-sm font-medium">🔗 Provider List</p></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Point %</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No providers</TableCell></TableRow> : items.map((p) => (
          <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.code}</TableCell><TableCell>{p.point_percentage}%</TableCell><TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell><TableCell className="flex gap-1">{p.code && <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { window.open(getTestUrl(p.code, p), '_blank'); toast({ title: `Test postback sent for ${p.name}!` }); }}><Play className="h-3 w-3" /></Button>}<Button size="sm" variant="outline" onClick={() => { setForm(p); setEditing(p.id); setOpen(true); }}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default SingleLinkProviders;
