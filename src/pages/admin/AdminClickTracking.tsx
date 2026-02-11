import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

const AdminClickTracking = () => {
  const [clicks, setClicks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    supabase.from("offer_clicks")
      .select("*, offers(title, offer_id), survey_links(name), profiles:user_id(username, email)")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setClicks(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Click Tracking</h1>
        <p className="text-sm text-muted-foreground">Track all survey & offer clicks with detailed session info</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.length}</p><p className="text-xs text-muted-foreground">Total Clicks</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.filter(c => c.completion_status === "completed").length}</p><p className="text-xs text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.filter(c => c.vpn_proxy_flag).length}</p><p className="text-xs text-muted-foreground">VPN/Proxy</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{clicks.filter(c => c.risk_score > 50).length}</p><p className="text-xs text-muted-foreground">High Risk</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>User</TableHead>
            <TableHead>Offer/Survey</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Browser</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {clicks.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No click data yet</TableCell></TableRow>
            ) : clicks.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-sm">{(c as any).profiles?.username || "—"}</TableCell>
                <TableCell className="text-sm">{(c as any).offers?.title || (c as any).survey_links?.name || "—"}</TableCell>
                <TableCell className="text-xs">{c.device_type || "—"}</TableCell>
                <TableCell className="text-xs">{c.browser || "—"}</TableCell>
                <TableCell><Badge variant={c.completion_status === "completed" ? "default" : "secondary"}>{c.completion_status}</Badge></TableCell>
                <TableCell><Badge variant={c.risk_score > 50 ? "destructive" : "secondary"}>{c.risk_score}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(c)}><Eye className="h-3 w-3" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Click Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              {[
                { label: "Session ID", value: selected.session_id },
                { label: "User", value: (selected as any).profiles?.username },
                { label: "User Email", value: (selected as any).profiles?.email },
                { label: "IP Address", value: selected.ip_address },
                { label: "Country", value: selected.country },
                { label: "Device Type", value: selected.device_type },
                { label: "Browser", value: selected.browser },
                { label: "OS", value: selected.os },
                { label: "User Agent", value: selected.user_agent },
                { label: "Source", value: selected.source },
                { label: "UTM Params", value: selected.utm_params ? JSON.stringify(selected.utm_params) : null },
                { label: "Offer/Survey", value: (selected as any).offers?.title || (selected as any).survey_links?.name },
                { label: "Session Start", value: selected.session_start ? new Date(selected.session_start).toLocaleString() : null },
                { label: "Session End", value: selected.session_end ? new Date(selected.session_end).toLocaleString() : null },
                { label: "Time Spent", value: selected.time_spent ? `${selected.time_spent}s` : null },
                { label: "Completion Status", value: selected.completion_status },
                { label: "VPN/Proxy Flag", value: selected.vpn_proxy_flag ? "Yes ⚠️" : "No" },
                { label: "Attempt Count", value: selected.attempt_count },
                { label: "Risk Score", value: selected.risk_score },
              ].filter(f => f.value != null && f.value !== "").map(f => (
                <div key={f.label} className="flex justify-between items-start py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                  <span className="text-sm font-medium text-right max-w-[60%] break-all">{String(f.value)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminClickTracking;
