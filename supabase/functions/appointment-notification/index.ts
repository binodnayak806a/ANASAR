import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

// Define types for better type safety
interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
  status: string;
  reason: string;
}

interface Patient {
  id: string;
  personal_info: {
    first_name: string;
    last_name: string;
    mobile?: string;
  };
}

interface Doctor {
  id: string;
  users: {
    full_name: string;
  };
}

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioWhatsAppNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    // Validate Twilio credentials
    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Twilio credentials not configured",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { record, type } = await req.json();

    // Validate request
    if (!record || !record.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request payload" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Only process insert events
    if (type !== "INSERT") {
      return new Response(
        JSON.stringify({ success: true, message: "Event type ignored" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const appointment = record as Appointment;

    // Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("personal_info")
      .eq("id", appointment.patient_id)
      .single();

    if (patientError || !patient) {
      console.error("Error fetching patient:", patientError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch patient details",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Fetch doctor details
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("users(full_name)")
      .eq("id", appointment.doctor_id)
      .single();

    if (doctorError || !doctor) {
      console.error("Error fetching doctor:", doctorError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch doctor details",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Get patient mobile number
    const patientMobile = patient.personal_info?.mobile;
    if (!patientMobile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Patient mobile number not available",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Format date and time for better readability
    const appointmentDate = new Date(appointment.appointment_date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Format time (assuming appointment_time is in HH:MM:SS format)
    const timeParts = appointment.appointment_time.split(':');
    const hours = parseInt(timeParts[0]);
    const minutes = timeParts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedTime = `${formattedHours}:${minutes} ${ampm}`;

    // Compose WhatsApp message
    const message = `
🏥 *Aarogya Sahayak HMS*

Dear ${patient.personal_info.first_name} ${patient.personal_info.last_name},

Your appointment has been confirmed:

📅 *Date*: ${appointmentDate}
⏰ *Time*: ${formattedTime}
👨‍⚕️ *Doctor*: Dr. ${doctor.users.full_name}
🔍 *Reason*: ${appointment.reason}

Please arrive 15 minutes before your appointment time. If you need to reschedule, please contact us at least 24 hours in advance.

Thank you for choosing Aarogya Sahayak HMS.
    `.trim();

    // Send WhatsApp message via Twilio
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:+91${patientMobile}`);
    formData.append("From", `whatsapp:${twilioWhatsAppNumber}`);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error("Twilio API error:", twilioError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Twilio API error: ${twilioError}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const twilioResult = await twilioResponse.json();

    // Log the notification in audit_logs table
    await supabase.from("audit_logs").insert({
      hospital_id: record.hospital_id,
      user_id: record.created_by,
      action: "NOTIFICATION_SENT",
      resource_type: "appointment",
      resource_id: appointment.id,
      new_values: { notification_type: "whatsapp", message_sid: twilioResult.sid },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp notification sent successfully",
        twilioSid: twilioResult.sid,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});