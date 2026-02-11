import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const EarningHistory = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const load = () => supabase.from("earning_history").select("*").order("created_at", { ascending: false }).limit(100).then(({ data }) => setItems(data || []));
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { await supabase.from("earning_history").delete().eq("id", id); load(); };
  const filtered = items.filter((i) => !filter || (i.description || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Earning History</h1>
      <Input placeholder="Filter by description..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User ID</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
        {filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records</TableCell></TableRow> : filtered.map((e) => (
          <TableRow key={e.id}><TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString()}</TableCell><TableCell className="text-xs font-mono">{e.user_id?.slice(0,8)}</TableCell><TableCell>{e.description}</TableCell><TableCell className="font-medium">{e.amount}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => del(e.id)}><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>
        ))}</TableBody></Table></CardContent></Card>
    </div>
  );
};
export default EarningHistory;
