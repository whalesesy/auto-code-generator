import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_USERS = [
  { email: "admin@demo.com", password: "Demo@123456", fullName: "Demo Admin", role: "admin" },
  { email: "approver@demo.com", password: "Demo@123456", fullName: "Demo Approver", role: "approver" },
  { email: "staff@demo.com", password: "Demo@123456", fullName: "Demo Staff", role: "staff" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const demoUser of DEMO_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);

      if (existingUser) {
        results.push({ email: demoUser.email, status: "already exists" });
        continue;
      }

      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: demoUser.email,
        password: demoUser.password,
        email_confirm: true,
        user_metadata: { full_name: demoUser.fullName }
      });

      if (userError) {
        results.push({ email: demoUser.email, status: "error", error: userError.message });
        continue;
      }

      // Update role (trigger creates default 'staff' role, so update if different)
      if (demoUser.role !== "staff" && userData.user) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: demoUser.role })
          .eq("user_id", userData.user.id);
      }

      results.push({ email: demoUser.email, status: "created", role: demoUser.role });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
