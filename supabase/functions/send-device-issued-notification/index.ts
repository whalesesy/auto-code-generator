import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface IssuedNotificationRequest {
  to: string;
  recipientName: string;
  deviceType: string;
  deviceModel?: string;
  quantity: number;
  ticketNumber?: string;
  pickupLocation: string;
  pickupTime: string;
  expectedReturnDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an authorized admin or approver
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user has admin or approver role
    const { data: roleData } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    const { data: approverData } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'approver' });

    if (!roleData && !approverData) {
      console.error("User does not have required role");
      return new Response(
        JSON.stringify({ error: "Forbidden: Requires admin or approver role" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { 
      to, 
      recipientName, 
      deviceType, 
      deviceModel,
      quantity,
      ticketNumber,
      pickupLocation, 
      pickupTime,
      expectedReturnDate 
    }: IssuedNotificationRequest = await req.json();

    // Sanitize all user inputs
    const safeRecipientName = escapeHtml(recipientName);
    const safeDeviceType = escapeHtml(deviceType);
    const safeDeviceModel = escapeHtml(deviceModel || '');
    const safePickupLocation = escapeHtml(pickupLocation);
    const safeTicketNumber = escapeHtml(ticketNumber || '');

    console.log(`Sending device issued notification to ${to} for ${safeDeviceType}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Device Ready for Pickup!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">ICT Device Manager</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
              Hello <strong>${safeRecipientName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
              Great news! Your device request has been processed and is ready for pickup.
            </p>
            
            <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #166534;">Device Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;">Device:</td>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">${safeDeviceType}${safeDeviceModel ? ` (${safeDeviceModel})` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Quantity:</td>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">${quantity}</td>
                </tr>
                ${safeTicketNumber ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Ticket #:</td>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">${safeTicketNumber}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #1e40af;">📍 Pickup Information</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 40%;">Location:</td>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">${safePickupLocation}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Pickup Time:</td>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">${pickupTime}</td>
                </tr>
                ${expectedReturnDate ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Expected Return:</td>
                  <td style="padding: 8px 0; color: #374151; font-weight: 600;">${expectedReturnDate}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <p style="color: #374151; font-size: 14px;">
              Please bring a valid ID when picking up your device. If you cannot make it at the scheduled time, 
              please contact the ICT department to reschedule.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
              This is an automated message from ICT Device Manager. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ICT Device Manager <onboarding@resend.dev>",
        to: [to],
        subject: `📦 Your ${safeDeviceType} is Ready for Pickup!`,
        html: emailHtml,
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Device issued notification sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending device issued notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
