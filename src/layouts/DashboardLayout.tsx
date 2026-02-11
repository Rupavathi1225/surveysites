import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, History, UserCog, Mail, Users, Wallet, ArrowLeftRight,
  ClipboardList, Gift, Newspaper, Tag, CreditCard, Trophy, HelpCircle,
  LogOut, Shield, Globe, Menu, X, DollarSign, Star
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/dashboard/balance-history", icon: History, label: "Balance History" },
  { to: "/dashboard/update-account", icon: UserCog, label: "Update Account" },
  { to: "/dashboard/inbox", icon: Mail, label: "Inbox" },
  { to: "/dashboard/affiliates", icon: Users, label: "Your Affiliates" },
  { to: "/dashboard/withdrawal", icon: Wallet, label: "Withdrawal" },
  { to: "/dashboard/convert-points", icon: ArrowLeftRight, label: "Convert Points" },
  { to: "/dashboard/daily-surveys", icon: ClipboardList, label: "Daily Surveys" },
  { to: "/dashboard/offers", icon: Gift, label: "Offers" },
  { to: "/dashboard/contest", icon: Trophy, label: "Contest" },
  { to: "/dashboard/news", icon: Newspaper, label: "News" },
  { to: "/dashboard/promocode", icon: Tag, label: "Promocode" },
  { to: "/dashboard/withdrawal-history", icon: CreditCard, label: "Withdrawal History" },
  { to: "/dashboard/leaderboard", icon: Star, label: "Leaderboard" },
  { to: "/dashboard/support", icon: HelpCircle, label: "Support Ticket" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { profile, signOut, isAdminOrSubAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generate session ID on every new page load if not already set
  useEffect(() => {
    if (!sessionStorage.getItem("session_id")) {
      const sessionId = crypto.randomUUID();
      sessionStorage.setItem("session_id", sessionId);
      // Clear login_log_id so a new session log is created
      sessionStorage.removeItem("login_log_id");
    }
  }, []);

  // Track session on first load (when no login_log_id exists — e.g. returning via existing auth)
  useEffect(() => {
    if (profile?.id && !sessionStorage.getItem("login_log_id")) {
      const sessionId = sessionStorage.getItem("session_id") || crypto.randomUUID();
      if (!sessionStorage.getItem("session_id")) {
        sessionStorage.setItem("session_id", sessionId);
      }
      supabase.functions.invoke("track-login", {
        body: { user_agent: navigator.userAgent, method: "SESSION_RESUME", session_id: sessionId },
      }).then(({ data }) => {
        if (data?.login_log_id) {
          sessionStorage.setItem("login_log_id", data.login_log_id);
        }
      }).catch(e => console.error("Session tracking failed:", e));
    }
  }, [profile?.id]);

  // Track page visits
  useEffect(() => {
    if (profile?.id) {
      const loginLogId = sessionStorage.getItem("login_log_id");
      supabase.from("page_visits").insert({
        user_id: profile.id,
        login_log_id: loginLogId || null,
        page_path: location.pathname,
      }).then(() => {});
    }
  }, [location.pathname, profile?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card rounded-lg">
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 overflow-y-auto`}>
        <div className="p-4">
          <Link to="/dashboard" className="flex items-center gap-2 mb-2">
            <Globe className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-primary">SurveySite</span>
          </Link>
          {profile && (
            <div className="mt-3 mb-4">
              <p className="font-medium text-sm">{profile.first_name || profile.username}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          )}
        </div>
        <nav className="px-2 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-sm ${
                location.pathname === item.to ? "nav-link-active" : "nav-link-hover text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdminOrSubAdmin && (
            <Link to="/admin" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm nav-link-hover text-sidebar-foreground">
              <Shield className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm nav-link-hover text-sidebar-foreground w-full">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-background/80 z-30" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="lg:hidden w-8" />
          <div className="flex items-center gap-4 ml-auto">
            {profile && (
              <>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">Cash Balance</span>
                  <p className="font-bold text-primary">${Number(profile.cash_balance).toFixed(2)}</p>
                </div>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">Points</span>
                  <p className="font-bold">{profile.points}</p>
                </div>
              </>
            )}
          </div>
        </header>
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
