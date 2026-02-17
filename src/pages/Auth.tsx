import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Mail, Lock, User, Globe } from "lucide-react";

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

  // Show sign-in popup after 2 seconds
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

  const AuthForm = ({ onClose }: { onClose?: () => void }) => (
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
      {/* Blurred Dashboard Background */}
      <div className="absolute inset-0 bg-background">
        <div className="blur-sm opacity-40 pointer-events-none min-h-screen p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="h-10 bg-primary/10 rounded-lg" />
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="h-4 w-48 bg-primary/20 rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="mt-4 text-right">
                <div className="h-8 w-24 bg-primary/30 rounded ml-auto" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-card rounded-xl p-4 border border-border">
                  <div className="h-10 w-10 bg-primary/20 rounded-full mx-auto mb-2" />
                  <div className="h-3 w-16 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-card rounded-xl p-3 border border-border">
                  <div className="h-2 w-12 bg-muted rounded mb-1" />
                  <div className="h-4 w-16 bg-primary/20 rounded" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="h-4 w-40 bg-muted rounded mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  {[1,2,3,4].map(i => (<div key={i} className="h-12 bg-accent/40 rounded-lg" />))}
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="h-4 w-32 bg-muted rounded mb-3" />
                {[1,2,3].map(i => (<div key={i} className="h-10 bg-accent/40 rounded-lg mb-2" />))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main auth form (centered) */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-card/95 backdrop-blur-md shadow-2xl border-border/50">
          <CardContent className="p-6">
            <AuthForm />
          </CardContent>
        </Card>
      </div>

      {/* Auto Sign-in Popup */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="max-w-sm p-6">
          <AuthForm onClose={() => setShowPopup(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
