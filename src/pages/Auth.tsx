import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";

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
          const { data: trackData } = await supabase.functions.invoke("track-login", {
            body: { user_agent: navigator.userAgent, method: "PASSWORD" },
          });
          if (trackData?.login_log_id) {
            sessionStorage.setItem("login_log_id", trackData.login_log_id);
          }
        }
      } catch (e) {
        console.error("Login tracking failed:", e);
      }

      // Create login notification for activity feed
      try {
        const { data: prof } = await supabase.from("profiles").select("id, username").eq("user_id", authData.user.id).single();
        if (prof) {
          await supabase.from("notifications").insert({
            user_id: prof.id,
            type: "login",
            message: `${prof.username || email.split("@")[0]} just logged in`,
            is_global: true,
          });
        }
      } catch (e) {
        console.error("Login notification failed:", e);
      }

      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
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
        user_id: data.user.id,
        email,
        username: username || email.split("@")[0],
        first_name: firstName,
        last_name: lastName,
        referral_code: newRefCode,
        referred_by: referredById,
      });

      const { data: newProfile } = await supabase.from("profiles").select("id").eq("user_id", data.user.id).single();
      if (newProfile) {
        await supabase.from("notifications").insert({
          user_id: newProfile.id,
          type: "signup",
          message: `${username || email.split("@")[0]} just joined the platform! 🎉`,
          is_global: true,
        });
      }

      toast({ title: "Account created!", description: "Please check your email to verify your account." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">SurveySite</span>
          </div>
          <CardTitle className="text-xl">{isLogin ? "Welcome Back" : "Create Account"}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {isLogin ? "Sign in to your account" : "Join and start earning today"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-9" />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9" required />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required minLength={6} />
            </div>
            {!isLogin && (
              <Input placeholder="Referral Code (optional)" value={referralCode || refFromUrl} onChange={(e) => setReferralCode(e.target.value)} />
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? (
                <><LogIn className="mr-2 h-4 w-4" /> Sign In</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary text-sm hover:underline">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
