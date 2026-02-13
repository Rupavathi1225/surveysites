import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, Search, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const PostbackLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("postback_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (tab !== "all" && l.direction !== tab) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          l.username?.toLowerCase().includes(s) ||
          l.txn_id?.toLowerCase().includes(s) ||
          l.provider_name?.toLowerCase().includes(s) ||
          l.ip_address?.includes(s)
        );
      }
      return true;
    });
  }, [logs, tab, statusFilter, search]);

  const stats = useMemo(() => {
    const now24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = logs.filter(l => l.created_at >= now24h);
    return {
      totalIncoming: recent.filter(l => l.direction === "incoming").length,
      totalOutgoing: recent.filter(l => l.direction === "outgoing").length,
      successful: recent.filter(l => l.status === "success").length,
      failed: recent.filter(l => l.status === "failed").length,
      reversed: recent.filter(l => l.status === "reversed").length,
      totalPayout: recent.filter(l => l.direction === "incoming" && l.status === "success")
        .reduce((s, l) => s + (l.payout || 0), 0),
      forwarded: recent.filter(l => l.direction === "incoming" && l.forwarded).length,
    };
  }, [logs]);

  const statusColor = (s: string) => {
    switch (s) {
      case "success": return "default";
      case "failed": return "destructive";
      case "reversed": return "secondary";
      default: return "outline";
    }
  };

  const postbackUrl = `${window.location.origin.replace('id-preview--', '').replace('.lovable.app', '.supabase.co')}/functions/v1/receive-postback/{provider_code}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Postback Logs</h1>
          <p className="text-sm text-muted-foreground">Monitor incoming & outgoing postback activity</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Postback URL Info */}
      <Card><CardContent className="p-4">
        <p className="text-sm font-medium mb-2">📡 Your Postback Endpoint</p>
        <div className="flex gap-2 items-center">
          <Input value={postbackUrl} readOnly className="text-xs bg-accent font-mono" />
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(postbackUrl);
            toast({ title: "Copied!" });
          }}><Copy className="h-3 w-3" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Replace <code>{"{provider_code}"}</code> with your survey/single-link provider code. Supports GET & POST.</p>
      </CardContent></Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Incoming (24h)", value: stats.totalIncoming, icon: "📥" },
          { label: "Outgoing (24h)", value: stats.totalOutgoing, icon: "📤" },
          { label: "Successful", value: stats.successful, icon: "✅" },
          { label: "Failed", value: stats.failed, icon: "❌" },
          { label: "Reversed", value: stats.reversed, icon: "🔄" },
          { label: "Total Payout", value: stats.totalPayout, icon: "💰" },
          { label: "Forwarded", value: stats.forwarded, icon: "➡️" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-3 text-center">
            <p className="text-lg font-bold">{s.icon} {s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by username, txn_id, provider..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({logs.length})</TabsTrigger>
          <TabsTrigger value="incoming">
            <ArrowDownLeft className="h-3 w-3 mr-1" /> Incoming
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            <ArrowUpRight className="h-3 w-3 mr-1" /> Outgoing
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Direction</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>TXN ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Forwarded</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Time</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No postback logs found
                  </TableCell></TableRow>
                ) : filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.direction === "incoming" ? (
                        <Badge variant="outline" className="gap-1"><ArrowDownLeft className="h-3 w-3" /> In</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><ArrowUpRight className="h-3 w-3" /> Out</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{log.provider_name || "-"}</TableCell>
                    <TableCell className="text-sm">{log.username || "-"}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[100px] truncate">{log.txn_id || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={statusColor(log.status) as any}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.payout || 0} <span className="text-xs text-muted-foreground">{log.payout_type}</span></TableCell>
                    <TableCell>
                      {log.direction === "incoming" ? (
                        log.forwarded ? <Badge variant="default">✓ {log.forward_count}</Badge> : <span className="text-muted-foreground">-</span>
                      ) : (
                        log.response_code ? <Badge variant={log.response_code < 400 ? "default" : "destructive"}>{log.response_code}</Badge> : "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{log.ip_address || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.created_at ? format(new Date(log.created_at), "MMM dd, HH:mm:ss") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default PostbackLogs;
