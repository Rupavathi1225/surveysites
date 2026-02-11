import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Affiliates = () => {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase.from("profiles").select("username, country, status, points, created_at").eq("referred_by", profile.id).then(({ data }) => setReferrals(data || []));
  }, [profile]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your Affiliates</h1>
      <p className="text-muted-foreground">View your referrals and earnings</p>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead>Earned Points</TableHead></TableRow></TableHeader>
          <TableBody>
            {referrals.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No referrals yet</TableCell></TableRow>
            ) : referrals.map((r, i) => (
              <TableRow key={i}><TableCell>{r.username}</TableCell><TableCell>{r.country}</TableCell><TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell><TableCell>{r.points}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};
export default Affiliates;
