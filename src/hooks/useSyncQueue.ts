import { useState, useEffect, useCallback } from 'react';
import { getOfflineDB } from '@/lib/offline/db';
import { toast } from 'sonner';

export function useSyncQueue() {
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    total: number;
    byTable: Record<string, number>;
    byOperation: Record<string, number>;
    byPriority: Record<string, number>;
  }>({
    total: 0,
    byTable: {},
    byOperation: {},
    byPriority: {}
  });

  // Load queue items
  const loadQueueItems = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getOfflineDB();
      
      // Get all items from sync queue
      const items = await db.getAll('syncQueue');
      
      // Sort by priority (descending) and timestamp (ascending)
      items.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp - b.timestamp; // Older items first
      });
      
      setQueueItems(items);
      
      // Calculate stats
      const byTable: Record<string, number> = {};
      const byOperation: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      
      for (const item of items) {
        // Count by table
        byTable[item.table] = (byTable[item.table] || 0) + 1;
        
        // Count by operation
        byOperation[item.operation] = (byOperation[item.operation] || 0) + 1;
        
        // Count by priority
        byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      }
      
      setStats({
        total: items.length,
        byTable,
        byOperation,
        byPriority
      });
    } catch (error) {
      console.error('Error loading sync queue:', error);
      toast.error("Failed to load sync queue");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load queue on mount
  useEffect(() => {
    loadQueueItems();
  }, [loadQueueItems]);

  // Remove item from queue
  const removeQueueItem = useCallback(async (id: string) => {
    try {
      const db = await getOfflineDB();
      await db.delete('syncQueue', id);
      
      toast.success("Item Removed", {
        description: "Sync queue item has been removed"
      });
      
      // Refresh queue
      await loadQueueItems();
    } catch (error) {
      console.error('Error removing queue item:', error);
      toast.error("Failed to remove sync queue item");
    }
  }, [loadQueueItems]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    try {
      const db = await getOfflineDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      await tx.objectStore('syncQueue').clear();
      await tx.done;
      
      toast.success("Queue Cleared", {
        description: "Sync queue has been cleared"
      });
      
      // Refresh queue
      await loadQueueItems();
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      toast.error("Failed to clear sync queue");
    }
  }, [loadQueueItems]);

  // Update item priority
  const updateItemPriority = useCallback(async (id: string, priority: number) => {
    try {
      const db = await getOfflineDB();
      const item = await db.get('syncQueue', id);
      
      if (item) {
        item.priority = priority;
        await db.put('syncQueue', item);
        
        toast.success("Priority Updated", {
          description: "Sync queue item priority has been updated"
        });
        
        // Refresh queue
        await loadQueueItems();
      }
    } catch (error) {
      console.error('Error updating item priority:', error);
      toast.error("Failed to update sync queue item priority");
    }
  }, [loadQueueItems]);

  return {
    queueItems,
    loading,
    stats,
    loadQueueItems,
    removeQueueItem,
    clearQueue,
    updateItemPriority
  };
}