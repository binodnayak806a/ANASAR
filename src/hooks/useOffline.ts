import { useState, useEffect, useCallback } from 'react';
import { networkStatus } from '@/lib/offline/networkStatus';
import { syncService, ConflictStrategy } from '@/lib/offline/syncService';
import { offlineCache } from '@/lib/offline/offlineCache';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function useOffline() {
  const [isOnline, setIsOnline] = useState<boolean>(networkStatus.isOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [pendingChanges, setPendingChanges] = useState<number>(0);
  const [conflicts, setConflicts] = useState<number>(0);
  
  const { hospitalId } = useAuth();

  // Update status when network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast("You're back online", {
        description: "Syncing your changes...",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast("You're offline", {
        description: "Changes will be saved locally and synced when you're back online",
      });
    };

    // Register callbacks
    networkStatus.onOnline(handleOnline);
    networkStatus.onOffline(handleOffline);

    // Initial status
    setIsOnline(networkStatus.isOnline());

    // Load sync status
    loadSyncStatus();

    // Clean up
    return () => {
      networkStatus.removeOnlineCallback(handleOnline);
      networkStatus.removeOfflineCallback(handleOffline);
    };
  }, []);

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    const status = await syncService.getSyncStatus();
    setLastSyncTime(status.lastSync);
    setPendingChanges(status.pendingChanges);
    setConflicts(status.conflicts);
    setIsSyncing(status.isSyncing);
  }, []);

  // Trigger manual sync
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error("You're offline", {
        description: "Cannot sync while offline",
      });
      return false;
    }

    setIsSyncing(true);
    
    try {
      const success = await syncService.sync({
        forceSync: true,
        onProgress: (progress) => {
          // Could update a progress indicator here
        },
        onError: (error) => {
          toast.error("Sync Error", {
            description: error.message,
          });
        },
        onComplete: () => {
          toast.success("Sync Complete", {
            description: "All changes have been synchronized",
          });
          loadSyncStatus();
        }
      });
      
      return success;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Cache patient data for offline use
  const cachePatientData = useCallback(async (patientId: string) => {
    if (!isOnline || !patientId) return;
    
    try {
      await offlineCache.cachePatient(patientId);
      
      toast.success("Patient Cached", {
        description: "Patient data is now available offline",
      });
    } catch (error) {
      console.error('Error caching patient data:', error);
      toast.error("Cache Error", {
        description: "Failed to cache patient data for offline use",
      });
    }
  }, [isOnline]);

  // Cache essential data for offline use
  const cacheEssentialData = useCallback(async () => {
    if (!isOnline || !hospitalId) return;
    
    try {
      await offlineCache.cacheEssentialData(hospitalId);
      
      toast.success("Data Cached", {
        description: "Essential data is now available offline",
      });
    } catch (error) {
      console.error('Error caching essential data:', error);
      toast.error("Cache Error", {
        description: "Failed to cache essential data for offline use",
      });
    }
  }, [isOnline, hospitalId]);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    return await offlineCache.getCacheStats();
  }, []);

  // Clean expired cache
  const cleanExpiredCache = useCallback(async () => {
    try {
      await offlineCache.cleanExpiredCache();
      
      toast.success("Cache Cleaned", {
        description: "Expired cache items have been removed",
      });
      
      // Refresh stats
      await loadSyncStatus();
    } catch (error) {
      console.error('Error cleaning cache:', error);
      toast.error("Clean Error", {
        description: "Failed to clean expired cache",
      });
    }
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback(async (conflictKey: string, resolution: any) => {
    try {
      await syncService.resolveConflict(conflictKey, resolution);
      
      toast.success("Conflict Resolved", {
        description: "The data conflict has been resolved",
      });
      
      // Refresh conflicts count
      await loadSyncStatus();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast.error("Resolution Error", {
        description: "Failed to resolve data conflict",
      });
    }
  }, []);

  // Get conflicts
  const getConflicts = useCallback(async () => {
    return await syncService.getConflicts();
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    conflicts,
    syncNow,
    cachePatientData,
    cacheEssentialData,
    getCacheStats,
    cleanExpiredCache,
    resolveConflict,
    getConflicts
  };
}