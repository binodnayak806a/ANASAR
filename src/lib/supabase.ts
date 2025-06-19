import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
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

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  resetPassword: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email)
  },

  updatePassword: async (password: string) => {
    return await supabase.auth.updateUser({ password })
  },

  getSession: async () => {
    return await supabase.auth.getSession()
  },

  getUser: async () => {
    return await supabase.auth.getUser()
  }
}

// Database helpers with RLS
export const db = {
  // Generic CRUD operations with hospital_id filtering
  select: <T>(table: string) => {
    return supabase.from(table).select('*') as any
  },

  insert: <T>(table: string, data: any) => {
    return supabase.from(table).insert(data) as any
  },

  update: <T>(table: string, data: any) => {
    return supabase.from(table).update(data) as any
  },

  delete: <T>(table: string) => {
    return supabase.from(table).delete() as any
  },

  // Specific table operations
  hospitals: {
    getById: (id: string) => 
      supabase.from('hospitals').select('*').eq('id', id).single(),
    
    create: (data: any) => 
      supabase.from('hospitals').insert(data).select().single(),
    
    update: (id: string, data: any) => 
      supabase.from('hospitals').update(data).eq('id', id).select().single(),
    
    delete: (id: string) => 
      supabase.from('hospitals').delete().eq('id', id)
  },

  users: {
    getByHospital: (hospitalId: string) => 
      supabase.from('users').select('*').eq('hospital_id', hospitalId),
    
    getById: (id: string) => 
      supabase.from('users').select('*').eq('id', id).single(),
    
    create: (data: any) => 
      supabase.from('users').insert(data).select().single(),
    
    update: (id: string, data: any) => 
      supabase.from('users').update(data).eq('id', id).select().single(),
    
    delete: (id: string) => 
      supabase.from('users').delete().eq('id', id)
  },

  patients: {
    getByHospital: (hospitalId: string) => 
      supabase.from('patients').select('*').eq('hospital_id', hospitalId),
    
    getById: (id: string) => 
      supabase.from('patients').select('*').eq('id', id).single(),
    
    create: (data: any) => 
      supabase.from('patients').insert(data).select().single(),
    
    update: (id: string, data: any) => 
      supabase.from('patients').update(data).eq('id', id).select().single(),
    
    delete: (id: string) => 
      supabase.from('patients').delete().eq('id', id),
    
    search: (hospitalId: string, query: string) => 
      supabase.from('patients')
        .select('*')
        .eq('hospital_id', hospitalId)
        .or(`personal_info->>first_name.ilike.%${query}%,personal_info->>last_name.ilike.%${query}%,patient_id.ilike.%${query}%,uhid.ilike.%${query}%`)
  },

  appointments: {
    getByHospital: (hospitalId: string) => 
      supabase.from('appointments').select('*, patients(*), doctors(*)').eq('hospital_id', hospitalId),
    
    getById: (id: string) => 
      supabase.from('appointments').select('*, patients(*), doctors(*)').eq('id', id).single(),
    
    getByPatient: (patientId: string) => 
      supabase.from('appointments').select('*, doctors(*)').eq('patient_id', patientId),
    
    getByDoctor: (doctorId: string) => 
      supabase.from('appointments').select('*, patients(*)').eq('doctor_id', doctorId),
    
    getByDate: (hospitalId: string, date: string) => 
      supabase.from('appointments')
        .select('*, patients(*), doctors(*)')
        .eq('hospital_id', hospitalId)
        .eq('appointment_date', date),
    
    create: (data: any) => 
      supabase.from('appointments').insert(data).select().single(),
    
    update: (id: string, data: any) => 
      supabase.from('appointments').update(data).eq('id', id).select().single(),
    
    delete: (id: string) => 
      supabase.from('appointments').delete().eq('id', id)
  },

  departments: {
    getByHospital: (hospitalId: string) => 
      supabase.from('departments').select('*').eq('hospital_id', hospitalId),
    
    getById: (id: string) => 
      supabase.from('departments').select('*').eq('id', id).single(),
    
    create: (data: any) => 
      supabase.from('departments').insert(data).select().single(),
    
    update: (id: string, data: any) => 
      supabase.from('departments').update(data).eq('id', id).select().single(),
    
    delete: (id: string) => 
      supabase.from('departments').delete().eq('id', id)
  },

  doctors: {
    getByHospital: (hospitalId: string) => 
      supabase.from('doctors').select('*, users(*), departments(*)').eq('hospital_id', hospitalId),
    
    getById: (id: string) => 
      supabase.from('doctors').select('*, users(*), departments(*)').eq('id', id).single(),
    
    getByDepartment: (departmentId: string) => 
      supabase.from('doctors').select('*, users(*)').eq('department_id', departmentId),
    
    create: (data: any) => 
      supabase.from('doctors').insert(data).select().single(),
    
    update: (id: string, data: any) => 
      supabase.from('doctors').update(data).eq('id', id).select().single(),
    
    delete: (id: string) => 
      supabase.from('doctors').delete().eq('id', id)
  }
}

// Storage helpers
export const storage = {
  upload: async (bucket: string, path: string, file: File) => {
    return await supabase.storage.from(bucket).upload(path, file)
  },

  download: async (bucket: string, path: string) => {
    return await supabase.storage.from(bucket).download(path)
  },

  getPublicUrl: (bucket: string, path: string) => {
    return supabase.storage.from(bucket).getPublicUrl(path)
  },

  delete: async (bucket: string, paths: string[]) => {
    return await supabase.storage.from(bucket).remove(paths)
  }
}

// Real-time subscriptions
export const realtime = {
  subscribe: (table: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe()
  },

  unsubscribe: (subscription: any) => {
    return supabase.removeChannel(subscription)
  }
}