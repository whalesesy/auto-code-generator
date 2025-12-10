import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Generate secure random password
function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

const DEMO_USERS = [
  { email: "admin@demo.com", fullName: "Demo Admin", role: "admin" },
  { email: "approver@demo.com", fullName: "Demo Approver", role: "approver" },
  { email: "staff@demo.com", fullName: "Demo Staff", role: "staff" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and check if user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - no token provided" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.log("Failed to get user from token:", userError?.message);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized - invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.log("User is not admin:", user.id, roleData?.role);
      return new Response(JSON.stringify({ success: false, error: "Forbidden - admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Admin user verified, creating demo users...");

    // Use service role for admin operations
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

      // Generate secure random password
      const securePassword = generateSecurePassword();

      // Create user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: demoUser.email,
        password: securePassword,
        email_confirm: true,
        user_metadata: { full_name: demoUser.fullName }
      });

      if (createError) {
        console.log("Error creating user:", demoUser.email, createError.message);
        results.push({ email: demoUser.email, status: "error", error: createError.message });
        continue;
      }

      // Update role (trigger creates default 'staff' role, so update if different)
      if (demoUser.role !== "staff" && userData.user) {
        await supabaseAdmin
          .from("user_roles")
          .update({ role: demoUser.role })
          .eq("user_id", userData.user.id);
      }

      console.log("Created demo user:", demoUser.email, demoUser.role);
      results.push({ 
        email: demoUser.email, 
        status: "created", 
        role: demoUser.role,
        temporaryPassword: securePassword // Return password so admin can share it securely
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-demo-users:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
