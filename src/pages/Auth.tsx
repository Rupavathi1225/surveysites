import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Mail, Lock, User, Globe, X } from "lucide-react";
import { Link } from "react-router-dom";

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
  const [showAuthCard, setShowAuthCard] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";

  useEffect(() => {
    const timer = setTimeout(() => setShowPopup(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check if user comes from email confirmation
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    if (type === "signup" || type === "email") {
      // Email confirmed, auto-redirect to dashboard
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          navigate("/dashboard");
        }
      });
    }
  }, [navigate]);

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
    if (!agreedToTerms) {
      toast({ title: "Terms Required", description: "You must agree to the Terms of Service and Privacy Policy.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
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
          <span className="text-xl font-bold text-primary">SurveyForever</span>
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
          <>
            <Input placeholder="Referral Code (optional)" value={referralCode || refFromUrl} onChange={(e) => setReferralCode(e.target.value)} className="h-9 text-sm" />
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight">
                By creating this account, you agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline font-medium">Terms of Service</Link>{" "}
                and{" "}
                <Link to="/terms" className="text-primary hover:underline font-medium">Privacy Policy</Link>
              </label>
            </div>
          </>
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
      {/* Static dashboard mockup background — very light blur like EarnLab */}
      <div className="absolute inset-0 bg-background">
        {/* Fake sidebar */}
        <div className="absolute left-0 top-0 bottom-0 w-48 bg-sidebar-background border-r border-sidebar-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-primary">SurveyForever</span>
          </div>
          {["Home", "Daily Surveys", "Offers", "Leaderboard", "Affiliates", "Withdrawal", "Balance History", "Contest", "News"].map((item) => (
            <div key={item} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sidebar-accent/40">
              <div className="h-3 w-3 rounded bg-muted-foreground/20" />
              <span className="text-xs text-sidebar-foreground/70">{item}</span>
            </div>
          ))}
        </div>
        {/* Fake main content */}
        <div className="absolute left-48 top-0 right-0 bottom-0 p-6">
          {/* Fake header bar */}
          <div className="flex items-center justify-between mb-4 bg-card rounded-xl p-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-accent" />
              <div>
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-2 w-14 bg-muted/60 rounded mt-1" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-24 bg-accent rounded-lg" />
              <div className="h-8 w-20 bg-primary/30 rounded-lg" />
            </div>
          </div>
          {/* Fake activity ticker */}
          <div className="bg-card rounded-lg p-2 mb-4 flex gap-6">
            {["User1 • $2.50", "User2 • $1.30", "User3 • $5.00", "User4 • $0.80"].map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-accent" />
                <span className="text-[10px] text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          {/* Fake task grid */}
          <div className="mb-3">
            <div className="h-4 w-28 bg-muted rounded mb-2" />
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/15 to-accent" />
                  <div className="p-2 space-y-1">
                    <div className="h-2.5 w-16 bg-muted rounded" />
                    <div className="h-2 w-12 bg-muted/50 rounded" />
                    <div className="h-3 w-10 bg-primary/30 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Fake offer walls */}
          <div>
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl p-3 flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-accent" />
                  <div className="h-2 w-12 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Very light glass overlay — barely blurred so dashboard is clearly visible */}
        <div className="absolute inset-0 backdrop-blur-[1.5px] bg-background/15" />
      </div>

      {/* Main auth form — closeable */}
      {showAuthCard && (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-card/85 backdrop-blur-xl shadow-2xl border border-border/30 relative" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            <button
              onClick={() => setShowAuthCard(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="h-4 w-4" />
            </button>
            <CardContent className="p-6">{formContent}</CardContent>
          </Card>
        </div>
      )}

      {/* When auth card is closed, show a floating sign-in button + intercept clicks */}
      {!showAuthCard && (
        <div className="relative z-10 min-h-screen" onClick={() => setShowAuthCard(true)}>
          <div className="fixed top-4 right-4 z-50 flex gap-2">
            <Button onClick={(e) => { e.stopPropagation(); setIsLogin(true); setShowAuthCard(true); }} size="sm">
              Sign In
            </Button>
            <Button onClick={(e) => { e.stopPropagation(); setIsLogin(false); setShowAuthCard(true); }} variant="outline" size="sm">
              Sign Up
            </Button>
          </div>
        </div>
      )}

      {/* Auto Sign-in Popup */}
      <Dialog open={showPopup && showAuthCard} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-sm p-6">{formContent}</DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
