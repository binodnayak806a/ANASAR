import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { useAuthStore } from '@/store/auth'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Types for better type safety
type Tables = Database['public']['Tables']
type TableName = keyof Tables
type TableRow<T extends TableName> = Tables[T]['Row']
type TableInsert<T extends TableName> = Tables[T]['Insert']
type TableUpdate<T extends TableName> = Tables[T]['Update']

// Result type for consistent error handling
export interface ServiceResult<T = any> {
  data?: T
  error?: string
  success: boolean
}

// Get current hospital ID from auth store
const getCurrentHospitalId = (): string | null => {
  const { hospitalId } = useAuthStore.getState()
  return hospitalId
}

// Get current user ID from auth store
const getCurrentUserId = (): string | null => {
  const { user } = useAuthStore.getState()
  return user?.id || null
}

/**
 * Higher-order function that automatically injects hospital_id filter for tenant isolation
 * @param query - Supabase query builder
 * @param hospitalId - Optional hospital ID (uses current user's hospital if not provided)
 */
export function withTenant<T>(
  query: any,
  hospitalId?: string
): any {
  const tenantId = hospitalId || getCurrentHospitalId()
  
  if (!tenantId) {
    throw new Error('Hospital ID is required for tenant isolation')
  }
  
  return query.eq('hospital_id', tenantId)
}

/**
 * Enhanced query builder with automatic tenant isolation
 */
export class TenantQueryBuilder {
  private hospitalId: string

  constructor(hospitalId?: string) {
    this.hospitalId = hospitalId || getCurrentHospitalId() || ''
    if (!this.hospitalId) {
      throw new Error('Hospital ID is required for tenant operations')
    }
  }

  // Generic select with tenant isolation
  select<T extends TableName>(table: T) {
    return withTenant(supabase.from(table).select('*'), this.hospitalId)
  }

  // Generic insert with automatic hospital_id injection
  insert<T extends TableName>(table: T, data: Omit<TableInsert<T>, 'hospital_id'> | Omit<TableInsert<T>, 'hospital_id'>[]) {
    const insertData = Array.isArray(data) 
      ? data.map(item => ({ ...item, hospital_id: this.hospitalId }))
      : { ...data, hospital_id: this.hospitalId }
    
    return supabase.from(table).insert(insertData as any)
  }

  // Generic update with tenant isolation
  update<T extends TableName>(table: T, data: TableUpdate<T>) {
    return withTenant(supabase.from(table).update(data), this.hospitalId)
  }

  // Generic delete with tenant isolation
  delete<T extends TableName>(table: T) {
    return withTenant(supabase.from(table).delete(), this.hospitalId)
  }
}

// Create tenant-aware query builder instance
export const createTenantQuery = (hospitalId?: string) => new TenantQueryBuilder(hospitalId)

// =============================================================================
// PATIENT OPERATIONS
// =============================================================================

