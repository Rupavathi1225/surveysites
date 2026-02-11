import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Monitor, Smartphone, Globe, Shield, Clock, MapPin, Wifi, Fingerprint, AlertTriangle } from "lucide-react";

const LoginLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("login_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, user_id, username, email")
    ]).then(([logsRes, usersRes]) => {
      setLogs(logsRes.data || []);
      setUsers(usersRes.data || []);
    });
  }, []);

  const getUser = (userId: string) => users.find(u => u.user_id === userId);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Login Logs</h1>
      <p className="text-muted-foreground">Track user login activity with device, location, and security details</p>

      {logs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No login logs recorded yet</CardContent></Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {logs.map((log) => {
            const user = getUser(log.user_id);
            const riskScore = log.risk_score || 0;
            return (
              <AccordionItem key={log.id} value={log.id} className="border border-border rounded-lg bg-card overflow-hidden">
                <AccordionTrigger className="px-5 py-4 hover:no-underline">
                  <div className="flex items-center gap-4 w-full text-left">
                    <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30">✅ Success</Badge>
                    <span className="font-semibold">{user?.username || "Unknown"}</span>
                    <span className="text-sm text-muted-foreground">{user?.email || log.user_id?.slice(0, 8)}</span>
                    <div className="ml-auto flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className={`h-2 w-2 rounded-full ${getRiskDot(riskScore)}`} />
                        <span className={`text-sm font-medium ${getRiskColor(riskScore)}`}>Risk: {riskScore}/100</span>
                        <span className={`text-xs ${getRiskColor(riskScore)}`}>{getRiskLabel(riskScore)}</span>
                      </div>
                      {log.is_new_device && (
                        <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> New Device
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  {/* Login Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Login Time</p>
                      <p className="text-sm font-medium mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> IP Address</p>
                      <p className="text-sm font-medium mt-1">{log.ip_address || "Unknown"}</p>
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

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {(log.device || "").toLowerCase().includes("mobile") ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />} Device
                      </p>
                      <p className="text-sm font-medium mt-1">{log.device || log.os || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Browser</p>
                      <p className="text-sm font-medium mt-1">{log.browser || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Method</p>
                      <p className="text-sm font-medium mt-1">{log.method || "PASSWORD"}</p>
                    </div>
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
                          <span className={`text-xs ${getRiskColor(riskScore)}`}>{getRiskLabel(riskScore)}</span>
                        </div>
                      </div>
                      {log.is_new_device && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                          <p className="text-sm text-yellow-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Login from new device</p>
                        </div>
                      )}
                      {log.fingerprint && (
                        <div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Device Fingerprint</p>
                          <p className="text-xs font-mono mt-1 text-muted-foreground">{log.fingerprint}</p>
                        </div>
                      )}
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
