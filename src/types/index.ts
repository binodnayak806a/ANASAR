// Core types for Aarogya Sahayak HMS
export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  license_number: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  hospital_id: string;
  email: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist';
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  hospital_id: string;
  patient_id: string; // Hospital-specific patient ID
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  aadhaar_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  hospital_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}