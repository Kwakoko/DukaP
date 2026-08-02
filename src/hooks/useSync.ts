import { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncOperation } from '../db/dexie';
import { mapProductToLocal, recoverUnsyncedProducts } from '../services/productService';
import { createSyncEvent } from '../services/syncEventGenerator';
import { productionSyncEngine } from '../services/productionSyncEngine';

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
}

export function useSync() {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  // Use refs so interval callbacks always see the latest values without stale closures
  const isSyncingRef = useRef(false);
  const isSimulatedRef = useRef(false);
  const isOnlineRef = useRef(isOnline);
  const lastSyncTimeRef = useRef<number>(0);
  const syncTimeoutRef = useRef<any>(null);

  useEffect(() => { isSyncingRef.current = isSyncing; }, [isSyncing]);
  useEffect(() => { isSimulatedRef.current = isSimulated; }, [isSimulated]);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  // Unique identifier for this tab session to handle multi-tab synchronization locks
  const currentTabId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  // Live query to track pending sync count
  const pendingCount = useLiveQuery(async () => {
    return await db.syncQueue.where('status').equals('Pending').count();
  }) || 0;

  // Logger helper
  const addLog = (message: string) => {
    setSyncLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 49)]);
  };

  // ── FIXED: use GET /api/ping instead of HEAD /api/products ─────────────────
  // The Vite dev server only handled GET/POST on /api/products, so HEAD always
  // failed → isOnline was permanently false → nothing ever synced.
  const checkRealConnectivity = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/ping', { method: 'GET', signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  };

  // Manage lock acquisition to coordinate tabs
  const acquireSyncLock = (): boolean => {
    const now = Date.now();
    const lockStr = localStorage.getItem('dukapos_sync_lock');
    if (lockStr) {
      try {
        const lock = JSON.parse(lockStr);
        if (now - lock.ts < 15000 && lock.tabId !== currentTabId) return false;
      } catch {
        localStorage.removeItem('dukapos_sync_lock');
      }
    }
    localStorage.setItem('dukapos_sync_lock', JSON.stringify({ ts: now, tabId: currentTabId }));
    return true;
  };

  const releaseSyncLock = () => {
    const lockStr = localStorage.getItem('dukapos_sync_lock');
    if (lockStr) {
      try {
        const lock = JSON.parse(lockStr);
        if (lock.tabId === currentTabId) localStorage.removeItem('dukapos_sync_lock');
      } catch {}
    }
  };

  // ── STARTUP CHECKPOINT RECOVERY ──────────────────────────────────────────
  // Resumes interrupted processing items by reverting them back to Pending status on load.
  useEffect(() => {
    const recoverInterruptedSyncs = async () => {
      try {
        const restored = await db.syncQueue.where('status').equals('Processing').modify({ status: 'Pending' });
        if (restored > 0) {
          addLog(`Checkpoint Recovery: Restored ${restored} interrupted sync queue items to Pending.`);
        }
      } catch (err) {
        console.error('Failed to recover interrupted syncs:', err);
      }
    };
    recoverInterruptedSyncs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── CORE FIX: Pull server products, variants, customers, and orders ──────────
  // This function is the missing piece. Every device MUST call this on login
  // to hydrate its empty IndexedDB from the shared server (cloud_db.json).
  // Without this, Device B starts with an empty DB and sees no products.
  const syncFromServer = async (tenantId?: string): Promise<number> => {
    try {
      const session = localStorage.getItem('dukapos_session');
      let currentTenantId = tenantId;
      let currentUserId = 'usr-sync-engine';
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (!currentTenantId) {
            currentTenantId = parsed?.user?.tenant_id || parsed?.user?.tenantId;
          }
          currentUserId = parsed?.user?.id || 'usr-sync-engine';
        } catch {}
      }

      // Step 1: Force local un-synced product recovery push first
      if (currentTenantId) {
        await recoverUnsyncedProducts(currentTenantId);
      }

      const headers: Record<string, string> = {
        'x-tenant-id': currentTenantId || '',
        'X-Tenant-ID': currentTenantId || '',
        'x-user-id': currentUserId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };

      const cacheBust = `_t=${Date.now()}`;
      const url = currentTenantId
        ? `/api/products?tenantId=${encodeURIComponent(currentTenantId)}&${cacheBust}`
        : `/api/products?${cacheBust}`;
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) return 0;

      const rawProducts: any = await res.json();
      const serverProducts: any[] = Array.isArray(rawProducts) ? rawProducts : (rawProducts.products || []);
      let syncedCount = 0;
      if (Array.isArray(serverProducts)) {
        for (const sp of serverProducts) {
          if (sp.deletedAt || sp.deleted_at) continue; // Skip soft-deleted

          // Never overwrite locally-pending (offline-created) records with server data
          const existing = await db.products.get(sp.id);
          if (existing && existing.syncStatus === 'PENDING') continue;

          const localFormat = mapProductToLocal({ ...sp, syncStatus: 'SYNCED' });
          await db.products.put(localFormat);
          syncedCount++;
        }
      }

      // Pull variants
      const varUrl = currentTenantId
        ? `/api/variants?tenantId=${encodeURIComponent(currentTenantId)}&${cacheBust}`
        : `/api/variants?${cacheBust}`;
      const varRes = await fetch(varUrl, { method: 'GET', headers });
      if (varRes.ok) {
        const rawVariants: any = await varRes.json();
        const serverVariants: any[] = Array.isArray(rawVariants) ? rawVariants : (rawVariants.variants || []);
        if (Array.isArray(serverVariants)) {
          for (const sv of serverVariants) {
            if (sv.deletedAt || sv.deleted_at) continue;
            const existing = await db.productVariants.get(sv.id);
            if (!existing || existing.syncStatus !== 'PENDING') {
              await db.productVariants.put({ ...sv, syncStatus: 'SYNCED', isSynced: 1 });
            }
          }

          // Recalculate parent product stock from variants
          const allProds = await db.products.toArray();
          for (const p of allProds) {
            if (p.hasVariants) {
              const vars = await db.productVariants.where('productId').equals(p.id).toArray();
              const totalStock = vars.reduce((sum, v) => sum + (v.stock || 0), 0);
              if (p.stock !== totalStock) {
                await db.products.update(p.id, { stock: totalStock });
              }
            }
          }
        }
      }

      // Pull customers
      const custUrl = currentTenantId
        ? `/api/customers?tenantId=${encodeURIComponent(currentTenantId)}&${cacheBust}`
        : `/api/customers?${cacheBust}`;
      const custRes = await fetch(custUrl, { method: 'GET', headers });
      if (custRes.ok) {
        const rawCust: any = await custRes.json();
        const serverCustomers: any[] = Array.isArray(rawCust) ? rawCust : (rawCust.customers || []);
        if (Array.isArray(serverCustomers)) {
          for (const sc of serverCustomers) {
            if (sc.deletedAt || sc.deleted_at) continue;
            const existing = await db.customers.get(sc.id) as any;
            if (!existing || existing.syncStatus !== 'PENDING') {
              await db.customers.put({ ...sc, syncStatus: 'SYNCED' } as any);
            }
          }
        }
      }

      // Pull orders
      const orderUrl = currentTenantId
        ? `/api/orders?tenantId=${encodeURIComponent(currentTenantId)}&${cacheBust}`
        : `/api/orders?${cacheBust}`;
      const orderRes = await fetch(orderUrl, { method: 'GET', headers });
      if (orderRes.ok) {
        const rawOrders: any = await orderRes.json();
        const serverOrders: any[] = Array.isArray(rawOrders) ? rawOrders : (rawOrders.orders || []);
        if (Array.isArray(serverOrders)) {
          for (const so of serverOrders) {
            if (so.deletedAt || so.deleted_at) continue;
            const existing = await db.orders.get(so.id);
            if (!existing || existing.syncStatus !== 'Pending') {
              await db.orders.put({ ...so, syncStatus: 'Synced' });
            }
          }
        }
      }

      if (syncedCount > 0) {
        addLog(`↓ Downloaded ${syncedCount} product(s) from server.`);
      }
      return syncedCount;
    } catch (err: any) {
      addLog(`Server pull failed: ${err.message}`);
      return 0;
    }
  };

  // Monitor real-world browser offline status and run verified pings
  useEffect(() => {
    const handleOnline = async () => {
      setIsSimulated(false);
      const reallyConnected = await checkRealConnectivity();
      setIsOnline(reallyConnected);
      if (reallyConnected) {
        addLog('Connection restored. Running auto-sync...');
      }
    };

    const handleOffline = () => {
      setIsSimulated(false);
      setIsOnline(false);
      addLog('Connection offline.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity + delta-sync (every 30s)
    const intervalId = setInterval(async () => {
      if (isSimulatedRef.current) return;
      const reallyConnected = await checkRealConnectivity();
      setIsOnline(reallyConnected);

      if (reallyConnected && !isSyncingRef.current) {
        // Pull latest from server (catches changes made on other devices)
        const session = localStorage.getItem('dukapos_session');
        if (session) {
          try {
            const parsed = JSON.parse(session);
            const tid = parsed?.user?.tenant_id || parsed?.user?.tenantId;
            if (tid) await syncFromServer(tid);
          } catch {}
        }
      }
    }, 30000);

    // Initial check
    if (!isSimulated) {
      checkRealConnectivity().then(res => setIsOnline(res));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger autoSync whenever browser is online and there are pending items (Debounced)
  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (!isSyncingRef.current) {
        syncData(false);
      }
    }, 1500);
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount, isOnline]);

  // Main synchronization engine — delegates queue processing to productionSyncEngine
  const syncData = async (isManual = false) => {
    if (isSyncingRef.current) return;

    // Minimum 3-second spacing between automatic sync executions
    const now = Date.now();
    if (!isManual && now - lastSyncTimeRef.current < 3000) {
      return;
    }
    lastSyncTimeRef.current = now;

    let isReallyOnline: boolean;
    if (isOnlineRef.current) {
      isReallyOnline = true;
    } else {
      isReallyOnline = isSimulatedRef.current ? false : await checkRealConnectivity();
    }

    if (!isReallyOnline) {
      addLog('Offline: Sync postponed.');
      return;
    }

    const pendingCount = await db.syncQueue.where('status').equals('Pending').count();
    const failedCount = await db.syncQueue.where('status').equals('Failed').count();
    const totalCount = pendingCount + failedCount;

    if (totalCount === 0) return;

    if (!acquireSyncLock()) {
      addLog('Sync postponed: Another browser tab is syncing.');
      return;
    }

    setIsSyncing(true);
    isSyncingRef.current = true;
    setSyncProgress({ current: 0, total: totalCount, percentage: 0 });
    addLog(`↑ Production Sync Engine processing ${totalCount} operation(s)...`);

    let currentTenantId: string | undefined;
    const session = localStorage.getItem('dukapos_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        currentTenantId = parsed?.user?.tenant_id || parsed?.user?.tenantId;
      } catch {}
    }

    try {
      const result = await productionSyncEngine.processQueue(currentTenantId);
      if (result.syncedItems > 0) {
        addLog(`✓ Production Sync Engine synced ${result.syncedItems} item(s).`);
      }
      if (result.failedItems > 0) {
        addLog(`✗ ${result.failedItems} item(s) failed. Will retry with exponential backoff.`);
      }
    } catch (err: any) {
      addLog(`Sync processing error: ${err.message || 'Unknown error'}`);
    } finally {
      releaseSyncLock();
      setIsSyncing(false);
      isSyncingRef.current = false;
      setSyncProgress(null);
      addLog('Sync cycle complete.');
    }
  };

  // Queue an operation to local DB and sync queue
  const queueOperation = async (
    actionType: 'INSERT' | 'UPDATE' | 'DELETE',
    entityName: 'products' | 'customers' | 'orders' | 'productVariants' | string,
    payload: any,
    operationOverride?: SyncOperation
  ) => {
    if (entityName === 'products') {
      if (actionType === 'DELETE') await db.products.delete(payload.id);
      else await db.products.put(mapProductToLocal(payload));
    } else if (entityName === 'customers') {
      if (actionType === 'DELETE') await db.customers.delete(payload.id);
      else await db.customers.put({ ...payload, syncStatus: 'PENDING' });
    } else if (entityName === 'orders') {
      if (actionType === 'DELETE') await db.orders.delete(payload.id);
      else await db.orders.put({ ...payload, syncStatus: 'PENDING' });
    } else if (entityName === 'productVariants') {
      if (actionType === 'DELETE') await db.productVariants.delete(payload.id);
      else await db.productVariants.put({ ...payload, syncStatus: 'PENDING' });
    }

    const tenantId = payload.tenantId || payload.tenant_id || 'tenant-001';
    const branchId = payload.branchId || payload.branch_id || 'main-branch';
    const operation: SyncOperation = operationOverride || (actionType === 'DELETE' ? 'DELETE' : actionType === 'UPDATE' ? 'UPDATE' : 'CREATE');

    await createSyncEvent({
      tenant_id: tenantId,
      branch_id: branchId,
      entity: entityName,
      entity_id: payload.id || `ent-${Date.now()}`,
      operation,
      payload,
    });

    if (isOnlineRef.current) {
      addLog(`Queued [${operation}] on ${entityName}. Auto-syncing...`);
      setTimeout(() => syncData(false), 300);
    } else {
      addLog(`Offline: Queued [${operation}] on ${entityName}.`);
    }
  };

  // Toggle online/offline mode manually for simulation/testing
  const toggleOfflineSimulation = () => {
    const nextState = !isOnlineRef.current;
    setIsOnline(nextState);
    setIsSimulated(true);
    isSimulatedRef.current = true;

    if (nextState) {
      addLog('SIMULATION: Online mode activated.');
      setTimeout(() => syncData(true), 200);
    } else {
      addLog('SIMULATION: Offline mode activated.');
    }
  };

  return {
    isOnline,
    isSyncing,
    syncProgress,
    pendingCount,
    syncLogs,
    syncData: (isManual = true) => syncData(isManual),
    syncFromServer,
    queueOperation,
    toggleOfflineSimulation,
  };
}
