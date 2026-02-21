import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, MousePointerClick, Globe, Shield, Clock, Eye, Gift, Ticket,
  TrendingUp, TrendingDown, Activity, UserCheck, UserX, Monitor,
  Smartphone, BarChart3, ArrowUpRight, RefreshCw, AlertTriangle, Layout
} from "lucide-react";

const AdminClickTracking = () => {
  const [clicks, setClicks] = useState<any[]>([]);
  const [providerClicks, setProviderClicks] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [pageVisits, setPageVisits] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [promoRedemptions, setPromoRedemptions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now24h = useMemo(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // First fetch all reference data
      const [offersRes, surveysRes, providersRes, profilesRes] = await Promise.all([
        supabase.from("offers").select("id, title").eq("status", "active"),
        supabase.from("survey_links").select("id, name").eq("status", "active"),
        supabase.from("survey_providers").select("id, name, code").eq("status", "active"),
        supabase.from("profiles").select("id, username, email"),
      ]);
      
      setOffers(offersRes.data || []);
      setSurveyLinks(surveysRes.data || []);
      setProviders(providersRes.data || []);
      
      // Create lookup maps for faster access
      const offerMap = new Map((offersRes.data || []).map(o => [o.id, o]));
      const surveyMap = new Map((surveysRes.data || []).map(s => [s.id, s]));
      const providerMap = new Map((providersRes.data || []).map(p => [p.id, p]));
      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

      // Fetch clicks
      const [clicksRes, providerClicksRes, loginsRes, visitsRes, earningsRes, promoRes] = await Promise.all([
        // Regular offer/survey clicks
        supabase.from("offer_clicks")
          .select("*")
          .or("offer_id.not.is.null,survey_link_id.not.is.null")
          .order("created_at", { ascending: false }).limit(1000),
        
        // Provider/Offerwall clicks
        supabase.from("offer_clicks")
          .select("*")
          .not("provider_id", "is", null)
          .order("created_at", { ascending: false }).limit(500),
        
        supabase.from("login_logs")
          .select("*")
          .order("created_at", { ascending: false }).limit(500),
        
        supabase.from("page_visits")
          .select("*").order("visited_at", { ascending: false }).limit(1000),
        
        supabase.from("earning_history")
          .select("*")
          .order("created_at", { ascending: false }).limit(500),
        
        supabase.from("promocode_redemptions")
          .select("*")
          .order("created_at", { ascending: false }).limit(200),
      ]);
      
      // Enhance click data with joined information
      const enhancedClicks = (clicksRes.data || []).map(click => ({
        ...click,
        profiles: profileMap.get(click.user_id) || null,
        offers: click.offer_id ? offerMap.get(click.offer_id) : null,
        survey_links: click.survey_link_id ? surveyMap.get(click.survey_link_id) : null
      }));

      const enhancedProviderClicks = (providerClicksRes.data || []).map(click => ({
        ...click,
        profiles: profileMap.get(click.user_id) || null,
        survey_providers: click.provider_id ? providerMap.get(click.provider_id) : null
      }));

      // Enhance other data
      const enhancedLogins = (loginsRes.data || []).map(log => ({
        ...log,
        profiles: profileMap.get(log.user_id) || null
      }));

      const enhancedEarnings = (earningsRes.data || []).map(earn => ({
        ...earn,
        profiles: profileMap.get(earn.user_id) || null
      }));

      const enhancedPromo = (promoRes.data || []).map(promo => ({
        ...promo,
        profiles: profileMap.get(promo.user_id) || null,
        promocodes: promo.promocode_id ? { code: promo.promocode_id } : null
      }));

      setClicks(enhancedClicks);
      setProviderClicks(enhancedProviderClicks);
      setLoginLogs(enhancedLogins);
      setPageVisits(visitsRes.data || []);
      setEarnings(enhancedEarnings);
      setPromoRedemptions(enhancedPromo);
      setProfiles(profilesRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  // Helper function to get item name
  const getItemName = (click: any) => {
    if (click.offer_id && click.offers) {
      return click.offers.title || "Unknown Offer";
    }
    if (click.survey_link_id && click.survey_links) {
      return click.survey_links.name || "Unknown Survey";
    }
    if (click.provider_id && click.survey_providers) {
      return click.survey_providers.name || "Unknown Offerwall";
    }
    return "—";
  };

  // Helper function to get item type
  const getItemType = (click: any) => {
    if (click.offer_id) return "offer";
    if (click.survey_link_id) return "survey";
    if (click.provider_id) return "provider";
    return "unknown";
  };

  // Last 24h filtered data
  const clicks24h = useMemo(() => clicks.filter(c => c.created_at >= now24h), [clicks, now24h]);
  const providerClicks24h = useMemo(() => providerClicks.filter(c => c.created_at >= now24h), [providerClicks, now24h]);
  const logins24h = useMemo(() => loginLogs.filter(l => l.created_at >= now24h), [loginLogs, now24h]);
  const visits24h = useMemo(() => pageVisits.filter(v => v.visited_at >= now24h), [pageVisits, now24h]);
  const earnings24h = useMemo(() => earnings.filter(e => e.created_at >= now24h), [earnings, now24h]);
  const promo24h = useMemo(() => promoRedemptions.filter(p => p.created_at >= now24h), [promoRedemptions, now24h]);
  const newUsers24h = useMemo(() => profiles.filter(p => p.created_at >= now24h), [profiles, now24h]);

  // Computed 24h metrics
  const metrics24h = useMemo(() => {
    const allClicks24h = [...clicks24h, ...providerClicks24h];
    const uniqueUsers = new Set(allClicks24h.map(c => c.user_id).filter(Boolean)).size;
    const uniqueIPs = new Set(allClicks24h.map(c => c.ip_address).filter(Boolean)).size;
    const uniqueClicks = new Set(allClicks24h.map(c => `${c.user_id}_${c.offer_id || c.survey_link_id || c.provider_id}`).filter(Boolean)).size;
    
    const offerClicked = clicks24h.filter(c => c.offer_id).length;
    const surveyClicked = clicks24h.filter(c => c.survey_link_id).length;
    const providerClicked = providerClicks24h.length;
    const offersNotClicked = clicks24h.filter(c => !c.offer_id && !c.survey_link_id).length;
    
    const completed = clicks24h.filter(c => c.completion_status === "completed").length;
    const reversed = clicks24h.filter(c => c.completion_status === "reversed").length;
    const vpnCount = allClicks24h.filter(c => c.vpn_proxy_flag).length;
    const highRisk = allClicks24h.filter(c => c.risk_score > 50).length;
    const countries = new Set(allClicks24h.map(c => c.country).filter(Boolean));
    const devices = {
      mobile: allClicks24h.filter(c => c.device_type === "mobile").length,
      desktop: allClicks24h.filter(c => c.device_type === "desktop").length,
      tablet: allClicks24h.filter(c => c.device_type === "tablet").length
    };
    
    const avgTimeSpent = allClicks24h.filter(c => c.time_spent > 0).length > 0
      ? Math.round(allClicks24h.filter(c => c.time_spent > 0).reduce((s, c) => s + c.time_spent, 0) / allClicks24h.filter(c => c.time_spent > 0).length)
      : 0;
    
    const uniqueLogins = new Set(logins24h.map(l => l.user_id).filter(Boolean)).size;
    const newDeviceLogins = logins24h.filter(l => l.is_new_device).length;
    const surveyPageVisits = visits24h.filter(v => v.page_path?.includes("survey") || v.page_path?.includes("daily")).length;
    const promoAdded = promo24h.length;
    const totalEarned = earnings24h.filter(e => e.status === "approved").reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return {
      totalClicks: allClicks24h.length,
      offerClicks: offerClicked,
      surveyClicks: surveyClicked,
      providerClicks: providerClicked,
      uniqueClicks, uniqueUsers, uniqueIPs,
      offerClicked, surveyClicked, providerClicked, offersNotClicked,
      completed, reversed,
      vpnCount, highRisk, countries: countries.size, countryList: [...countries],
      devices, avgTimeSpent, uniqueLogins, newDeviceLogins, newUsers: newUsers24h.length,
      surveyPageVisits, promoAdded, totalEarned, totalPageViews: visits24h.length,
    };
  }, [clicks24h, providerClicks24h, logins24h, visits24h, earnings24h, promo24h, newUsers24h]);

  // User behavior aggregation
  const userBehavior = useMemo(() => {
    const allClicks = [...clicks, ...providerClicks];
    const map = new Map<string, any>();
    
    allClicks.forEach(c => {
      if (!c.user_id) return;
      if (!map.has(c.user_id)) {
        map.set(c.user_id, {
          user_id: c.user_id,
          username: c.profiles?.username || "—",
          email: c.profiles?.email || "—",
          totalClicks: 0,
          offerClicks: 0,
          surveyClicks: 0,
          providerClicks: 0,
          completed: 0,
          reversed: 0,
          clicked: 0,
          vpnFlags: 0,
          avgRisk: 0,
          riskSum: 0,
          countries: new Set(),
          devices: new Set(),
          avgTime: 0,
          timeSum: 0,
          timeCount: 0,
          lastClick: c.created_at,
        });
      }
      const u = map.get(c.user_id);
      u.totalClicks++;
      
      if (c.offer_id) u.offerClicks++;
      else if (c.survey_link_id) u.surveyClicks++;
      else if (c.provider_id) u.providerClicks++;
      
      if (c.completion_status === "completed") u.completed++;
      else if (c.completion_status === "reversed") u.reversed++;
      else u.clicked++;
      
      if (c.vpn_proxy_flag) u.vpnFlags++;
      u.riskSum += (c.risk_score || 0);
      if (c.country) u.countries.add(c.country);
      if (c.device_type) u.devices.add(c.device_type);
      if (c.time_spent > 0) { u.timeSum += c.time_spent; u.timeCount++; }
      if (c.created_at > u.lastClick) u.lastClick = c.created_at;
    });
    
    return [...map.values()].map(u => ({
      ...u,
      avgRisk: u.totalClicks ? Math.round(u.riskSum / u.totalClicks) : 0,
      avgTime: u.timeCount ? Math.round(u.timeSum / u.timeCount) : 0,
      completionRate: u.totalClicks ? Math.round((u.completed / u.totalClicks) * 100) : 0,
      countries: [...u.countries].join(", "),
      devices: [...u.devices].join(", "),
    })).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [clicks, providerClicks]);

  // Offer performance
  const offerPerformance = useMemo(() => {
    const map = new Map<string, any>();
    
    // Regular offers and surveys
    clicks.forEach(c => {
      const key = c.offer_id || c.survey_link_id || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: c.offers?.title || c.survey_links?.name || "Unknown",
          type: c.offer_id ? "Offer" : "Survey",
          totalClicks: 0,
          completed: 0,
          reversed: 0,
          clicked: 0,
          uniqueUsers: new Set(),
          avgTime: 0,
          timeSum: 0,
          timeCount: 0,
        });
      }
      const o = map.get(key);
      o.totalClicks++;
      if (c.completion_status === "completed") o.completed++;
      else if (c.completion_status === "reversed") o.reversed++;
      else o.clicked++;
      if (c.user_id) o.uniqueUsers.add(c.user_id);
      if (c.time_spent > 0) { o.timeSum += c.time_spent; o.timeCount++; }
    });

    // Provider/Offerwall clicks
    providerClicks.forEach(c => {
      const key = `provider_${c.provider_id}`;
      if (!map.has(key)) {
        map.set(key, {
          id: c.provider_id,
          name: c.survey_providers?.name || "Unknown Provider",
          type: "Offerwall",
          totalClicks: 0,
          completed: 0,
          reversed: 0,
          clicked: 0,
          uniqueUsers: new Set(),
          avgTime: 0,
          timeSum: 0,
          timeCount: 0,
        });
      }
      const o = map.get(key);
      o.totalClicks++;
      o.clicked++;
      if (c.user_id) o.uniqueUsers.add(c.user_id);
      if (c.time_spent > 0) { o.timeSum += c.time_spent; o.timeCount++; }
    });
    
    return [...map.values()].map(o => ({
      ...o,
      uniqueUsers: o.uniqueUsers.size,
      avgTime: o.timeCount ? Math.round(o.timeSum / o.timeCount) : 0,
      completionRate: o.totalClicks ? Math.round((o.completed / o.totalClicks) * 100) : 0,
      reversalRate: o.totalClicks ? Math.round((o.reversed / o.totalClicks) * 100) : 0,
    })).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [clicks, providerClicks]);

  // Provider performance
  const providerPerformance = useMemo(() => {
    const map = new Map<string, any>();
    
    providerClicks.forEach(c => {
      const providerId = c.provider_id;
      if (!providerId) return;
      
      if (!map.has(providerId)) {
        map.set(providerId, {
          id: providerId,
          name: c.survey_providers?.name || "Unknown",
          code: c.survey_providers?.code || "—",
          totalClicks: 0,
          uniqueUsers: new Set(),
          avgTime: 0,
          timeSum: 0,
          timeCount: 0,
          vpnCount: 0,
          countries: new Set(),
          devices: {
            mobile: 0,
            desktop: 0,
            tablet: 0
          }
        });
      }
      
      const p = map.get(providerId);
      p.totalClicks++;
      if (c.user_id) p.uniqueUsers.add(c.user_id);
      if (c.vpn_proxy_flag) p.vpnCount++;
      if (c.country) p.countries.add(c.country);
      if (c.device_type) {
        if (c.device_type === 'mobile') p.devices.mobile++;
        else if (c.device_type === 'desktop') p.devices.desktop++;
        else if (c.device_type === 'tablet') p.devices.tablet++;
      }
      if (c.time_spent > 0) { p.timeSum += c.time_spent; p.timeCount++; }
    });
    
    return [...map.values()].map(p => ({
      ...p,
      uniqueUsers: p.uniqueUsers.size,
      avgTime: p.timeCount ? Math.round(p.timeSum / p.timeCount) : 0,
      vpnPercentage: p.totalClicks ? Math.round((p.vpnCount / p.totalClicks) * 100) : 0,
      countries: [...p.countries].join(", "),
    })).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [providerClicks]);

  const StatCard = ({ icon: Icon, value, label, color = "text-primary" }: { icon: any; value: any; label: string; color?: string }) => (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${color}`} />
          <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );

  // Combine all clicks for display
  const allClicks = useMemo(() => {
    return [...clicks, ...providerClicks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [clicks, providerClicks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Click Tracking</h1>
          <p className="text-sm text-muted-foreground">Track visitor sessions, click activity & user behavior</p>
        </div>
        <Badge variant="outline" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Live Data</Badge>
      </div>

      <Tabs defaultValue="last24h">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="last24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="activity">Click Activity</TabsTrigger>
          <TabsTrigger value="users">User Behavior</TabsTrigger>
          <TabsTrigger value="offers">Offer Performance</TabsTrigger>
          <TabsTrigger value="providers">Offerwall Analytics</TabsTrigger>
          <TabsTrigger value="raw">Raw Logs</TabsTrigger>
        </TabsList>

        {/* ==================== LAST 24 HOURS ==================== */}
        <TabsContent value="last24h" className="space-y-6">
          <h2 className="text-lg font-semibold mt-2">Last 24 Hours</h2>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading analytics...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard icon={Users} value={metrics24h.newUsers} label="New Users Registered" />
                <StatCard icon={UserCheck} value={metrics24h.uniqueLogins} label="Unique Logins" />
                <StatCard icon={Activity} value={logins24h.length} label="Total Login Sessions" />
                <StatCard icon={Monitor} value={metrics24h.newDeviceLogins} label="New Device Logins" color="text-yellow-500" />
                <StatCard icon={Eye} value={metrics24h.totalPageViews} label="Total Page Views" />
                
                <StatCard icon={MousePointerClick} value={metrics24h.totalClicks} label="Total Clicks" />
                <StatCard icon={MousePointerClick} value={metrics24h.uniqueClicks} label="Unique Clicks" />
                <StatCard icon={Users} value={metrics24h.uniqueUsers} label="Unique Clickers" />
                <StatCard icon={Globe} value={metrics24h.uniqueIPs} label="Unique IPs" />
                
                <StatCard icon={TrendingUp} value={metrics24h.offerClicked} label="Offer Clicks" />
                <StatCard icon={BarChart3} value={metrics24h.surveyClicked} label="Survey Clicks" />
                <StatCard icon={Layout} value={metrics24h.providerClicks} label="Offerwall Clicks" color="text-purple-500" />
                
                <StatCard icon={UserX} value={metrics24h.offersNotClicked} label="Unlinked Clicks" color="text-yellow-500" />
                <StatCard icon={TrendingUp} value={metrics24h.completed} label="Completed" color="text-green-500" />
                <StatCard icon={TrendingDown} value={metrics24h.reversed} label="Reversed" color="text-red-500" />
                
                <StatCard icon={Shield} value={metrics24h.vpnCount} label="VPN/Proxy Detected" color="text-orange-500" />
                <StatCard icon={AlertTriangle} value={metrics24h.highRisk} label="High Risk Clicks" color="text-red-500" />
                <StatCard icon={Globe} value={metrics24h.countries} label="Countries Active" />
                <StatCard icon={Clock} value={`${metrics24h.avgTimeSpent}s`} label="Avg Time Spent" />
                
                <StatCard icon={Gift} value={metrics24h.promoAdded} label="Promocodes Redeemed" />
                <StatCard icon={Ticket} value={metrics24h.totalEarned} label="Points Earned" />
                <StatCard icon={Eye} value={metrics24h.surveyPageVisits} label="Survey Page Visits" />
                
                <StatCard icon={Smartphone} value={metrics24h.devices.mobile} label="Mobile Clicks" />
                <StatCard icon={Monitor} value={metrics24h.devices.desktop} label="Desktop Clicks" />
              </div>

              {/* Country breakdown */}
              {metrics24h.countryList.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Countries Active (24h)</CardTitle></CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {metrics24h.countryList.map(c => <Badge key={c} variant="secondary">{c}</Badge>)}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ==================== CLICK ACTIVITY ==================== */}
        <TabsContent value="activity" className="space-y-4">
          <h2 className="text-lg font-semibold">Click Activity & Completion Tracking</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard icon={MousePointerClick} value={allClicks.length} label="All-Time Clicks" />
            <StatCard icon={TrendingUp} value={clicks.filter(c => c.completion_status === "completed").length} label="Completed" color="text-green-500" />
            <StatCard icon={TrendingDown} value={clicks.filter(c => c.completion_status === "reversed").length} label="Reversed" color="text-red-500" />
            <StatCard icon={Clock} value={clicks.filter(c => c.completion_status === "clicked").length + providerClicks.length} label="Pending/Clicked" color="text-yellow-500" />
            <StatCard icon={Layout} value={providerClicks.length} label="Offerwall Clicks" color="text-purple-500" />
            <StatCard icon={Shield} value={allClicks.filter(c => c.vpn_proxy_flag).length} label="VPN Flagged" color="text-orange-500" />
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Click Activity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[500px]">
                <div className="min-w-[1400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Offer/Survey</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>VPN</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Time Spent</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allClicks.slice(0, 150).map(c => {
                        const type = getItemType(c);
                        const itemName = getItemName(c);
                        
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Badge 
                                variant={
                                  type === "provider" ? "default" : 
                                  type === "offer" ? "secondary" : 
                                  "outline"
                                }
                                className={`text-xs ${
                                  type === "provider" ? "bg-purple-500" : 
                                  type === "offer" ? "bg-blue-500" : 
                                  "bg-green-500"
                                }`}
                              >
                                {type === "provider" ? "Offerwall" : 
                                 type === "offer" ? "Offer" : 
                                 type === "survey" ? "Survey" : "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{c.profiles?.username || "—"}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {itemName !== "—" ? itemName : 
                               <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  c.completion_status === "completed" ? "default" : 
                                  c.completion_status === "reversed" ? "destructive" : 
                                  type === "provider" ? "secondary" : "secondary"
                                } 
                                className="text-xs"
                              >
                                {type === "provider" ? "Clicked" : c.completion_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{c.ip_address || "—"}</TableCell>
                            <TableCell className="text-xs">{c.country || "—"}</TableCell>
                            <TableCell className="text-xs">{c.device_type || "—"}</TableCell>
                            <TableCell className="text-xs">{c.vpn_proxy_flag ? "⚠️ Yes" : "No"}</TableCell>
                            <TableCell>
                              <Badge variant={c.risk_score > 50 ? "destructive" : "secondary"} className="text-xs">
                                {c.risk_score || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{c.time_spent ? `${c.time_spent}s` : "—"}</TableCell>
                            <TableCell className="text-xs text-center">{c.attempt_count || 1}</TableCell>
                            <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== USER BEHAVIOR ==================== */}
        <TabsContent value="users" className="space-y-4">
          <h2 className="text-lg font-semibold">User Behavior Analysis</h2>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[600px]">
                <div className="min-w-[1600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Offers</TableHead>
                        <TableHead>Surveys</TableHead>
                        <TableHead>Offerwalls</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Reversed</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Completion %</TableHead>
                        <TableHead>VPN Flags</TableHead>
                        <TableHead>Avg Risk</TableHead>
                        <TableHead>Avg Time</TableHead>
                        <TableHead>Countries</TableHead>
                        <TableHead>Devices</TableHead>
                        <TableHead>Last Click</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userBehavior.length === 0 ? (
                        <TableRow><TableCell colSpan={16} className="text-center text-muted-foreground py-8">No user data</TableCell></TableRow>
                      ) : userBehavior.map(u => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium text-sm">{u.username}</TableCell>
                          <TableCell className="text-xs">{u.email}</TableCell>
                          <TableCell className="text-sm font-bold">{u.totalClicks}</TableCell>
                          <TableCell className="text-sm">{u.offerClicks || 0}</TableCell>
                          <TableCell className="text-sm">{u.surveyClicks || 0}</TableCell>
                          <TableCell className="text-sm text-purple-500">{u.providerClicks || 0}</TableCell>
                          <TableCell className="text-sm text-green-500">{u.completed}</TableCell>
                          <TableCell className="text-sm text-red-500">{u.reversed}</TableCell>
                          <TableCell className="text-sm text-yellow-500">{u.clicked}</TableCell>
                          <TableCell>
                            <Badge variant={u.completionRate > 60 ? "default" : u.completionRate > 30 ? "secondary" : "destructive"} className="text-xs">
                              {u.completionRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{u.vpnFlags > 0 ? <span className="text-orange-500">⚠️ {u.vpnFlags}</span> : "0"}</TableCell>
                          <TableCell><Badge variant={u.avgRisk > 50 ? "destructive" : "secondary"} className="text-xs">{u.avgRisk}</Badge></TableCell>
                          <TableCell className="text-xs">{u.avgTime}s</TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">{u.countries || "—"}</TableCell>
                          <TableCell className="text-xs">{u.devices || "—"}</TableCell>
                          <TableCell className="text-xs">{new Date(u.lastClick).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== OFFER PERFORMANCE ==================== */}
        <TabsContent value="offers" className="space-y-4">
          <h2 className="text-lg font-semibold">Offer & Survey Performance</h2>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[600px]">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Total Clicks</TableHead>
                        <TableHead>Unique Users</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Reversed</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Completion %</TableHead>
                        <TableHead>Reversal %</TableHead>
                        <TableHead>Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offerPerformance.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No data available</TableCell></TableRow>
                      ) : offerPerformance.map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium text-sm max-w-[200px] truncate">{o.name}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={o.type === "Offerwall" ? "default" : "outline"} 
                              className={`text-xs ${o.type === "Offerwall" ? "bg-purple-500" : o.type === "Offer" ? "bg-blue-500" : "bg-green-500"}`}
                            >
                              {o.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">{o.totalClicks}</TableCell>
                          <TableCell>{o.uniqueUsers}</TableCell>
                          <TableCell className="text-green-500">{o.completed}</TableCell>
                          <TableCell className="text-red-500">{o.reversed}</TableCell>
                          <TableCell className="text-yellow-500">{o.clicked}</TableCell>
                          <TableCell>
                            <Badge variant={o.completionRate > 60 ? "default" : o.completionRate > 30 ? "secondary" : "destructive"} className="text-xs">
                              {o.completionRate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={o.reversalRate > 20 ? "destructive" : "secondary"} className="text-xs">
                              {o.reversalRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{o.avgTime}s</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== OFFERWALL ANALYTICS ==================== */}
        <TabsContent value="providers" className="space-y-4">
          <h2 className="text-lg font-semibold">Offerwall Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Offerwall Clicks</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-500">{providerClicks.length}</p>
                <p className="text-xs text-muted-foreground mt-1">All-time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Unique Users</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{new Set(providerClicks.map(c => c.user_id)).size}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all offerwalls</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Active Offerwalls</CardTitle></CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{providers.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Currently active</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Offerwall Performance Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[500px]">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offerwall Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Total Clicks</TableHead>
                        <TableHead>Unique Users</TableHead>
                        <TableHead>Avg Time</TableHead>
                        <TableHead>VPN Detected</TableHead>
                        <TableHead>VPN %</TableHead>
                        <TableHead>Devices (M/D/T)</TableHead>
                        <TableHead>Countries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerPerformance.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No offerwall click data yet</TableCell></TableRow>
                      ) : providerPerformance.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-xs font-mono">{p.code}</TableCell>
                          <TableCell className="font-bold">{p.totalClicks}</TableCell>
                          <TableCell>{p.uniqueUsers}</TableCell>
                          <TableCell className="text-xs">{p.avgTime}s</TableCell>
                          <TableCell className="text-xs text-orange-500">{p.vpnCount}</TableCell>
                          <TableCell>
                            <Badge variant={p.vpnPercentage > 20 ? "destructive" : "secondary"} className="text-xs">
                              {p.vpnPercentage}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            📱{p.devices.mobile} | 💻{p.devices.desktop} | 📟{p.devices.tablet}
                          </TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{p.countries || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== RAW LOGS ==================== */}
        <TabsContent value="raw" className="space-y-4">
          <h2 className="text-lg font-semibold">Raw Click Logs</h2>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[2000px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Item</TableHead>
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
                      {allClicks.length === 0 ? (
                        <TableRow><TableCell colSpan={20} className="text-center text-muted-foreground py-8">No click data yet</TableCell></TableRow>
                      ) : allClicks.map((c) => {
                        const type = getItemType(c);
                        const itemName = getItemName(c);
                        
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Badge 
                                variant={type === "provider" ? "default" : "secondary"} 
                                className={`text-xs ${type === "provider" ? "bg-purple-500" : ""}`}
                              >
                                {type === "provider" ? "Offerwall" : type === "offer" ? "Offer" : "Survey"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{c.profiles?.username || "—"}</TableCell>
                            <TableCell className="text-xs">{c.profiles?.email || "—"}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {itemName !== "—" ? itemName : 
                               <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-xs font-mono max-w-[120px] truncate">{c.session_id || "—"}</TableCell>
                            <TableCell className="text-xs">{c.ip_address || "—"}</TableCell>
                            <TableCell className="text-xs">{c.country || "—"}</TableCell>
                            <TableCell className="text-xs">{c.device_type || "—"}</TableCell>
                            <TableCell className="text-xs">{c.browser || "—"}</TableCell>
                            <TableCell className="text-xs">{c.os || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[100px] truncate">{c.source || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[100px] truncate">
                              {c.utm_params ? JSON.stringify(c.utm_params).substring(0, 30) + "..." : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{c.session_start ? new Date(c.session_start).toLocaleString() : "—"}</TableCell>
                            <TableCell className="text-xs">{c.session_end ? new Date(c.session_end).toLocaleString() : "—"}</TableCell>
                            <TableCell className="text-xs">{c.time_spent ? `${c.time_spent}s` : "—"}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  c.completion_status === "completed" ? "default" : 
                                  c.completion_status === "reversed" ? "destructive" : 
                                  type === "provider" ? "secondary" : "secondary"
                                } 
                                className="text-xs"
                              >
                                {type === "provider" ? "Clicked" : c.completion_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{c.vpn_proxy_flag ? "⚠️ Yes" : "No"}</TableCell>
                            <TableCell className="text-xs text-center">{c.attempt_count || 1}</TableCell>
                            <TableCell>
                              <Badge variant={c.risk_score > 50 ? "destructive" : "secondary"} className="text-xs">
                                {c.risk_score || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminClickTracking;