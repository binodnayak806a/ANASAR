export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hospitals: {
        Row: {
          id: string
          name: string
          registration_number: string
          type: string
          address: Json
          contact: Json
          license_info: Json
          settings: Json
          subscription: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          registration_number: string
          type: string
          address: Json
          contact: Json
          license_info: Json
          settings: Json
          subscription: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          registration_number?: string
          type?: string
          address?: Json
          contact?: Json
          license_info?: Json
          settings?: Json
          subscription?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string | null
          phone: string | null
          role: string
          hospital_id: string
          department_id: string | null
          employee_id: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          avatar_url?: string | null
          phone?: string | null
          role: string
          hospital_id: string
          department_id?: string | null
          employee_id?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          phone?: string | null
          role?: string
          hospital_id?: string
          department_id?: string | null
          employee_id?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          hospital_id: string
          patient_id: string
          uhid: string
          personal_info: Json
          contact_info: Json
          medical_info: Json
          insurance_info: Json | null
          emergency_contact: Json
          registration_date: string
          last_visit: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          patient_id: string
          uhid: string
          personal_info: Json
          contact_info: Json
          medical_info: Json
          insurance_info?: Json | null
          emergency_contact: Json
          registration_date: string
          last_visit?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          patient_id?: string
          uhid?: string
          personal_info?: Json
          contact_info?: Json
          medical_info?: Json
          insurance_info?: Json | null
          emergency_contact?: Json
          registration_date?: string
          last_visit?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          hospital_id: string
          name: string
          code: string
          description: string | null
          head_of_department: string | null
          location: string | null
          phone: string | null
          email: string | null
          services: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          name: string
          code: string
          description?: string | null
          head_of_department?: string | null
          location?: string | null
          phone?: string | null
          email?: string | null
          services: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          name?: string
          code?: string
          description?: string | null
          head_of_department?: string | null
          location?: string | null
          phone?: string | null
          email?: string | null
          services?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          hospital_id: string
          user_id: string
          employee_id: string
          department_id: string
          personal_info: Json
          professional_info: Json
          schedule: Json
          consultation_fee: number
          is_available: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          user_id: string
          employee_id: string
          department_id: string
          personal_info: Json
          professional_info: Json
          schedule: Json
          consultation_fee: number
          is_available?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          user_id?: string
          employee_id?: string
          department_id?: string
          personal_info?: Json
          professional_info?: Json
          schedule?: Json
          consultation_fee?: number
          is_available?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          hospital_id: string
          patient_id: string
          doctor_id: string
          department_id: string
          appointment_date: string
          appointment_time: string
          duration: number
          type: string
          status: string
          reason: string
          notes: string | null
          symptoms: Json | null
          vital_signs: Json | null
          diagnosis: string | null
          prescription: Json | null
          follow_up_date: string | null
          consultation_fee: number
          payment_status: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          patient_id: string
          doctor_id: string
          department_id: string
          appointment_date: string
          appointment_time: string
          duration: number
          type: string
          status: string
          reason: string
          notes?: string | null
          symptoms?: Json | null
          vital_signs?: Json | null
          diagnosis?: string | null
          prescription?: Json | null
          follow_up_date?: string | null
          consultation_fee: number
          payment_status: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          patient_id?: string
          doctor_id?: string
          department_id?: string
          appointment_date?: string
          appointment_time?: string
          duration?: number
          type?: string
          status?: string
          reason?: string
          notes?: string | null
          symptoms?: Json | null
          vital_signs?: Json | null
          diagnosis?: string | null
          prescription?: Json | null
          follow_up_date?: string | null
          consultation_fee?: number
          payment_status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      ipd_records: {
        Row: {
          id: string
          hospital_id: string
          patient_id: string
          admission_number: string
          admission_date: string
          discharge_date: string | null
          attending_doctor_id: string
          department_id: string
          room_number: string | null
          bed_number: string | null
          admission_type: string
          admission_reason: string
          diagnosis: Json
          treatment_plan: Json
          daily_notes: Json
          discharge_summary: string | null
          discharge_instructions: string | null
          status: string
          total_charges: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          patient_id: string
          admission_number: string
          admission_date: string
          discharge_date?: string | null
          attending_doctor_id: string
          department_id: string
          room_number?: string | null
          bed_number?: string | null
          admission_type: string
          admission_reason: string
          diagnosis: Json
          treatment_plan: Json
          daily_notes: Json
          discharge_summary?: string | null
          discharge_instructions?: string | null
          status: string
          total_charges: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          patient_id?: string
          admission_number?: string
          admission_date?: string
          discharge_date?: string | null
          attending_doctor_id?: string
          department_id?: string
          room_number?: string | null
          bed_number?: string | null
          admission_type?: string
          admission_reason?: string
          diagnosis?: Json
          treatment_plan?: Json
          daily_notes?: Json
          discharge_summary?: string | null
          discharge_instructions?: string | null
          status?: string
          total_charges?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          hospital_id: string
          patient_id: string
          doctor_id: string
          appointment_id: string | null
          ipd_record_id: string | null
          prescription_number: string
          prescription_date: string
          medications: Json
          instructions: string | null
          follow_up_date: string | null
          status: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          patient_id: string
          doctor_id: string
          appointment_id?: string | null
          ipd_record_id?: string | null
          prescription_number: string
          prescription_date: string
          medications: Json
          instructions?: string | null
          follow_up_date?: string | null
          status: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          patient_id?: string
          doctor_id?: string
          appointment_id?: string | null
          ipd_record_id?: string | null
          prescription_number?: string
          prescription_date?: string
          medications?: Json
          instructions?: string | null
          follow_up_date?: string | null
          status?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      bills: {
        Row: {
          id: string
          hospital_id: string
          patient_id: string
          bill_number: string
          bill_date: string
          bill_type: string
          appointment_id: string | null
          ipd_record_id: string | null
          items: Json
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          payment_status: string
          payment_method: string | null
          payment_date: string | null
          payment_reference: string | null
          insurance_claim: Json | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          patient_id: string
          bill_number: string
          bill_date: string
          bill_type: string
          appointment_id?: string | null
          ipd_record_id?: string | null
          items: Json
          subtotal: number
          tax_amount: number
          discount_amount: number
          total_amount: number
          payment_status: string
          payment_method?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          insurance_claim?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          patient_id?: string
          bill_number?: string
          bill_date?: string
          bill_type?: string
          appointment_id?: string | null
          ipd_record_id?: string | null
          items?: Json
          subtotal?: number
          tax_amount?: number
          discount_amount?: number
          total_amount?: number
          payment_status?: string
          payment_method?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          insurance_claim?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      rx_master: {
        Row: {
          id: string
          hospital_id: string
          medicine_name: string
          generic_name: string | null
          brand_name: string | null
          strength: string | null
          dosage_form: string
          manufacturer: string | null
          category: string | null
          unit_price: number | null
          common_dosages: Json
          common_instructions: Json
          contraindications: string | null
          side_effects: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          medicine_name: string
          generic_name?: string | null
          brand_name?: string | null
          strength?: string | null
          dosage_form: string
          manufacturer?: string | null
          category?: string | null
          unit_price?: number | null
          common_dosages: Json
          common_instructions: Json
          contraindications?: string | null
          side_effects?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          medicine_name?: string
          generic_name?: string | null
          brand_name?: string | null
          strength?: string | null
          dosage_form?: string
          manufacturer?: string | null
          category?: string | null
          unit_price?: number | null
          common_dosages?: Json
          common_instructions?: Json
          contraindications?: string | null
          side_effects?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      diagnosis_master: {
        Row: {
          id: string
          hospital_id: string
          icd_code: string | null
          diagnosis_name: string
          category: string | null
          description: string | null
          common_symptoms: Json
          common_treatments: Json
          severity_level: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          icd_code?: string | null
          diagnosis_name: string
          category?: string | null
          description?: string | null
          common_symptoms: Json
          common_treatments: Json
          severity_level?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          icd_code?: string | null
          diagnosis_name?: string
          category?: string | null
          description?: string | null
          common_symptoms?: Json
          common_treatments?: Json
          severity_level?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      investigation_master: {
        Row: {
          id: string
          hospital_id: string
          test_code: string
          test_name: string
          category: string
          department: string | null
          sample_type: string | null
          normal_range: string | null
          unit: string | null
          method: string | null
          cost: number
          duration_hours: number
          preparation_instructions: string | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          test_code: string
          test_name: string
          category: string
          department?: string | null
          sample_type?: string | null
          normal_range?: string | null
          unit?: string | null
          method?: string | null
          cost: number
          duration_hours: number
          preparation_instructions?: string | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          test_code?: string
          test_name?: string
          category?: string
          department?: string | null
          sample_type?: string | null
          normal_range?: string | null
          unit?: string | null
          method?: string | null
          cost?: number
          duration_hours?: number
          preparation_instructions?: string | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      advice_master: {
        Row: {
          id: string
          hospital_id: string
          advice_category: string
          advice_text: string
          applicable_conditions: Json
          department_specific: boolean
          department_id: string | null
          priority_order: number
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          advice_category: string
          advice_text: string
          applicable_conditions: Json
          department_specific?: boolean
          department_id?: string | null
          priority_order?: number
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          advice_category?: string
          advice_text?: string
          applicable_conditions?: Json
          department_specific?: boolean
          department_id?: string | null
          priority_order?: number
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          hospital_id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          old_values: Json | null
          new_values: Json | null
          ip_address: string
          user_agent: string
          created_at: string
        }
        Insert: {
          id?: string
          hospital_id: string
          user_id: string
          action: string
          resource_type: string
          resource_id: string
          old_values?: Json | null
          new_values?: Json | null
          ip_address: string
          user_agent: string
          created_at?: string
        }
        Update: {
          id?: string
          hospital_id?: string
          user_id?: string
          action?: string
          resource_type?: string
          resource_id?: string
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string
          user_agent?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}