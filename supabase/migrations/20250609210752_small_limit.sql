/*
  # Hospital Management System Database Schema

  1. New Tables
    - `hospitals` - Hospital registration and configuration
    - `users` - System users with role-based access
    - `doctors` - Doctor profiles and professional information
    - `patients` - Patient records and personal information
    - `appointments` - Appointment scheduling and management
    - `ipd_records` - In-Patient Department records
    - `prescriptions` - Medical prescriptions
    - `bills` - Billing and payment records
    - `rx_master` - Prescription template master data
    - `diagnosis_master` - Diagnosis codes and descriptions
    - `investigation_master` - Investigation/test master data
    - `advice_master` - Medical advice templates

  2. Security
    - Enable RLS on all tables
    - Add policies for hospital_id-based tenant isolation
    - Ensure users can only access data from their hospital

  3. Features
    - Multi-tenant architecture with hospital_id isolation
    - Comprehensive audit trails
    - Role-based access control
    - Automatic timestamps and user tracking
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HOSPITALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  registration_number text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'private' CHECK (type IN ('government', 'private', 'trust', 'corporate')),
  address jsonb NOT NULL DEFAULT '{}',
  contact jsonb NOT NULL DEFAULT '{}',
  license_info jsonb NOT NULL DEFAULT '{}',
  settings jsonb NOT NULL DEFAULT '{}',
  subscription jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for hospitals
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- Hospitals can only be accessed by users belonging to that hospital
CREATE POLICY "Users can access their hospital data"
  ON hospitals
  FOR ALL
  TO authenticated
  USING (id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'hospital_admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'staff')),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  department_id uuid,
  employee_id text,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only access users from their hospital
CREATE POLICY "Users can access hospital users"
  ON users
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- DEPARTMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  head_of_department uuid REFERENCES users(id),
  location text,
  phone text,
  email text,
  services jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, code)
);

-- RLS for departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital departments access"
  ON departments
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- DOCTORS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id text NOT NULL,
  department_id uuid NOT NULL REFERENCES departments(id),
  personal_info jsonb NOT NULL DEFAULT '{}',
  professional_info jsonb NOT NULL DEFAULT '{}',
  schedule jsonb NOT NULL DEFAULT '{}',
  consultation_fee numeric(10,2) NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, employee_id)
);

-- RLS for doctors
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital doctors access"
  ON doctors
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- PATIENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id text NOT NULL,
  uhid text NOT NULL,
  personal_info jsonb NOT NULL DEFAULT '{}',
  contact_info jsonb NOT NULL DEFAULT '{}',
  medical_info jsonb NOT NULL DEFAULT '{}',
  insurance_info jsonb,
  emergency_contact jsonb NOT NULL DEFAULT '{}',
  registration_date timestamptz NOT NULL DEFAULT now(),
  last_visit timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, patient_id),
  UNIQUE(hospital_id, uhid)
);

-- RLS for patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital patients access"
  ON patients
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- APPOINTMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id),
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  duration integer NOT NULL DEFAULT 30,
  type text NOT NULL DEFAULT 'consultation' CHECK (type IN ('consultation', 'follow_up', 'emergency', 'procedure')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  reason text NOT NULL,
  notes text,
  symptoms jsonb,
  vital_signs jsonb,
  diagnosis text,
  prescription jsonb,
  follow_up_date date,
  consultation_fee numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital appointments access"
  ON appointments
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- IPD RECORDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ipd_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_number text NOT NULL,
  admission_date timestamptz NOT NULL DEFAULT now(),
  discharge_date timestamptz,
  attending_doctor_id uuid NOT NULL REFERENCES doctors(id),
  department_id uuid NOT NULL REFERENCES departments(id),
  room_number text,
  bed_number text,
  admission_type text NOT NULL DEFAULT 'planned' CHECK (admission_type IN ('emergency', 'planned', 'transfer')),
  admission_reason text NOT NULL,
  diagnosis jsonb NOT NULL DEFAULT '[]',
  treatment_plan jsonb NOT NULL DEFAULT '{}',
  daily_notes jsonb NOT NULL DEFAULT '[]',
  discharge_summary text,
  discharge_instructions text,
  status text NOT NULL DEFAULT 'admitted' CHECK (status IN ('admitted', 'discharged', 'transferred', 'deceased')),
  total_charges numeric(12,2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, admission_number)
);

-- RLS for IPD records
ALTER TABLE ipd_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital IPD records access"
  ON ipd_records
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- PRESCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  ipd_record_id uuid REFERENCES ipd_records(id),
  prescription_number text NOT NULL,
  prescription_date timestamptz NOT NULL DEFAULT now(),
  medications jsonb NOT NULL DEFAULT '[]',
  instructions text,
  follow_up_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, prescription_number)
);

-- RLS for prescriptions
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital prescriptions access"
  ON prescriptions
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- BILLS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  bill_date timestamptz NOT NULL DEFAULT now(),
  bill_type text NOT NULL DEFAULT 'opd' CHECK (bill_type IN ('opd', 'ipd', 'pharmacy', 'lab', 'procedure')),
  appointment_id uuid REFERENCES appointments(id),
  ipd_record_id uuid REFERENCES ipd_records(id),
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded')),
  payment_method text CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'insurance')),
  payment_date timestamptz,
  payment_reference text,
  insurance_claim jsonb,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, bill_number)
);

-- RLS for bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital bills access"
  ON bills
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- RX MASTER TABLE (Prescription Templates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS rx_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  generic_name text,
  brand_name text,
  strength text,
  dosage_form text NOT NULL CHECK (dosage_form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'other')),
  manufacturer text,
  category text,
  unit_price numeric(10,2),
  common_dosages jsonb NOT NULL DEFAULT '[]',
  common_instructions jsonb NOT NULL DEFAULT '[]',
  contraindications text,
  side_effects text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for rx_master
ALTER TABLE rx_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital rx_master access"
  ON rx_master
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- DIAGNOSIS MASTER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS diagnosis_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  icd_code text,
  diagnosis_name text NOT NULL,
  category text,
  description text,
  common_symptoms jsonb NOT NULL DEFAULT '[]',
  common_treatments jsonb NOT NULL DEFAULT '[]',
  severity_level text CHECK (severity_level IN ('mild', 'moderate', 'severe', 'critical')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for diagnosis_master
ALTER TABLE diagnosis_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital diagnosis_master access"
  ON diagnosis_master
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- INVESTIGATION MASTER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS investigation_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  test_code text NOT NULL,
  test_name text NOT NULL,
  category text NOT NULL,
  department text,
  sample_type text,
  normal_range text,
  unit text,
  method text,
  cost numeric(10,2) NOT NULL DEFAULT 0,
  duration_hours integer NOT NULL DEFAULT 24,
  preparation_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(hospital_id, test_code)
);

-- RLS for investigation_master
ALTER TABLE investigation_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital investigation_master access"
  ON investigation_master
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- ADVICE MASTER TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS advice_master (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  advice_category text NOT NULL,
  advice_text text NOT NULL,
  applicable_conditions jsonb NOT NULL DEFAULT '[]',
  department_specific boolean NOT NULL DEFAULT false,
  department_id uuid REFERENCES departments(id),
  priority_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for advice_master
ALTER TABLE advice_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital advice_master access"
  ON advice_master
  FOR ALL
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- AUDIT LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital audit_logs access"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- Only allow INSERT for audit logs (no UPDATE/DELETE)
CREATE POLICY "Hospital audit_logs insert"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (hospital_id = (auth.jwt() ->> 'hospital_id')::uuid);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Departments indexes
CREATE INDEX IF NOT EXISTS idx_departments_hospital_id ON departments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(hospital_id, code);

-- Doctors indexes
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_department_id ON doctors(department_id);

-- Patients indexes
CREATE INDEX IF NOT EXISTS idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_uhid ON patients(hospital_id, uhid);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- IPD records indexes
CREATE INDEX IF NOT EXISTS idx_ipd_records_hospital_id ON ipd_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ipd_records_patient_id ON ipd_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_ipd_records_admission_number ON ipd_records(hospital_id, admission_number);

-- Prescriptions indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital_id ON prescriptions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON prescriptions(doctor_id);

-- Bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_hospital_id ON bills(hospital_id);
CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(hospital_id, bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills(payment_status);

-- Master data indexes
CREATE INDEX IF NOT EXISTS idx_rx_master_hospital_id ON rx_master(hospital_id);
CREATE INDEX IF NOT EXISTS idx_rx_master_medicine_name ON rx_master(medicine_name);
CREATE INDEX IF NOT EXISTS idx_diagnosis_master_hospital_id ON diagnosis_master(hospital_id);
CREATE INDEX IF NOT EXISTS idx_investigation_master_hospital_id ON investigation_master(hospital_id);
CREATE INDEX IF NOT EXISTS idx_investigation_master_test_code ON investigation_master(hospital_id, test_code);
CREATE INDEX IF NOT EXISTS idx_advice_master_hospital_id ON advice_master(hospital_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ipd_records_updated_at BEFORE UPDATE ON ipd_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rx_master_updated_at BEFORE UPDATE ON rx_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diagnosis_master_updated_at BEFORE UPDATE ON diagnosis_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investigation_master_updated_at BEFORE UPDATE ON investigation_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_advice_master_updated_at BEFORE UPDATE ON advice_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS (Additional)
-- =============================================================================

-- Add foreign key for department head
ALTER TABLE departments 
ADD CONSTRAINT fk_departments_head_of_department 
FOREIGN KEY (head_of_department) REFERENCES users(id);

-- Add foreign key for users department
ALTER TABLE users 
ADD CONSTRAINT fk_users_department_id 
FOREIGN KEY (department_id) REFERENCES departments(id);

-- =============================================================================
-- SAMPLE DATA INSERTION (Optional - for testing)
-- =============================================================================

-- Insert sample hospital (for testing)
INSERT INTO hospitals (id, name, registration_number, type, address, contact, license_info, settings, subscription)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Apollo Medical Center',
  'REG001',
  'private',
  '{"street": "123 Medical Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001"}',
  '{"phone": "+91-22-12345678", "email": "info@apollo.com", "website": "www.apollo.com"}',
  '{"license_number": "LIC001", "valid_until": "2025-12-31"}',
  '{"timezone": "Asia/Kolkata", "currency": "INR"}',
  '{"plan": "premium", "valid_until": "2025-12-31", "max_users": 100}'
) ON CONFLICT (id) DO NOTHING;