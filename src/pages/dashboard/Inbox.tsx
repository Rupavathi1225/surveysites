import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Inbox = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("inbox_messages").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).then(({ data }) => setMessages(data || []));
  }, [profile]);

  const markRead = async (id: string) => {
    await supabase.from("inbox_messages").update({ is_read: true }).eq("id", id);
    setMessages((m) => m.map((msg) => msg.id === id ? { ...msg, is_read: true } : msg));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inbox</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>From</TableHead><TableHead>Subject</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No messages</TableCell></TableRow>
            ) : messages.map((m) => (
              <TableRow key={m.id} className="cursor-pointer" onClick={() => markRead(m.id)}>
                <TableCell className="text-sm">{m.from_name || "System"}</TableCell>
                <TableCell className="text-sm font-medium">{m.subject}</TableCell>
                <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                <TableCell><Badge variant={m.is_read ? "secondary" : "default"}>{m.is_read ? "Read" : "Unread"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default Inbox;
