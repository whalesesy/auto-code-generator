import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupNotificationRequest {
  email: string;
  fullName: string;
  status: 'approved' | 'rejected';
  role?: string;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-signup-notification function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin or approver role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'approver'].includes(roleData.role)) {
      console.error("User does not have permission to send notifications");
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin or Approver role required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, fullName, status, role, rejectionReason }: SignupNotificationRequest = await req.json();
    console.log(`Sending ${status} notification to ${email}`);

    let subject: string;
    let htmlContent: string;

    if (status === 'approved') {
      subject = "Your ICT Device Manager Account Has Been Approved! 🎉";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .role-badge { display: inline-block; background: #ddd6fe; color: #7c3aed; padding: 4px 12px; border-radius: 20px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Approved!</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Great news! Your ICT Device Manager account has been approved.</p>
              <p>You have been assigned the role: <span class="role-badge">${role || 'Staff'}</span></p>
              <p>You can now log in to the system and start managing your device requests.</p>
              <p style="text-align: center;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '#'}/auth" class="button">Login Now</a>
              </p>
              <p>If you have any questions, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>ICT Device Manager - Secure Device Management System</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = "Update on Your ICT Device Manager Account Request";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
            .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account Request Update</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>We regret to inform you that your account request for the ICT Device Manager has not been approved at this time.</p>
              ${rejectionReason ? `
                <div class="reason-box">
                  <strong>Reason:</strong><br>
                  ${rejectionReason}
                </div>
              ` : ''}
              <p>If you believe this was a mistake or would like to appeal this decision, please contact your system administrator.</p>
              <p>You may also submit a new signup request with updated information if applicable.</p>
            </div>
            <div class="footer">
              <p>ICT Device Manager - Secure Device Management System</p>
              <p>This is an automated message. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "ICT Device Manager <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-signup-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
