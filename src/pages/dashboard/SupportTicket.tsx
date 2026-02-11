import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const SupportTicket = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase.from("support_tickets").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => setTickets(data || []));
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await supabase.from("support_tickets").insert({ user_id: profile.id, subject, message });
    toast({ title: "Ticket submitted!" });
    setSubject(""); setMessage("");
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
    setTickets(data || []);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support Ticket</h1>
      <Card><CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div><label className="text-sm text-muted-foreground">Name</label><Input value={profile?.first_name || profile?.username || ""} disabled /></div>
          <div><label className="text-sm text-muted-foreground">Subject</label><Input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
          <div><label className="text-sm text-muted-foreground">Message</label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} /></div>
          <Button type="submit">Submit Ticket</Button>
        </form>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ticket No</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No tickets</TableCell></TableRow>
            ) : tickets.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm font-mono">{t.id.slice(0, 8)}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell><Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default SupportTicket;
