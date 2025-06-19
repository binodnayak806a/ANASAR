import { useState, useEffect, useCallback } from 'react';
import { prescriptionStore } from '@/lib/offline/offlineStore';
import { useOffline } from '@/hooks/useOffline';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export function useOfflinePrescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { isOnline } = useOffline();

  // Load prescriptions for a patient
  const loadPatientPrescriptions = useCallback(async (patientId: string, hospitalId?: string) => {
    setLoading(true);
    try {
      if (isOnline && hospitalId) {
        // Online mode: fetch from Supabase
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            doctors (
              id,
              users (
                full_name
              )
            )
          `)
          .eq('hospital_id', hospitalId)
          .eq('patient_id', patientId)
          .order('prescription_date', { ascending: false });
        
        if (error) throw error;
        
        setPrescriptions(data || []);
        
        // Cache prescriptions for offline use
        if (data) {
          for (const prescription of data) {
            await prescriptionStore.save({
              ...prescription,
              isDraft: false,
              synced: true
            });
          }
        }
        
        // Load drafts from IndexedDB
        const draftPrescriptions = await prescriptionStore.getByIndex('by-draft', true);
        const patientDrafts = draftPrescriptions.filter(draft => draft.patientId === patientId);
        setDrafts(patientDrafts);
      } else {
        // Offline mode: fetch from IndexedDB
        const offlinePrescriptions = await prescriptionStore.getByPatient(patientId);
        
        // Split into drafts and regular prescriptions
        const regularPrescriptions = offlinePrescriptions.filter(p => !p.isDraft);
        const draftPrescriptions = offlinePrescriptions.filter(p => p.isDraft);
        
        setPrescriptions(regularPrescriptions);
        setDrafts(draftPrescriptions);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast.error("Failed to load prescriptions");
      
      // Fallback to offline data
      const offlinePrescriptions = await prescriptionStore.getByPatient(patientId);
      
      // Split into drafts and regular prescriptions
      const regularPrescriptions = offlinePrescriptions.filter(p => !p.isDraft);
      const draftPrescriptions = offlinePrescriptions.filter(p => p.isDraft);
      
      setPrescriptions(regularPrescriptions);
      setDrafts(draftPrescriptions);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  // Get prescription by ID
  const getPrescriptionById = useCallback(async (id: string): Promise<any | null> => {
    try {
      if (isOnline) {
        // Try online first
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            doctors (
              id,
              users (
                full_name
              )
            )
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          // Fallback to offline
          return await prescriptionStore.getById(id) || null;
        }
        
        // Cache for offline use
        if (data) {
          await prescriptionStore.save({
            ...data,
            isDraft: false,
            synced: true
          });
        }
        
        return data;
      } else {
        // Offline mode
        return await prescriptionStore.getById(id) || null;
      }
    } catch (error) {
      console.error(`Error getting prescription ${id}:`, error);
      
      // Fallback to offline
      return await prescriptionStore.getById(id) || null;
    }
  }, [isOnline]);

  // Save prescription
  const savePrescription = useCallback(async (prescription: any, hospitalId?: string): Promise<string> => {
    try {
      // Prepare prescription data
      const now = new Date().toISOString();
      const prescriptionId = prescription.id || uuidv4();
      const isDraft = prescription.isDraft === undefined ? true : prescription.isDraft;
      
      if (isOnline && hospitalId && !isDraft) {
        // Online mode and not a draft: save to Supabase
        const prescriptionData = {
          ...prescription,
          id: prescriptionId,
          hospital_id: hospitalId,
          prescription_date: prescription.prescription_date || now,
          updated_at: now
        };
        
        if (prescription.id) {
          // Update existing prescription
          const { error } = await supabase
            .from('prescriptions')
            .update(prescriptionData)
            .eq('id', prescription.id);
          
          if (error) throw error;
        } else {
          // Create new prescription
          const { error } = await supabase
            .from('prescriptions')
            .insert({
              ...prescriptionData,
              prescription_number: `RX${Date.now().toString().slice(-8)}`
            });
          
          if (error) throw error;
        }
        
        // Save to IndexedDB as well
        const offlineData = {
          ...prescription,
          id: prescriptionId,
          updatedAt: Date.now(),
          isDraft,
          synced: true
        };
        
        await prescriptionStore.save(offlineData);
        
        return prescriptionId;
      } else {
        // Offline mode or draft: save to IndexedDB only
        const offlineData = {
          ...prescription,
          id: prescriptionId,
          updatedAt: Date.now(),
          isDraft,
          synced: false
        };
        
        if (!isOnline) {
          toast("Offline Mode", {
            description: "Prescription saved locally and will sync when online"
          });
        }
        
        return await prescriptionStore.save(offlineData);
      }
    } catch (error) {
      console.error('Error saving prescription:', error);
      
      // Fallback to offline save
      toast("Offline Save", {
        description: "Prescription saved locally and will sync when online"
      });
      
      const prescriptionId = prescription.id || uuidv4();
      const offlineData = {
        ...prescription,
        id: prescriptionId,
        updatedAt: Date.now(),
        isDraft: prescription.isDraft === undefined ? true : prescription.isDraft,
        synced: false
      };
      
      return await prescriptionStore.save(offlineData);
    }
  }, [isOnline]);

  // Finalize draft prescription
  const finalizeDraft = useCallback(async (draftId: string, hospitalId?: string): Promise<string> => {
    try {
      // Get the draft
      const draft = await prescriptionStore.getById(draftId);
      
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      // Update draft status
      draft.isDraft = false;
      
      // Save with finalized status
      return await savePrescription(draft, hospitalId);
    } catch (error) {
      console.error('Error finalizing draft:', error);
      toast.error("Failed to finalize draft prescription");
      throw error;
    }
  }, [savePrescription]);

  // Delete draft
  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    try {
      await prescriptionStore.delete(draftId);
      
      toast.success("Draft Deleted", {
        description: "Prescription draft has been deleted"
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error("Failed to delete draft prescription");
    }
  }, []);

  return {
    prescriptions,
    drafts,
    loading,
    loadPatientPrescriptions,
    getPrescriptionById,
    savePrescription,
    finalizeDraft,
    deleteDraft
  };
}