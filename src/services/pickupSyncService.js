import axios from 'axios';
import authUtils from '../utils/authUtils';

class PickupSyncService {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncQueue = [];
  }

  /**
   * Sync local pickup data with the server
   * @param {boolean} force - Force sync even if recently synced
   * @returns {Promise<Object>} Sync result
   */
  async syncPickups(force = false) {
    // Prevent concurrent syncs
    if (this.syncInProgress && !force) {
      console.log('🔄 Pickup sync already in progress, skipping...');
      return { success: false, message: 'Sync already in progress' };
    }

    // Rate limiting - don't sync more than once per minute unless forced
    const now = Date.now();
    if (!force && this.lastSyncTime && (now - this.lastSyncTime) < 60000) {
      console.log('⏳ Sync rate limited, skipping...');
      return { success: false, message: 'Rate limited' };
    }

    this.syncInProgress = true;
    console.log('🔄 Starting pickup synchronization...');

    try {
      const token = authUtils.getToken();
      const userId = localStorage.getItem('userId');

      if (!token || !userId) {
        console.log('❌ No authentication token or user ID, skipping sync');
        return { success: false, message: 'Not authenticated' };
      }

      // Get local pickups
      const localPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
      console.log(`📱 Found ${localPickups.length} local pickups`);

      // Separate synced and unsynced pickups
      const unsyncedPickups = localPickups.filter(pickup => 
        pickup.needsSync === true || pickup.syncedToServer !== true
      );
      
      console.log(`📤 Found ${unsyncedPickups.length} pickups needing sync`);

      let syncResults = {
        attempted: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Try to sync unsynced pickups to server
      for (const pickup of unsyncedPickups) {
        try {
          syncResults.attempted++;
          
          const response = await axios.post(
            'http://localhost:3000/api/pickups/schedule',
            {
              pickupId: pickup.pickupId,
              userId: pickup.userId,
              customerName: pickup.customerName,
              customerPhone: pickup.customerPhone,
              customerAddress: pickup.customerAddress,
              customerPincode: pickup.customerPincode,
              wasteTypes: pickup.wasteTypes,
              estimatedWeight: pickup.estimatedWeight,
              timeSlot: pickup.timeSlot,
              specialInstructions: pickup.specialInstructions,
              location: pickup.location,
              address: pickup.address,
              scheduledDate: pickup.scheduledDate,
              scheduledTime: pickup.scheduledTime,
              wasteImages: pickup.wasteImages,
              timestamp: pickup.timestamp,
              createdAt: pickup.createdAt
            },
            {
              headers: { 'Authorization': `Bearer ${token}` },
              timeout: 15000
            }
          );

          if (response.data.success) {
            // Mark as synced
            pickup.syncedToServer = true;
            pickup.needsSync = false;
            pickup.lastSyncAt = new Date().toISOString();
            delete pickup.lastSyncError;
            delete pickup.lastSyncAttempt;
            
            syncResults.successful++;
            console.log(`✅ Synced pickup: ${pickup.pickupId}`);
          } else {
            throw new Error(response.data.message || 'Unknown server error');
          }
        } catch (error) {
          syncResults.failed++;
          pickup.lastSyncError = error.message;
          pickup.lastSyncAttempt = new Date().toISOString();
          pickup.syncAttempts = (pickup.syncAttempts || 0) + 1;
          
          syncResults.errors.push({
            pickupId: pickup.pickupId,
            error: error.message
          });
          
          console.log(`❌ Failed to sync pickup ${pickup.pickupId}:`, error.message);
        }
      }

      // Update localStorage with sync status
      if (unsyncedPickups.length > 0) {
        localStorage.setItem('pickupHistory', JSON.stringify(localPickups));
      }

      // Now fetch latest data from server to ensure consistency
      try {
        const response = await axios.get(
          `http://localhost:3000/api/pickups/user/${userId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 15000
          }
        );

        if (response.data.success) {
          const serverPickups = response.data.data || [];
          console.log(`📥 Retrieved ${serverPickups.length} pickups from server`);

          // Merge server data with local data (server takes precedence)
          const mergedPickups = this.mergePickupData(localPickups, serverPickups);
          
          // Update localStorage with merged data
          localStorage.setItem('pickupHistory', JSON.stringify(mergedPickups));
          
          console.log(`✅ Merged and updated ${mergedPickups.length} total pickups`);
          
          // Dispatch event for components to refresh
          window.dispatchEvent(new CustomEvent('pickupDataSynced', { 
            detail: { pickups: mergedPickups, syncResults } 
          }));
        }
      } catch (fetchError) {
        console.log('⚠️ Could not fetch latest server data:', fetchError.message);
      }

      this.lastSyncTime = now;
      
      const message = syncResults.attempted === 0 ? 
        'No pickups needed syncing' :
        `Synced ${syncResults.successful}/${syncResults.attempted} pickups`;

      console.log(`✅ Sync completed: ${message}`);
      
      return {
        success: true,
        message,
        results: syncResults
      };

    } catch (error) {
      console.error('❌ Pickup sync failed:', error);
      return {
        success: false,
        message: error.message,
        error
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Merge local and server pickup data, prioritizing server data
   * @param {Array} localPickups - Pickups from localStorage
   * @param {Array} serverPickups - Pickups from server
   * @returns {Array} Merged pickup data
   */
  mergePickupData(localPickups, serverPickups) {
    const merged = [...serverPickups];
    const serverPickupIds = new Set(serverPickups.map(p => p.pickupId));

    // Add local pickups that aren't on server (recently created, failed sync, etc.)
    localPickups.forEach(localPickup => {
      if (!serverPickupIds.has(localPickup.pickupId)) {
        // Keep local pickup but mark it as needing sync if not already synced
        if (localPickup.syncedToServer !== true) {
          localPickup.needsSync = true;
        }
        merged.push(localPickup);
      }
    });

    // Sort by creation date (newest first)
    merged.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.scheduledDate || 0);
      const dateB = new Date(b.createdAt || b.scheduledDate || 0);
      return dateB - dateA;
    });

    // Limit to 100 most recent pickups
    return merged.slice(0, 100);
  }

  /**
   * Add a pickup to the sync queue for later processing
   * @param {Object} pickup - Pickup data to sync
   */
  queueForSync(pickup) {
    const existingIndex = this.syncQueue.findIndex(p => p.pickupId === pickup.pickupId);
    if (existingIndex >= 0) {
      this.syncQueue[existingIndex] = pickup; // Replace existing
    } else {
      this.syncQueue.push(pickup);
    }
    
    // Automatically sync if queue gets too long
    if (this.syncQueue.length >= 5) {
      setTimeout(() => this.syncPickups(), 1000);
    }
  }

  /**
   * Force sync all queued pickups
   */
  async syncQueuedPickups() {
    if (this.syncQueue.length === 0) return;
    
    console.log(`🔄 Syncing ${this.syncQueue.length} queued pickups...`);
    
    // Move queued items to localStorage and clear queue
    const localPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
    this.syncQueue.forEach(queuedPickup => {
      const existingIndex = localPickups.findIndex(p => p.pickupId === queuedPickup.pickupId);
      if (existingIndex >= 0) {
        localPickups[existingIndex] = queuedPickup;
      } else {
        localPickups.unshift(queuedPickup);
      }
    });
    
    localStorage.setItem('pickupHistory', JSON.stringify(localPickups.slice(0, 100)));
    this.syncQueue = [];
    
    // Now sync with server
    return await this.syncPickups(true);
  }

  /**
   * Check if sync is needed
   * @returns {boolean} True if sync is needed
   */
  needsSync() {
    const localPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
    return localPickups.some(pickup => pickup.needsSync === true || pickup.syncedToServer !== true);
  }

  /**
   * Get sync status information
   * @returns {Object} Sync status
   */
  getSyncStatus() {
    const localPickups = JSON.parse(localStorage.getItem('pickupHistory') || '[]');
    const unsyncedCount = localPickups.filter(p => p.needsSync === true || p.syncedToServer !== true).length;
    
    return {
      totalPickups: localPickups.length,
      unsyncedCount,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      needsSync: unsyncedCount > 0
    };
  }
}

// Create singleton instance
const pickupSyncService = new PickupSyncService();

// Auto-sync on network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network reconnected, triggering pickup sync...');
    setTimeout(() => pickupSyncService.syncPickups(), 2000);
  });

  // Periodic sync every 5 minutes if user is active
  let syncInterval;
  const startPeriodicSync = () => {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (pickupSyncService.needsSync() && authUtils.isLoggedIn()) {
        pickupSyncService.syncPickups();
      }
    }, 5 * 60 * 1000); // 5 minutes
  };

  // Start periodic sync when page is visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      startPeriodicSync();
    } else {
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    }
  });

  // Start initial periodic sync
  startPeriodicSync();
}

export default pickupSyncService;
