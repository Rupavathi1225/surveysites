import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");
    
    const { data: callerProfile } = await supabase
      .from("profiles").select("role").eq("user_id", caller.id).single();
    if (!callerProfile || !["admin", "subadmin"].includes(callerProfile.role)) {
      throw new Error("Forbidden: admin only");
    }

    const { users, country, activityScheduling, timeGap, singleUserData } = await req.json();
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      throw new Error("No users provided");
    }

    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < users.length; i++) {
      const { username, password, email } = users[i];
      
      // Create auth user with admin API (won't affect caller's session)
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        errors.push(`${username}: ${error.message}`);
        continue;
      }

      if (data.user) {
        // Generate a referral code for the new user
        const refCode = Math.random().toString(36).substring(2, 12).toUpperCase();

        const profileData: any = {
          user_id: data.user.id,
          username,
          first_name: singleUserData?.first_name || username,
          last_name: singleUserData?.last_name || null,
          email,
          mobile: singleUserData?.mobile || null,
          country: country || "India",
          status: "active",
          role: singleUserData?.role || "user",
          referral_code: refCode,
        };

        const { error: profileError } = await supabase.from("profiles").insert(profileData);

        if (profileError) {
          // If profile already exists (from a trigger), try update instead
          if (profileError.code === "23505") {
            await supabase.from("profiles").update({
              username,
              first_name: username,
              email,
              country: country || "India",
              status: "active",
            }).eq("user_id", data.user.id);
          } else {
            console.error("Profile insert error:", profileError);
          }
        }

        // Activity notification with scheduling
        if (activityScheduling && i > 0 && timeGap > 0) {
          const scheduledTime = new Date(Date.now() + i * timeGap * 60000).toISOString();
          await supabase.from("notifications").insert({
            type: "signup",
            message: `${username} joined the platform!`,
            is_global: true,
            created_at: scheduledTime,
          });
        } else {
          await supabase.from("notifications").insert({
            type: "signup",
            message: `${username} joined the platform!`,
            is_global: true,
          });
        }

        created.push({ username, email, password });
      }
    }

    return new Response(JSON.stringify({ created, errors, total: created.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
