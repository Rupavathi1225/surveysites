import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BarChart3, Link2, FileText, Trophy, History,
  Wallet, Users, FileStack, CreditCard, Lock, UserCog, Settings,
  ShieldCheck, Bell, Activity, LogOut, Home, ChevronDown
} from "lucide-react";

const adminNav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/survey-providers", icon: BarChart3, label: "Survey Providers" },
  { to: "/admin/single-link-providers", icon: Link2, label: "Single Link Providers" },
  { to: "/admin/survey-links", icon: FileText, label: "Survey Links" },
  { to: "/admin/contests", icon: Trophy, label: "Contests" },
  { to: "/admin/earning-history", icon: History, label: "Earning History" },
  { to: "/admin/withdrawals", icon: Wallet, label: "Withdrawals" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/sub-admins", icon: ShieldCheck, label: "Sub Admins" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/login-logs", icon: Activity, label: "Login Logs" },
  { to: "/admin/pages", icon: FileStack, label: "Pages" },
  { to: "/admin/payment-methods", icon: CreditCard, label: "Payment Methods" },
  { to: "/admin/change-password", icon: Lock, label: "Change Password" },
  { to: "/admin/update-profile", icon: UserCog, label: "Update Profile" },
  { to: "/admin/settings", icon: Settings, label: "Website Settings" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const mainTabs = adminNav.slice(0, 8);
  const moreTabs = adminNav.slice(8);

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4" /> User Dashboard
            </Link>
            <button onClick={() => navigate("/auth")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground ml-3">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {mainTabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={location.pathname === tab.to ? "admin-tab-active whitespace-nowrap flex items-center gap-1.5" : "admin-tab whitespace-nowrap flex items-center gap-1.5"}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
          {/* More dropdown */}
          <div className="relative">
            <button onClick={() => setMoreOpen(!moreOpen)} className="admin-tab flex items-center gap-1 whitespace-nowrap">
              More <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-48">
                  {moreTabs.map((tab) => (
                    <Link
                      key={tab.to}
                      to={tab.to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2 text-sm ${
                        location.pathname === tab.to ? "text-primary bg-accent" : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="p-6 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
