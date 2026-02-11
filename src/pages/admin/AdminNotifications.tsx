import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Send, Trash2, Bell, UserPlus, Tag, Gift, CreditCard, Megaphone } from "lucide-react";

const NOTIFICATION_TYPES = [
  { value: "signup", label: "🎉 New User Signup", icon: UserPlus },
  { value: "offer_completed", label: "✅ Offer Completed", icon: Gift },
  { value: "promo_redeemed", label: "🎁 Promocode Redeemed", icon: Tag },
  { value: "promo_added", label: "🔥 Promocode Added", icon: Tag },
  { value: "offer_added", label: "🆕 New Offer Added", icon: Gift },
  { value: "credits", label: "💰 Credits/System", icon: Megaphone },
  { value: "payment_requested", label: "💸 Payment Requested", icon: CreditCard },
  { value: "payment_completed", label: "✅ Payment Completed", icon: CreditCard },
  { value: "announcement", label: "📢 Global Announcement", icon: Bell },
];

const AdminNotifications = () => {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "announcement", message: "", user_id: "", is_global: true });

  const load = () => {
    Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, username, email"),
    ]).then(([notifRes, usersRes]) => {
      setItems(notifRes.data || []);
      setUsers(usersRes.data || []);
    });
  };
  useEffect(() => { load(); }, []);

  const getUser = (id: string) => users.find(u => u.id === id);

  const send = async () => {
    if (!form.message.trim()) return;
    const payload: any = { type: form.type, message: form.message, is_global: form.is_global };
    if (!form.is_global && form.user_id) payload.user_id = form.user_id;
    const { error } = await supabase.from("notifications").insert(payload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Notification sent!" });
      setOpen(false);
      setForm({ type: "announcement", message: "", user_id: "", is_global: true });
      load();
    }
  };

  const del = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    toast({ title: "Notification deleted" });
    load();
  };

  const getTypeIcon = (type: string) => {
    const found = NOTIFICATION_TYPES.find(t => t.value === type);
    return found?.label?.split(" ")[0] || "📢";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Send Notification</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No notifications</TableCell></TableRow>
              ) : items.map(n => {
                const user = n.user_id ? getUser(n.user_id) : null;
                return (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm">{new Date(n.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getTypeIcon(n.type)} {n.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{n.message}</TableCell>
                    <TableCell>
                      {n.is_global ? (
                        <Badge className="bg-primary/20 text-primary text-xs">Global</Badge>
                      ) : (
                        <span className="text-sm">{user?.username || user?.email || n.user_id?.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => del(n.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Notification Type</label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Target</label>
              <Select value={form.is_global ? "global" : "user"} onValueChange={v => setForm({ ...form, is_global: v === "global" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">📢 Global (all users)</SelectItem>
                  <SelectItem value="user">👤 Specific User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!form.is_global && (
              <div>
                <label className="text-xs text-muted-foreground">Select User</label>
                <Select value={form.user_id} onValueChange={v => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.username || u.email || u.id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Message</label>
              <Textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Enter notification message..."
                rows={3}
              />
            </div>

            <Button onClick={send} className="w-full"><Send className="h-4 w-4 mr-2" /> Send Notification</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminNotifications;
