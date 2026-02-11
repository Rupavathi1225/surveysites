import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Monitor, Smartphone, Globe, Shield, Clock, MapPin, Wifi, Fingerprint, AlertTriangle, Search, ExternalLink } from "lucide-react";

const LoginLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [pageVisits, setPageVisits] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("login_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, user_id, username, email"),
      supabase.from("page_visits").select("*").order("visited_at", { ascending: false }).limit(500),
    ]).then(([logsRes, usersRes, visitsRes]) => {
      setLogs(logsRes.data || []);
      setUsers(usersRes.data || []);
      const grouped: Record<string, any[]> = {};
      (visitsRes.data || []).forEach((v: any) => {
        if (!grouped[v.login_log_id]) grouped[v.login_log_id] = [];
        grouped[v.login_log_id].push(v);
      });
      setPageVisits(grouped);
    });
  }, []);

  const getUser = (userId: string) => users.find(u => u.id === userId || u.user_id === userId);

  const getRiskColor = (score: number) => {
    if (score <= 30) return "text-green-400";
    if (score <= 60) return "text-yellow-400";
    return "text-red-400";
  };
  const getRiskLabel = (score: number) => {
    if (score <= 30) return "LOW";
    if (score <= 60) return "MEDIUM";
    return "HIGH";
  };
  const getRiskDot = (score: number) => {
    if (score <= 30) return "bg-green-400";
    if (score <= 60) return "bg-yellow-400";
    return "bg-red-400";
  };

  const filtered = logs.filter(log => {
    if (!search) return true;
    const user = getUser(log.user_id);
    const s = search.toLowerCase();
    return (
      (user?.email || "").toLowerCase().includes(s) ||
      (user?.username || "").toLowerCase().includes(s) ||
      (log.ip_address || "").includes(s) ||
      (log.location || "").toLowerCase().includes(s) ||
      (log.isp || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Recent Login Attempts ({filtered.length} total)</h1>
        <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Live</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No login logs found</CardContent></Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {filtered.map((log) => {
            const user = getUser(log.user_id);
            const riskScore = log.risk_score || 0;
            const visits = pageVisits[log.id] || [];
            return (
              <AccordionItem key={log.id} value={log.id} className="border border-border rounded-lg bg-card overflow-hidden">
                <AccordionTrigger className="px-5 py-4 hover:no-underline">
                  <div className="flex items-center gap-4 w-full text-left">
                    <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30">✅ Success</Badge>
                    <span className="font-semibold">{user?.username || "Unknown"}</span>
                    <span className="text-sm text-muted-foreground">{user?.email || log.user_id?.slice(0, 8)}</span>
                    <div className="ml-auto flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${getRiskDot(riskScore)}`} />
                        <span className="text-sm">Risk: {riskScore}/100</span>
                        <Badge variant="outline" className="text-xs">{getRiskLabel(riskScore)}</Badge>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Login Time</p>
                      <p className="text-sm font-medium mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> IP Address</p>
                      <p className="text-sm font-mono font-medium mt-1">{log.ip_address || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                      <p className="text-sm font-medium mt-1">{log.location || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Wifi className="h-3 w-3" /> ISP</p>
                      <p className="text-sm font-medium mt-1">{log.isp || "Unknown"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {(log.device || "").toLowerCase().includes("mobile") ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />} Device
                      </p>
                      <p className="text-sm font-medium mt-1">{log.device || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Browser</p>
                      <p className="text-sm font-medium mt-1">{log.browser || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Method</p>
                      <p className="text-sm font-medium mt-1">{log.method || "PASSWORD"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Session ID</p>
                      <p className="text-sm font-mono font-medium mt-1 truncate max-w-[180px]">{log.session_id || "—"}</p>
                    </div>
                  </div>

                  {/* Last 10 Pages Visited */}
                  <div className="mb-6">
                    <h4 className="font-semibold flex items-center gap-2 mb-3"><ExternalLink className="h-4 w-4" /> Last 10 Pages Visited</h4>
                    {visits.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">No page visits recorded for this session</p>
                    ) : (
                      <div className="space-y-1">
                        {visits.slice(0, 10).map((v, i) => (
                          <div key={i} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-2 rounded">
                            <span className="font-mono text-xs">{v.page_path}</span>
                            <span className="text-xs text-muted-foreground">{new Date(v.visited_at).toLocaleTimeString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fraud Analysis */}
                  <Card className="bg-muted/30 border-border/50">
                    <CardContent className="p-4 space-y-4">
                      <h4 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Fraud Analysis</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Fraud Risk Score</span>
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${getRiskDot(riskScore)}`} />
                          <span className={`font-bold ${getRiskColor(riskScore)}`}>{riskScore}/100</span>
                          <Badge variant="outline" className="text-xs">{getRiskLabel(riskScore)}</Badge>
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-sm font-medium">Detected Issues</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {riskScore === 0 ? "No issues detected" : 
                           log.is_new_device ? "Login from new/unrecognized device" : "Minor risk factors detected"}
                        </p>
                      </div>
                      {log.fingerprint && (
                        <div className="bg-muted/50 rounded p-3">
                          <p className="text-sm font-medium flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Device Information</p>
                          <p className="text-xs font-mono mt-1 text-muted-foreground">Fingerprint: {log.fingerprint}</p>
                        </div>
                      )}
                      <div className="bg-muted/50 rounded p-3">
                        <p className="text-sm font-medium">Login Frequency</p>
                        <p className="text-xs text-muted-foreground mt-1">Last Hour: N/A &nbsp;&nbsp; Last 24h: N/A</p>
                      </div>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};
export default LoginLogs;
