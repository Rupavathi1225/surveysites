import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Mail, Lock, User } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(defaultTab === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const refFromUrl = urlParams.get("ref") || "";

  useEffect(() => {
    setIsLogin(defaultTab === "login");
  }, [defaultTab, isOpen]);

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

      onClose();
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
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6 bg-white rounded-lg border border-gray-200 shadow-xl">
        <div>
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img src="/logo-icon.png" className="h-8 w-8 object-contain" alt="SurveyForever Logo" />
              <span className="text-xl font-bold text-gray-900">SurveyForever</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{isLogin ? "Welcome Back" : "Create Account"}</h2>
            <p className="text-gray-500 text-xs">{isLogin ? "Sign in to your account" : "Join and start earning today"}</p>
          </div>
          
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-3.5">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-9 h-10 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded" />
                  </div>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="pl-9 h-10 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded" />
                  </div>
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 h-10 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded" required />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-10 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-10 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded" required minLength={6} />
            </div>
            {!isLogin && (
              <>
                <Input placeholder="Referral Code (optional)" value={referralCode || refFromUrl} onChange={(e) => setReferralCode(e.target.value)} className="h-10 text-sm border-gray-300 focus:border-primary focus:ring-primary rounded" />
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms-modal"
                    checked={agreedToTerms}
                    onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="terms-modal" className="text-xs text-gray-500 leading-tight cursor-pointer">
                    By creating this account, you agree to the{" "}
                    <Link to="/terms" onClick={onClose} className="text-primary hover:underline font-medium">Terms of Service</Link>{" "}
                    and{" "}
                    <Link to="/terms" onClick={onClose} className="text-primary hover:underline font-medium">Privacy Policy</Link>
                  </label>
                </div>
              </>
            )}
            <Button type="submit" className="w-full h-10 text-sm rounded bg-primary hover:bg-primary/95 text-white font-semibold shadow-sm transition-colors" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? (<><LogIn className="mr-2 h-4 w-4" /> Sign In</>) : (<><UserPlus className="mr-2 h-4 w-4" /> Create Account</>)}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary text-xs hover:underline font-medium">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
