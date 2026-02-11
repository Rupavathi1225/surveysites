import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";

const Leaderboard = () => {
  const [entries, setEntries] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("username, country, points").order("points", { ascending: false }).limit(50).then(({ data }) => setEntries(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Leaderboard</h1>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>User</TableHead><TableHead>Country</TableHead><TableHead>Points</TableHead></TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data yet</TableCell></TableRow>
            ) : entries.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="font-bold">{i + 1 <= 3 ? ["🥇","🥈","🥉"][i] : `#${i+1}`}</TableCell>
                <TableCell className="font-medium">{e.username}</TableCell>
                <TableCell>{e.country}</TableCell>
                <TableCell className="text-primary font-bold">{e.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default Leaderboard;
