import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Contest = () => {
  const [contests, setContests] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("contests").select("*").eq("status", "active").order("created_at", { ascending: false }).then(({ data }) => setContests(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contests</h1>
      <p className="text-muted-foreground">Participate in contests to win rewards</p>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Contest</TableHead><TableHead>Reward</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {contests.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No active contests</TableCell></TableRow>
            ) : contests.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell className="text-primary font-bold">${Number(c.amount).toFixed(2)}</TableCell>
                <TableCell className="text-sm">{c.start_date ? new Date(c.start_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell className="text-sm">{c.end_date ? new Date(c.end_date).toLocaleDateString() : "-"}</TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default Contest;
