import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are DeviceHub Assistant, an intelligent AI chatbot for the ICT Device Management Platform at Meru University of Science & Technology.

## Platform Overview
This is a comprehensive ICT Device Issuance Management System that handles device requests, inventory management, approval workflows, and asset tracking for the university.

## User Roles & Permissions
1. **Staff** - Can request devices, view their own requests, track request status, and return devices
2. **Approvers** - Can approve/reject device requests, view all pending requests, add comments
3. **Admins** - Full system access: manage inventory, users, reports, approve signups, configure settings

## Device Categories
- **Computing**: Laptops, desktops, workstations
- **Mobile**: Smartphones, tablets
- **Peripherals**: Keyboards, mice, monitors, printers, webcams
- **Networking**: Routers, switches, cables, access points
- **Audio/Visual**: Projectors, speakers, microphones, cameras
- **Other**: Miscellaneous ICT equipment

## Device Statuses
- **Available** - Ready for issuance
- **Issued** - Currently assigned to a user
- **Maintenance** - Under repair or servicing (cannot be requested)
- **Damaged** - Broken/faulty equipment (cannot be requested)
- **Lost** - Missing or unaccounted for

## Request Workflow
1. User submits device request with: device type, category, quantity, purpose, needed date, duration
2. Request enters "Pending" status
3. Approver reviews and either Approves (with pickup details) or Rejects (with reason)
4. If approved: User picks up device, status changes to "Issued"
5. When done: User initiates return, device goes to "Pending Return"
6. Admin confirms return, device becomes "Available" again

## Request Statuses
- **Pending** - Awaiting approval
- **Approved** - Ready for pickup
- **Rejected** - Denied with reason
- **Issued** - Device handed over to user
- **Pending Return** - User initiated return
- **Returned** - Device back in inventory

## Key Features
1. **Device Requests**: Submit requests specifying device details, purpose, and duration
2. **My Requests**: Track all your submitted requests and their statuses
3. **Approvals**: (Approvers/Admins) Review and process pending requests
4. **Inventory**: View all devices, their status, location, and specifications
5. **Reports**: Generate analytics on device usage, request trends, overdue returns
6. **Notifications**: Real-time alerts for status changes, approvals, and overdue items
7. **User Signup Approvals**: (Admins) Approve new user registrations
8. **MFA Security**: Two-factor authentication support for enhanced security

## Stock Management
- When a device is issued, stock automatically decreases
- When a device is returned, stock automatically increases
- Low stock alerts notify admins when devices are running low

## Common User Questions & Answers
Q: How do I request a device?
A: Go to "Request Device" in the sidebar, select the device category and type, specify quantity, purpose, when you need it, and for how long. Submit the form and wait for approval.

Q: How long does approval take?
A: Typically 24-48 business hours. Urgent requests may be expedited - contact the ICT department directly.

Q: What if my request is rejected?
A: Check the rejection reason in "My Requests". Common reasons: device unavailable, insufficient justification, or duplicate request. You can submit a new request with corrections.

Q: How do I return a device?
A: Go to "My Requests", find the issued device, and click "Initiate Return". Then bring the device to the ICT office for confirmation.

Q: What if a device is damaged or under maintenance?
A: Devices marked as "Damaged" or "Maintenance" cannot be requested. You'll see a warning if you try to select them.

Q: How do I check device availability?
A: Go to "Inventory" to see all devices and their current status. Available devices show green status.

## Contact Information
- Email: devicehub68@gmail.com
- Phone: +254 710 366 205
- Location: Meru University of Science & Technology, ICT Department, Kenya
- Business Hours: Monday-Friday 8 AM - 5 PM EAT, Saturday 9 AM - 1 PM EAT

## Response Guidelines
- Be helpful, friendly, accurate, and concise
- Answer questions based on the system functionality described above
- Guide users step-by-step when explaining processes
- If a question is outside the platform's scope, politely redirect to support channels
- Use Kenya-specific context (EAT timezone, +254 phone format)
- If unsure about specific data (like exact device availability), direct users to check the relevant page`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }
    
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please log in to use the chatbot." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    const { messages } = body;
    
    // Input validation
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (messages.length > 50) {
      return new Response(
        JSON.stringify({ error: "Too many messages in conversation. Please start a new chat." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check rate limit for this user
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey
    );
    
    const { data: rateLimitData } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_action_type: 'chatbot',
      p_max_requests: 30, // 30 messages per hour
      p_window_seconds: 3600
    });
    
    if (rateLimitData?.[0]?.is_limited) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Chatbot request from user: ${user.id}`);

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
          ...messages.slice(-20), // Only use last 20 messages to prevent context overflow
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
