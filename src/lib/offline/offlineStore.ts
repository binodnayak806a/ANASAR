import { v4 as uuidv4 } from 'uuid';
import { getOfflineDB } from './db';

// Generic type for all storable entities
export interface OfflineEntity {
  id: string;
  [key: string]: any;
}

// Base class for all offline stores
export class OfflineStore<T extends OfflineEntity> {
  protected storeName: string;
  protected syncQueuePriority: number;

  constructor(storeName: string, syncQueuePriority: number = 1) {
    this.storeName = storeName;
    this.syncQueuePriority = syncQueuePriority;
  }

  // Get all items
  async getAll(): Promise<T[]> {
    const db = await getOfflineDB();
    const items = await db.getAll(this.storeName);
    return items.map(item => item.data);
  }

  // Get item by ID
  async getById(id: string): Promise<T | undefined> {
    const db = await getOfflineDB();
    const item = await db.get(this.storeName, id);
    return item?.data;
  }

  // Get items by index
  async getByIndex(indexName: string, value: any): Promise<T[]> {
    const db = await getOfflineDB();
    const items = await db.getAllFromIndex(this.storeName, indexName, value);
    return items.map(item => item.data);
  }

  // Save item (create or update)
  async save(item: T): Promise<string> {
    const db = await getOfflineDB();
    const id = item.id || uuidv4();
    const now = Date.now();
    
    // Prepare the item for storage
    const storageItem = {
      id,
      data: { ...item, id },
      updatedAt: now,
      synced: false
    };

    // Add additional fields based on store type
    if (this.storeName === 'consultations' || this.storeName === 'prescriptions') {
      (storageItem as any).patientId = item.patientId;
      (storageItem as any).isDraft = item.isDraft || false;
    }

    // Save to IndexedDB
    await db.put(this.storeName, storageItem);

    // Add to sync queue
    await this.addToSyncQueue(id, item.id ? 'UPDATE' : 'INSERT', item);

    return id;
  }

  // Delete item
  async delete(id: string): Promise<void> {
    const db = await getOfflineDB();
    
    // Get the item first to add to sync queue
    const item = await db.get(this.storeName, id);
    
    if (item) {
      // Delete from IndexedDB
      await db.delete(this.storeName, id);
      
      // Add to sync queue
      await this.addToSyncQueue(id, 'DELETE', item.data);
    }
  }

  // Get unsynced items
  async getUnsynced(): Promise<T[]> {
    const db = await getOfflineDB();
    const items = await db.getAllFromIndex(this.storeName, 'by-synced', false);
    return items.map(item => item.data);
  }

  // Mark item as synced
  async markAsSynced(id: string): Promise<void> {
    const db = await getOfflineDB();
    const item = await db.get(this.storeName, id);
    
    if (item) {
      item.synced = true;
      await db.put(this.storeName, item);
    }
  }

  // Add item to sync queue
  protected async addToSyncQueue(id: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', data: any): Promise<void> {
    const db = await getOfflineDB();
    const queueItem = {
      id: `${this.storeName}_${id}_${Date.now()}`,
      table: this.storeName,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      priority: this.syncQueuePriority
    };
    
    await db.put('syncQueue', queueItem);
  }
}

// Patient store
export class PatientOfflineStore extends OfflineStore<any> {
  constructor() {
    // Patients have high sync priority (2)
    super('patients', 2);
  }
}

// Consultation store
export class ConsultationOfflineStore extends OfflineStore<any> {
  constructor() {
    // Consultations have highest sync priority (3)
    super('consultations', 3);
  }

  // Get drafts
  async getDrafts(): Promise<any[]> {
    const db = await getOfflineDB();
    const items = await db.getAllFromIndex(this.storeName, 'by-draft', true);
    return items.map(item => item.data);
  }

  // Get by patient
  async getByPatient(patientId: string): Promise<any[]> {
    const db = await getOfflineDB();
    const items = await db.getAllFromIndex(this.storeName, 'by-patient', patientId);
    return items.map(item => item.data);
  }
}

// Prescription store
export class PrescriptionOfflineStore extends OfflineStore<any> {
  constructor() {
    // Prescriptions have high sync priority (2)
    super('prescriptions', 2);
  }

  // Get drafts
  async getDrafts(): Promise<any[]> {
    const db = await getOfflineDB();
    const items = await db.getAllFromIndex(this.storeName, 'by-draft', true);
    return items.map(item => item.data);
  }

  // Get by patient
  async getByPatient(patientId: string): Promise<any[]> {
    const db = await getOfflineDB();
    const items = await db.getAllFromIndex(this.storeName, 'by-patient', patientId);
    return items.map(item => item.data);
  }
}

// Create instances
export const patientStore = new PatientOfflineStore();
export const consultationStore = new ConsultationOfflineStore();
export const prescriptionStore = new PrescriptionOfflineStore();