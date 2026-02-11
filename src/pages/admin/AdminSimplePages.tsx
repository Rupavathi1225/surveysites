// Admin simple pages: Pages, Payment Methods, Change Password, Update Profile, Website Settings
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Pencil, Settings, CreditCard, Mail, MessageSquare } from "lucide-react";

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

const settingGroups = {
  general: [
    { key: "site_name", label: "Site Name" },
    { key: "logo_url", label: "Logo URL" },
    { key: "favicon_url", label: "Favicon URL" },
    { key: "contact_email", label: "Contact Email" },
    { key: "homepage_text", label: "Homepage Text" },
  ],
  payment: [
    { key: "min_withdrawal", label: "Min Withdrawal Amount" },
    { key: "max_withdrawal", label: "Max Withdrawal Amount" },
    { key: "withdrawal_fee", label: "Withdrawal Fee (%)" },
    { key: "points_to_cash_rate", label: "Points to Cash Rate" },
    { key: "payout_schedule", label: "Payout Schedule" },
  ],
  email: [
    { key: "smtp_host", label: "SMTP Host" },
    { key: "smtp_port", label: "SMTP Port" },
    { key: "smtp_user", label: "SMTP Username" },
    { key: "smtp_password", label: "SMTP Password" },
    { key: "from_email", label: "From Email" },
  ],
  chat: [
    { key: "free_messages_limit", label: "Free Messages Per User" },
    { key: "message_cost_points", label: "Cost Per Message (Points)" },
    { key: "chat_enabled", label: "Chat Enabled (true/false)" },
    { key: "profanity_filter", label: "Profanity Filter (true/false)" },
    { key: "max_message_length", label: "Max Message Length" },
  ],
};

export const WebsiteSettings = () => {
  const [settings, setSettings] = useState<Map<string, { id: string; value: string }>>(new Map());
  const [activeTab, setActiveTab] = useState<"general" | "payment" | "email" | "chat">("general");

  const load = async () => {
    const { data } = await supabase.from("website_settings").select("*");
    const map = new Map<string, { id: string; value: string }>();
    (data || []).forEach((s: any) => map.set(s.key, { id: s.id, value: s.value || "" }));
    setSettings(map);
  };
  useEffect(() => { load(); }, []);

  const updateSetting = async (key: string, value: string) => {
    const existing = settings.get(key);
    if (existing) {
      await supabase.from("website_settings").update({ value }).eq("id", existing.id);
    } else {
      await supabase.from("website_settings").insert({ key, value });
    }
    toast({ title: "Saved!" });
    load();
  };

  const tabs = [
    { id: "general" as const, icon: Settings, label: "General" },
    { id: "payment" as const, icon: CreditCard, label: "Payment" },
    { id: "email" as const, icon: Mail, label: "Email" },
    { id: "chat" as const, icon: MessageSquare, label: "Chat Limits" },
  ];

  const currentSettings = settingGroups[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Website Settings</h1>
        <p className="text-sm text-muted-foreground">Configure global website settings</p>
      </div>

      <div className="flex gap-1 bg-accent/40 rounded-lg p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-md transition-colors ${activeTab === t.id ? "bg-background shadow text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
            <Settings className="h-5 w-5" /> {tabs.find(t => t.id === activeTab)?.label} Settings
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {activeTab === "general" && "Site name, logo, and branding"}
            {activeTab === "payment" && "Payment and withdrawal configuration"}
            {activeTab === "email" && "Email delivery settings"}
            {activeTab === "chat" && "Chat limits and moderation"}
          </p>
          <Table>
            <TableHeader><TableRow><TableHead>Setting</TableHead><TableHead>Value</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {currentSettings.map(({ key, label }) => {
                const val = settings.get(key)?.value || "";
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell className="text-muted-foreground">{val || "-"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => {
                        const newVal = prompt(`Enter value for ${label}:`, val);
                        if (newVal !== null) updateSetting(key, newVal);
                      }}><Pencil className="h-3 w-3" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
