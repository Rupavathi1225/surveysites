import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Users, MousePointerClick, Globe, Shield, Clock, Eye, Gift, Ticket,
  TrendingUp, TrendingDown, Activity, UserCheck, UserX, Monitor,
  Smartphone, BarChart3, ArrowUpRight, RefreshCw, AlertTriangle, Layout,
  CheckCircle, XCircle, ArrowDownUp, Search
} from "lucide-react";

const AdminClickTracking = () => {
  const [clicks, setClicks] = useState<any[]>([]);
  const [providerClicks, setProviderClicks] = useState<any[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [pageVisits, setPageVisits] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [promoRedemptions, setPromoRedemptions] = useState<any[]>([]);
  const [postbackLogs, setPostbackLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [detailModal, setDetailModal] = useState<{ title: string; data: any[]; columns: { key: string; label: string }[] } | null>(null);
  const [userDetailModal, setUserDetailModal] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const now24h = useMemo(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    
    const [offersRes, surveysRes, providersRes, profilesRes] = await Promise.all([
      supabase.from("offers").select("id, title"),
      supabase.from("survey_links").select("id, name"),
      supabase.from("survey_providers").select("id, name, code, image_url"),
      supabase.from("profiles").select("id, username, email, created_at, country, points"),
    ]);
    
    setOffers(offersRes.data || []);
    setSurveyLinks(surveysRes.data || []);
    setProviders(providersRes.data || []);
    
    const offerMap = new Map((offersRes.data || []).map(o => [o.id, o]));
    const surveyMap = new Map((surveysRes.data || []).map(s => [s.id, s]));
    const providerMap = new Map((providersRes.data || []).map(p => [p.id, p]));
    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));

    // Fetch ALL clicks in one query - no filters that might miss records
    const [allClicksRes, loginsRes, visitsRes, earningsRes, promoRes, postbackRes] = await Promise.all([
      supabase.from("offer_clicks").select("*")
        .order("created_at", { ascending: false }).limit(1000),
      supabase.from("login_logs").select("*")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("page_visits").select("*").order("visited_at", { ascending: false }).limit(1000),
      supabase.from("earning_history").select("*")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("promocode_redemptions").select("*, promocodes(code)")
        .order("created_at", { ascending: false }).limit(200),
      supabase.from("postback_logs").select("*")
        .order("created_at", { ascending: false }).limit(1000),
    ]);
    
    console.log("[AdminClickTracking] All clicks fetched:", allClicksRes.data?.length, "error:", allClicksRes.error?.message);
    
    const allClicksData = allClicksRes.data || [];
    // Split into offer/survey clicks and provider clicks from the same dataset
    const clicksData = allClicksData.filter(c => c.offer_id || c.survey_link_id);
    const providerClicksData = allClicksData.filter(c => c.provider_id && !c.offer_id && !c.survey_link_id);
    
    const enhancedClicks = clicksData.map(click => ({
      ...click,
      profiles: profileMap.get(click.user_id) || null,
      offers: click.offer_id ? offerMap.get(click.offer_id) : null,
      survey_links: click.survey_link_id ? surveyMap.get(click.survey_link_id) : null
    }));

    const enhancedProviderClicks = providerClicksData.map((click: any) => ({
      ...click,
      profiles: profileMap.get(click.user_id) || null,
      survey_providers: click.provider_id ? providerMap.get(click.provider_id) : null
    }));

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
    }));

    const enhancedPostbacks = (postbackRes.data || []).map(pb => ({
      ...pb,
      profiles: profileMap.get(pb.user_id) || null,
      survey_providers: pb.provider_id ? providerMap.get(pb.provider_id) : null,
    }));

    setClicks(enhancedClicks);
    setProviderClicks(enhancedProviderClicks);
    setLoginLogs(enhancedLogins);
    setPageVisits(visitsRes.data || []);
    setEarnings(enhancedEarnings);
    setPromoRedemptions(enhancedPromo);
    setPostbackLogs(enhancedPostbacks);
    setProfiles(profilesRes.data || []);
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const getItemName = (click: any) => {
    if (click.offer_id && click.offers) return click.offers.title || "Unknown Offer";
    if (click.survey_link_id && click.survey_links) return click.survey_links.name || "Unknown Survey";
    if (click.provider_id && click.survey_providers) return click.survey_providers.name || "Unknown Offerwall";
    return "—";
  };

  const getItemType = (click: any) => {
    if (click.offer_id) return "offer";
    if (click.survey_link_id) return "survey";
    if (click.provider_id) return "provider";
    return "unknown";
  };

  const fmtDate = (d: string) => d ? new Date(d).toLocaleString() : "—";
  const profileName = (item: any) => item.profiles?.username || item.username || "—";

  // Last 24h filtered data
  const clicks24h = useMemo(() => clicks.filter(c => c.created_at >= now24h), [clicks, now24h]);
  const providerClicks24h = useMemo(() => providerClicks.filter(c => c.created_at >= now24h), [providerClicks, now24h]);
  const logins24h = useMemo(() => loginLogs.filter(l => l.created_at >= now24h), [loginLogs, now24h]);
  const visits24h = useMemo(() => pageVisits.filter(v => v.visited_at >= now24h), [pageVisits, now24h]);
  const earnings24h = useMemo(() => earnings.filter(e => e.created_at >= now24h), [earnings, now24h]);
  const promo24h = useMemo(() => promoRedemptions.filter(p => p.created_at >= now24h), [promoRedemptions, now24h]);
  const newUsers24h = useMemo(() => profiles.filter(p => p.created_at >= now24h), [profiles, now24h]);
  const postbacks24h = useMemo(() => postbackLogs.filter(p => p.created_at >= now24h), [postbackLogs, now24h]);

  // Postback stats
  const postbackStats = useMemo(() => {
    const successCount = postbackLogs.filter(p => p.status === "success").length;
    const failedCount = postbackLogs.filter(p => p.status === "failed").length;
    const reversedCount = postbackLogs.filter(p => p.status === "reversed" || p.status === "reversal" || p.status === "chargeback").length;
    const totalPayout = postbackLogs.filter(p => p.status === "success").reduce((s, p) => s + (Number(p.payout) || 0), 0);
    const reversedPayout = postbackLogs.filter(p => ["reversed","reversal","chargeback"].includes(p.status)).reduce((s, p) => s + (Number(p.payout) || 0), 0);
    
    const success24h = postbacks24h.filter(p => p.status === "success").length;
    const failed24h = postbacks24h.filter(p => p.status === "failed").length;
    const reversed24h = postbacks24h.filter(p => ["reversed","reversal","chargeback"].includes(p.status)).length;
    const payout24h = postbacks24h.filter(p => p.status === "success").reduce((s, p) => s + (Number(p.payout) || 0), 0);
    
    return { successCount, failedCount, reversedCount, totalPayout, reversedPayout, success24h, failed24h, reversed24h, payout24h };
  }, [postbackLogs, postbacks24h]);

  // Computed 24h metrics
  const metrics24h = useMemo(() => {
    const allClicks24h = [...clicks24h, ...providerClicks24h];
    const uniqueUsers = new Set(allClicks24h.map(c => c.user_id).filter(Boolean)).size;
    const uniqueIPs = new Set(allClicks24h.map(c => c.ip_address).filter(Boolean)).size;
    const uniqueClicks = new Set(allClicks24h.map(c => `${c.user_id}_${c.offer_id || c.survey_link_id || c.provider_id}`).filter(Boolean)).size;
    
    const offerClicked = clicks24h.filter(c => c.offer_id).length;
    const surveyClicked = clicks24h.filter(c => c.survey_link_id).length;
    const providerClicked = providerClicks24h.length;
    
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
      offerClicks: offerClicked, surveyClicks: surveyClicked, providerClicks: providerClicked,
      uniqueClicks, uniqueUsers, uniqueIPs,
      completed, reversed,
      vpnCount, highRisk, countries: countries.size, countryList: [...countries],
      devices, avgTimeSpent, uniqueLogins, newDeviceLogins, newUsers: newUsers24h.length,
      surveyPageVisits, promoAdded, totalEarned, totalPageViews: visits24h.length,
    };
  }, [clicks24h, providerClicks24h, logins24h, visits24h, earnings24h, promo24h, newUsers24h]);

  // Open detail modal for card
  const openCardDetail = (cardType: string) => {
    switch (cardType) {
      case "newUsers": {
        const data = newUsers24h.map(u => ({ username: u.username || "—", email: u.email || "—", country: u.country || "—", created_at: fmtDate(u.created_at) }));
        setDetailModal({ title: "New Users Registered (24h)", data, columns: [{ key: "username", label: "Username" }, { key: "email", label: "Email" }, { key: "country", label: "Country" }, { key: "created_at", label: "Registered" }] });
        break;
      }
      case "uniqueLogins": {
        const seen = new Set<string>();
        const data = logins24h.filter(l => { if (!l.user_id || seen.has(l.user_id)) return false; seen.add(l.user_id); return true; })
          .map(l => ({ username: profileName(l), ip: l.ip_address || "—", device: l.device || "—", browser: l.browser || "—", time: fmtDate(l.created_at) }));
        setDetailModal({ title: "Unique Logins (24h)", data, columns: [{ key: "username", label: "User" }, { key: "ip", label: "IP" }, { key: "device", label: "Device" }, { key: "browser", label: "Browser" }, { key: "time", label: "Time" }] });
        break;
      }
      case "totalLogins": {
        const data = logins24h.map(l => ({ username: profileName(l), ip: l.ip_address || "—", device: l.device || "—", browser: l.browser || "—", os: l.os || "—", new_device: l.is_new_device ? "Yes" : "No", time: fmtDate(l.created_at) }));
        setDetailModal({ title: "All Login Sessions (24h)", data, columns: [{ key: "username", label: "User" }, { key: "ip", label: "IP" }, { key: "device", label: "Device" }, { key: "browser", label: "Browser" }, { key: "os", label: "OS" }, { key: "new_device", label: "New Device" }, { key: "time", label: "Time" }] });
        break;
      }
      case "totalClicks": {
        const allC = [...clicks24h, ...providerClicks24h].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const data = allC.map(c => ({ username: profileName(c), item: getItemName(c), type: getItemType(c), ip: c.ip_address || "—", country: c.country || "—", device: c.device_type || "—", time: fmtDate(c.created_at) }));
        setDetailModal({ title: "Total Clicks (24h)", data, columns: [{ key: "username", label: "User" }, { key: "item", label: "Item" }, { key: "type", label: "Type" }, { key: "ip", label: "IP" }, { key: "country", label: "Country" }, { key: "device", label: "Device" }, { key: "time", label: "Time" }] });
        break;
      }
      case "offerwallClicks": {
        const data = providerClicks24h.map(c => ({ username: profileName(c), offerwall: c.survey_providers?.name || "Unknown", ip: c.ip_address || "—", country: c.country || "—", device: c.device_type || "—", time: fmtDate(c.created_at) }));
        setDetailModal({ title: "Offerwall Clicks (24h)", data, columns: [{ key: "username", label: "User" }, { key: "offerwall", label: "Offerwall" }, { key: "ip", label: "IP" }, { key: "country", label: "Country" }, { key: "device", label: "Device" }, { key: "time", label: "Time" }] });
        break;
      }
      case "postbackSuccess": {
        const data = postbacks24h.filter(p => p.status === "success").map(p => ({ username: profileName(p), provider: p.provider_name || "—", payout: p.payout || 0, txn: p.txn_id || "—", time: fmtDate(p.created_at) }));
        setDetailModal({ title: "Successful Postbacks (24h)", data, columns: [{ key: "username", label: "User" }, { key: "provider", label: "Provider" }, { key: "payout", label: "Payout" }, { key: "txn", label: "Txn ID" }, { key: "time", label: "Time" }] });
        break;
      }
      case "postbackFailed": {
        const data = postbacks24h.filter(p => p.status === "failed").map(p => ({ username: profileName(p), provider: p.provider_name || "—", error: p.error_message || "—", time: fmtDate(p.created_at) }));
        setDetailModal({ title: "Failed Postbacks (24h)", data, columns: [{ key: "username", label: "User" }, { key: "provider", label: "Provider" }, { key: "error", label: "Error" }, { key: "time", label: "Time" }] });
        break;
      }
      case "postbackReversed": {
        const data = postbackLogs.filter(p => ["reversed","reversal","chargeback"].includes(p.status)).map(p => ({ username: profileName(p), provider: p.provider_name || "—", payout: p.payout || 0, txn: p.txn_id || "—", time: fmtDate(p.created_at) }));
        setDetailModal({ title: "Reversals / Chargebacks (All Time)", data, columns: [{ key: "username", label: "User" }, { key: "provider", label: "Provider" }, { key: "payout", label: "Payout" }, { key: "txn", label: "Txn ID" }, { key: "time", label: "Time" }] });
        break;
      }
      default: {
        // Generic card details for other types
        const allC = [...clicks24h, ...providerClicks24h];
        const data = allC.map(c => ({ username: profileName(c), item: getItemName(c), type: getItemType(c), time: fmtDate(c.created_at) }));
        setDetailModal({ title: `Details (24h)`, data, columns: [{ key: "username", label: "User" }, { key: "item", label: "Item" }, { key: "type", label: "Type" }, { key: "time", label: "Time" }] });
        break;
      }
    }
  };

  // User behavior aggregation - includes ALL users with clicks, postbacks, logins, or earnings
  const userBehavior = useMemo(() => {
    const allClicks = [...clicks, ...providerClicks];
    const map = new Map<string, any>();

    const ensureUser = (userId: string, username?: string, email?: string) => {
      if (!userId || map.has(userId)) return;
      const prof = profiles.find(p => p.id === userId);
      map.set(userId, {
        user_id: userId, username: prof?.username || username || "—", email: prof?.email || email || "—",
        totalClicks: 0, offerClicks: 0, surveyClicks: 0, providerClicks: 0,
        completed: 0, reversed: 0, clicked: 0, vpnFlags: 0, riskSum: 0,
        countries: new Set(), devices: new Set(), timeSum: 0, timeCount: 0,
        lastClick: null, lastLogin: null, postbackSuccess: 0, postbackFailed: 0, postbackReversed: 0,
        totalEarned: 0, totalReversedPayout: 0, loginCount: 0, pageViews: 0
      });
    };
    
    // Build from ALL profiles first so every user appears
    profiles.forEach(p => ensureUser(p.id, p.username, p.email));

    // Add click data
    allClicks.forEach(c => {
      if (!c.user_id) return;
      ensureUser(c.user_id, c.profiles?.username, c.profiles?.email);
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
      if (!u.lastClick || c.created_at > u.lastClick) u.lastClick = c.created_at;
    });

    // Enrich with postback data
    postbackLogs.forEach(pb => {
      if (!pb.user_id) return;
      ensureUser(pb.user_id, pb.username);
      const u = map.get(pb.user_id);
      if (pb.status === "success") { u.postbackSuccess++; u.totalEarned += (Number(pb.payout) || 0); }
      else if (pb.status === "failed") u.postbackFailed++;
      else if (["reversed","reversal","chargeback"].includes(pb.status)) { u.postbackReversed++; u.totalReversedPayout += (Number(pb.payout) || 0); }
    });

    // Enrich with login count for ALL users
    loginLogs.forEach(l => {
      if (!l.user_id) return;
      ensureUser(l.user_id);
      const u = map.get(l.user_id);
      u.loginCount++;
      if (!u.lastLogin || l.created_at > u.lastLogin) u.lastLogin = l.created_at;
    });

    // Enrich with page views
    pageVisits.forEach(v => {
      if (!v.user_id) return;
      if (map.has(v.user_id)) map.get(v.user_id).pageViews++;
    });

    return [...map.values()].map(u => ({
      ...u,
      avgRisk: u.totalClicks ? Math.round(u.riskSum / u.totalClicks) : 0,
      avgTime: u.timeCount ? Math.round(u.timeSum / u.timeCount) : 0,
      completionRate: u.totalClicks ? Math.round((u.completed / u.totalClicks) * 100) : 0,
      countries: [...u.countries].join(", "), devices: [...u.devices].join(", "),
      lastActivity: u.lastClick || u.lastLogin || null,
    })).sort((a, b) => {
      // Sort by last activity, then by login count
      if (b.lastActivity && a.lastActivity) return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      if (b.lastActivity) return 1;
      if (a.lastActivity) return -1;
      return b.loginCount - a.loginCount;
    });
  }, [clicks, providerClicks, postbackLogs, loginLogs, pageVisits, profiles]);

  // Filtered user behavior
  const filteredUserBehavior = useMemo(() => {
    if (!searchQuery) return userBehavior;
    const q = searchQuery.toLowerCase();
    return userBehavior.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [userBehavior, searchQuery]);

  // Open user detail drill-down
  const openUserDetail = (userId: string) => {
    const prof = profiles.find(p => p.id === userId);
    const userClicks = [...clicks, ...providerClicks].filter(c => c.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const userPostbacks = postbackLogs.filter(p => p.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const userEarnings = earnings.filter(e => e.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const userLogins = loginLogs.filter(l => l.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const userVisits = pageVisits.filter(v => v.user_id === userId).sort((a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime());

    setUserDetailModal({
      profile: prof,
      clicks: userClicks,
      postbacks: userPostbacks,
      earnings: userEarnings,
      logins: userLogins,
      visits: userVisits,
    });
  };

  // Offer performance with postback data
  const offerPerformance = useMemo(() => {
    const map = new Map<string, any>();
    clicks.forEach(c => {
      const key = c.offer_id || c.survey_link_id || "unknown";
      if (key === "unknown") return;
      if (!map.has(key)) {
        map.set(key, { id: key, name: c.offers?.title || c.survey_links?.name || `Deleted (${key.substring(0, 8)}…)`, type: c.offer_id ? "Offer" : "Survey", totalClicks: 0, completed: 0, reversed: 0, clicked: 0, uniqueUsers: new Set(), timeSum: 0, timeCount: 0, postbackSuccess: 0, postbackFailed: 0, postbackReversed: 0, totalPayout: 0 });
      }
      const o = map.get(key);
      o.totalClicks++;
      if (c.completion_status === "completed") o.completed++;
      else if (c.completion_status === "reversed") o.reversed++;
      else o.clicked++;
      if (c.user_id) o.uniqueUsers.add(c.user_id);
      if (c.time_spent > 0) { o.timeSum += c.time_spent; o.timeCount++; }
    });
    providerClicks.forEach(c => {
      const key = `provider_${c.provider_id}`;
      if (!map.has(key)) {
        map.set(key, { id: c.provider_id, name: c.survey_providers?.name || "Unknown Provider", type: "Offerwall", totalClicks: 0, completed: 0, reversed: 0, clicked: 0, uniqueUsers: new Set(), timeSum: 0, timeCount: 0, postbackSuccess: 0, postbackFailed: 0, postbackReversed: 0, totalPayout: 0 });
      }
      const o = map.get(key);
      o.totalClicks++; o.clicked++;
      if (c.user_id) o.uniqueUsers.add(c.user_id);
      if (c.time_spent > 0) { o.timeSum += c.time_spent; o.timeCount++; }
    });
    return [...map.values()].map(o => ({
      ...o, uniqueUsers: o.uniqueUsers.size, avgTime: o.timeCount ? Math.round(o.timeSum / o.timeCount) : 0,
      completionRate: o.totalClicks ? Math.round((o.completed / o.totalClicks) * 100) : 0,
      reversalRate: o.totalClicks ? Math.round((o.reversed / o.totalClicks) * 100) : 0,
    })).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [clicks, providerClicks]);

  // Provider performance with postback data
  const providerPerformance = useMemo(() => {
    const map = new Map<string, any>();
    providers.forEach(p => {
      map.set(p.id, { id: p.id, name: p.name || "Unknown", code: p.code || "—", image: p.image_url, totalClicks: 0, uniqueUsers: new Set(), timeSum: 0, timeCount: 0, vpnCount: 0, countries: new Set(), devices: { mobile: 0, desktop: 0, tablet: 0 }, postbackSuccess: 0, postbackFailed: 0, postbackReversed: 0, totalPayout: 0, reversedPayout: 0 });
    });
    providerClicks.forEach(c => {
      const providerId = c.provider_id;
      if (!providerId) return;
      if (!map.has(providerId)) {
        map.set(providerId, { id: providerId, name: c.survey_providers?.name || "Unknown", code: c.survey_providers?.code || "—", image: c.survey_providers?.image_url, totalClicks: 0, uniqueUsers: new Set(), timeSum: 0, timeCount: 0, vpnCount: 0, countries: new Set(), devices: { mobile: 0, desktop: 0, tablet: 0 }, postbackSuccess: 0, postbackFailed: 0, postbackReversed: 0, totalPayout: 0, reversedPayout: 0 });
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
    // Enrich with postback data per provider
    postbackLogs.forEach(pb => {
      if (!pb.provider_id || !map.has(pb.provider_id)) return;
      const p = map.get(pb.provider_id);
      if (pb.status === "success") { p.postbackSuccess++; p.totalPayout += (Number(pb.payout) || 0); }
      else if (pb.status === "failed") p.postbackFailed++;
      else if (["reversed","reversal","chargeback"].includes(pb.status)) { p.postbackReversed++; p.reversedPayout += (Number(pb.payout) || 0); }
    });
    return [...map.values()].map(p => ({
      ...p, uniqueUsers: p.uniqueUsers.size, avgTime: p.timeCount ? Math.round(p.timeSum / p.timeCount) : 0,
      vpnPercentage: p.totalClicks ? Math.round((p.vpnCount / p.totalClicks) * 100) : 0, countries: [...p.countries].join(", "),
      conversionRate: p.totalClicks ? Math.round((p.postbackSuccess / p.totalClicks) * 100) : 0,
    })).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [providerClicks, providers, postbackLogs]);

  const StatCard = ({ icon: Icon, value, label, color = "text-primary", onClick }: { icon: any; value: any; label: string; color?: string; onClick?: () => void }) => (
    <Card className={`hover:border-primary/30 transition-colors ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className={`h-5 w-5 ${color}`} />
          {onClick && <ArrowUpRight className="h-3 w-3 text-muted-foreground" />}
        </div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );

  const allClicks = useMemo(() => {
    return [...clicks, ...providerClicks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [clicks, providerClicks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics & Click Tracking</h1>
          <p className="text-sm text-muted-foreground">Clicks, completions, reversals, user behavior & offerwall analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" /> {lastRefresh.toLocaleTimeString()}
          </Badge>
          <button onClick={() => loadData()} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <Tabs defaultValue="last24h">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="last24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="conversions">Conversions & Reversals</TabsTrigger>
          <TabsTrigger value="activity">Click Activity</TabsTrigger>
          <TabsTrigger value="users">User Behavior</TabsTrigger>
          <TabsTrigger value="offers">Offer Performance</TabsTrigger>
          <TabsTrigger value="providers">Offerwall Analytics</TabsTrigger>
          <TabsTrigger value="postbacks">Postback Logs</TabsTrigger>
        </TabsList>

        {/* ==================== LAST 24 HOURS ==================== */}
        <TabsContent value="last24h" className="space-y-6">
          {loading ? <p className="text-muted-foreground text-sm">Loading analytics...</p> : (
            <>
              <h2 className="text-lg font-semibold mt-2">Last 24 Hours Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard icon={Users} value={metrics24h.newUsers} label="New Users" onClick={() => openCardDetail("newUsers")} />
                <StatCard icon={UserCheck} value={metrics24h.uniqueLogins} label="Unique Logins" onClick={() => openCardDetail("uniqueLogins")} />
                <StatCard icon={Activity} value={logins24h.length} label="Login Sessions" onClick={() => openCardDetail("totalLogins")} />
                <StatCard icon={Eye} value={metrics24h.totalPageViews} label="Page Views" />
                <StatCard icon={MousePointerClick} value={metrics24h.totalClicks} label="Total Clicks" onClick={() => openCardDetail("totalClicks")} />
                <StatCard icon={Layout} value={metrics24h.providerClicks} label="Offerwall Clicks" color="text-purple-500" onClick={() => openCardDetail("offerwallClicks")} />
                <StatCard icon={TrendingUp} value={metrics24h.offerClicks} label="Offer Clicks" />
                <StatCard icon={BarChart3} value={metrics24h.surveyClicks} label="Survey Clicks" />
                <StatCard icon={Users} value={metrics24h.uniqueUsers} label="Unique Clickers" />
                <StatCard icon={Globe} value={metrics24h.uniqueIPs} label="Unique IPs" />
              </div>

              <h2 className="text-lg font-semibold">Conversions & Reversals (24h)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard icon={CheckCircle} value={postbackStats.success24h} label="Successful Postbacks" color="text-green-500" onClick={() => openCardDetail("postbackSuccess")} />
                <StatCard icon={XCircle} value={postbackStats.failed24h} label="Failed Postbacks" color="text-red-500" onClick={() => openCardDetail("postbackFailed")} />
                <StatCard icon={ArrowDownUp} value={postbackStats.reversed24h} label="Reversals (24h)" color="text-orange-500" onClick={() => openCardDetail("postbackReversed")} />
                <StatCard icon={Ticket} value={postbackStats.payout24h} label="Payout (24h)" color="text-green-500" />
                <StatCard icon={TrendingUp} value={metrics24h.completed} label="Completed Clicks" color="text-green-500" />
                <StatCard icon={TrendingDown} value={metrics24h.reversed} label="Reversed Clicks" color="text-red-500" />
                <StatCard icon={Shield} value={metrics24h.vpnCount} label="VPN/Proxy" color="text-orange-500" />
                <StatCard icon={AlertTriangle} value={metrics24h.highRisk} label="High Risk" color="text-red-500" />
                <StatCard icon={Smartphone} value={metrics24h.devices.mobile} label="Mobile" />
                <StatCard icon={Monitor} value={metrics24h.devices.desktop} label="Desktop" />
              </div>

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

        {/* ==================== CONVERSIONS & REVERSALS ==================== */}
        <TabsContent value="conversions" className="space-y-4">
          <h2 className="text-lg font-semibold">Conversions & Reversals (All Time)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={CheckCircle} value={postbackStats.successCount} label="Total Successful" color="text-green-500" />
            <StatCard icon={XCircle} value={postbackStats.failedCount} label="Total Failed" color="text-red-500" />
            <StatCard icon={ArrowDownUp} value={postbackStats.reversedCount} label="Total Reversals" color="text-orange-500" onClick={() => openCardDetail("postbackReversed")} />
            <StatCard icon={Ticket} value={postbackStats.totalPayout.toFixed(0)} label="Total Payout" color="text-green-500" />
            <StatCard icon={TrendingDown} value={postbackStats.reversedPayout.toFixed(0)} label="Reversed Payout" color="text-red-500" />
          </div>

          {/* Conversion by Provider */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Conversion Performance by Offerwall</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[500px]">
                <div className="min-w-[1000px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offerwall</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Successful</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Reversed</TableHead>
                        <TableHead>Conv. Rate</TableHead>
                        <TableHead>Total Payout</TableHead>
                        <TableHead>Reversed Payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerPerformance.filter(p => p.totalClicks > 0 || p.postbackSuccess > 0).length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No conversion data</TableCell></TableRow>
                      ) : providerPerformance.filter(p => p.totalClicks > 0 || p.postbackSuccess > 0).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="font-bold">{p.totalClicks}</TableCell>
                          <TableCell className="text-green-500 font-medium">{p.postbackSuccess}</TableCell>
                          <TableCell className="text-red-500">{p.postbackFailed}</TableCell>
                          <TableCell className="text-orange-500">{p.postbackReversed}</TableCell>
                          <TableCell>
                            <Badge variant={p.conversionRate > 30 ? "default" : p.conversionRate > 10 ? "secondary" : "destructive"} className="text-xs">
                              {p.conversionRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-500">{p.totalPayout.toFixed(0)}</TableCell>
                          <TableCell className="text-red-500">{p.reversedPayout.toFixed(0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent postback activity */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Postback Activity</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[400px]">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead>Txn ID</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postbackLogs.slice(0, 100).map(pb => (
                        <TableRow key={pb.id}>
                          <TableCell>
                            <Badge variant={pb.status === "success" ? "default" : pb.status === "failed" ? "destructive" : "secondary"} className={`text-xs ${pb.status === "success" ? "bg-green-500" : ["reversed","reversal","chargeback"].includes(pb.status) ? "bg-orange-500" : ""}`}>
                              {pb.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{profileName(pb)}</TableCell>
                          <TableCell className="text-sm">{pb.provider_name || "—"}</TableCell>
                          <TableCell className="font-medium">{pb.payout || 0}</TableCell>
                          <TableCell className="text-xs font-mono max-w-[120px] truncate">{pb.txn_id || "—"}</TableCell>
                          <TableCell className="text-xs">{pb.direction || "incoming"}</TableCell>
                          <TableCell className="text-xs text-red-500 max-w-[150px] truncate">{pb.error_message || "—"}</TableCell>
                          <TableCell className="text-xs">{pb.ip_address || "—"}</TableCell>
                          <TableCell className="text-xs">{fmtDate(pb.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
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
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Badge variant={type === "provider" ? "default" : "secondary"} className={`text-xs ${type === "provider" ? "bg-purple-500" : type === "offer" ? "bg-blue-500" : "bg-green-500"}`}>
                                {type === "provider" ? "Offerwall" : type === "offer" ? "Offer" : "Survey"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium cursor-pointer hover:underline" onClick={() => c.user_id && openUserDetail(c.user_id)}>{c.profiles?.username || "—"}</TableCell>
                            <TableCell className="text-sm">{getItemName(c)}</TableCell>
                            <TableCell>
                              <Badge variant={c.completion_status === "completed" ? "default" : c.completion_status === "reversed" ? "destructive" : "secondary"} className="text-xs">
                                {type === "provider" ? "Clicked" : c.completion_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{c.ip_address || "—"}</TableCell>
                            <TableCell className="text-xs">{c.country || "—"}</TableCell>
                            <TableCell className="text-xs">{c.device_type || "—"}</TableCell>
                            <TableCell className="text-xs">{c.vpn_proxy_flag ? "⚠️ Yes" : "No"}</TableCell>
                            <TableCell><Badge variant={c.risk_score > 50 ? "destructive" : "secondary"} className="text-xs">{c.risk_score || 0}</Badge></TableCell>
                            <TableCell className="text-xs">{c.time_spent ? `${c.time_spent}s` : "—"}</TableCell>
                            <TableCell className="text-xs text-center">{c.attempt_count || 1}</TableCell>
                            <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">User Behavior Analysis</h2>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search user..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Click a username to see their full activity timeline</p>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[600px]">
                <div className="min-w-[1800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Offers</TableHead>
                        <TableHead>Surveys</TableHead>
                        <TableHead>Offerwalls</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Reversed</TableHead>
                        <TableHead>Comp %</TableHead>
                        <TableHead>PB Success</TableHead>
                        <TableHead>PB Failed</TableHead>
                        <TableHead>PB Reversed</TableHead>
                        <TableHead>Earned</TableHead>
                        <TableHead>Rev. Payout</TableHead>
                        <TableHead>Logins</TableHead>
                        <TableHead>VPN</TableHead>
                        <TableHead>Avg Risk</TableHead>
                        <TableHead>Countries</TableHead>
                        <TableHead>Last Click</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUserBehavior.length === 0 ? (
                        <TableRow><TableCell colSpan={19} className="text-center text-muted-foreground py-8">No user data</TableCell></TableRow>
                      ) : filteredUserBehavior.map(u => (
                        <TableRow key={u.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openUserDetail(u.user_id)}>
                          <TableCell className="font-medium text-sm text-primary hover:underline">{u.username}</TableCell>
                          <TableCell className="text-xs">{u.email}</TableCell>
                          <TableCell className="font-bold">{u.totalClicks}</TableCell>
                          <TableCell>{u.offerClicks}</TableCell>
                          <TableCell>{u.surveyClicks}</TableCell>
                          <TableCell className="text-purple-500">{u.providerClicks}</TableCell>
                          <TableCell className="text-green-500">{u.completed}</TableCell>
                          <TableCell className="text-red-500">{u.reversed}</TableCell>
                          <TableCell><Badge variant={u.completionRate > 60 ? "default" : u.completionRate > 30 ? "secondary" : "destructive"} className="text-xs">{u.completionRate}%</Badge></TableCell>
                          <TableCell className="text-green-500 font-medium">{u.postbackSuccess}</TableCell>
                          <TableCell className="text-red-500">{u.postbackFailed}</TableCell>
                          <TableCell className="text-orange-500">{u.postbackReversed}</TableCell>
                          <TableCell className="font-medium">{u.totalEarned.toFixed(0)}</TableCell>
                          <TableCell className="text-red-500">{u.totalReversedPayout.toFixed(0)}</TableCell>
                          <TableCell>{u.loginCount}</TableCell>
                          <TableCell>{u.vpnFlags > 0 ? <span className="text-orange-500">⚠️ {u.vpnFlags}</span> : "0"}</TableCell>
                          <TableCell><Badge variant={u.avgRisk > 50 ? "destructive" : "secondary"} className="text-xs">{u.avgRisk}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{u.countries || "—"}</TableCell>
                          <TableCell className="text-xs">{fmtDate(u.lastClick)}</TableCell>
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
                        <TableHead>Clicks</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Reversed</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Comp %</TableHead>
                        <TableHead>Rev %</TableHead>
                        <TableHead>Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offerPerformance.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                      ) : offerPerformance.map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium text-sm max-w-[200px] truncate">{o.name}</TableCell>
                          <TableCell><Badge variant={o.type === "Offerwall" ? "default" : "outline"} className={`text-xs ${o.type === "Offerwall" ? "bg-purple-500" : o.type === "Offer" ? "bg-blue-500" : "bg-green-500"}`}>{o.type}</Badge></TableCell>
                          <TableCell className="font-bold">{o.totalClicks}</TableCell>
                          <TableCell>{o.uniqueUsers}</TableCell>
                          <TableCell className="text-green-500">{o.completed}</TableCell>
                          <TableCell className="text-red-500">{o.reversed}</TableCell>
                          <TableCell className="text-yellow-500">{o.clicked}</TableCell>
                          <TableCell><Badge variant={o.completionRate > 60 ? "default" : o.completionRate > 30 ? "secondary" : "destructive"} className="text-xs">{o.completionRate}%</Badge></TableCell>
                          <TableCell><Badge variant={o.reversalRate > 20 ? "destructive" : "secondary"} className="text-xs">{o.reversalRate}%</Badge></TableCell>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-3xl font-bold text-purple-500">{providerClicks.length}</p><p className="text-xs text-muted-foreground mt-1">Total Clicks</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-3xl font-bold text-green-500">{postbackStats.successCount}</p><p className="text-xs text-muted-foreground mt-1">Total Conversions</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-3xl font-bold text-orange-500">{postbackStats.reversedCount}</p><p className="text-xs text-muted-foreground mt-1">Total Reversals</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-3xl font-bold">{providers.length}</p><p className="text-xs text-muted-foreground mt-1">Active Offerwalls</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Offerwall Performance (Clicks + Conversions + Reversals)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[800px]">
                <div className="min-w-[1400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Offerwall</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Clicks</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Conversions</TableHead>
                        <TableHead>Failed</TableHead>
                        <TableHead>Reversed</TableHead>
                        <TableHead>Conv %</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead>Rev. Payout</TableHead>
                        <TableHead>Avg Time</TableHead>
                        <TableHead>VPN %</TableHead>
                        <TableHead>Devices (M/D/T)</TableHead>
                        <TableHead>Countries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerPerformance.length === 0 ? (
                        <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">No data</TableCell></TableRow>
                      ) : providerPerformance.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-xs font-mono">{p.code}</TableCell>
                          <TableCell className="font-bold">{p.totalClicks}</TableCell>
                          <TableCell>{p.uniqueUsers}</TableCell>
                          <TableCell className="text-green-500 font-medium">{p.postbackSuccess}</TableCell>
                          <TableCell className="text-red-500">{p.postbackFailed}</TableCell>
                          <TableCell className="text-orange-500">{p.postbackReversed}</TableCell>
                          <TableCell><Badge variant={p.conversionRate > 30 ? "default" : p.conversionRate > 10 ? "secondary" : "destructive"} className="text-xs">{p.conversionRate}%</Badge></TableCell>
                          <TableCell className="font-medium text-green-500">{p.totalPayout.toFixed(0)}</TableCell>
                          <TableCell className="text-red-500">{p.reversedPayout.toFixed(0)}</TableCell>
                          <TableCell className="text-xs">{p.avgTime}s</TableCell>
                          <TableCell><Badge variant={p.vpnPercentage > 20 ? "destructive" : "secondary"} className="text-xs">{p.vpnPercentage}%</Badge></TableCell>
                          <TableCell className="text-xs">📱{p.devices.mobile} | 💻{p.devices.desktop} | 📟{p.devices.tablet}</TableCell>
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

        {/* ==================== POSTBACK LOGS ==================== */}
        <TabsContent value="postbacks" className="space-y-4">
          <h2 className="text-lg font-semibold">Postback Logs (Raw)</h2>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full max-h-[600px]">
                <div className="min-w-[1600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead>Payout Type</TableHead>
                        <TableHead>Txn ID</TableHead>
                        <TableHead>Forwarded</TableHead>
                        <TableHead>Fwd Count</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {postbackLogs.length === 0 ? (
                        <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">No postback logs</TableCell></TableRow>
                      ) : postbackLogs.map(pb => (
                        <TableRow key={pb.id}>
                          <TableCell>
                            <Badge variant={pb.status === "success" ? "default" : pb.status === "failed" ? "destructive" : "secondary"} className={`text-xs ${pb.status === "success" ? "bg-green-500" : ["reversed","reversal","chargeback"].includes(pb.status) ? "bg-orange-500" : ""}`}>
                              {pb.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{pb.direction}</TableCell>
                          <TableCell className="text-sm font-medium cursor-pointer hover:underline" onClick={() => pb.user_id && openUserDetail(pb.user_id)}>{profileName(pb)}</TableCell>
                          <TableCell className="text-sm">{pb.provider_name || "—"}</TableCell>
                          <TableCell className="text-xs">{pb.provider_type || "—"}</TableCell>
                          <TableCell className="font-medium">{pb.payout || 0}</TableCell>
                          <TableCell className="text-xs">{pb.payout_type || "—"}</TableCell>
                          <TableCell className="text-xs font-mono max-w-[100px] truncate">{pb.txn_id || "—"}</TableCell>
                          <TableCell className="text-xs">{pb.forwarded ? "✅" : "—"}</TableCell>
                          <TableCell className="text-xs">{pb.forward_count || 0}</TableCell>
                          <TableCell className="text-xs text-red-500 max-w-[120px] truncate">{pb.error_message || "—"}</TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{pb.response_body || "—"}</TableCell>
                          <TableCell className="text-xs">{pb.ip_address || "—"}</TableCell>
                          <TableCell className="text-xs">{fmtDate(pb.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generic Detail Modal */}
      <Dialog open={!!detailModal} onOpenChange={() => setDetailModal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader><DialogTitle>{detailModal?.title}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {detailModal && detailModal.data.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data for this period</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>{detailModal?.columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {detailModal?.data.map((row, i) => (
                    <TableRow key={i}>{detailModal.columns.map(col => <TableCell key={col.key} className="text-sm">{String(row[col.key] ?? "—")}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* User Detail Drill-Down Modal */}
      <Dialog open={!!userDetailModal} onOpenChange={() => setUserDetailModal(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Activity: {userDetailModal?.profile?.username || "Unknown"}
            </DialogTitle>
          </DialogHeader>
          {userDetailModal && (
            <ScrollArea className="max-h-[75vh]">
              <div className="space-y-4">
                {/* User summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{userDetailModal.profile?.email || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Country</p>
                    <p className="text-sm font-medium">{userDetailModal.profile?.country || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-sm font-medium">{userDetailModal.profile?.points || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-medium">{fmtDate(userDetailModal.profile?.created_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                  <div className="p-2 rounded bg-blue-500/10"><p className="text-lg font-bold">{userDetailModal.clicks.length}</p><p className="text-[10px] text-muted-foreground">Clicks</p></div>
                  <div className="p-2 rounded bg-green-500/10"><p className="text-lg font-bold text-green-500">{userDetailModal.postbacks.filter((p: any) => p.status === "success").length}</p><p className="text-[10px] text-muted-foreground">Conversions</p></div>
                  <div className="p-2 rounded bg-red-500/10"><p className="text-lg font-bold text-red-500">{userDetailModal.postbacks.filter((p: any) => p.status === "failed").length}</p><p className="text-[10px] text-muted-foreground">Failed</p></div>
                  <div className="p-2 rounded bg-orange-500/10"><p className="text-lg font-bold text-orange-500">{userDetailModal.postbacks.filter((p: any) => ["reversed","reversal","chargeback"].includes(p.status)).length}</p><p className="text-[10px] text-muted-foreground">Reversals</p></div>
                  <div className="p-2 rounded bg-purple-500/10"><p className="text-lg font-bold">{userDetailModal.logins.length}</p><p className="text-[10px] text-muted-foreground">Logins</p></div>
                </div>

                {/* Clicks timeline */}
                <h3 className="text-sm font-semibold">Click History ({userDetailModal.clicks.length})</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Item</TableHead><TableHead>Status</TableHead><TableHead>IP</TableHead><TableHead>Device</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {userDetailModal.clicks.slice(0, 50).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell><Badge variant="secondary" className="text-xs">{getItemType(c)}</Badge></TableCell>
                        <TableCell className="text-sm">{getItemName(c)}</TableCell>
                        <TableCell><Badge variant={c.completion_status === "completed" ? "default" : c.completion_status === "reversed" ? "destructive" : "secondary"} className="text-xs">{c.completion_status}</Badge></TableCell>
                        <TableCell className="text-xs">{c.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs">{c.device_type || "—"}</TableCell>
                        <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Postbacks */}
                {userDetailModal.postbacks.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Postback History ({userDetailModal.postbacks.length})</h3>
                    <Table>
                      <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Provider</TableHead><TableHead>Payout</TableHead><TableHead>Txn</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetailModal.postbacks.slice(0, 50).map((pb: any) => (
                          <TableRow key={pb.id}>
                            <TableCell><Badge variant={pb.status === "success" ? "default" : pb.status === "failed" ? "destructive" : "secondary"} className={`text-xs ${pb.status === "success" ? "bg-green-500" : ["reversed","reversal","chargeback"].includes(pb.status) ? "bg-orange-500" : ""}`}>{pb.status}</Badge></TableCell>
                            <TableCell className="text-sm">{pb.provider_name || "—"}</TableCell>
                            <TableCell className="font-medium">{pb.payout || 0}</TableCell>
                            <TableCell className="text-xs font-mono">{pb.txn_id || "—"}</TableCell>
                            <TableCell className="text-xs">{fmtDate(pb.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* Earnings */}
                {userDetailModal.earnings.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Earnings ({userDetailModal.earnings.length})</h3>
                    <Table>
                      <TableHeader><TableRow><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>Offer</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetailModal.earnings.slice(0, 30).map((e: any) => (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium">{e.amount}</TableCell>
                            <TableCell className="text-xs">{e.type || "—"}</TableCell>
                            <TableCell className="text-sm">{e.offer_name || "—"}</TableCell>
                            <TableCell><Badge variant={e.status === "approved" ? "default" : "secondary"} className="text-xs">{e.status}</Badge></TableCell>
                            <TableCell className="text-xs">{fmtDate(e.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* Logins */}
                {userDetailModal.logins.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Login History ({userDetailModal.logins.length})</h3>
                    <Table>
                      <TableHeader><TableRow><TableHead>IP</TableHead><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>OS</TableHead><TableHead>New Device</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {userDetailModal.logins.slice(0, 20).map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs">{l.ip_address || "—"}</TableCell>
                            <TableCell className="text-xs">{l.device || "—"}</TableCell>
                            <TableCell className="text-xs">{l.browser || "—"}</TableCell>
                            <TableCell className="text-xs">{l.os || "—"}</TableCell>
                            <TableCell className="text-xs">{l.is_new_device ? "⚠️ Yes" : "No"}</TableCell>
                            <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {/* Page visits */}
                {userDetailModal.visits.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Page Visits ({userDetailModal.visits.length})</h3>
                    <div className="flex flex-wrap gap-1">
                      {userDetailModal.visits.slice(0, 30).map((v: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{v.page_path}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClickTracking;
