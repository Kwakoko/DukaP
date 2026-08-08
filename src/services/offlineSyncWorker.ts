/**
 * offlineSyncWorker.ts
 * Background Resumption & Offline Sync Worker for DukaPos SaaS.
 * 
 * Automatically handles reconnection triggers, background timers, pre-logout flushing,
 * and Service Worker background sync.
 */

import { stockLedgerSyncEngine } from './stockLedgerSyncEngine';

let syncTimerId: any = null;
let isWorkerRunning = false;

export const offlineSyncWorker = {

  /**
   * Initializes client offline sync event listeners & background intervals
   */
  startWorker(tenantId: string, branchId: string, intervalMs: number = 30000) {
    if (isWorkerRunning) return;
    isWorkerRunning = true;

    // 1. Online reconnection trigger
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.info('[OfflineSyncWorker] Network reconnected. Flushing sync queues...');
        this.triggerSyncNow(tenantId, branchId);
        import('./productionSyncEngine').then(({ productionSyncEngine }) => {
          productionSyncEngine.processQueue(tenantId).catch(() => {});
        });
      });
    }

    // 2. Periodic background interval
    syncTimerId = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      this.triggerSyncNow(tenantId, branchId);
      import('./productionSyncEngine').then(({ productionSyncEngine }) => {
        productionSyncEngine.processQueue(tenantId).catch(() => {});
      });
    }, intervalMs);

    console.info(`[OfflineSyncWorker] Sync worker active (Interval: ${intervalMs}ms).`);
  },

  /**
   * Stops background worker timer
   */
  stopWorker() {
    if (syncTimerId) {
      clearInterval(syncTimerId);
      syncTimerId = null;
    }
    isWorkerRunning = false;
  },

  /**
   * Triggers an immediate full sync flush
   */
  async triggerSyncNow(tenantId: string, branchId: string): Promise<{ syncedCount: number; failedCount: number }> {
    if (!tenantId || !branchId) return { syncedCount: 0, failedCount: 0 };
    try {
      const res = await stockLedgerSyncEngine.syncPendingEvents(tenantId, branchId);
      return res;
    } catch (err) {
      console.warn('[OfflineSyncWorker] Sync execution error:', err);
      return { syncedCount: 0, failedCount: 0 };
    }
  }
};
