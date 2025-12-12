import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityCheckRequest {
  action: "check_login" | "record_failed" | "clear_failed" | "check_rate_limit" | "check_password_breach" | "log_event";
  email?: string;
  ip_address?: string;
  user_agent?: string;
  user_id?: string;
  password?: string;
  event_type?: string;
  metadata?: Record<string, unknown>;
  rate_limit_action?: string;
  max_requests?: number;
  window_seconds?: number;
}

// Check if password is in known breach databases (HaveIBeenPwned API)
async function checkPasswordBreach(password: string): Promise<{ breached: boolean; count: number }> {
  try {
    // Create SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);
    
    // Query HaveIBeenPwned API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" }
    });
    
    if (!response.ok) {
      console.error("HaveIBeenPwned API error:", response.status);
      return { breached: false, count: 0 };
    }
    
    const text = await response.text();
    const lines = text.split("\n");
    
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(":");
      if (hashSuffix.trim() === suffix) {
        const count = parseInt(countStr.trim(), 10);
        return { breached: true, count };
      }
    }
    
    return { breached: false, count: 0 };
  } catch (error) {
    console.error("Error checking password breach:", error);
    return { breached: false, count: 0 };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SecurityCheckRequest = await req.json();
    const { action, email, ip_address, user_agent, user_id, password, event_type, metadata, rate_limit_action, max_requests = 10, window_seconds = 3600 } = body;

    switch (action) {
      case "check_login": {
        if (!email) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data, error } = await supabase.rpc("check_login_attempts", { 
          p_email: email, 
          p_ip_address: ip_address 
        });
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ 
          is_locked: data?.[0]?.is_locked || false,
          attempts_remaining: data?.[0]?.attempts_remaining ?? 5,
          locked_until: data?.[0]?.locked_until || null
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "record_failed": {
        if (!email) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data, error } = await supabase.rpc("record_failed_login", { 
          p_email: email, 
          p_ip_address: ip_address 
        });
        
        if (error) throw error;
        
        // Log the failed login event
        await supabase.rpc("log_security_event", {
          p_event_type: "login_failed",
          p_email: email,
          p_ip_address: ip_address,
          p_user_agent: user_agent,
          p_metadata: { attempts_remaining: data?.[0]?.attempts_remaining }
        });
        
        return new Response(JSON.stringify({ 
          is_now_locked: data?.[0]?.is_now_locked || false,
          attempts_remaining: data?.[0]?.attempts_remaining ?? 0,
          locked_until: data?.[0]?.locked_until || null
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "clear_failed": {
        if (!email) {
          return new Response(JSON.stringify({ error: "Email required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        await supabase.rpc("clear_failed_logins", { p_email: email });
        
        // Log successful login
        await supabase.rpc("log_security_event", {
          p_event_type: "login_success",
          p_user_id: user_id || null,
          p_email: email,
          p_ip_address: ip_address,
          p_user_agent: user_agent
        });
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "check_rate_limit": {
        const identifier = ip_address || email;
        if (!identifier || !rate_limit_action) {
          return new Response(JSON.stringify({ error: "Identifier and action required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const { data, error } = await supabase.rpc("check_rate_limit", {
          p_identifier: identifier,
          p_action_type: rate_limit_action,
          p_max_requests: max_requests,
          p_window_seconds: window_seconds
        });
        
        if (error) throw error;
        
        return new Response(JSON.stringify({
          is_limited: data?.[0]?.is_limited || false,
          requests_remaining: data?.[0]?.requests_remaining ?? max_requests,
          reset_at: data?.[0]?.reset_at || null
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "check_password_breach": {
        if (!password) {
          return new Response(JSON.stringify({ error: "Password required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        const result = await checkPasswordBreach(password);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "log_event": {
        if (!event_type) {
          return new Response(JSON.stringify({ error: "Event type required" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        
        await supabase.rpc("log_security_event", {
          p_event_type: event_type,
          p_user_id: user_id || null,
          p_email: email || null,
          p_ip_address: ip_address || null,
          p_user_agent: user_agent || null,
          p_metadata: metadata || {}
        });
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (error: unknown) {
    console.error("Security check error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
