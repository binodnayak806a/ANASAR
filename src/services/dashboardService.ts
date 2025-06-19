import { supabase, createTenantQuery, ServiceResult } from './supabaseClient'

// Dashboard-specific service for aggregated data
export const dashboardService = {
  // Get comprehensive dashboard statistics
  async getDashboardStats(hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
      const weekStart = startOfWeek.toISOString().split('T')[0]

      // Execute multiple queries in parallel
      const [
        patientsResult,
        appointmentsResult,
        todayAppointmentsResult,
        billsResult,
        ipdResult,
        doctorsResult
      ] = await Promise.all([
        // Total patients
        query.select('patients').select('id'),
        
        // All appointments for trends
        query.select('appointments')
          .select('id, appointment_date, status, consultation_fee, payment_status')
          .gte('appointment_date', startOfMonth),
        
        // Today's appointments
        query.select('appointments')
          .select('id, status, consultation_fee')
          .eq('appointment_date', today),
        
        // Bills for revenue calculation
        query.select('bills')
          .select('id, bill_date, total_amount, payment_status, bill_type')
          .gte('bill_date', startOfMonth),
        
        // IPD records for bed occupancy
        query.select('ipd_records')
          .select('id, status, admission_date, total_charges')
          .eq('status', 'admitted'),
        
        // Active doctors
        query.select('doctors')
          .select('id, is_active, is_available')
          .eq('is_active', true)
      ])

      // Process results
      const totalPatients = patientsResult.data?.length || 0
      const allAppointments = appointmentsResult.data || []
      const todayAppointments = todayAppointmentsResult.data || []
      const allBills = billsResult.data || []
      const activeBeds = ipdResult.data?.length || 0
      const activeDoctors = doctorsResult.data?.length || 0

      // Calculate metrics
      const todayRevenue = allBills
        .filter(bill => bill.bill_date === today)
        .reduce((sum, bill) => sum + bill.total_amount, 0)

      const monthlyRevenue = allBills
        .reduce((sum, bill) => sum + bill.total_amount, 0)

      const weeklyRevenue = allBills
        .filter(bill => bill.bill_date >= weekStart)
        .reduce((sum, bill) => sum + bill.total_amount, 0)

      const pendingBills = allBills
        .filter(bill => bill.payment_status === 'pending').length

      const newUHIDs = patientsResult.data?.filter(patient => 
        patient.created_at >= today
      ).length || 0

      // Calculate trends (week over week)
      const lastWeekStart = new Date(startOfWeek)
      lastWeekStart.setDate(lastWeekStart.getDate() - 7)
      const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0]

      const thisWeekAppointments = allAppointments.filter(apt => apt.appointment_date >= weekStart).length
      const lastWeekAppointments = allAppointments.filter(apt => 
        apt.appointment_date >= lastWeekStartStr && apt.appointment_date < weekStart
      ).length

      const appointmentTrend = lastWeekAppointments > 0 
        ? ((thisWeekAppointments - lastWeekAppointments) / lastWeekAppointments) * 100 
        : 0

      // Weekly revenue data for chart
      const weeklyData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayRevenue = allBills
          .filter(bill => bill.bill_date === dateStr)
          .reduce((sum, bill) => sum + bill.total_amount, 0)
        
        const dayAppointments = allAppointments
          .filter(apt => apt.appointment_date === dateStr).length

        weeklyData.push({
          date: dateStr,
          revenue: dayRevenue,
          appointments: dayAppointments,
          day: date.toLocaleDateString('en-US', { weekday: 'short' })
        })
      }

      return {
        success: true,
        data: {
          kpis: {
            totalOPDToday: todayAppointments.filter(apt => apt.status !== 'cancelled').length,
            activeIPD: activeBeds,
            revenueToday: todayRevenue,
            newUHIDs: newUHIDs,
            totalPatients,
            activeDoctors,
            monthlyRevenue,
            pendingBills,
            appointmentTrend
          },
          trends: {
            weeklyData,
            weeklyRevenue,
            appointmentGrowth: appointmentTrend
          },
          breakdown: {
            appointmentsByStatus: todayAppointments.reduce((acc, apt) => {
              acc[apt.status] = (acc[apt.status] || 0) + 1
              return acc
            }, {} as Record<string, number>),
            revenueByType: allBills.reduce((acc, bill) => {
              acc[bill.bill_type] = (acc[bill.bill_type] || 0) + bill.total_amount
              return acc
            }, {} as Record<string, number>)
          }
        }
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get recent activities from audit logs
  async getRecentActivities(hospitalId?: string, limit: number = 10): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('audit_logs')
        .select(`
          id,
          action,
          resource_type,
          resource_id,
          created_at,
          users (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        return { success: false, error: error.message }
      }

      const activities = data?.map(log => ({
        id: log.id,
        type: log.resource_type,
        action: log.action,
        message: `${log.action} ${log.resource_type} ${log.resource_id}`,
        time: log.created_at,
        user: log.users?.full_name || 'System'
      })) || []

      return { success: true, data: activities }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// Reports service for generating various reports
export const reportsService = {
  // Generate patient registration report
  async generatePatientReport(params: any, hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('patients')
        .select(`
          id,
          patient_id,
          uhid,
          personal_info,
          contact_info,
          registration_date,
          created_at
        `)
        .gte('registration_date', params.dateFrom)
        .lte('registration_date', params.dateTo)
        .order('registration_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const reportData = {
        title: 'Patient Registration Report',
        period: `${params.dateFrom} to ${params.dateTo}`,
        totalRecords: data?.length || 0,
        data: data?.map(patient => ({
          uhid: patient.uhid,
          patientId: patient.patient_id,
          name: `${patient.personal_info?.first_name || ''} ${patient.personal_info?.last_name || ''}`,
          age: patient.personal_info?.age || 0,
          gender: patient.personal_info?.gender || '',
          mobile: patient.personal_info?.mobile || '',
          registrationDate: patient.registration_date,
          payerType: patient.personal_info?.payer_type || 'Self'
        })) || []
      }

      return { success: true, data: reportData }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Generate appointment summary report
  async generateAppointmentReport(params: any, hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          type,
          consultation_fee,
          payment_status,
          patients (
            uhid,
            personal_info
          ),
          doctors (
            employee_id,
            users (
              full_name
            ),
            departments (
              name
            )
          )
        `)
        .gte('appointment_date', params.dateFrom)
        .lte('appointment_date', params.dateTo)
        .order('appointment_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const reportData = {
        title: 'Appointment Summary Report',
        period: `${params.dateFrom} to ${params.dateTo}`,
        totalAppointments: data?.length || 0,
        summary: {
          byStatus: data?.reduce((acc, apt) => {
            acc[apt.status] = (acc[apt.status] || 0) + 1
            return acc
          }, {} as Record<string, number>) || {},
          totalRevenue: data?.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0) || 0
        },
        data: data?.map(appointment => ({
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          patientName: `${appointment.patients?.personal_info?.first_name || ''} ${appointment.patients?.personal_info?.last_name || ''}`,
          uhid: appointment.patients?.uhid || '',
          doctorName: appointment.doctors?.users?.full_name || '',
          department: appointment.doctors?.departments?.name || '',
          status: appointment.status,
          fee: appointment.consultation_fee || 0,
          paymentStatus: appointment.payment_status
        })) || []
      }

      return { success: true, data: reportData }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Generate revenue analysis report
  async generateRevenueReport(params: any, hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('bills')
        .select(`
          id,
          bill_number,
          bill_date,
          bill_type,
          total_amount,
          payment_status,
          patients (
            uhid,
            personal_info
          )
        `)
        .gte('bill_date', params.dateFrom)
        .lte('bill_date', params.dateTo)
        .order('bill_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const totalRevenue = data?.reduce((sum, bill) => sum + bill.total_amount, 0) || 0
      const paidAmount = data?.filter(bill => bill.payment_status === 'paid')
        .reduce((sum, bill) => sum + bill.total_amount, 0) || 0
      const pendingAmount = data?.filter(bill => bill.payment_status === 'pending')
        .reduce((sum, bill) => sum + bill.total_amount, 0) || 0

      const reportData = {
        title: 'Revenue Analysis Report',
        period: `${params.dateFrom} to ${params.dateTo}`,
        summary: {
          totalRevenue,
          paidAmount,
          pendingAmount,
          collectionRate: totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0,
          byType: data?.reduce((acc, bill) => {
            acc[bill.bill_type] = (acc[bill.bill_type] || 0) + bill.total_amount
            return acc
          }, {} as Record<string, number>) || {}
        },
        data: data?.map(bill => ({
          billNumber: bill.bill_number,
          date: bill.bill_date,
          type: bill.bill_type,
          patientName: `${bill.patients?.personal_info?.first_name || ''} ${bill.patients?.personal_info?.last_name || ''}`,
          uhid: bill.patients?.uhid || '',
          amount: bill.total_amount,
          status: bill.payment_status
        })) || []
      }

      return { success: true, data: reportData }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Generate bed occupancy report
  async generateBedOccupancyReport(params: any, hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('ipd_records')
        .select(`
          id,
          admission_number,
          admission_date,
          discharge_date,
          room_number,
          bed_number,
          status,
          total_charges,
          patients (
            uhid,
            personal_info
          ),
          doctors (
            users (
              full_name
            )
          )
        `)
        .gte('admission_date', params.dateFrom)
        .order('admission_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      const totalAdmissions = data?.length || 0
      const currentlyAdmitted = data?.filter(record => record.status === 'admitted').length || 0
      const discharged = data?.filter(record => record.status === 'discharged').length || 0
      const avgStay = data?.filter(record => record.discharge_date)
        .reduce((sum, record) => {
          const admissionDate = new Date(record.admission_date)
          const dischargeDate = new Date(record.discharge_date!)
          const days = Math.ceil((dischargeDate.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24))
          return sum + days
        }, 0) / discharged || 0

      const reportData = {
        title: 'Bed Occupancy Report',
        period: `${params.dateFrom} to ${params.dateTo}`,
        summary: {
          totalAdmissions,
          currentlyAdmitted,
          discharged,
          occupancyRate: 75, // Mock - would calculate from total beds
          avgStay: Math.round(avgStay * 10) / 10,
          totalRevenue: data?.reduce((sum, record) => sum + (record.total_charges || 0), 0) || 0
        },
        data: data?.map(record => ({
          admissionNumber: record.admission_number,
          admissionDate: record.admission_date,
          dischargeDate: record.discharge_date,
          patientName: `${record.patients?.personal_info?.first_name || ''} ${record.patients?.personal_info?.last_name || ''}`,
          uhid: record.patients?.uhid || '',
          room: record.room_number,
          bed: record.bed_number,
          doctor: record.doctors?.users?.full_name || '',
          status: record.status,
          charges: record.total_charges || 0,
          stayDays: record.discharge_date 
            ? Math.ceil((new Date(record.discharge_date).getTime() - new Date(record.admission_date).getTime()) / (1000 * 60 * 60 * 24))
            : Math.ceil((new Date().getTime() - new Date(record.admission_date).getTime()) / (1000 * 60 * 60 * 24))
        })) || []
      }

      return { success: true, data: reportData }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Export report data to CSV
  exportToCSV(reportData: any): string {
    if (!reportData.data || reportData.data.length === 0) {
      return ''
    }

    const headers = Object.keys(reportData.data[0])
    const csvContent = [
      headers.join(','),
      ...reportData.data.map((row: any) => 
        headers.map(header => {
          const value = row[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    return csvContent
  },

  // Generate PDF report (placeholder - would use a PDF library)
  async generatePDF(reportData: any): Promise<Blob> {
    // Mock PDF generation - in real implementation would use jsPDF or similar
    const content = `
      ${reportData.title}
      Period: ${reportData.period}
      Total Records: ${reportData.totalRecords || reportData.data?.length || 0}
      
      Generated on: ${new Date().toLocaleString()}
    `
    
    return new Blob([content], { type: 'application/pdf' })
  }
}