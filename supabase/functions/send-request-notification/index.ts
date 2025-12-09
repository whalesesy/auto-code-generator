import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  to: string;
  recipientName: string;
  deviceType: string;
  status: 'approved' | 'rejected';
  comments?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, recipientName, deviceType, status, comments }: NotificationRequest = await req.json();

    console.log(`Sending ${status} notification to ${to} for device ${deviceType}`);

    const statusColor = status === 'approved' ? '#22c55e' : '#ef4444';
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';
    const statusEmoji = status === 'approved' ? '✅' : '❌';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ICT Device Manager</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Device Request Update</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
              Hello <strong>${recipientName}</strong>,
            </p>
            
            <div style="background: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
              <p style="margin: 0; color: #374151; font-size: 16px;">
                Your request for <strong>${deviceType}</strong> has been 
                <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
              </p>
            </div>
            
            ${comments ? `
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Comments from approver:</p>
              <p style="margin: 0; color: #374151; font-size: 14px;">${comments}</p>
            </div>
            ` : ''}
            
            ${status === 'approved' ? `
            <p style="color: #374151; font-size: 14px;">
              Your device will be prepared for issuance. You will receive further instructions on when and where to collect it.
            </p>
            ` : `
            <p style="color: #374151; font-size: 14px;">
              If you have questions about this decision, please contact your ICT department or submit a new request with additional details.
            </p>
            `}
            
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
        subject: `${statusEmoji} Your Device Request has been ${statusText}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
