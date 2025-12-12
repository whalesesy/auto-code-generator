import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are DeviceHub Assistant, a helpful AI chatbot for the ICT Device Management Platform at Meru University of Science & Technology.

About the Platform:
- This is an ICT Device Issuance Management Platform for managing device requests, inventory, and approval workflows
- Users can request devices like laptops, monitors, phones, and other ICT equipment
- There are three user roles: Staff (can request devices), Approvers (can approve/reject requests), and Admins (full system access)

Key Features:
1. Device Requests: Users submit requests specifying device type, quantity, purpose, duration, and needed date
2. Approval Workflow: Managers review and approve/reject requests with comments
3. Inventory Management: Track device status (available, issued, maintenance, damaged, lost)
4. Role-Based Access: Different permissions for staff, approvers, and admins
5. Reports: Generate analytics, status reports, and export to CSV/PDF
6. Notifications: Real-time alerts for request status changes and overdue returns
7. Device Returns: Track issued devices and expected return dates

How to Use:
- To request a device: Go to "Request Device" from the sidebar, fill out the form
- To check request status: Go to "My Requests" to see your submissions
- Approvals typically take 24-48 business hours
- Once approved, you'll receive pickup location, time, and expected return date

Contact Information:
- Email: devicehub68@gmail.com
- Phone: +254 710 366 205
- Location: Meru University of Science & Technology, Kenya
- Business Hours: Mon-Fri 8 AM - 5 PM EAT, Saturday 9 AM - 1 PM EAT

Guidelines for responses:
- Be helpful, friendly, and concise
- Answer questions about the platform's features and how to use them
- Guide users on device requests, approvals, inventory, and reports
- If asked about something outside the platform's scope, politely redirect to relevant support channels
- Always use Kenya-specific context (+254 phone format, EAT timezone)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
