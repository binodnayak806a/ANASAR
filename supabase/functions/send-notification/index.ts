import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface NotificationRequest {
  type: 'appointment_created' | 'appointment_reminder' | 'appointment_cancelled'
  patient: {
    id: string
    personal_info: {
      first_name: string
      last_name: string
      mobile?: string
    }
  }
  doctor: {
    users: {
      full_name: string
    }
  }
  appointment: {
    date: string
    time: string
    reason: string
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const { type, patient, doctor, appointment }: NotificationRequest = await req.json()

    // Get Twilio credentials from environment
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log('Twilio credentials not configured, skipping notification')
      return new Response(
        JSON.stringify({ success: true, message: 'Notification skipped - Twilio not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Prepare message based on type
    let message = ''
    const patientName = `${patient.personal_info.first_name} ${patient.personal_info.last_name}`
    const doctorName = doctor.users.full_name
    const appointmentDate = new Date(appointment.date).toLocaleDateString('en-IN')
    const appointmentTime = appointment.time

    switch (type) {
      case 'appointment_created':
        message = `Dear ${patientName}, your appointment with Dr. ${doctorName} is scheduled for ${appointmentDate} at ${appointmentTime}. Reason: ${appointment.reason}. Please arrive 15 minutes early. - Aarogya Sahayak HMS`
        break
      case 'appointment_reminder':
        message = `Reminder: You have an appointment with Dr. ${doctorName} tomorrow at ${appointmentTime}. Please arrive 15 minutes early. - Aarogya Sahayak HMS`
        break
      case 'appointment_cancelled':
        message = `Your appointment with Dr. ${doctorName} scheduled for ${appointmentDate} at ${appointmentTime} has been cancelled. Please contact us to reschedule. - Aarogya Sahayak HMS`
        break
      default:
        message = `Update regarding your appointment with Dr. ${doctorName}. - Aarogya Sahayak HMS`
    }

    // Send SMS via Twilio
    const patientMobile = patient.personal_info.mobile
    if (patientMobile) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
      
      const formData = new URLSearchParams()
      formData.append('To', `+91${patientMobile}`)
      formData.append('From', twilioPhoneNumber)
      formData.append('Body', message)

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      })

      if (!twilioResponse.ok) {
        const error = await twilioResponse.text()
        console.error('Twilio SMS error:', error)
        throw new Error(`Failed to send SMS: ${error}`)
      }

      const twilioResult = await twilioResponse.json()
      console.log('SMS sent successfully:', twilioResult.sid)

      // Optional: Send WhatsApp message if WhatsApp number is configured
      const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')
      if (twilioWhatsAppNumber) {
        const whatsappFormData = new URLSearchParams()
        whatsappFormData.append('To', `whatsapp:+91${patientMobile}`)
        whatsappFormData.append('From', `whatsapp:${twilioWhatsAppNumber}`)
        whatsappFormData.append('Body', message)

        try {
          const whatsappResponse = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: whatsappFormData,
          })

          if (whatsappResponse.ok) {
            const whatsappResult = await whatsappResponse.json()
            console.log('WhatsApp message sent successfully:', whatsappResult.sid)
          }
        } catch (whatsappError) {
          console.error('WhatsApp message failed:', whatsappError)
          // Don't fail the entire request if WhatsApp fails
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully',
        type,
        recipient: patientMobile 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Notification error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send notification' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})