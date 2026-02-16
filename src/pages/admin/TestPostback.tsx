import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Send, RefreshCw } from "lucide-react";

interface TestRow {
  id: string;
  partner_id: string;
  username: string;
  offer_name: string;
  points: string;
  count: number;
  interval: number;
}

const newRow = (): TestRow => ({
  id: crypto.randomUUID(),
  partner_id: "",
  username: "",
  offer_name: "",
  points: "",
  count: 1,
  interval: 10,
});

const TestPostback = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [rows, setRows] = useState<TestRow[]>([newRow()]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("downward_partners").select("*").eq("status", "active")
      .order("name").then(({ data }) => setPartners(data || []));
  }, []);

  const updateRow = (id: string, field: string, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter(r => r.id !== id));
  };

  const sendPostbacks = async () => {
    const valid = rows.filter(r => r.partner_id && r.username && r.points);
    if (valid.length === 0) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }

    setSending(true);
    setResults([]);
    const allResults: any[] = [];

    for (const row of valid) {
      const partner = partners.find(p => p.id === row.partner_id);
      for (let i = 0; i < row.count; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, row.interval * 1000));
        try {
          const { data, error } = await supabase.functions.invoke("send-test-postback", {
            body: {
              partner_id: row.partner_id,
              username: row.username,
              offer_name: row.offer_name || "Test Offer",
              points: Number(row.points),
              status: "1",
            },
          });
          allResults.push({
            partner: partner?.name || "Unknown",
            iteration: i + 1,
            success: !error,
            response_code: data?.response_code,
            response: data?.response_body || error?.message || "Unknown",
          });
          setResults([...allResults]);
        } catch (err: any) {
          allResults.push({
            partner: partner?.name || "Unknown",
            iteration: i + 1,
            success: false,
            response: err.message,
          });
          setResults([...allResults]);
        }
      }
    }

    setSending(false);
    toast({ title: `Sent ${allResults.length} test postback(s)!` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Postback</h1>
        <p className="text-sm text-muted-foreground">
          Send test postbacks to registered publishers/partners for integration testing. Configure multiple publishers with different test data and intervals.
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Configure Test Postbacks</h2>
            <p className="text-xs text-muted-foreground">
              Add multiple publisher configurations. Each can send multiple postbacks with custom intervals in seconds.
            </p>
          </div>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end border border-border rounded-lg p-4">
              <div>
                <label className="text-xs font-medium">Publisher *</label>
                <Select value={row.partner_id} onValueChange={v => updateRow(row.id, "partner_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Select publisher" /></SelectTrigger>
                  <SelectContent>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Username *</label>
                <Input value={row.username} onChange={e => updateRow(row.id, "username", e.target.value)} placeholder="e.g., Don1" />
              </div>
              <div>
                <label className="text-xs font-medium">Offer Name *</label>
                <Input value={row.offer_name} onChange={e => updateRow(row.id, "offer_name", e.target.value)} placeholder="e.g., Zen Offer" />
              </div>
              <div>
                <label className="text-xs font-medium">Points *</label>
                <Input type="number" value={row.points} onChange={e => updateRow(row.id, "points", e.target.value)} placeholder="e.g., 30" />
              </div>
              <div>
                <label className="text-xs font-medium">Count *</label>
                <Input type="number" value={row.count} onChange={e => updateRow(row.id, "count", Number(e.target.value))} min={1} max={50} />
              </div>
              <div>
                <label className="text-xs font-medium">Interval (seconds) *</label>
                <Input type="number" value={row.interval} onChange={e => updateRow(row.id, "interval", Number(e.target.value))} min={1} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeRow(row.id)} disabled={rows.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => setRows([...rows, newRow()])}>
              <Plus className="h-4 w-4 mr-2" /> Add Another Publisher
            </Button>
            <Button onClick={sendPostbacks} disabled={sending}>
              <Send className="h-4 w-4 mr-2" /> {sending ? "Sending..." : "Send Test Postbacks"}
            </Button>
            <Button variant="outline" onClick={() => { setResults([]); setRows([newRow()]); }}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-lg text-sm">
                  <Badge variant={r.success ? "default" : "destructive"}>
                    {r.success ? "✓" : "✗"}
                  </Badge>
                  <span className="font-medium">{r.partner}</span>
                  <span className="text-muted-foreground">#{r.iteration}</span>
                  {r.response_code && (
                    <Badge variant={r.response_code < 400 ? "outline" : "destructive"}>
                      HTTP {r.response_code}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">{r.response}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
export default TestPostback;
