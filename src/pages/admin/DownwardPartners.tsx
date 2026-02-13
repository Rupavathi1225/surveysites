import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";

const defaultForm = {
  name: "", code: "", postback_url: "", postback_method: "GET",
  username_param: "user_id", status_param: "status", payout_param: "payout",
  txn_param: "txn_id", offer_param: "offer_id", custom_params: {},
  status: "active",
};

const DownwardPartners = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () =>
    supabase.from("downward_partners").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setItems(data || []));

  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = { ...form };
    if (editing) {
      await supabase.from("downward_partners").update(payload).eq("id", editing);
    } else {
      await supabase.from("downward_partners").insert(payload);
    }
    toast({ title: "Saved!" });
    setOpen(false); setForm(defaultForm); setEditing(null); load();
  };

  const del = async (id: string) => {
    await supabase.from("downward_partners").delete().eq("id", id);
    toast({ title: "Deleted" }); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Downward Partners</h1>
          <p className="text-sm text-muted-foreground">Partners who receive postback forwarding from us</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(defaultForm); setEditing(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Add Partner</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit" : "Add"} Downward Partner</DialogTitle>
              <p className="text-sm text-muted-foreground">Configure postback forwarding settings</p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Partner name" /></div>
                <div><label className="text-xs text-muted-foreground">Code</label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="unique_code" /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Postback URL *</label>
                <Input value={form.postback_url} onChange={(e) => setForm({ ...form, postback_url: e.target.value })} placeholder="https://partner.com/postback" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">HTTP Method</label>
                  <Select value={form.postback_method} onValueChange={v => setForm({ ...form, postback_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground">Status</label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm">Parameter Mapping</h3>
                <p className="text-xs text-muted-foreground">Map our fields to the partner's expected parameter names</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Username Param</label>
                    <Input value={form.username_param} onChange={(e) => setForm({ ...form, username_param: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Status Param</label>
                    <Input value={form.status_param} onChange={(e) => setForm({ ...form, status_param: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Payout Param</label>
                    <Input value={form.payout_param} onChange={(e) => setForm({ ...form, payout_param: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Transaction ID Param</label>
                    <Input value={form.txn_param} onChange={(e) => setForm({ ...form, txn_param: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Offer ID Param</label>
                    <Input value={form.offer_param} onChange={(e) => setForm({ ...form, offer_param: e.target.value })} /></div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Code</TableHead>
            <TableHead>Postback URL</TableHead><TableHead>Method</TableHead>
            <TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No downward partners</TableCell></TableRow>
            ) : items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.code}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs">{p.postback_url}</TableCell>
                <TableCell><Badge variant="outline">{p.postback_method}</Badge></TableCell>
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
export default DownwardPartners;
