import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

const Leaderboard = () => {
  const [entries, setEntries] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("username, country, points, avatar_url").order("points", { ascending: false }).limit(100).then(({ data }) => setEntries(data || []));
  }, []);

  const podiumColors = [
    "bg-yellow-500/20 border-yellow-500 text-yellow-600",
    "bg-gray-300/20 border-gray-400 text-gray-500",
    "bg-amber-600/20 border-amber-600 text-amber-700",
  ];

  const crownIcons = ["👑", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-primary" /> Leaderboard</h1>
        <p className="text-muted-foreground">Top earners on the platform</p>
      </div>

      {/* Podium - Top 3 */}
      {entries.length >= 1 && (
        <div className="flex justify-center items-end gap-6 py-4">
          {/* 2nd */}
          {entries.length >= 2 && (
            <div className="text-center">
              <Card className={`p-4 border-2 ${podiumColors[1]}`}>
                <div className="text-3xl mb-1">🥈</div>
                <p className="font-semibold text-sm">{entries[1].username || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">{entries[1].country || ""}</p>
                <Badge className="mt-2 bg-muted text-foreground">{entries[1].points || 0} pts</Badge>
              </Card>
            </div>
          )}
          {/* 1st */}
          <div className="text-center -mt-4">
            <Card className={`p-6 border-2 ${podiumColors[0]}`}>
              <div className="text-4xl mb-1">👑</div>
              <p className="font-bold">{entries[0].username || "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">{entries[0].country || ""}</p>
              <Badge className="mt-2 bg-primary text-primary-foreground">{entries[0].points || 0} pts</Badge>
            </Card>
          </div>
          {/* 3rd */}
          {entries.length >= 3 && (
            <div className="text-center">
              <Card className={`p-4 border-2 ${podiumColors[2]}`}>
                <div className="text-3xl mb-1">🥉</div>
                <p className="font-semibold text-sm">{entries[2].username || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">{entries[2].country || ""}</p>
                <Badge className="mt-2 bg-muted text-foreground">{entries[2].points || 0} pts</Badge>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Full Rankings */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4" /> Full Rankings</h3>
            <p className="text-xs text-muted-foreground">Top 100 users by points earned</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No data yet</TableCell></TableRow>
              ) : entries.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-bold">
                    {i < 3 ? (
                      <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold overflow-hidden">
                      {e.avatar_url
                        ? <img src={e.avatar_url} className="w-full h-full object-cover" />
                        : (e.username?.[0] || "?")}
                    </div>
                    {e.username || "Anonymous"}
                  </TableCell>
                  <TableCell>{e.country || "-"}</TableCell>
                  <TableCell className="text-right font-bold text-primary">{e.points || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default Leaderboard;
