import { useState, useEffect, useCallback } from 'react';
import { consultationStore } from '@/lib/offline/offlineStore';
import { useOffline } from '@/hooks/useOffline';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export function useOfflineConsultations() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { isOnline } = useOffline();

  // Load consultations for a patient
  const loadPatientConsultations = useCallback(async (patientId: string, hospitalId?: string) => {
    setLoading(true);
    try {
      if (isOnline && hospitalId) {
        // Online mode: fetch from Supabase
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            doctors (
              id,
              employee_id,
              users (
                full_name
              )
            )
          `)
          .eq('hospital_id', hospitalId)
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });
        
        if (error) throw error;
        
        setConsultations(data || []);
        
        // Cache consultations for offline use
        if (data) {
          for (const appointment of data) {
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
              synced: true,
              doctorName: appointment.doctors?.users?.full_name
            };
            
            await consultationStore.save(consultationData);
          }
        }
        
        // Load drafts from IndexedDB
        const draftConsultations = await consultationStore.getByIndex('by-draft', true);
        const patientDrafts = draftConsultations.filter(draft => draft.patientId === patientId);
        setDrafts(patientDrafts);
      } else {
        // Offline mode: fetch from IndexedDB
        const offlineConsultations = await consultationStore.getByPatient(patientId);
        
        // Split into drafts and regular consultations
        const regularConsultations = offlineConsultations.filter(c => !c.isDraft);
        const draftConsultations = offlineConsultations.filter(c => c.isDraft);
        
        setConsultations(regularConsultations);
        setDrafts(draftConsultations);
      }
    } catch (error) {
      console.error('Error loading consultations:', error);
      toast.error("Failed to load consultations");
      
      // Fallback to offline data
      const offlineConsultations = await consultationStore.getByPatient(patientId);
      
      // Split into drafts and regular consultations
      const regularConsultations = offlineConsultations.filter(c => !c.isDraft);
      const draftConsultations = offlineConsultations.filter(c => c.isDraft);
      
      setConsultations(regularConsultations);
      setDrafts(draftConsultations);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  // Get consultation by ID
  const getConsultationById = useCallback(async (id: string): Promise<any | null> => {
    try {
      if (isOnline) {
        // Try online first
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            doctors (
              id,
              employee_id,
              users (
                full_name
              )
            )
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          // Fallback to offline
          return await consultationStore.getById(id) || null;
        }
        
        // Transform to consultation format
        const consultationData = {
          id: data.id,
          appointmentId: data.id,
          patientId: data.patient_id,
          doctorId: data.doctor_id,
          appointmentDate: data.appointment_date,
          appointmentTime: data.appointment_time,
          reason: data.reason,
          symptoms: data.symptoms || {},
          vitalSigns: data.vital_signs || {},
          diagnosis: data.diagnosis || '',
          notes: data.notes || '',
          isDraft: false,
          synced: true,
          doctorName: data.doctors?.users?.full_name
        };
        
        // Cache for offline use
        await consultationStore.save(consultationData);
        
        return consultationData;
      } else {
        // Offline mode
        return await consultationStore.getById(id) || null;
      }
    } catch (error) {
      console.error(`Error getting consultation ${id}:`, error);
      
      // Fallback to offline
      return await consultationStore.getById(id) || null;
    }
  }, [isOnline]);

  // Save consultation
  const saveConsultation = useCallback(async (consultation: any, hospitalId?: string): Promise<string> => {
    try {
      // Prepare consultation data
      const now = new Date().toISOString();
      const consultationId = consultation.id || uuidv4();
      const isDraft = consultation.isDraft === undefined ? true : consultation.isDraft;
      
      if (isOnline && hospitalId && !isDraft) {
        // Online mode and not a draft: save to Supabase
        const appointmentData = {
          id: consultation.appointmentId || consultationId,
          hospital_id: hospitalId,
          patient_id: consultation.patientId,
          doctor_id: consultation.doctorId,
          symptoms: consultation.symptoms || {},
          vital_signs: consultation.vitalSigns || {},
          diagnosis: consultation.diagnosis || '',
          notes: consultation.notes || '',
          updated_at: now
        };
        
        if (consultation.appointmentId) {
          // Update existing appointment
          const { error } = await supabase
            .from('appointments')
            .update(appointmentData)
            .eq('id', consultation.appointmentId);
          
          if (error) throw error;
        } else {
          // This is a new consultation without an appointment
          // In a real app, you might want to create an appointment or handle differently
          console.warn('Creating consultation without appointment');
        }
        
        // Save to IndexedDB as well
        const offlineData = {
          ...consultation,
          id: consultationId,
          updatedAt: Date.now(),
          isDraft,
          synced: true
        };
        
        await consultationStore.save(offlineData);
        
        return consultationId;
      } else {
        // Offline mode or draft: save to IndexedDB only
        const offlineData = {
          ...consultation,
          id: consultationId,
          updatedAt: Date.now(),
          isDraft,
          synced: false
        };
        
        if (!isOnline) {
          toast("Offline Mode", {
            description: "Consultation saved locally and will sync when online"
          });
        }
        
        return await consultationStore.save(offlineData);
      }
    } catch (error) {
      console.error('Error saving consultation:', error);
      
      // Fallback to offline save
      toast("Offline Save", {
        description: "Consultation saved locally and will sync when online"
      });
      
      const consultationId = consultation.id || uuidv4();
      const offlineData = {
        ...consultation,
        id: consultationId,
        updatedAt: Date.now(),
        isDraft: consultation.isDraft === undefined ? true : consultation.isDraft,
        synced: false
      };
      
      return await consultationStore.save(offlineData);
    }
  }, [isOnline]);

  // Finalize draft consultation
  const finalizeDraft = useCallback(async (draftId: string, hospitalId?: string): Promise<string> => {
    try {
      // Get the draft
      const draft = await consultationStore.getById(draftId);
      
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Update draft status
      draft.isDraft = false;
      
      // Save with finalized status
      return await saveConsultation(draft, hospitalId);
    } catch (error) {
      console.error('Error finalizing draft:', error);
      toast.error("Failed to finalize draft consultation");
      throw error;
    }
  }, [saveConsultation]);

  // Delete draft
  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    try {
      await consultationStore.delete(draftId);
      
      toast.success("Draft Deleted", {
        description: "Consultation draft has been deleted"
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error("Failed to delete draft consultation");
    }
  }, []);

  return {
    consultations,
    drafts,
    loading,
    loadPatientConsultations,
    getConsultationById,
    saveConsultation,
    finalizeDraft,
    deleteDraft
  };
}