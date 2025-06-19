import { useState } from 'react'
import { notificationService, NotificationPayload } from '@/services/notificationService'
import { toast } from 'sonner'

export function useNotifications() {
  const [loading, setLoading] = useState(false)

  /**
   * Send a notification
   */
  const sendNotification = async (payload: NotificationPayload) => {
    setLoading(true)
    try {
      const result = await notificationService.sendNotification(payload)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send notification')
      }
      
      toast.success('Notification Sent', {
        description: 'The notification was sent successfully'
      })
      
      return result
    } catch (error: any) {
      console.error('Notification error:', error)
      
      toast.error('Notification Failed', {
        description: error.message || 'Failed to send notification'
      })
      
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Send an appointment notification
   */
  const sendAppointmentNotification = async (
    appointmentId: string,
    type: 'created' | 'reminder' | 'cancelled' = 'created'
  ) => {
    setLoading(true)
    try {
      const result = await notificationService.sendAppointmentNotification(appointmentId, type)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send appointment notification')
      }
      
      toast.success('Appointment Notification Sent', {
        description: `The ${type} notification was sent successfully`
      })
      
      return result
    } catch (error: any) {
      console.error('Appointment notification error:', error)
      
      toast.error('Notification Failed', {
        description: error.message || 'Failed to send appointment notification'
      })
      
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Send a test notification (for development/testing)
   */
  const sendTestNotification = async () => {
    setLoading(true)
    try {
      const result = await notificationService.sendTestNotification()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send test notification')
      }
      
      toast.success('Test Notification Sent', {
        description: 'The test notification was sent successfully'
      })
      
      return result
    } catch (error: any) {
      console.error('Test notification error:', error)
      
      toast.error('Test Notification Failed', {
        description: error.message || 'Failed to send test notification'
      })
      
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    sendNotification,
    sendAppointmentNotification,
    sendTestNotification
  }
}