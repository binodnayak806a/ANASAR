import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
export interface OfflineDBSchema extends DBSchema {
  patients: {
    key: string;
    value: {
      id: string;
      data: any;
      updatedAt: number;
      synced: boolean;
    };
    indexes: {
      'by-synced': boolean;
      'by-updated': number;
    };
  };
  consultations: {
    key: string;
    value: {
      id: string;
      appointmentId?: string;
      patientId: string;
      data: any;
      updatedAt: number;
      synced: boolean;
      isDraft: boolean;
    };
    indexes: {
      'by-patient': string;
      'by-synced': boolean;
      'by-draft': boolean;
      'by-updated': number;
    };
  };
  prescriptions: {
    key: string;
    value: {
      id: string;
      patientId: string;
      data: any;
      updatedAt: number;
      synced: boolean;
      isDraft: boolean;
    };
    indexes: {
      'by-patient': string;
      'by-synced': boolean;
      'by-draft': boolean;
      'by-updated': number;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: 'INSERT' | 'UPDATE' | 'DELETE';
      data: any;
      timestamp: number;
      retryCount: number;
      priority: number;
      error?: string;
    };
    indexes: {
      'by-table': string;
      'by-timestamp': number;
      'by-priority': number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };
}

// Database version
const DB_VERSION = 1;
const DB_NAME = 'aarogya-sahayak-offline';

// Initialize the database
export async function initOfflineDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  return openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientsStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientsStore.createIndex('by-synced', 'synced');
        patientsStore.createIndex('by-updated', 'updatedAt');
      }

      // Create consultations store
      if (!db.objectStoreNames.contains('consultations')) {
        const consultationsStore = db.createObjectStore('consultations', { keyPath: 'id' });
        consultationsStore.createIndex('by-patient', 'patientId');
        consultationsStore.createIndex('by-synced', 'synced');
        consultationsStore.createIndex('by-draft', 'isDraft');
        consultationsStore.createIndex('by-updated', 'updatedAt');
      }

      // Create prescriptions store
      if (!db.objectStoreNames.contains('prescriptions')) {
        const prescriptionsStore = db.createObjectStore('prescriptions', { keyPath: 'id' });
        prescriptionsStore.createIndex('by-patient', 'patientId');
        prescriptionsStore.createIndex('by-synced', 'synced');
        prescriptionsStore.createIndex('by-draft', 'isDraft');
        prescriptionsStore.createIndex('by-updated', 'updatedAt');
      }

      // Create sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncQueueStore.createIndex('by-table', 'table');
        syncQueueStore.createIndex('by-timestamp', 'timestamp');
        syncQueueStore.createIndex('by-priority', 'priority');
      }

      // Create metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });
}

// Get database instance
let dbPromise: Promise<IDBPDatabase<OfflineDBSchema>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (!dbPromise) {
    dbPromise = initOfflineDB();
  }
  return dbPromise;
}

// Reset database (for testing or when user logs out)
export async function resetOfflineDB(): Promise<void> {
  const db = await getOfflineDB();
  db.close();
  await deleteDB();
  dbPromise = initOfflineDB();
}

// Delete the database
export async function deleteDB(): Promise<void> {
  await indexedDB.deleteDatabase(DB_NAME);
}

// Check if IndexedDB is supported
export function isIndexedDBSupported(): boolean {
  return 'indexedDB' in window;
}