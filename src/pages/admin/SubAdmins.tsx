import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PERMISSION_KEYS = [
  { key: "survey_providers", label: "Survey Providers" },
  { key: "single_link_providers", label: "Single Link Providers" },
  { key: "survey_links", label: "Survey Links" },
  { key: "contests", label: "Contests" },
  { key: "earning_history", label: "Earning History" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "users", label: "Users" },
  { key: "notifications", label: "Notifications" },
  { key: "news", label: "News" },
  { key: "promocodes", label: "Promocodes" },
  { key: "support_tickets", label: "Support Tickets" },
  { key: "pages", label: "Pages" },
  { key: "payment_methods", label: "Payment Methods" },
  { key: "login_logs", label: "Login Logs" },
  { key: "website_settings", label: "Website Settings" },
];

const defaultPermissions = () => {
  const p: Record<string, boolean> = {};
  PERMISSION_KEYS.forEach(k => p[k.key] = true);
  return p;
};

const SubAdmins = () => {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(defaultPermissions());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const [subsRes, usersRes] = await Promise.all([
      supabase.from("sub_admins").select("*"),
      supabase.from("profiles").select("id, user_id, username, email, role")
    ]);
    setItems(subsRes.data || []);
    setUsers(usersRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setSelectedUserId("");
    setPermissions(defaultPermissions());
    setOpen(true);
  };

  const openEdit = (sub: any) => {
    setEditingId(sub.id);
    setSelectedUserId(sub.user_id);
    const perms = typeof sub.permissions === "object" && sub.permissions ? sub.permissions as Record<string, boolean> : defaultPermissions();
    setPermissions({ ...defaultPermissions(), ...perms });
    setOpen(true);
  };

  const save = async () => {
    if (editingId) {
      await supabase.from("sub_admins").update({ permissions }).eq("id", editingId);
      toast({ title: "Sub-admin updated!" });
    } else {
      if (!selectedUserId) return;
      await supabase.from("profiles").update({ role: "subadmin" }).eq("id", selectedUserId);
      await supabase.from("sub_admins").insert({ user_id: selectedUserId, permissions });
      toast({ title: "Sub-admin created!" });
    }
    setOpen(false);
    load();
  };

  const remove = async (id: string, userId: string) => {
    await supabase.from("sub_admins").delete().eq("id", id);
    await supabase.from("profiles").update({ role: "user" }).eq("id", userId);
    toast({ title: "Sub-admin removed" });
    load();
  };

  const togglePerm = (key: string) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const availableUsers = users.filter(u => u.role === "user");
  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sub Admins</h1>
          <p className="text-muted-foreground text-sm">Manage sub-admin roles and their permissions</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Sub Admin</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sub-admins yet</TableCell>
                </TableRow>
              ) : items.map((s) => {
                const u = users.find(u => u.id === s.user_id || u.user_id === s.user_id);
                const perms = typeof s.permissions === "object" && s.permissions ? s.permissions as Record<string, boolean> : {};
                const activePerms = Object.values(perms).filter(Boolean).length;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      {u?.username || s.user_id?.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u?.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{activePerms}/{PERMISSION_KEYS.length} enabled</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => remove(s.id, s.user_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Sub Admin Permissions" : "Add Sub Admin"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* User selection (only for new) */}
            {!editingId && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select User</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger><SelectValue placeholder="Choose a user..." /></SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 ? (
                      <SelectItem value="none" disabled>No available users</SelectItem>
                    ) : availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username || "No username"} ({u.email || "no email"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tab Permissions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Tab Permissions</label>
                <span className="text-xs text-muted-foreground">{enabledCount}/{PERMISSION_KEYS.length} enabled</span>
              </div>
              <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                {PERMISSION_KEYS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                    <span className="text-sm">{label}</span>
                    <Switch checked={permissions[key] ?? true} onCheckedChange={() => togglePerm(key)} />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={save} className="w-full" disabled={!editingId && !selectedUserId}>
              {editingId ? "Update Permissions" : "Make Sub Admin"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default SubAdmins;
