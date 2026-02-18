import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Tablet, Globe } from "lucide-react";
import {
  LayoutDashboard, History, UserCog, Mail, Users, Wallet, ArrowLeftRight,
  ClipboardList, Gift, Newspaper, Tag, CreditCard, Trophy, HelpCircle,
  Star, ChevronDown, ChevronRight,
} from "lucide-react";
import ActivityTicker from "@/components/ActivityTicker";

/**
 * A read-only, non-interactive replica of the dashboard rendered
 * behind the Auth page — exactly like EarnLab does it.
 * Fetches real data from public tables so the background looks genuine.
 */

const navItems = [
  "Dashboard", "Daily Surveys", "Offers", "Leaderboard", "Affiliates",
  "Withdrawal", "Balance History", "Contest", "News", "Promocode",
];

const navIcons: Record<string, any> = {
  Dashboard: LayoutDashboard, "Daily Surveys": ClipboardList, Offers: Gift,
  Leaderboard: Star, Affiliates: Users, Withdrawal: Wallet,
  "Balance History": History, Contest: Trophy, News: Newspaper, Promocode: Tag,
};

export default function AuthBackgroundDashboard() {
  const [surveyLinks, setSurveyLinks] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [surveyProviders, setSurveyProviders] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("survey_links").select("*").eq("status", "active").order("is_recommended", { ascending: false }).limit(7).then(({ data }) => setSurveyLinks(data || []));
    supabase.from("offers").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(7).then(({ data }) => setOffers(data || []));
    supabase.from("survey_providers").select("*").eq("status", "active").order("is_recommended", { ascending: false }).limit(7).then(({ data }) => setSurveyProviders(data || []));
  }, []);

  const featuredTasks = [...surveyLinks, ...offers].slice(0, 7);

  const deviceIcons = (device: string) => {
    const d = (device || "").toLowerCase();
    return (
      <div className="flex gap-0.5">
        {(d.includes("desktop") || d.includes("all") || !d) && <Monitor className="h-3 w-3 text-muted-foreground" />}
        {(d.includes("mobile") || d.includes("all") || !d) && <Smartphone className="h-3 w-3 text-muted-foreground" />}
        {(d.includes("tablet") || d.includes("all")) && <Tablet className="h-3 w-3 text-muted-foreground" />}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-background select-none">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border shrink-0">
        <div className="p-4 pb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-base font-bold text-primary">SurveyForever</span>
          </div>
          <div className="mt-3 mb-2">
            <p className="font-medium text-xs">Guest User</p>
            <p className="text-[10px] text-muted-foreground">Sign in to start earning</p>
          </div>
        </div>
        <nav className="px-2 pb-4 space-y-0.5">
          {navItems.map((item, i) => {
            const Icon = navIcons[item] || Gift;
            return (
              <div
                key={item}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-md ${i === 0 ? "bg-primary/15 text-primary font-medium" : "text-sidebar-foreground"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-1.5 flex items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-semibold whitespace-nowrap">Hi, <span className="text-primary">Guest</span></span>
            <span className="text-[8px] text-muted-foreground">|</span>
            <span className="text-primary text-[10px] font-bold whitespace-nowrap">$0.00</span>
            <span className="text-[8px] text-muted-foreground">|</span>
            <span className="text-info text-[10px] font-bold whitespace-nowrap">0 pts</span>
            <span className="text-[8px] text-muted-foreground">|</span>
            <span className="text-[8px] font-semibold text-success whitespace-nowrap">Refer & Earn</span>
            <div className="h-5 w-36 bg-accent/50 rounded px-1.5 text-[8px] flex items-center text-muted-foreground">
              surveyforever.com/auth?ref=XXXXXX
            </div>
            <div className="h-5 px-2 bg-primary text-primary-foreground rounded text-[8px] flex items-center font-medium">
              Withdraw
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4">
          {/* Activity Ticker */}
          <ActivityTicker />

          {/* Featured Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold">Featured Tasks</h2>
                <p className="text-xs text-muted-foreground">Featured tasks are the best tasks to complete, with the highest rewards</p>
              </div>
              <span className="text-xs text-primary font-medium">View All</span>
            </div>
            {featuredTasks.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden border-0">
                    <CardContent className="p-0">
                      <div className="aspect-square bg-gradient-to-br from-primary/15 to-accent" />
                      <div className="p-2 space-y-1">
                        <div className="h-2.5 w-16 bg-muted rounded" />
                        <div className="h-2 w-12 bg-muted/50 rounded" />
                        <div className="h-3 w-10 bg-primary/30 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                {featuredTasks.map((item) => {
                  const isOffer = "title" in item && "url" in item && !("link" in item);
                  const name = isOffer ? item.title : item.name;
                  const payout = item.payout;
                  const imgUrl = item.image_url;
                  return (
                    <Card key={item.id} className="overflow-hidden border-0">
                      <CardContent className="p-0">
                        {imgUrl ? (
                          <div className="aspect-square bg-accent overflow-hidden">
                            <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary/40">{(name || "?")[0]}</span>
                          </div>
                        )}
                        <div className="p-2">
                          <p className="font-semibold text-xs truncate">{name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.description || item.content || "Complete to earn"}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-primary font-bold text-xs">$ {Number(payout || 0).toFixed(2)}</span>
                            {deviceIcons(item.device || item.devices || "")}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offer Walls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-bold">Offer Walls</h2>
                <p className="text-xs text-muted-foreground">Each offer wall contains hundreds of offers to complete</p>
              </div>
              <span className="text-xs text-primary font-medium">View All</span>
            </div>
            {surveyProviders.length === 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Card key={i} className="border-0">
                    <CardContent className="p-4 text-center">
                      <div className="h-12 w-12 mx-auto rounded-lg bg-accent mb-2" />
                      <div className="h-2.5 w-14 mx-auto bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {surveyProviders.map((p) => (
                  <Card key={p.id} className="border-0 relative">
                    <CardContent className="p-4 text-center">
                      {p.point_percentage > 100 && (
                        <Badge className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0 bg-primary/90 text-primary-foreground">+{p.point_percentage - 100}%</Badge>
                      )}
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-12 object-contain mb-2" />
                      ) : (
                        <div className="h-12 flex items-center justify-center mb-2">
                          <span className="text-lg font-bold text-primary/60">{p.name[0]}</span>
                        </div>
                      )}
                      <p className="font-medium text-xs truncate">{p.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
