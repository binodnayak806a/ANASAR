import { useState, useEffect, useCallback } from 'react';
import { patientStore } from '@/lib/offline/offlineStore';
import { useOffline } from '@/hooks/useOffline';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useOfflinePatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { isOnline } = useOffline();

  // Load patients
  const loadPatients = useCallback(async (hospitalId?: string) => {
    setLoading(true);
    try {
      if (isOnline && hospitalId) {
        // Online mode: fetch from Supabase
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('hospital_id', hospitalId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setPatients(data || []);
        
        // Cache patients for offline use
        if (data) {
          for (const patient of data) {
            await patientStore.save(patient);
          }
        }
      } else {
        // Offline mode: fetch from IndexedDB
        const offlinePatients = await patientStore.getAll();
        setPatients(offlinePatients);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error("Failed to load patients");
      
      // Fallback to offline data
      const offlinePatients = await patientStore.getAll();
      setPatients(offlinePatients);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  // Get patient by ID
  const getPatientById = useCallback(async (id: string): Promise<any | null> => {
    try {
      if (isOnline) {
        // Try online first
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          // Fallback to offline
          return await patientStore.getById(id) || null;
        }
        
        // Cache for offline use
        if (data) {
          await patientStore.save(data);
        }
        
        return data;
      } else {
        // Offline mode
        return await patientStore.getById(id) || null;
      }
    } catch (error) {
      console.error(`Error getting patient ${id}:`, error);
      
      // Fallback to offline
      return await patientStore.getById(id) || null;
    }
  }, [isOnline]);

  // Search patients
  const searchPatients = useCallback(async (query: string, hospitalId?: string): Promise<any[]> => {
    try {
      if (isOnline && hospitalId) {
        // Online mode: search via Supabase
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('hospital_id', hospitalId)
          .or(`patient_id.ilike.%${query}%,uhid.ilike.%${query}%,personal_info->>first_name.ilike.%${query}%,personal_info->>last_name.ilike.%${query}%`)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
      } else {
        // Offline mode: search in IndexedDB
        const allPatients = await patientStore.getAll();
        
        // Simple client-side search
        return allPatients.filter(patient => {
          const searchableText = [
            patient.patient_id,
            patient.uhid,
            patient.personal_info?.first_name,
            patient.personal_info?.last_name,
            patient.personal_info?.mobile
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchableText.includes(query.toLowerCase());
        });
      }
    } catch (error) {
      console.error('Error searching patients:', error);
      
      // Fallback to offline search
      const allPatients = await patientStore.getAll();
      
      return allPatients.filter(patient => {
        const searchableText = [
          patient.patient_id,
          patient.uhid,
          patient.personal_info?.first_name,
          patient.personal_info?.last_name,
          patient.personal_info?.mobile
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchableText.includes(query.toLowerCase());
      });
    }
  }, [isOnline]);

  // Save patient
  const savePatient = useCallback(async (patient: any, hospitalId?: string): Promise<string> => {
    try {
      if (isOnline && hospitalId) {
        // Online mode: save to Supabase
        const patientData = {
          ...patient,
          hospital_id: hospitalId,
          updated_at: new Date().toISOString()
        };
        
        if (patient.id) {
          // Update
          const { data, error } = await supabase
            .from('patients')
            .update(patientData)
            .eq('id', patient.id)
            .select()
            .single();
          
          if (error) throw error;
          
          // Cache for offline use
          if (data) {
            await patientStore.save(data);
          }
          
          return patient.id;
        } else {
          // Insert
          const { data, error } = await supabase
            .from('patients')
            .insert({
              ...patientData,
              registration_date: new Date().toISOString()
            })
            .select()
            .single();
          
          if (error) throw error;
          
          // Cache for offline use
          if (data) {
            await patientStore.save(data);
          }
          
          return data.id;
        }
      } else {
        // Offline mode: save to IndexedDB
        return await patientStore.save(patient);
      }
    } catch (error) {
      console.error('Error saving patient:', error);
      
      // Fallback to offline save
      toast("Offline Mode", {
        description: "Changes saved locally and will sync when online"
      });
      
      return await patientStore.save(patient);
    }
  }, [isOnline]);

  return {
    patients,
    loading,
    loadPatients,
    getPatientById,
    searchPatients,
    savePatient
  };
}