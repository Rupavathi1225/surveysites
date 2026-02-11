// Admin simple pages: Pages, Payment Methods, Change Password, Update Profile, Website Settings
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Pencil } from "lucide-react";

export const AdminPages = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = () => supabase.from("site_pages").select("*").then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const toggle = async (id: string, status: string) => { await supabase.from("site_pages").update({ status: status === "active" ? "inactive" : "active" }).eq("id", id); load(); };
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Pages</h1>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No pages configured</TableCell></TableRow> : items.map((p) => (
          <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell><TableCell><Button size="sm" variant="outline" onClick={() => toggle(p.id, p.status)}><Pencil className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};

export const AdminPaymentMethods = () => {
  const [items, setItems] = useState<any[]>([]);
  const load = () => supabase.from("payment_methods").select("*").then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Payment Methods</h1>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Min Amount</TableHead><TableHead>Fee %</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No payment methods configured</TableCell></TableRow> : items.map((p) => (
          <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>${p.min_amount}</TableCell><TableCell>{p.fee_percentage}%</TableCell><TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};

export const ChangePassword = () => {
  const [old, setOld] = useState(""); const [newP, setNewP] = useState(""); const [confirm, setConfirm] = useState("");
  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newP !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: newP });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Password updated!" }); setOld(""); setNewP(""); setConfirm(""); }
  };
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Change Password</h1>
      <Card><CardContent className="p-6"><form onSubmit={handleChange} className="space-y-4 max-w-md">
        <div><label className="text-sm text-muted-foreground">Old Password</label><Input type="password" value={old} onChange={(e) => setOld(e.target.value)} required /></div>
        <div><label className="text-sm text-muted-foreground">New Password</label><Input type="password" value={newP} onChange={(e) => setNewP(e.target.value)} required minLength={6} /></div>
        <div><label className="text-sm text-muted-foreground">Confirm Password</label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
        <Button type="submit">Update Password</Button>
      </form></CardContent></Card>
    </div>
  );
};

export const AdminUpdateProfile = () => {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", mobile: "" });
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) setForm({ first_name: data.first_name || "", last_name: data.last_name || "", email: data.email || "", mobile: data.mobile || "" });
    });
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update(form).eq("user_id", user.id);
    toast({ title: "Profile updated!" });
  };
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Update Profile</h1>
      <Card><CardContent className="p-6"><form onSubmit={save} className="space-y-4 max-w-md">
        <div><label className="text-sm text-muted-foreground">Name</label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
        <div><label className="text-sm text-muted-foreground">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="text-sm text-muted-foreground">Phone</label><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
        <Button type="submit">Update</Button>
      </form></CardContent></Card>
    </div>
  );
};

export const WebsiteSettings = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [key, setKey] = useState(""); const [value, setValue] = useState("");
  const load = () => supabase.from("website_settings").select("*").then(({ data }) => setSettings(data || []));
  useEffect(() => { load(); }, []);
  const save = async () => {
    const existing = settings.find((s) => s.key === key);
    if (existing) await supabase.from("website_settings").update({ value }).eq("id", existing.id);
    else await supabase.from("website_settings").insert({ key, value });
    toast({ title: "Saved!" }); setKey(""); setValue(""); load();
  };
  return (
    <div className="space-y-6"><h1 className="text-2xl font-bold">Website Settings</h1>
      <Card><CardContent className="p-6 space-y-4">
        <div className="flex gap-3 max-w-lg"><Input placeholder="Key" value={key} onChange={(e) => setKey(e.target.value)} /><Input placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} /><Button onClick={save}>Save</Button></div>
        <Table><TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Value</TableHead></TableRow></TableHeader><TableBody>
          {settings.map((s) => <TableRow key={s.id}><TableCell className="font-mono text-sm">{s.key}</TableCell><TableCell>{s.value}</TableCell></TableRow>)}
        </TableBody></Table>
      </CardContent></Card>
    </div>
  );
};
