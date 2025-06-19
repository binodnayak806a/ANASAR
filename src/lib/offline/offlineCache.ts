import { supabase } from '@/lib/supabase';
import { patientStore, consultationStore, prescriptionStore } from './offlineStore';
import { networkStatus } from './networkStatus';

// Cache configuration
interface CacheConfig {
  maxPatients: number;
  maxConsultationsPerPatient: number;
  maxPrescriptionsPerPatient: number;
  cacheExpiry: number; // in milliseconds
}

// Default cache configuration
const defaultCacheConfig: CacheConfig = {
  maxPatients: 100,
  maxConsultationsPerPatient: 10,
  maxPrescriptionsPerPatient: 20,
  cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Offline cache service
export class OfflineCache {
  private config: CacheConfig;
  private isCaching: boolean = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultCacheConfig, ...config };
  }

  // Cache essential data for offline use
  async cacheEssentialData(hospitalId: string): Promise<void> {
    if (this.isCaching || !networkStatus.isOnline()) {
      return;
    }

    try {
      this.isCaching = true;
      
      // Cache recent patients
      await this.cacheRecentPatients(hospitalId);
      
      // Cache active consultations
      await this.cacheActiveConsultations(hospitalId);
      
      // Cache recent prescriptions
      await this.cacheRecentPrescriptions(hospitalId);
      
    } catch (error) {
      console.error('Error caching essential data:', error);
    } finally {
      this.isCaching = false;
    }
  }

  // Cache recent patients
  private async cacheRecentPatients(hospitalId: string): Promise<void> {
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('last_visit', { ascending: false })
      .limit(this.config.maxPatients);
    
    if (error) {
      throw error;
    }
    
    if (patients && patients.length > 0) {
      for (const patient of patients) {
        await patientStore.save(patient);
      }
    }
  }

  // Cache active consultations
  private async cacheActiveConsultations(hospitalId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (
          id,
          patient_id,
          uhid,
          personal_info
        )
      `)
      .eq('hospital_id', hospitalId)
      .eq('appointment_date', today)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .order('appointment_time', { ascending: true });
    
    if (error) {
      throw error;
    }
    
    if (appointments && appointments.length > 0) {
      for (const appointment of appointments) {
        // Cache patient data
        if (appointment.patients) {
          await patientStore.save(appointment.patients);
        }
        
        // Cache consultation data
        const consultationData = {
          id: appointment.id,
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          doctorId: appointment.doctor_id,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          reason: appointment.reason,
          symptoms: appointment.symptoms || {},
          vitalSigns: appointment.vital_signs || {},
          diagnosis: appointment.diagnosis || '',
          notes: appointment.notes || '',
          isDraft: true,
          synced: true
        };
        
        await consultationStore.save(consultationData);
      }
    }
  }

  // Cache recent prescriptions
  private async cacheRecentPrescriptions(hospitalId: string): Promise<void> {
    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('prescription_date', { ascending: false })
      .limit(this.config.maxPrescriptionsPerPatient);
    
    if (error) {
      throw error;
    }
    
    if (prescriptions && prescriptions.length > 0) {
      for (const prescription of prescriptions) {
        await prescriptionStore.save({
          ...prescription,
          isDraft: false,
          synced: true
        });
      }
    }
  }

  // Cache patient data
  async cachePatient(patientId: string): Promise<void> {
    if (!networkStatus.isOnline()) {
      return;
    }
    
    try {
      // Fetch patient data
      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (patient) {
        await patientStore.save(patient);
        
        // Cache patient's recent consultations
        await this.cachePatientConsultations(patientId);
        
        // Cache patient's recent prescriptions
        await this.cachePatientPrescriptions(patientId);
      }
    } catch (error) {
      console.error(`Error caching patient ${patientId}:`, error);
    }
  }

  // Cache patient's consultations
  private async cachePatientConsultations(patientId: string): Promise<void> {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .limit(this.config.maxConsultationsPerPatient);
    
    if (error) {
      throw error;
    }
    
    if (appointments && appointments.length > 0) {
      for (const appointment of appointments) {
        const consultationData = {
          id: appointment.id,
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          doctorId: appointment.doctor_id,
          appointmentDate: appointment.appointment_date,
          appointmentTime: appointment.appointment_time,
          reason: appointment.reason,
          symptoms: appointment.symptoms || {},
          vitalSigns: appointment.vital_signs || {},
          diagnosis: appointment.diagnosis || '',
          notes: appointment.notes || '',
          isDraft: false,
          synced: true
        };
        
        await consultationStore.save(consultationData);
      }
    }
  }

  // Cache patient's prescriptions
  private async cachePatientPrescriptions(patientId: string): Promise<void> {
    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('prescription_date', { ascending: false })
      .limit(this.config.maxPrescriptionsPerPatient);
    
    if (error) {
      throw error;
    }
    
    if (prescriptions && prescriptions.length > 0) {
      for (const prescription of prescriptions) {
        await prescriptionStore.save({
          ...prescription,
          isDraft: false,
          synced: true
        });
      }
    }
  }

  // Clean expired cache
  async cleanExpiredCache(): Promise<void> {
    const expiryThreshold = Date.now() - this.config.cacheExpiry;
    
    try {
      const db = await getOfflineDB();
      
      // Get all patients
      const patients = await db.getAll('patients');
      
      for (const patient of patients) {
        // Skip unsynced items
        if (!patient.synced) continue;
        
        // Remove if expired
        if (patient.updatedAt < expiryThreshold) {
          await db.delete('patients', patient.id);
        }
      }
      
      // Clean consultations
      const consultations = await db.getAll('consultations');
      
      for (const consultation of consultations) {
        // Skip unsynced and draft items
        if (!consultation.synced || consultation.isDraft) continue;
        
        // Remove if expired
        if (consultation.updatedAt < expiryThreshold) {
          await db.delete('consultations', consultation.id);
        }
      }
      
      // Clean prescriptions
      const prescriptions = await db.getAll('prescriptions');
      
      for (const prescription of prescriptions) {
        // Skip unsynced and draft items
        if (!prescription.synced || prescription.isDraft) continue;
        
        // Remove if expired
        if (prescription.updatedAt < expiryThreshold) {
          await db.delete('prescriptions', prescription.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning expired cache:', error);
    }
  }

  // Get cache stats
  async getCacheStats(): Promise<{
    patients: number;
    consultations: number;
    prescriptions: number;
    syncQueue: number;
    totalSize: string;
  }> {
    const db = await getOfflineDB();
    
    const patients = await db.count('patients');
    const consultations = await db.count('consultations');
    const prescriptions = await db.count('prescriptions');
    const syncQueue = await db.count('syncQueue');
    
    // Estimate total size (rough approximation)
    const totalSizeBytes = (patients * 5000) + (consultations * 10000) + (prescriptions * 8000) + (syncQueue * 2000);
    const totalSize = this.formatBytes(totalSizeBytes);
    
    return {
      patients,
      consultations,
      prescriptions,
      syncQueue,
      totalSize
    };
  }

  // Format bytes to human-readable size
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
export const offlineCache = new OfflineCache();

// Function to get IndexedDB from the global context
function getOfflineDB() {
  return import('./db').then(module => module.getOfflineDB());
}