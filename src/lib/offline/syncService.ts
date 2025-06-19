import { getOfflineDB } from './db';
import { supabase } from '@/lib/supabase';
import { patientStore, consultationStore, prescriptionStore } from './offlineStore';
import { NetworkStatus } from './networkStatus';

// Conflict resolution strategies
export enum ConflictStrategy {
  CLIENT_WINS = 'CLIENT_WINS',
  SERVER_WINS = 'SERVER_WINS',
  MERGE = 'MERGE',
  MANUAL = 'MANUAL'
}

// Sync options
export interface SyncOptions {
  forceSync?: boolean;
  conflictStrategy?: ConflictStrategy;
  tables?: string[];
  batchSize?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

// Default sync options
const defaultSyncOptions: SyncOptions = {
  forceSync: false,
  conflictStrategy: ConflictStrategy.MERGE,
  batchSize: 10,
  onProgress: () => {},
  onError: () => {},
  onComplete: () => {}
};

// Sync service
export class SyncService {
  private isSyncing: boolean = false;
  private lastSyncTimestamp: number = 0;
  private networkStatus: NetworkStatus;

  constructor() {
    this.networkStatus = new NetworkStatus();
    this.setupAutoSync();
  }

  // Set up automatic sync when online
  private setupAutoSync() {
    // Sync when coming back online
    this.networkStatus.onOnline(() => {
      this.sync();
    });

    // Sync periodically when online
    setInterval(() => {
      if (this.networkStatus.isOnline()) {
        this.sync();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Start sync process
  async sync(options: SyncOptions = {}): Promise<boolean> {
    // Merge with default options
    const syncOptions = { ...defaultSyncOptions, ...options };
    
    // Skip if already syncing and not forced
    if (this.isSyncing && !syncOptions.forceSync) {
      return false;
    }

    // Skip if offline
    if (!this.networkStatus.isOnline()) {
      return false;
    }

    try {
      this.isSyncing = true;
      
      // Process sync queue
      await this.processSyncQueue(syncOptions);
      
      // Update last sync timestamp
      this.lastSyncTimestamp = Date.now();
      await this.updateMetadata('lastSyncTimestamp', this.lastSyncTimestamp);
      
      // Call onComplete callback
      syncOptions.onComplete?.();
      
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      syncOptions.onError?.(error as Error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Process sync queue
  private async processSyncQueue(options: SyncOptions): Promise<void> {
    const db = await getOfflineDB();
    
    // Get all items from sync queue, ordered by priority and timestamp
    const tx = db.transaction('syncQueue', 'readwrite');
    const index = tx.store.index('by-priority');
    const syncItems = await index.getAll();
    
    // Sort by priority (descending) and timestamp (ascending)
    syncItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older items first
    });
    
    // Process in batches
    const batchSize = options.batchSize || 10;
    const totalItems = syncItems.length;
    let processedItems = 0;
    
    for (let i = 0; i < syncItems.length; i += batchSize) {
      const batch = syncItems.slice(i, i + batchSize);
      
      // Process batch
      for (const item of batch) {
        try {
          await this.processSyncItem(item, options.conflictStrategy || ConflictStrategy.MERGE);
          await tx.store.delete(item.id);
        } catch (error) {
          console.error(`Error processing sync item ${item.id}:`, error);
          
          // Update retry count
          item.retryCount = (item.retryCount || 0) + 1;
          item.error = (error as Error).message;
          
          // If retry count exceeds limit, move to end of queue with lower priority
          if (item.retryCount >= 5) {
            item.priority = Math.max(0, item.priority - 1);
            item.timestamp = Date.now();
          }
          
          await tx.store.put(item);
        }
      }
      
      processedItems += batch.length;
      options.onProgress?.(processedItems / totalItems);
    }
    
    await tx.done;
  }

  // Process a single sync item
  private async processSyncItem(item: any, conflictStrategy: ConflictStrategy): Promise<void> {
    const { table, operation, data, id } = item;
    
    // Skip system tables
    if (table === 'metadata') {
      return;
    }
    
    // Handle based on operation type
    switch (operation) {
      case 'INSERT':
      case 'UPDATE':
        await this.handleUpsert(table, data, conflictStrategy);
        break;
      case 'DELETE':
        await this.handleDelete(table, data.id);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    // Mark as synced in the appropriate store
    switch (table) {
      case 'patients':
        await patientStore.markAsSynced(data.id);
        break;
      case 'consultations':
        await consultationStore.markAsSynced(data.id);
        break;
      case 'prescriptions':
        await prescriptionStore.markAsSynced(data.id);
        break;
    }
  }

  // Handle insert or update
  private async handleUpsert(table: string, data: any, conflictStrategy: ConflictStrategy): Promise<void> {
    // Check for conflicts
    const { data: serverData, error: fetchError } = await supabase
      .from(table)
      .select('*')
      .eq('id', data.id)
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows returned"
      throw fetchError;
    }
    
    // If server has no data, just insert
    if (!serverData) {
      const { error } = await supabase
        .from(table)
        .insert(data);
      
      if (error) throw error;
      return;
    }
    
    // Handle conflict based on strategy
    let resolvedData;
    
    switch (conflictStrategy) {
      case ConflictStrategy.CLIENT_WINS:
        resolvedData = data;
        break;
      
      case ConflictStrategy.SERVER_WINS:
        resolvedData = serverData;
        break;
      
      case ConflictStrategy.MERGE:
        resolvedData = this.mergeData(serverData, data);
        break;
      
      case ConflictStrategy.MANUAL:
        // Store conflict for manual resolution
        await this.storeConflict(table, serverData, data);
        return;
      
      default:
        resolvedData = data;
    }
    
    // Update on server
    const { error } = await supabase
      .from(table)
      .update(resolvedData)
      .eq('id', data.id);
    
    if (error) throw error;
  }

  // Handle delete
  private async handleDelete(table: string, id: string): Promise<void> {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Merge data for conflict resolution
  private mergeData(serverData: any, clientData: any): any {
    // Start with server data
    const merged = { ...serverData };
    
    // Merge client changes
    for (const [key, value] of Object.entries(clientData)) {
      // Skip id and timestamps
      if (key === 'id' || key === 'created_at') continue;
      
      // For complex objects, do deep merge
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof merged[key] === 'object') {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  // Store conflict for manual resolution
  private async storeConflict(table: string, serverData: any, clientData: any): Promise<void> {
    const db = await getOfflineDB();
    
    await db.put('metadata', {
      key: `conflict_${table}_${clientData.id}_${Date.now()}`,
      value: {
        table,
        id: clientData.id,
        serverData,
        clientData,
        timestamp: Date.now(),
        resolved: false
      },
      updatedAt: Date.now()
    });
  }

  // Get metadata
  private async getMetadata(key: string): Promise<any> {
    const db = await getOfflineDB();
    const item = await db.get('metadata', key);
    return item?.value;
  }

  // Update metadata
  private async updateMetadata(key: string, value: any): Promise<void> {
    const db = await getOfflineDB();
    
    await db.put('metadata', {
      key,
      value,
      updatedAt: Date.now()
    });
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    lastSync: number;
    pendingChanges: number;
    isSyncing: boolean;
    conflicts: number;
  }> {
    const db = await getOfflineDB();
    
    // Count pending changes
    const pendingChanges = await db.count('syncQueue');
    
    // Count conflicts
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const keys = await store.getAllKeys();
    const conflicts = keys.filter(key => typeof key === 'string' && key.startsWith('conflict_')).length;
    
    return {
      lastSync: this.lastSyncTimestamp,
      pendingChanges,
      isSyncing: this.isSyncing,
      conflicts
    };
  }

  // Get conflicts
  async getConflicts(): Promise<any[]> {
    const db = await getOfflineDB();
    
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const keys = await store.getAllKeys();
    const conflictKeys = keys.filter(key => typeof key === 'string' && key.startsWith('conflict_'));
    
    const conflicts = [];
    for (const key of conflictKeys) {
      const item = await store.get(key);
      if (item && !item.value.resolved) {
        conflicts.push(item.value);
      }
    }
    
    return conflicts;
  }

  // Resolve conflict
  async resolveConflict(conflictKey: string, resolution: any): Promise<void> {
    const db = await getOfflineDB();
    
    // Get conflict
    const conflict = await db.get('metadata', conflictKey);
    
    if (!conflict) {
      throw new Error(`Conflict ${conflictKey} not found`);
    }
    
    // Update on server
    const { error } = await supabase
      .from(conflict.value.table)
      .update(resolution)
      .eq('id', conflict.value.id);
    
    if (error) throw error;
    
    // Mark conflict as resolved
    conflict.value.resolved = true;
    conflict.value.resolution = resolution;
    conflict.updatedAt = Date.now();
    
    await db.put('metadata', conflict);
  }

  // Initialize sync service
  async initialize(): Promise<void> {
    // Load last sync timestamp
    const lastSync = await this.getMetadata('lastSyncTimestamp');
    if (lastSync) {
      this.lastSyncTimestamp = lastSync;
    }
    
    // Sync if online
    if (this.networkStatus.isOnline()) {
      this.sync();
    }
  }
}

// Create singleton instance
export const syncService = new SyncService();