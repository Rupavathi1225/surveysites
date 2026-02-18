import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";

interface Reward { rank: number; prize: number; }

const Contest = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [activeContest, setActiveContest] = useState<any>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [ended, setEnded] = useState(false);

  // Try to finalize ended contests
  const tryFinalize = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-contests`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
    } catch {}
  }, []);

  useEffect(() => {
    // Load active + recently ended contests
    supabase.from("contests").select("*")
      .in("status", ["active", "ended"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setContests(data || []);
        if (data && data.length > 0) setActiveContest(data[0]);
      });
    // Try finalize on page load
    tryFinalize();
  }, [tryFinalize]);

  useEffect(() => {
    if (!activeContest?.end_date) { setEnded(false); return; }
    if (activeContest.status === "ended") { setEnded(true); return; }
    const endTime = new Date(activeContest.end_date).getTime();
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setEnded(true);
        tryFinalize();
        return false;
      }
      setEnded(false);
      setCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
      return true;
    };
    const running = tick();
    if (!running) return;
    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeContest, tryFinalize]);

  useEffect(() => {
    if (!activeContest) return;
    supabase.from("contest_entries").select("*, profiles:user_id(username, avatar_url, country)")
      .eq("contest_id", activeContest.id)
      .order("points", { ascending: false })
      .limit(100)
      .then(({ data }) => setEntries(data || []));
  }, [activeContest]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const rewards: Reward[] = activeContest?.rewards || [];
  const getPrize = (rank: number) => rewards.find(rw => rw.rank === rank)?.prize || 0;

  const podiumColors = ["bg-yellow-500/20 border-yellow-500", "bg-gray-300/20 border-gray-400", "bg-amber-600/20 border-amber-600"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" /> Contests
      </h1>

      {contests.length > 1 && (
        <Tabs defaultValue={contests[0]?.id} onValueChange={(v) => setActiveContest(contests.find(c => c.id === v))}>
          <TabsList>
            {contests.map(c => (
              <TabsTrigger key={c.id} value={c.id}>
                <Trophy className="h-4 w-4 mr-1" /> {c.title}
                {c.status === "ended" && <Badge variant="secondary" className="ml-1 text-xs">Ended</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {!activeContest ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No active contests</CardContent></Card>
      ) : (
        <>
          {/* Prize Banner */}
          <Card className="bg-gradient-to-r from-primary/20 via-accent to-primary/20 border-primary/30">
            <CardContent className="p-8 text-center">
              <p className="text-4xl md:text-5xl font-extrabold text-primary">${Number(activeContest.amount).toFixed(2)}</p>
              <p className="text-xl font-bold mt-2">{activeContest.title}</p>
              {activeContest.description && <p className="text-sm text-muted-foreground mt-1">{activeContest.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">
                Users are automatically entered when earning points during the contest window.
              </p>

              {ended ? (
                <Badge variant="destructive" className="mt-6 text-lg px-6 py-2">Contest Ended</Badge>
              ) : (
                <div className="flex justify-center gap-4 mt-6">
                  {[
                    { val: countdown.days, label: "Days" },
                    { val: countdown.hours, label: "Hours" },
                    { val: countdown.minutes, label: "Minutes" },
                    { val: countdown.seconds, label: "Seconds" },
                  ].map(({ val, label }) => (
                    <div key={label} className="text-center">
                      <div className="flex gap-1">
                        {pad(val).split("").map((d, i) => (
                          <div key={i} className="bg-background border rounded-lg w-10 h-12 flex items-center justify-center text-xl font-bold">{d}</div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reward tiers */}
              {rewards.length > 0 && (
                <div className="flex justify-center gap-3 mt-4 flex-wrap">
                  {rewards.map((r) => (
                    <Badge key={r.rank} variant="outline" className="text-sm">
                      Rank #{r.rank}: {r.prize} pts bonus
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Podium (top 3) */}
          {entries.length >= 1 && (
            <div className="flex justify-center items-end gap-6 py-6">
              {entries.length >= 2 && (
                <div className="text-center">
                  <Card className={`p-4 ${podiumColors[1]} border-2`}>
                    <div className="text-3xl mb-1">🥈</div>
                    <p className="font-semibold text-sm">{(entries[1] as any)?.profiles?.username || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">{(entries[1] as any)?.profiles?.country || ""}</p>
                    <Badge className="mt-2 bg-muted text-foreground">{entries[1].points?.toLocaleString()} pts</Badge>
                  </Card>
                  {getPrize(2) > 0 && <p className="text-primary font-bold mt-2">{getPrize(2)} pts bonus</p>}
                </div>
              )}
              <div className="text-center -mt-4">
                <Card className={`p-6 ${podiumColors[0]} border-2`}>
                  <div className="text-4xl mb-1">👑</div>
                  <p className="font-bold">{(entries[0] as any)?.profiles?.username || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground">{(entries[0] as any)?.profiles?.country || ""}</p>
                  <Badge className="mt-2 bg-primary text-primary-foreground">{entries[0].points?.toLocaleString()} pts</Badge>
                </Card>
                {getPrize(1) > 0 && <p className="text-primary font-bold text-lg mt-2">{getPrize(1)} pts bonus</p>}
              </div>
              {entries.length >= 3 && (
                <div className="text-center">
                  <Card className={`p-4 ${podiumColors[2]} border-2`}>
                    <div className="text-3xl mb-1">🥉</div>
                    <p className="font-semibold text-sm">{(entries[2] as any)?.profiles?.username || "Anonymous"}</p>
                    <p className="text-xs text-muted-foreground">{(entries[2] as any)?.profiles?.country || ""}</p>
                    <Badge className="mt-2 bg-muted text-foreground">{entries[2].points?.toLocaleString()} pts</Badge>
                  </Card>
                  {getPrize(3) > 0 && <p className="text-primary font-bold mt-2">{getPrize(3)} pts bonus</p>}
                </div>
              )}
            </div>
          )}

          {/* Full Rankings Table */}
          <Card>
            <CardContent className="p-0">
              <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4" /> Full Rankings</h3>
                <p className="text-xs text-muted-foreground">Top 100 users by points earned during contest</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Prize</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No entries yet. Earn points to participate!</TableCell></TableRow>
                  ) : entries.map((e: any, i) => {
                    const rank = i + 1;
                    const prize = getPrize(rank);
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <TableRow key={e.id} className={rank <= 3 ? "bg-primary/5" : ""}>
                        <TableCell className="font-bold">
                          {rank <= 3 ? <span className="text-lg">{medals[rank - 1]}</span> : `#${rank}`}
                        </TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold">
                            {e.profiles?.avatar_url
                              ? <img src={e.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
                              : (e.profiles?.username?.[0] || "?")}
                          </div>
                          {e.profiles?.username || "Anonymous"}
                        </TableCell>
                        <TableCell className="text-sm">{e.profiles?.country || "-"}</TableCell>
                        <TableCell className="font-bold">{e.points?.toLocaleString()} Points</TableCell>
                        <TableCell className="text-primary font-bold">{prize > 0 ? `${prize} pts bonus` : "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
export default Contest;
