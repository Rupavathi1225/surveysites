import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  payment_method: string | null;
  payment_info: string | null;
  avatar_url: string | null;
  role: string;
  status: string;
  is_verified: boolean;
  cash_balance: number;
  points: number;
  locked_points: number;
  referral_code: string | null;
  referred_by: string | null;
  free_messages_remaining: number;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      setProfile(data as Profile);
    } else {
      // Auto-create profile if missing
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email || "";
      const newRefCode = Math.random().toString(36).substring(2, 12).toUpperCase();
      await supabase.from("profiles").insert({
        user_id: userId,
        email,
        username: email.split("@")[0],
        referral_code: newRefCode,
      });
      const { data: newProfile } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      setProfile(newProfile as Profile | null);
    }
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === "admin";
  const isSubAdmin = profile?.role === "subadmin";
  const isAdminOrSubAdmin = isAdmin || isSubAdmin;

  return { user, session, profile, loading, signOut, isAdmin, isSubAdmin, isAdminOrSubAdmin, fetchProfile };
}
