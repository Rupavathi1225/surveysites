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
import { Plus, Pencil, Trash2, Copy, Play, Upload, Loader2, ExternalLink } from "lucide-react";

const defaultForm = {
  name: "", 
  code: "", 
  point_percentage: 100, 
  is_recommended: false, 
  rating: 0,
  button_text: "Open Survey", 
  color_code: "#3B82F6", 
  button_gradient: "linear-gradient(90deg, #836)",
  content: "", 
  image_url: "", 
  level: 1, 
  iframe_url: "",
  iframe_code: "", 
  iframe_keys: "{user_id}",
  postback_url: "", 
  postback_username_key: "user_id", 
  postback_status_key: "status",
  postback_payout_key: "payout", 
  postback_txn_key: "txn_id",
  different_postback_link: "", 
  payout_type: "points", 
  status: "active"
};

const SurveyProviders = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("survey-provider-images").upload(path, file);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("survey-provider-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast({ title: "Image uploaded!" });
  };

  const fetch = () => supabase.from("survey_providers").select("*").order("created_at", { ascending: false }).then(({ data }) => setProviders(data || []));
  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (editing) await supabase.from("survey_providers").update(form).eq("id", editing);
    else await supabase.from("survey_providers").insert(form);
    toast({ title: editing ? "Updated!" : "Created!" });
    setOpen(false); setForm(defaultForm); setEditing(null); fetch();
  };

  const del = async (id: string) => { await supabase.from("survey_providers").delete().eq("id", id); fetch(); };

  const supabaseUrl = "https://gyafunimpnzctpfbqkgm.supabase.co/functions/v1/receive-postback";
  const getPostbackUrl = (code: string, keys?: any) => {
    const uk = keys?.postback_username_key || form.postback_username_key || 'user_id';
    const sk = keys?.postback_status_key || form.postback_status_key || 'status';
    const pk = keys?.postback_payout_key || form.postback_payout_key || 'payout';
    const tk = keys?.postback_txn_key || form.postback_txn_key || 'txn_id';
    return `${supabaseUrl}/${code}?${uk}={user_id}&${sk}={status}&${pk}={payout}&${tk}={txn_id}`;
  };
  const getTestUrl = (code: string, keys?: any) => {
    const uk = keys?.postback_username_key || form.postback_username_key || 'user_id';
    const sk = keys?.postback_status_key || form.postback_status_key || 'status';
    const pk = keys?.postback_payout_key || form.postback_payout_key || 'payout';
    const tk = keys?.postback_txn_key || form.postback_txn_key || 'txn_id';
    return `${supabaseUrl}/${code}?${uk}=badboysai&${sk}=1&${pk}=10&${tk}=test_${Date.now()}`;
  };
  const postbackUrl = form.code ? getPostbackUrl(form.code) : `${supabaseUrl}/{code}?user_id={user_id}&status={status}&payout={payout}&txn_id={txn_id}`;
  const testPostbackUrl = form.code ? getTestUrl(form.code) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Survey Providers</h1><p className="text-sm text-muted-foreground">Manage offerwall providers with postback</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(defaultForm); setEditing(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Provider</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Provider</DialogTitle>
              <p className="text-sm text-muted-foreground">Configure the survey provider settings including postback</p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Provider name" /></div>
                <div><label className="text-xs text-muted-foreground">Code *</label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="unique_code" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Point %</label><Input type="number" value={form.point_percentage} onChange={(e) => setForm({ ...form, point_percentage: Number(e.target.value) })} /></div>
                <div><label className="text-xs text-muted-foreground">Rating</label><Input type="number" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} min={0} max={5} step={0.1} /></div>
                <div><label className="text-xs text-muted-foreground">Level</label><Input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-muted-foreground">Button Text</label><Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Color Code</label><Input type="color" value={form.color_code} onChange={(e) => setForm({ ...form, color_code: e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Button Gradient</label><Input value={form.button_gradient} onChange={(e) => setForm({ ...form, button_gradient: e.target.value })} placeholder="linear-gradient(90deg, #836)" /></div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Image</label>
                <div className="flex gap-2 items-center">
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://example.com/logo.png" className="flex-1" />
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                      <span>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
                    </Button>
                  </label>
                </div>
                {form.image_url && <img src={form.image_url} alt="Preview" className="h-12 mt-1 object-contain rounded border border-border" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Payout Type</label>
                  <Select value={form.payout_type} onValueChange={v => setForm({ ...form, payout_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="points">Points</SelectItem><SelectItem value="cash">Cash</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_recommended} onCheckedChange={(v) => setForm({ ...form, is_recommended: v })} /> Is Recommended</label>
              <div><label className="text-xs text-muted-foreground">Content / Description</label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Description..." /></div>

              <div className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm text-primary">Iframe Configuration</h3>
                
                <div>
                  <label className="text-xs text-muted-foreground">Iframe URL (Direct link to offer wall)</label>
                  <Input 
                    value={form.iframe_url || ""} 
                    onChange={(e) => setForm({ ...form, iframe_url: e.target.value })} 
                    placeholder="https://offerwall.moustacheleads.com/offerwall?placement_id=XXX&user_id={user_id}&api_key=XXX" 
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Enter the direct URL to the offer wall. Use {'{user_id}'} as placeholder for user ID.</p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Iframe Code (Alternative to URL)</label>
                  <Textarea 
                    value={form.iframe_code || ""} 
                    onChange={(e) => setForm({ ...form, iframe_code: e.target.value })} 
                    placeholder='<iframe src="https://example.com/offerwall" width="100%" height="600"></iframe>' 
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">User ID Key</label>
                    <Input 
                      value={form.iframe_keys || "{user_id}"} 
                      onChange={(e) => setForm({ ...form, iframe_keys: e.target.value })} 
                      placeholder="{user_id}"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Username Key</label>
                    <Input defaultValue="{username}" placeholder="{username}" disabled />
                  </div>
                </div>

                {form.iframe_url && (
                  <div className="bg-accent/30 rounded-md p-2">
                    <p className="text-xs font-medium flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Preview URL:
                    </p>
                    <p className="text-[10px] break-all text-muted-foreground">{form.iframe_url}</p>
                  </div>
                )}
              </div>

              <div className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm text-primary">Postback Configuration</h3>
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
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Username Key</label><Input value={form.postback_username_key} onChange={(e) => setForm({ ...form, postback_username_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Status Key</label><Input value={form.postback_status_key} onChange={(e) => setForm({ ...form, postback_status_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Payout Key</label><Input value={form.postback_payout_key} onChange={(e) => setForm({ ...form, postback_payout_key: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Transaction ID Key</label><Input value={form.postback_txn_key} onChange={(e) => setForm({ ...form, postback_txn_key: e.target.value })} /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Different Postback Link</label><Input value={form.different_postback_link} onChange={(e) => setForm({ ...form, different_postback_link: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4"><p className="text-sm font-medium">📋 Provider List</p></CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Point %</TableHead>
              <TableHead>Iframe URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No providers</TableCell></TableRow> :
            providers.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm">{p.code}</TableCell>
                <TableCell>{p.point_percentage}%</TableCell>
                <TableCell>
                  {p.iframe_url ? (
                    <a href={p.iframe_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  ) : p.iframe_code ? (
                    <Badge variant="outline" className="text-[10px]">Has Code</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">No URL</span>
                  )}
                </TableCell>
                <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                <TableCell className="flex gap-1">
                  {p.code && <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { window.open(getTestUrl(p.code, p), '_blank'); toast({ title: `Test postback sent for ${p.name}!` }); }}><Play className="h-3 w-3" /></Button>}
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