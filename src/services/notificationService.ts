import { supabase } from '@/lib/supabase'

export interface NotificationPayload {
  type: 'appointment_created' | 'appointment_reminder' | 'appointment_cancelled' | 'result_ready' | 'prescription_created'
  recipient: {
    id: string
    type: 'patient' | 'doctor' | 'staff'
  }
  data: any
}

export const notificationService = {
  /**
   * Send a notification through the Edge Function
   */
  async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('appointment-notification', {
        body: payload
      })

      if (error) {
        console.error('Notification error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      console.error('Notification service error:', error)
      return { success: false, error: error.message || 'Failed to send notification' }
    }
  },

  /**
   * Send an appointment notification
   */
  async sendAppointmentNotification(
    appointmentId: string,
    notificationType: 'created' | 'reminder' | 'cancelled' = 'created'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Fetch appointment details with related data
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            personal_info
          ),
          doctors (
            id,
            users (
              full_name
            )
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (appointmentError || !appointment) {
        return { success: false, error: appointmentError?.message || 'Appointment not found' }
      }

      // Prepare notification payload
      const payload: NotificationPayload = {
        type: `appointment_${notificationType}` as any,
        recipient: {
          id: appointment.patient_id,
          type: 'patient'
        },
        data: {
          appointment_id: appointment.id,
          patient: appointment.patients,
          doctor: appointment.doctors,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          reason: appointment.reason,
          status: appointment.status
        }
      }

      // Send notification
      return await this.sendNotification(payload)
    } catch (error: any) {
      console.error('Appointment notification error:', error)
      return { success: false, error: error.message || 'Failed to send appointment notification' }
    }
  },

  /**
   * Send a test notification (for development/testing)
   */
  async sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
      const testPayload: NotificationPayload = {
        type: 'appointment_created',
        recipient: {
          id: 'test-patient-id',
          type: 'patient'
        },
        data: {
          appointment_id: 'test-appointment-id',
          patient: {
            personal_info: {
              first_name: 'Test',
              last_name: 'Patient',
              mobile: '9876543210' // Use a real number for testing
            }
          },
          doctor: {
            users: {
              full_name: 'Test Doctor'
            }
          },
          appointment_date: new Date().toISOString().split('T')[0],
          appointment_time: '14:30:00',
          reason: 'Test notification',
          status: 'scheduled'
        }
      }

      return await this.sendNotification(testPayload)
    } catch (error: any) {
      console.error('Test notification error:', error)
      return { success: false, error: error.message || 'Failed to send test notification' }
    }
  }
}

export default notificationService