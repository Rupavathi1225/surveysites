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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Bell, Gift, Settings2 } from "lucide-react";

const AdminNotifications = () => {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);

  const [openNotif, setOpenNotif] = useState(false);
  const [notifForm, setNotifForm] = useState({
    is_global: false, user_id: "", type: "announcement", title: "", message: "",
    repeat: false, repeat_count: 1, time_gap: 0,
  });

  const [openOffer, setOpenOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    user_id: "", offer_id: "", points: "", custom_title: "", custom_message: "",
    repeat: false, repeat_count: 1, time_gap: 0,
  });

  const load = () => {
    Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, username, email"),
      supabase.from("offers").select("id, title, payout, currency"),
    ]).then(([notifRes, usersRes, offersRes]) => {
      setItems(notifRes.data || []);
      setUsers(usersRes.data || []);
      setOffers(offersRes.data || []);
    });
  };
  useEffect(() => { load(); }, []);

  const getUser = (id: string) => users.find(u => u.id === id);

  // Send regular notification with REAL scheduled timing using setTimeout
  const sendNotification = async () => {
    if (!notifForm.title.trim() || !notifForm.message.trim()) return;
    const count = notifForm.repeat ? Math.max(1, notifForm.repeat_count) : 1;
    const gap = notifForm.repeat ? Math.max(0, notifForm.time_gap) : 0;

    // Insert first one immediately
    const payload: any = {
      type: notifForm.type,
      message: `${notifForm.title}: ${notifForm.message}`,
      is_global: notifForm.is_global,
    };
    if (!notifForm.is_global && notifForm.user_id) payload.user_id = notifForm.user_id;

    const { error } = await supabase.from("notifications").insert(payload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Schedule remaining ones with real delays
    if (count > 1 && gap > 0) {
      for (let i = 1; i < count; i++) {
        const delayMs = gap * 60000 * i;
        setTimeout(async () => {
          await supabase.from("notifications").insert(payload);
        }, delayMs);
      }
      toast({ title: `First sent! ${count - 1} more scheduled every ${gap} min` });
    } else if (count > 1) {
      // No gap, insert all with staggered created_at
      for (let i = 1; i < count; i++) {
        await supabase.from("notifications").insert(payload);
      }
      toast({ title: `Sent ${count} notifications!` });
    } else {
      toast({ title: "Notification sent!" });
    }

    setOpenNotif(false);
    setNotifForm({ is_global: false, user_id: "", type: "announcement", title: "", message: "", repeat: false, repeat_count: 1, time_gap: 0 });
    load();
  };

  // Send offer notification with REAL scheduled timing
  const sendOfferNotification = async () => {
    if (!offerForm.user_id || !offerForm.points) return;
    const user = getUser(offerForm.user_id);
    const offer = offers.find(o => o.id === offerForm.offer_id);
    const count = offerForm.repeat ? Math.max(1, offerForm.repeat_count) : 1;
    const gap = offerForm.repeat ? Math.max(0, offerForm.time_gap) : 0;

    const title = offerForm.custom_title || `Offer Completed: ${offer?.title || "Manual Offer"}`;
    const message = offerForm.custom_message || `✅ ${user?.username || user?.email} completed ${offer?.title || "an offer"} and earned ${offerForm.points} points`;

    const insertPayload = {
      type: "offer_completed",
      message: `${title} — ${message}`,
      is_global: true,
      user_id: offerForm.user_id,
    };

    const { error } = await supabase.from("notifications").insert(insertPayload);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }

    // Schedule remaining with real delays
    if (count > 1 && gap > 0) {
      for (let i = 1; i < count; i++) {
        const delayMs = gap * 60000 * i;
        setTimeout(async () => {
          await supabase.from("notifications").insert(insertPayload);
        }, delayMs);
      }
      toast({ title: `First sent! ${count - 1} more will appear every ${gap} min` });
    } else if (count > 1) {
      for (let i = 1; i < count; i++) {
        await supabase.from("notifications").insert(insertPayload);
      }
      toast({ title: `Sent ${count} offer notifications!` });
    } else {
      toast({ title: "Offer notification sent!" });
    }

    setOpenOffer(false);
    setOfferForm({ user_id: "", offer_id: "", points: "", custom_title: "", custom_message: "", repeat: false, repeat_count: 1, time_gap: 0 });
    load();
  };

  const del = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    toast({ title: "Notification deleted" });
    load();
  };

  const getTypeIcon = (type: string) => {
    const map: Record<string, string> = {
      signup: "🎉", offer_completed: "✅", promo_redeemed: "🎁", promo_added: "🔥",
      offer_added: "🆕", credits: "💰", payment_requested: "💸", payment_completed: "✅", announcement: "📢", login: "👋",
    };
    return map[type] || "📢";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Send notifications to users with scheduling</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenOffer(true)}>
            <Gift className="h-4 w-4 mr-2" /> Offer Notification
          </Button>
          <Button onClick={() => setOpenNotif(true)}>
            <Plus className="h-4 w-4 mr-2" /> Send Notification
          </Button>
        </div>
      </div>

      {/* Sent Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" /> Sent Notifications ({items.length})
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Repeat</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No notifications</TableCell></TableRow>
              ) : items.map(n => {
                const user = n.user_id ? getUser(n.user_id) : null;
                return (
                  <TableRow key={n.id}>
                    <TableCell className="max-w-xs">
                      <span className="text-sm">{getTypeIcon(n.type)} {n.message?.slice(0, 60)}{n.message?.length > 60 ? "..." : ""}</span>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{n.type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">Once</TableCell>
                    <TableCell>
                      {n.is_global ? (
                        <Badge className="bg-primary/20 text-primary text-xs">Global</Badge>
                      ) : (
                        <span className="text-sm">{user?.username || user?.email || n.user_id?.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(n.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Send Notification Dialog */}
      <Dialog open={openNotif} onOpenChange={setOpenNotif}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={notifForm.is_global} onCheckedChange={v => setNotifForm({ ...notifForm, is_global: v })} />
              <Label>Send to all users (Global)</Label>
            </div>
            {!notifForm.is_global && (
              <div>
                <Label className="text-sm">Select User</Label>
                <Select value={notifForm.user_id} onValueChange={v => setNotifForm({ ...notifForm, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger>
                  <SelectContent>{users.map(u => (<SelectItem key={u.id} value={u.id}>{u.username || u.email || u.id.slice(0, 8)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-sm">Type</Label>
              <Select value={notifForm.type} onValueChange={v => setNotifForm({ ...notifForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">📢 Announcement</SelectItem>
                  <SelectItem value="credits">💰 Credits/System</SelectItem>
                  <SelectItem value="signup">🎉 Signup</SelectItem>
                  <SelectItem value="offer_completed">✅ Offer Completed</SelectItem>
                  <SelectItem value="promo_redeemed">🎁 Promo Redeemed</SelectItem>
                  <SelectItem value="promo_added">🔥 Promo Added</SelectItem>
                  <SelectItem value="offer_added">🆕 Offer Added</SelectItem>
                  <SelectItem value="payment_requested">💸 Payment Requested</SelectItem>
                  <SelectItem value="payment_completed">✅ Payment Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Title *</Label>
              <Input value={notifForm.title} onChange={e => setNotifForm({ ...notifForm, title: e.target.value })} placeholder="Notification title" />
            </div>
            <div>
              <Label className="text-sm">Message *</Label>
              <Textarea value={notifForm.message} onChange={e => setNotifForm({ ...notifForm, message: e.target.value })} placeholder="Notification message..." rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={notifForm.repeat} onCheckedChange={v => setNotifForm({ ...notifForm, repeat: v })} />
              <Label>Send Multiple Times (Repeat)</Label>
            </div>
            {notifForm.repeat && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Repeat Count</Label>
                  <Input type="number" min={1} value={notifForm.repeat_count} onChange={e => setNotifForm({ ...notifForm, repeat_count: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">How many times to send</p>
                </div>
                <div>
                  <Label className="text-sm">Time Gap (minutes)</Label>
                  <Input type="number" min={0} value={notifForm.time_gap} onChange={e => setNotifForm({ ...notifForm, time_gap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Minutes between each</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenNotif(false)}>Cancel</Button>
              <Button onClick={sendNotification}>{notifForm.repeat ? "Schedule" : "Send Notification"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Offer Notification Dialog */}
      <Dialog open={openOffer} onOpenChange={setOpenOffer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Send Offer Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Select User *</Label>
              <Select value={offerForm.user_id} onValueChange={v => setOfferForm({ ...offerForm, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose user" /></SelectTrigger>
                <SelectContent>{users.map(u => (<SelectItem key={u.id} value={u.id}>{u.username || u.email || u.id.slice(0, 8)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Select Offer (or leave empty for manual)</Label>
              <Select value={offerForm.offer_id} onValueChange={v => {
                const offer = offers.find(o => o.id === v);
                setOfferForm({ ...offerForm, offer_id: v, points: offer?.payout?.toString() || offerForm.points });
              }}>
                <SelectTrigger><SelectValue placeholder="Choose offer" /></SelectTrigger>
                <SelectContent>
                  {offers.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.title} ({o.currency || "$"} {o.payout})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Points *</Label>
              <Input type="number" value={offerForm.points} onChange={e => setOfferForm({ ...offerForm, points: e.target.value })} placeholder="e.g. 500" />
              <p className="text-xs text-muted-foreground mt-1">Enter points manually.</p>
            </div>
            <div>
              <Label className="text-sm">Custom Title (optional)</Label>
              <Input value={offerForm.custom_title} onChange={e => setOfferForm({ ...offerForm, custom_title: e.target.value })} placeholder="Override default title" />
            </div>
            <div>
              <Label className="text-sm">Custom Message (optional)</Label>
              <Textarea value={offerForm.custom_message} onChange={e => setOfferForm({ ...offerForm, custom_message: e.target.value })} placeholder="Override default message" rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={offerForm.repeat} onCheckedChange={v => setOfferForm({ ...offerForm, repeat: v })} />
              <Label>Send Multiple Times (Repeat)</Label>
            </div>
            {offerForm.repeat && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Repeat Count</Label>
                  <Input type="number" min={1} value={offerForm.repeat_count} onChange={e => setOfferForm({ ...offerForm, repeat_count: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-sm">Time Gap (minutes)</Label>
                  <Input type="number" min={0} value={offerForm.time_gap} onChange={e => setOfferForm({ ...offerForm, time_gap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Each will appear after this delay</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpenOffer(false)}>Cancel</Button>
              <Button onClick={sendOfferNotification}>{offerForm.repeat ? "Schedule Offer Notification" : "Send Offer Notification"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminNotifications;
