import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const AdminClickTracking = () => {
  const [clicks, setClicks] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("offer_clicks")
      .select("*, offers(title, offer_id), survey_links(name), profiles:user_id(username, email)")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setClicks(data || []));
  }, []);

  const uniqueUsers = new Set(clicks.map(c => c.user_id).filter(Boolean)).size;
  const uniqueIPs = new Set(clicks.map(c => c.ip_address).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Click Tracking</h1>
        <p className="text-sm text-muted-foreground">Track all survey & offer clicks with detailed session info</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.length}</p><p className="text-xs text-muted-foreground">Total Clicks</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{new Set(clicks.map(c => `${c.user_id}_${c.offer_id || c.survey_link_id}`).filter(Boolean)).size}</p><p className="text-xs text-muted-foreground">Unique Clicks</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{uniqueUsers}</p><p className="text-xs text-muted-foreground">Unique Users</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{uniqueIPs}</p><p className="text-xs text-muted-foreground">Unique IPs</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.filter(c => c.completion_status === "completed").length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.filter(c => c.vpn_proxy_flag).length}</p><p className="text-xs text-muted-foreground">VPN/Proxy</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.filter(c => c.risk_score > 50).length}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[1800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Offer/Survey</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>UTM</TableHead>
                    <TableHead>Session Start</TableHead>
                    <TableHead>Session End</TableHead>
                    <TableHead>Time Spent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>VPN</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clicks.length === 0 ? (
                    <TableRow><TableCell colSpan={19} className="text-center text-muted-foreground py-8">No click data yet</TableCell></TableRow>
                  ) : clicks.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">{(c as any).profiles?.username || "—"}</TableCell>
                      <TableCell className="text-xs">{(c as any).profiles?.email || "—"}</TableCell>
                      <TableCell className="text-sm">{(c as any).offers?.title || (c as any).survey_links?.name || "—"}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[120px] truncate">{c.session_id || "—"}</TableCell>
                      <TableCell className="text-xs">{c.ip_address || "—"}</TableCell>
                      <TableCell className="text-xs">{c.country || "—"}</TableCell>
                      <TableCell className="text-xs">{c.device_type || "—"}</TableCell>
                      <TableCell className="text-xs">{c.browser || "—"}</TableCell>
                      <TableCell className="text-xs">{c.os || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">{c.source || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">{c.utm_params ? JSON.stringify(c.utm_params) : "—"}</TableCell>
                      <TableCell className="text-xs">{c.session_start ? new Date(c.session_start).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-xs">{c.session_end ? new Date(c.session_end).toLocaleString() : "—"}</TableCell>
                      <TableCell className="text-xs">{c.time_spent ? `${c.time_spent}s` : "—"}</TableCell>
                      <TableCell><Badge variant={c.completion_status === "completed" ? "default" : "secondary"} className="text-xs">{c.completion_status}</Badge></TableCell>
                      <TableCell className="text-xs">{c.vpn_proxy_flag ? "⚠️ Yes" : "No"}</TableCell>
                      <TableCell className="text-xs text-center">{c.attempt_count || 1}</TableCell>
                      <TableCell><Badge variant={c.risk_score > 50 ? "destructive" : "secondary"} className="text-xs">{c.risk_score}</Badge></TableCell>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
export default AdminClickTracking;
