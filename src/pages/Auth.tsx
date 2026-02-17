import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  LogIn, UserPlus, Mail, Lock, User, Globe,
  DollarSign, Star, ClipboardList, Gift, Wallet, ArrowLeftRight,
  TrendingUp, Users, Activity, Copy
} from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";

  useEffect(() => {
    const timer = setTimeout(() => setShowPopup(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      try {
        const session = authData?.session;
        if (session) {
          const sessionId = crypto.randomUUID();
          sessionStorage.setItem("session_id", sessionId);
          const { data: trackData } = await supabase.functions.invoke("track-login", {
            body: { user_agent: navigator.userAgent, method: "PASSWORD", session_id: sessionId },
          });
          if (trackData?.login_log_id) sessionStorage.setItem("login_log_id", trackData.login_log_id);
        }
      } catch (e) { console.error("Login tracking failed:", e); }

      try {
        const { data: prof } = await supabase.from("profiles").select("id, username").eq("user_id", authData.user.id).single();
        if (prof) {
          await supabase.from("notifications").insert({
            user_id: prof.id, type: "login",
            message: `${prof.username || email.split("@")[0]} just logged in`,
            is_global: true,
          });
        }
      } catch (e) { console.error("Login notification failed:", e); }

      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth` }
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else if (data.user) {
      const refCode = referralCode || refFromUrl;
      let referredById: string | null = null;
      if (refCode) {
        const { data: referrer } = await supabase.from("profiles").select("id").eq("referral_code", refCode).single();
        if (referrer) referredById = referrer.id;
      }
      const newRefCode = Math.random().toString(36).substring(2, 12).toUpperCase();
      await supabase.from("profiles").insert({
        user_id: data.user.id, email,
        username: username || email.split("@")[0],
        first_name: firstName, last_name: lastName,
        referral_code: newRefCode, referred_by: referredById,
      });

      const { data: newProfile } = await supabase.from("profiles").select("id").eq("user_id", data.user.id).single();
      if (newProfile) {
        await supabase.from("notifications").insert({
          user_id: newProfile.id, type: "signup",
          message: `${username || email.split("@")[0]} just joined the platform! 🎉`,
          is_global: true,
        });
      }
      toast({ title: "Account created!", description: "Please check your email to verify your account." });
    }
    setLoading(false);
  };

  const formContent = (
    <div>
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary">SurveySite</span>
        </div>
        <h2 className="text-lg font-semibold">{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <p className="text-muted-foreground text-xs">{isLogin ? "Sign in to your account" : "Join and start earning today"}</p>
      </div>
      <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-3">
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 h-9 text-sm" required />
            </div>
          </>
        )}
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-9 text-sm" required />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-9 text-sm" required minLength={6} />
        </div>
        {!isLogin && (
          <Input placeholder="Referral Code (optional)" value={referralCode || refFromUrl} onChange={(e) => setReferralCode(e.target.value)} className="h-9 text-sm" />
        )}
        <Button type="submit" className="w-full h-9 text-sm" disabled={loading}>
          {loading ? "Please wait..." : isLogin ? (<><LogIn className="mr-2 h-4 w-4" /> Sign In</>) : (<><UserPlus className="mr-2 h-4 w-4" /> Create Account</>)}
        </Button>
      </form>
      <div className="mt-3 text-center">
        <button onClick={() => setIsLogin(!isLogin)} className="text-primary text-xs hover:underline">
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Realistic blurred dashboard background */}
      <div className="absolute inset-0 bg-background">
        <div className="blur-[3px] opacity-30 pointer-events-none min-h-screen">
          {/* Sidebar */}
          <div className="flex min-h-screen">
            <div className="w-48 bg-card border-r border-border p-3 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-primary" />
                <span className="text-sm font-bold text-primary">SurveySite</span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-1">user@email.com</div>
              {["Dashboard", "Daily Surveys", "Offers", "Withdrawal", "Convert Points", "Leaderboard", "Affiliates"].map(item => (
                <div key={item} className="text-xs py-1.5 px-2 rounded bg-accent/30">{item}</div>
              ))}
            </div>
            {/* Main content area */}
            <div className="flex-1 p-4 space-y-3">
              {/* Ticker bar */}
              <div className="h-8 bg-primary/10 rounded-lg flex items-center px-3 gap-6">
                {["user1 earned $5.00", "user2 earned $10.00", "user3 earned $2.50", "user4 earned $15.00"].map((t, i) => (
                  <span key={i} className="text-[10px] text-primary whitespace-nowrap flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> {t}
                  </span>
                ))}
              </div>
              {/* Welcome row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Hi, <span className="text-primary">User</span> ✓</span>
                <div className="flex items-center gap-2">
                  <span className="text-primary text-sm font-bold">$8.09</span>
                  <div className="h-5 w-16 bg-primary rounded text-[8px] text-primary-foreground flex items-center justify-center">Withdraw</div>
                </div>
              </div>
              {/* Quick actions */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: ClipboardList, label: "Surveys", bg: "bg-info" },
                  { icon: Gift, label: "Offers", bg: "bg-success" },
                  { icon: Wallet, label: "Withdraw", bg: "bg-primary" },
                  { icon: ArrowLeftRight, label: "Convert", bg: "bg-warning" },
                ].map((a) => (
                  <div key={a.label} className="flex flex-col items-center gap-1 p-2 rounded-lg">
                    <div className={`${a.bg} p-1.5 rounded-full`}>
                      <a.icon className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <span className="text-[8px]">{a.label}</span>
                  </div>
                ))}
              </div>
              {/* Wallet cards */}
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { icon: DollarSign, label: "Cash", value: "$8.09" },
                  { icon: Star, label: "Points", value: "352" },
                  { icon: Lock, label: "Locked", value: "0" },
                  { icon: TrendingUp, label: "Payouts", value: "$0.00" },
                  { icon: Users, label: "Referrals", value: "0" },
                  { icon: Gift, label: "Ref. Earn", value: "$0.00" },
                ].map((c) => (
                  <div key={c.label} className="bg-card border border-border rounded p-1.5">
                    <div className="text-[7px] text-muted-foreground">{c.label}</div>
                    <div className="text-[10px] font-bold text-primary">{c.value}</div>
                  </div>
                ))}
              </div>
              {/* Refer & Earn */}
              <div className="flex items-center gap-2 p-2 rounded bg-success/10 border border-success/20">
                <Gift className="h-3 w-3 text-success" />
                <span className="text-[8px] font-semibold">Refer & Earn</span>
                <div className="h-4 flex-1 bg-accent/50 rounded px-1 text-[7px] flex items-center">http://localhost/auth?ref=A14CA8CF8B</div>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </div>
              {/* Offerwalls + Surveys */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[9px] font-semibold mb-1">Recommended Offerwalls</div>
                  <div className="grid grid-cols-3 gap-1">
                    {["moustache", "test", "abc", "hello", "rl.xy", "cricket"].map(n => (
                      <div key={n} className="bg-accent/40 rounded p-1 text-center text-[8px]">{n}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[9px] font-semibold mb-1">Daily Surveys</div>
                  <div className="space-y-0.5">
                    {["hello"].map(n => (
                      <div key={n} className="flex justify-between bg-accent/40 rounded p-1 text-[8px]">
                        <span>{n}</span><span className="text-primary">1 pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Last Credited + Live Activity */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[9px] font-semibold mb-1">Last Credited</div>
                  {["Postback from cricket", "Postback from tolgate", "Postback from ricky", "Postback from uma"].map((t, i) => (
                    <div key={i} className="flex justify-between text-[8px] py-0.5">
                      <span>{t}</span><span className="text-success">+{[7, 20, 10, 30][i]} pts</span>
                    </div>
                  ))}
                </div>
                <div className="bg-card border border-border rounded p-2">
                  <div className="text-[9px] font-semibold mb-1 flex items-center gap-1"><Activity className="h-2 w-2 text-primary" /> Live Activity</div>
                  {["badboysai redeemed promocode", "New promocode added", "New offer added: reshma", "badboysai just logged in"].map((t, i) => (
                    <div key={i} className="text-[8px] py-0.5">{t}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main auth form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-card/95 backdrop-blur-md shadow-2xl border-border/50">
          <CardContent className="p-6">{formContent}</CardContent>
        </Card>
      </div>

      {/* Auto Sign-in Popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-sm p-6">{formContent}</DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
