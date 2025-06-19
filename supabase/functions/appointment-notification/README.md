# Appointment Notification Edge Function

This Edge Function sends WhatsApp notifications to patients when new appointments are created in the system.

## Features

- Automatically triggers on new appointment insertions
- Fetches patient and doctor details
- Formats a personalized WhatsApp message
- Sends the message via Twilio WhatsApp API
- Logs the notification in the audit trail

## Configuration

### Environment Variables

The following environment variables must be set in the Supabase Dashboard:

- `TWILIO_ACCOUNT_SID`: Your Twilio account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio auth token
- `TWILIO_WHATSAPP_NUMBER`: Your Twilio WhatsApp number (with country code)

### Database Trigger

This function is designed to be triggered by a database insert on the `appointments` table.

## Deployment

1. Deploy the function to Supabase:
   ```bash
   supabase functions deploy appointment-notification
   ```

2. Set up the required environment variables in the Supabase Dashboard:
   - Go to Project Settings > API > Functions
   - Add the environment variables listed above

3. Create a database trigger in the Supabase Dashboard:
   - Go to Database > Triggers
   - Create a new trigger:
     - Name: `on_appointment_created`
     - Table: `appointments`
     - Events: `INSERT`
     - Function to trigger: `http://localhost:54321/functions/v1/appointment-notification`

## Manual Invocation

You can also manually invoke this function for testing:

```typescript
const { data, error } = await supabase.functions.invoke('appointment-notification', {
  body: {
    type: 'INSERT',
    record: {
      id: 'appointment-uuid',
      hospital_id: 'hospital-uuid',
      patient_id: 'patient-uuid',
      doctor_id: 'doctor-uuid',
      appointment_date: '2025-01-15',
      appointment_time: '14:30:00',
      type: 'consultation',
      status: 'scheduled',
      reason: 'Regular checkup',
      created_by: 'user-uuid'
    }
  }
});
```

## Error Handling

The function includes comprehensive error handling for:
- Missing environment variables
- Invalid request payloads
- Database query errors
- Twilio API errors

All errors are logged and returned with appropriate HTTP status codes.