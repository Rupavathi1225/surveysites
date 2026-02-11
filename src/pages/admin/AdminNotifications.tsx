import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Send } from "lucide-react";

const AdminNotifications = () => {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("announcement");
  const load = () => supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const send = async () => {
    await supabase.from("notifications").insert({ type, message, is_global: true });
    toast({ title: "Notification sent!" }); setOpen(false); setMessage(""); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Notifications</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Send Notification</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Send Global Notification</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (e.g. announcement)" />
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message..." rows={3} />
              <Button onClick={send} className="w-full"><Send className="h-4 w-4 mr-2" /> Send</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Message</TableHead><TableHead>Global</TableHead></TableRow></TableHeader><TableBody>
        {items.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No notifications</TableCell></TableRow> : items.map((n) => (
          <TableRow key={n.id}><TableCell className="text-sm">{new Date(n.created_at).toLocaleString()}</TableCell><TableCell>{n.type}</TableCell><TableCell>{n.message}</TableCell><TableCell>{n.is_global ? "Yes" : "No"}</TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default AdminNotifications;