export const patientService = {
  // Get all patients for current hospital
  async getPatients(hospitalId?: string): Promise<ServiceResult<TableRow<'patients'>[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('patients')
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get patient by ID
  async getPatientById(id: string, hospitalId?: string): Promise<ServiceResult<TableRow<'patients'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('patients')
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Search patients
  async searchPatients(searchTerm: string, hospitalId?: string): Promise<ServiceResult<TableRow<'patients'>[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('patients')
        .or(`patient_id.ilike.%${searchTerm}%,uhid.ilike.%${searchTerm}%,personal_info->>first_name.ilike.%${searchTerm}%,personal_info->>last_name.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Add new patient
  async addPatient(patientData: Omit<TableInsert<'patients'>, 'hospital_id' | 'id' | 'created_at' | 'updated_at'>, hospitalId?: string): Promise<ServiceResult<TableRow<'patients'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.insert('patients', {
        ...patientData,
        registration_date: new Date().toISOString(),
        is_active: true
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Update patient
  async updatePatient(id: string, patientData: TableUpdate<'patients'>, hospitalId?: string): Promise<ServiceResult<TableRow<'patients'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.update('patients', {
        ...patientData,
        updated_at: new Date().toISOString()
      })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Delete patient (soft delete)
  async deletePatient(id: string, hospitalId?: string): Promise<ServiceResult<void>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { error } = await query.update('patients', {
        is_active: false,
        updated_at: new Date().toISOString()
      })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// =============================================================================
// APPOINTMENT OPERATIONS
// =============================================================================

export const appointmentService = {
  // Get all appointments for current hospital
  async getAppointments(hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('appointments')
        .select(`
          *,
          patients (
            id,
            patient_id,
            uhid,
            personal_info
          ),
          doctors (
            id,
            employee_id,
            personal_info,
            users (
              full_name
            )
          )
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get appointments by date
  async getAppointmentsByDate(date: string, hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('appointments')
        .select(`
          *,
          patients (
            id,
            patient_id,
            uhid,
            personal_info
          ),
          doctors (
            id,
            employee_id,
            personal_info,
            users (
              full_name
            )
          )
        `)
        .eq('appointment_date', date)
        .order('appointment_time', { ascending: true })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get appointments by patient
  async getAppointmentsByPatient(patientId: string, hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('appointments')
        .select(`
          *,
          doctors (
            id,
            employee_id,
            personal_info,
            users (
              full_name
            )
          )
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Add new appointment
  async addAppointment(appointmentData: Omit<TableInsert<'appointments'>, 'hospital_id' | 'id' | 'created_at' | 'updated_at'>, hospitalId?: string): Promise<ServiceResult<TableRow<'appointments'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const currentUserId = getCurrentUserId()
      
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await query.insert('appointments', {
        ...appointmentData,
        created_by: currentUserId,
        payment_status: appointmentData.payment_status || 'pending'
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Update appointment
  async updateAppointment(id: string, appointmentData: TableUpdate<'appointments'>, hospitalId?: string): Promise<ServiceResult<TableRow<'appointments'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.update('appointments', {
        ...appointmentData,
        updated_at: new Date().toISOString()
      })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Cancel appointment
  async cancelAppointment(id: string, hospitalId?: string): Promise<ServiceResult<void>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { error } = await query.update('appointments', {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// =============================================================================
// DOCTOR OPERATIONS
// =============================================================================

export const doctorService = {
  // Get all doctors for current hospital
  async getDoctors(hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('doctors')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            is_active
          ),
          departments (
            id,
            name,
            code
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get doctor by ID
  async getDoctorById(id: string, hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('doctors')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone,
            is_active
          ),
          departments (
            id,
            name,
            code
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get doctors by department
  async getDoctorsByDepartment(departmentId: string, hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('doctors')
        .select(`
          *,
          users (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('department_id', departmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Add new doctor
  async addDoctor(doctorData: Omit<TableInsert<'doctors'>, 'hospital_id' | 'id' | 'created_at' | 'updated_at'>, hospitalId?: string): Promise<ServiceResult<TableRow<'doctors'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.insert('doctors', {
        ...doctorData,
        is_available: true,
        is_active: true
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Update doctor
  async updateDoctor(id: string, doctorData: TableUpdate<'doctors'>, hospitalId?: string): Promise<ServiceResult<TableRow<'doctors'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.update('doctors', {
        ...doctorData,
        updated_at: new Date().toISOString()
      })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// =============================================================================
// DEPARTMENT OPERATIONS
// =============================================================================

export const departmentService = {
  // Get all departments for current hospital
  async getDepartments(hospitalId?: string): Promise<ServiceResult<TableRow<'departments'>[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('departments')
        .order('name', { ascending: true })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Add new department
  async addDepartment(departmentData: Omit<TableInsert<'departments'>, 'hospital_id' | 'id' | 'created_at' | 'updated_at'>, hospitalId?: string): Promise<ServiceResult<TableRow<'departments'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.insert('departments', {
        ...departmentData,
        is_active: true
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// =============================================================================
// IPD OPERATIONS
// =============================================================================

export const ipdService = {
  // Get all IPD records for current hospital
  async getIPDRecords(hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('ipd_records')
        .select(`
          *,
          patients (
            id,
            patient_id,
            uhid,
            personal_info,
            contact_info
          ),
          doctors (
            id,
            employee_id,
            personal_info,
            users (
              full_name
            )
          )
        `)
        .order('admission_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Get IPD record by ID
  async getIPDRecordById(id: string, hospitalId?: string): Promise<ServiceResult<any>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('ipd_records')
        .select(`
          *,
          patients (
            id,
            patient_id,
            uhid,
            personal_info,
            contact_info
          ),
          doctors (
            id,
            employee_id,
            personal_info,
            users (
              full_name
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Add new IPD record
  async addIPDRecord(ipdData: Omit<TableInsert<'ipd_records'>, 'hospital_id' | 'id' | 'created_at' | 'updated_at'>, hospitalId?: string): Promise<ServiceResult<TableRow<'ipd_records'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const currentUserId = getCurrentUserId()
      
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await query.insert('ipd_records', {
        ...ipdData,
        created_by: currentUserId
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Update IPD record
  async updateIPDRecord(id: string, ipdData: TableUpdate<'ipd_records'>, hospitalId?: string): Promise<ServiceResult<TableRow<'ipd_records'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.update('ipd_records', {
        ...ipdData,
        updated_at: new Date().toISOString()
      })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Discharge patient
  async dischargePatient(id: string, dischargeData: any, hospitalId?: string): Promise<ServiceResult<void>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { error } = await query.update('ipd_records', {
        status: 'discharged',
        discharge_date: new Date().toISOString(),
        discharge_summary: dischargeData.discharge_summary,
        discharge_instructions: dischargeData.discharge_instructions,
        updated_at: new Date().toISOString()
      })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// =============================================================================
// BILLING OPERATIONS
// =============================================================================

export const billingService = {
  // Get all bills for current hospital
  async getBills(hospitalId?: string): Promise<ServiceResult<any[]>> {
    try {
      const query = createTenantQuery(hospitalId)
      const { data, error } = await query.select('bills')
        .select(`
          *,
          patients (
            id,
            patient_id,
            uhid,
            personal_info
          )
        `)
        .order('bill_date', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  },

  // Add new bill
  async addBill(billData: Omit<TableInsert<'bills'>, 'hospital_id' | 'id' | 'created_at' | 'updated_at'>, hospitalId?: string): Promise<ServiceResult<TableRow<'bills'>>> {
    try {
      const query = createTenantQuery(hospitalId)
      const currentUserId = getCurrentUserId()
      
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await query.insert('bills', {
        ...billData,
        created_by: currentUserId
      }).select().single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// =============================================================================
// REAL-TIME SUBSCRIPTIONS
// =============================================================================

export const realtimeService = {
  // Subscribe to table changes with tenant isolation
  subscribeToTable<T extends TableName>(
    table: T,
    callback: (payload: any) => void,
    hospitalId?: string
  ) {
    const tenantId = hospitalId || getCurrentHospitalId()
    
    if (!tenantId) {
      throw new Error('Hospital ID is required for real-time subscriptions')
    }

    return supabase
      .channel(`${table}_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `hospital_id=eq.${tenantId}`
        },
        callback
      )
      .subscribe()
  },

  // Unsubscribe from channel
  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription)
  }
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

export const auditService = {
  // Log user action
  async logAction(
    action: string,
    resourceType: string,
    resourceId: string,
    oldValues?: any,
    newValues?: any,
    hospitalId?: string
  ): Promise<ServiceResult<void>> {
    try {
      const currentUserId = getCurrentUserId()
      
      if (!currentUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      const query = createTenantQuery(hospitalId)
      const { error } = await query.insert('audit_logs', {
        user_id: currentUserId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: 'unknown', // You might want to get this from the client
        user_agent: navigator.userAgent
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

// Export the main supabase client for direct use when needed
export default supabase