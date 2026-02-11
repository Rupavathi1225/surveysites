import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const defaultForm = {
  offer_id: "", title: "", url: "", payout: 0, currency: "USD", payout_model: "CPA",
  countries: "", allowed_countries: "", platform: "", device: "", vertical: "",
  preview_url: "", image_url: "", traffic_sources: "", devices: "",
  expiry_date: "", percent: 0, non_access_url: "", description: "", status: "active"
};

const AdminOffers = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => supabase.from("offers").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(defaultForm); setEditing(null); setOpen(true); };
  const openEdit = (item: any) => { setForm({ ...item, expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split("T")[0] : "" }); setEditing(item.id); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const payload = { ...form, expiry_date: form.expiry_date || null };
    if (editing) {
      await supabase.from("offers").update(payload).eq("id", editing);
      toast({ title: "Offer updated!" });
    } else {
      await supabase.from("offers").insert(payload);
      // Create notification for activity feed
      await supabase.from("notifications").insert({
        type: "offer_added",
        message: `New offer added: ${form.title} (${form.currency} ${form.payout})`,
        is_global: true,
      });
      toast({ title: "Offer created!" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => { await supabase.from("offers").delete().eq("id", id); toast({ title: "Offer deleted" }); load(); };
  const toggleStatus = async (id: string, current: string) => {
    await supabase.from("offers").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offers Management</h1>
          <p className="text-sm text-muted-foreground">Manage offers via manual entry, bulk upload, or Google Sheets</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Offer</Button>
      </div>

      <Card><CardContent className="p-4"><p className="text-sm font-medium">📦 Offers List ({items.length})</p></CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Offer ID</TableHead><TableHead>Title</TableHead><TableHead>Payout</TableHead>
            <TableHead>Currency</TableHead><TableHead>Model</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No offers yet</TableCell></TableRow>
            ) : items.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="text-sm font-mono">{o.offer_id || "-"}</TableCell>
                <TableCell className="font-medium">{o.title}</TableCell>
                <TableCell>{o.payout}</TableCell>
                <TableCell>{o.currency}</TableCell>
                <TableCell>{o.payout_model}</TableCell>
                <TableCell><Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1 items-center">
                    <Switch checked={o.status === "active"} onCheckedChange={() => toggleStatus(o.id, o.status)} />
                    <Button size="sm" variant="outline" onClick={() => openEdit(o)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => del(o.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Offer" : "Add New Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Offer ID *</label><Input value={form.offer_id} onChange={e => setForm({ ...form, offer_id: e.target.value })} placeholder="OFF-001" /></div>
              <div><label className="text-xs text-muted-foreground">Title *</label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Offer title" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">URL *</label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">Payout</label><Input type="number" value={form.payout} onChange={e => setForm({ ...form, payout: Number(e.target.value) })} /></div>
              <div><label className="text-xs text-muted-foreground">Currency</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="INR">INR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Payout Model</label>
                <Select value={form.payout_model} onValueChange={v => setForm({ ...form, payout_model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CPA">CPA</SelectItem><SelectItem value="CPL">CPL</SelectItem><SelectItem value="CPI">CPI</SelectItem><SelectItem value="CPC">CPC</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Countries</label><Input value={form.countries} onChange={e => setForm({ ...form, countries: e.target.value })} placeholder="US, UK, CA" /></div>
              <div><label className="text-xs text-muted-foreground">Allowed Countries</label><Input value={form.allowed_countries} onChange={e => setForm({ ...form, allowed_countries: e.target.value })} placeholder="US, UK, CA" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">Platform</label><Input value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} placeholder="web, ios, android" /></div>
              <div><label className="text-xs text-muted-foreground">Device</label><Input value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} placeholder="all, desktop, mobile" /></div>
              <div><label className="text-xs text-muted-foreground">Vertical</label><Input value={form.vertical} onChange={e => setForm({ ...form, vertical: e.target.value })} placeholder="finance, gaming" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Preview URL</label><Input value={form.preview_url} onChange={e => setForm({ ...form, preview_url: e.target.value })} placeholder="https://..." /></div>
              <div><label className="text-xs text-muted-foreground">Image URL</label><Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Traffic Sources</label><Input value={form.traffic_sources} onChange={e => setForm({ ...form, traffic_sources: e.target.value })} placeholder="Social, Email" /></div>
              <div><label className="text-xs text-muted-foreground">Devices</label><Input value={form.devices} onChange={e => setForm({ ...form, devices: e.target.value })} placeholder="Desktop, Mobile" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Expiry Date</label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Percent (%)</label><Input type="number" value={form.percent} onChange={e => setForm({ ...form, percent: Number(e.target.value) })} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Non-Access URL</label><Input value={form.non_access_url} onChange={e => setForm({ ...form, non_access_url: e.target.value })} placeholder="https://..." /></div>
            <div><label className="text-xs text-muted-foreground">Description</label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.status === "active"} onCheckedChange={v => setForm({ ...form, status: v ? "active" : "inactive" })} />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminOffers;
