import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LoginLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { supabase.from("login_logs").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setLogs(data || [])); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Login Logs</h1>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User ID</TableHead><TableHead>User Agent</TableHead></TableRow></TableHeader><TableBody>
        {logs.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No logs</TableCell></TableRow> : logs.map((l) => (
          <TableRow key={l.id}><TableCell className="text-sm">{new Date(l.created_at).toLocaleString()}</TableCell><TableCell className="text-xs font-mono">{l.user_id?.slice(0,8)}</TableCell><TableCell className="text-xs max-w-xs truncate">{l.user_agent}</TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default LoginLogs;
