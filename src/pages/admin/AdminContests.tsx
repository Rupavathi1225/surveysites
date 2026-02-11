import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Trophy, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface Reward {
  rank: number;
  prize: number;
}

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const seconds = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

const DateTimePicker = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => {
  const date = value ? new Date(value) : undefined;
  const now = new Date();
  const h = date ? String(date.getHours()).padStart(2, "0") : String(now.getHours()).padStart(2, "0");
  const m = date ? String(date.getMinutes()).padStart(2, "0") : String(now.getMinutes()).padStart(2, "0");
  const s = date ? String(date.getSeconds()).padStart(2, "0") : "00";

  const buildDate = (d: Date, hh: string, mm: string, ss: string) => {
    d.setHours(Number(hh), Number(mm), Number(ss), 0);
    return d.toISOString();
  };

  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "dd-MM-yyyy HH:mm:ss") : "Select date & time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) onChange(buildDate(d, h, m, s));
            }}
          />
          <div className="flex gap-2 p-3 border-t">
            <Select value={h} onValueChange={(v) => { if (date) onChange(buildDate(new Date(date), v, m, s)); }}>
              <SelectTrigger className="w-[70px]"><SelectValue placeholder="HH" /></SelectTrigger>
              <SelectContent className="max-h-48 z-[9999] bg-popover" position="popper" side="bottom" sideOffset={4}>{hours.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <span className="self-center">:</span>
            <Select value={m} onValueChange={(v) => { if (date) onChange(buildDate(new Date(date), h, v, s)); }}>
              <SelectTrigger className="w-[70px]"><SelectValue placeholder="MM" /></SelectTrigger>
              <SelectContent className="max-h-48 z-[9999] bg-popover" position="popper" side="bottom" sideOffset={4}>{minutes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <span className="self-center">:</span>
            <Select value={s} onValueChange={(v) => { if (date) onChange(buildDate(new Date(date), h, m, v)); }}>
              <SelectTrigger className="w-[70px]"><SelectValue placeholder="SS" /></SelectTrigger>
              <SelectContent className="max-h-48 z-[9999] bg-popover" position="popper" side="bottom" sideOffset={4}>{seconds.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const AdminContests = () => {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    title: "", amount: 0, start_date: "", end_date: "", description: "",
    status: "active", excluded_users: [], rewards: [] as Reward[], allow_same_ip: true,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () => supabase.from("contests").select("*").order("created_at", { ascending: false }).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);

  const save = async () => {
    const payload = {
      title: form.title,
      amount: form.amount,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description,
      status: form.status,
      excluded_users: form.excluded_users,
      rewards: form.rewards,
      allow_same_ip: form.allow_same_ip,
    };
    if (editing) {
      await supabase.from("contests").update(payload).eq("id", editing);
    } else {
      await supabase.from("contests").insert(payload);
      // Add to activity feed
      const rewardsSummary = (form.rewards || []).map((r: Reward) => `Rank ${r.rank}: ${r.prize}pts`).join(", ");
      await supabase.from("notifications").insert({
        type: "contest_created",
        message: `🏆 New contest "${form.title}" created! Prize: $${form.amount}${rewardsSummary ? ` | ${rewardsSummary}` : ""}`,
        is_global: true,
      });
    }
    toast({ title: "Saved!" }); setOpen(false); setEditing(null); load();
  };

  const del = async (id: string) => { await supabase.from("contests").delete().eq("id", id); load(); };

  const addReward = () => {
    const nextRank = (form.rewards?.length || 0) + 1;
    setForm({ ...form, rewards: [...(form.rewards || []), { rank: nextRank, prize: 0 }] });
  };

  const updateReward = (index: number, prize: number) => {
    const r = [...(form.rewards || [])];
    r[index] = { ...r[index], prize };
    setForm({ ...form, rewards: r });
  };

  const removeReward = (index: number) => {
    const r = [...(form.rewards || [])];
    r.splice(index, 1);
    r.forEach((rw, i) => rw.rank = i + 1);
    setForm({ ...form, rewards: r });
  };

  const resetForm = () => ({
    title: "", amount: 0, start_date: "", end_date: "", description: "",
    status: "active", excluded_users: [], rewards: [] as Reward[], allow_same_ip: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6" /> Contests</h1>
        <Button onClick={() => { setForm(resetForm()); setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Contest
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Contest</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label className="text-sm">Total Prize Amount ($)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateTimePicker label="Start Date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
              <DateTimePicker label="End Date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div>
              <Label className="text-sm font-semibold">Winner Rewards (per rank)</Label>
              <p className="text-xs text-muted-foreground mb-2">Define bonus points for each rank. These are credited after the contest ends.</p>
              <div className="space-y-2">
                {(form.rewards || []).map((r: Reward, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="w-16 justify-center">Rank {r.rank}</Badge>
                    <Input type="number" value={r.prize} onChange={(e) => updateReward(i, Number(e.target.value))} placeholder="Bonus points" className="flex-1" />
                    <span className="text-xs text-muted-foreground">pts</span>
                    <Button size="sm" variant="ghost" onClick={() => removeReward(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={addReward}>
                <Plus className="h-3 w-3 mr-1" /> Add Rank Reward
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.allow_same_ip ?? true} onCheckedChange={(v) => setForm({ ...form, allow_same_ip: v })} />
              <div>
                <Label className="text-sm">Allow same IP participation</Label>
                <p className="text-xs text-muted-foreground">When OFF, only 1st user per IP counts for rankings</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} />
              <Label>Active</Label>
            </div>

            <Button onClick={save} className="w-full">Save Contest</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Rewards</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No contests</TableCell></TableRow>
              ) : items.map((c) => {
                const rewards = (c.rewards as Reward[]) || [];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>${Number(c.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {rewards.length > 0 ? rewards.map(r => `#${r.rank}: ${r.prize}pts`).join(", ") : "-"}
                    </TableCell>
                    <TableCell className="text-sm">{c.start_date ? format(new Date(c.start_date), "dd-MM-yyyy HH:mm:ss") : "-"}</TableCell>
                    <TableCell className="text-sm">{c.end_date ? format(new Date(c.end_date), "dd-MM-yyyy HH:mm:ss") : "-"}</TableCell>
                    <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => {
                        setForm({ ...c, rewards: c.rewards || [], allow_same_ip: c.allow_same_ip ?? true });
                        setEditing(c.id); setOpen(true);
                      }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => del(c.id)}><Trash2 className="h-3 w-3" /></Button>
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
export default AdminContests;
