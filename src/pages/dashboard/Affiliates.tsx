import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Globe, Activity } from "lucide-react";

const Affiliates = () => {
  const { profile } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [activeReferrals, setActiveReferrals] = useState(0);

  useEffect(() => {
    if (!profile) return;
    supabase.from("profiles").select("username, country, status, points, created_at").eq("referred_by", profile.id).then(({ data }) => {
      const referralsData = data || [];
      setReferrals(referralsData);
      setTotalEarnings(referralsData.reduce((sum, r) => sum + (r.points || 0), 0));
      setActiveReferrals(referralsData.filter(r => r.status === "active").length);
    });
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Header Section - BadBoysAI Style */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Your Affiliates</h1>
          <p className="text-sm text-gray-400">Track your referrals and earnings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Referrals</p>
                <p className="text-xl font-bold text-white">{referrals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Active Referrals</p>
                <p className="text-xl font-bold text-white">{activeReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Earnings</p>
                <p className="text-xl font-bold text-white">{totalEarnings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referrals Table - BadBoysAI Style */}
      <Card className="border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Referral List</h2>
                <p className="text-xs text-gray-400">Your referred users and their activity</p>
              </div>
              <Badge className="ml-auto bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs border-0">
                {referrals.length} Total
              </Badge>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-purple-500/20">
                  <TableHead className="text-purple-300 font-semibold">User</TableHead>
                  <TableHead className="text-purple-300 font-semibold">Country</TableHead>
                  <TableHead className="text-purple-300 font-semibold">Status</TableHead>
                  <TableHead className="text-purple-300 font-semibold">Earned Points</TableHead>
                  <TableHead className="text-purple-300 font-semibold">Joined Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                          <Users className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white">No Referrals Yet</h3>
                        <p className="text-sm text-gray-400">Start sharing your referral link to earn rewards!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : referrals.map((r, i) => (
                  <TableRow key={i} className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors">
                    <TableCell className="text-white font-medium">{r.username}</TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-purple-400" />
                        {r.country || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        r.status === "active" 
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-semibold">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        {r.points || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default Affiliates;
