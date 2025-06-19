// Network status monitoring class
export class NetworkStatus {
  private isOnlineValue: boolean;
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];

  constructor() {
    this.isOnlineValue = navigator.onLine;
    this.setupListeners();
  }

  // Set up event listeners for online/offline events
  private setupListeners() {
    window.addEventListener('online', () => {
      this.isOnlineValue = true;
      this.notifyOnlineCallbacks();
    });

    window.addEventListener('offline', () => {
      this.isOnlineValue = false;
      this.notifyOfflineCallbacks();
    });
  }

  // Check if online
  isOnline(): boolean {
    return this.isOnlineValue;
  }

  // Register callback for online event
  onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  // Register callback for offline event
  onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  // Notify all online callbacks
  private notifyOnlineCallbacks(): void {
    this.onlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in online callback:', error);
      }
    });
  }

  // Notify all offline callbacks
  private notifyOfflineCallbacks(): void {
    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in offline callback:', error);
      }
    });
  }

  // Remove callback
  removeOnlineCallback(callback: () => void): void {
    this.onlineCallbacks = this.onlineCallbacks.filter(cb => cb !== callback);
  }

  // Remove callback
  removeOfflineCallback(callback: () => void): void {
    this.offlineCallbacks = this.offlineCallbacks.filter(cb => cb !== callback);
  }
}

// Create singleton instance
export const networkStatus = new NetworkStatus();