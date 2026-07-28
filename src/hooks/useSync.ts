import { useState, useEffect, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncItem, applyIdMappings } from '../db/dexie';
import { supabase, setMockAuthOverride } from '../db/supabaseClient';
import { mapProductToLocal } from '../services/productService';

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
}

export function useSync() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  // Use refs so interval callbacks always see the latest values without stale closures
  const isSyncingRef = useRef(false);
  const isSimulatedRef = useRef(false);
  const isOnlineRef = useRef(isOnline);

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

  const renewSyncLock = () => {
    localStorage.setItem('dukapos_sync_lock', JSON.stringify({ ts: Date.now(), tabId: currentTabId }));
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

      const headers: Record<string, string> = {
        'x-tenant-id': currentTenantId || '',
        'x-user-id': currentUserId
      };

      const url = currentTenantId
        ? `/api/products?tenantId=${encodeURIComponent(currentTenantId)}`
        : '/api/products';
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) return 0;

      const serverProducts: any[] = await res.json();
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
        ? `/api/variants?tenantId=${encodeURIComponent(currentTenantId)}`
        : '/api/variants';
      const varRes = await fetch(varUrl, { method: 'GET', headers });
      if (varRes.ok) {
        const serverVariants: any[] = await varRes.json();
        if (Array.isArray(serverVariants)) {
          for (const sv of serverVariants) {
            if (sv.deletedAt || sv.deleted_at) continue;
            const existing = await db.productVariants.get(sv.id);
            if (!existing || existing.syncStatus !== 'PENDING') {
              await db.productVariants.put({ ...sv, syncStatus: 'SYNCED', isSynced: 1 });
            }
          }
        }
      }

      // Pull customers
      const custUrl = currentTenantId
        ? `/api/customers?tenantId=${encodeURIComponent(currentTenantId)}`
        : '/api/customers';
      const custRes = await fetch(custUrl, { method: 'GET', headers });
      if (custRes.ok) {
        const serverCustomers: any[] = await custRes.json();
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
        ? `/api/orders?tenantId=${encodeURIComponent(currentTenantId)}`
        : '/api/orders';
      const orderRes = await fetch(orderUrl, { method: 'GET', headers });
      if (orderRes.ok) {
        const serverOrders: any[] = await orderRes.json();
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

  // Trigger autoSync whenever browser is online and there are pending items
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount, isOnline]);

  // Main synchronization engine — uploads local pending changes to the server
  const syncData = async () => {
    if (isSyncingRef.current) return;

    const isReallyOnline = isSimulatedRef.current ? isOnlineRef.current : await checkRealConnectivity();
    if (!isReallyOnline) {
      if (isOnlineRef.current) {
        setIsOnline(false);
        addLog('Server ping failed. Postponing synchronization.');
      }
      return;
    }

    const items = await db.syncQueue.where('status').equals('Pending').toArray();
    if (items.length === 0) return;

    if (!acquireSyncLock()) {
      addLog('Sync postponed: Another browser tab is syncing.');
      return;
    }

    setIsSyncing(true);
    isSyncingRef.current = true;
    setSyncProgress({ current: 0, total: items.length, percentage: 0 });
    addLog(`↑ Syncing ${items.length} pending operation(s) to server...`);

    let processedCount = 0;

    for (const item of items) {
      if (item.id === undefined) continue;
      renewSyncLock();
      processedCount++;
      setSyncProgress({
        current: processedCount,
        total: items.length,
        percentage: Math.round((processedCount / items.length) * 100)
      });

      // AUTH CONTEXT impersonation for sync engine
      const itemTenantId = (item.payload as any)?.tenantId || (item.payload as any)?.tenant_id || null;
      const itemUserId   = (item.payload as any)?.createdBy || (item.payload as any)?.created_by ||
                           (item.payload as any)?.updatedBy || 'usr-sync-engine';
      if (itemTenantId) {
        setMockAuthOverride({ tenant_id: itemTenantId, user_id: itemUserId, user_name: 'Sync Engine' });
      }

      try {
        await db.syncQueue.update(item.id, { status: 'Processing' });
        addLog(`  → ${item.entityName} [${item.actionType}]`);

        let response: { data: any; error: any } | undefined;

        if (item.entityName === 'products') {
          // CONFLICT RESOLUTION: check server version before UPDATE/DELETE
          if (item.actionType === 'UPDATE' || item.actionType === 'DELETE') {
            const { data: serverProds } = await supabase.from('products').select('*').eq('id', item.payload.id);
            if (serverProds && serverProds.length > 0) {
              const serverRecord = serverProds[0];
              const localVersion = item.payload.version || 1;
              const serverVersion = serverRecord.version || 1;

              if (serverVersion > localVersion) {
                addLog(`Conflict: Server v${serverVersion} > local v${localVersion}. Using server version.`);
                const localFormat = mapProductToLocal({ ...serverRecord, syncStatus: 'SYNCED' });
                await db.products.put(localFormat);
                await db.syncQueue.delete(item.id);
                continue;
              } else if (serverVersion === localVersion && JSON.stringify(serverRecord) !== JSON.stringify(item.payload)) {
                addLog(`Conflict: Same version, different content. Applying Last Write Wins.`);
                item.payload.version = localVersion + 1;
              }
            }
          }

          if (item.actionType === 'DELETE') {
            response = await supabase.from('products').delete().eq('id', item.payload.id);
          } else if (item.actionType === 'INSERT') {
            response = await supabase.from('products').insert(item.payload);
          } else if (item.actionType === 'UPDATE') {
            response = await supabase.from('products').update(item.payload).eq('id', item.payload.id);
          }

          // ID MAPPING RECONCILIATION (for offline-created products with temp IDs)
          if (item.actionType === 'INSERT' && response != null && response.data?.length > 0) {
            const serverProd = response.data[0];
            const oldClientId = item.payload.id;
            const newServerId  = serverProd.id;
            const mappings: Record<string, string> = {};
            if (oldClientId !== newServerId) mappings[oldClientId] = newServerId;

            const serverVariants: any[] = serverProd.variants || [];
            for (const sv of serverVariants) {
              if (sv.clientId && sv.id && sv.clientId !== sv.id) mappings[sv.clientId] = sv.id;
            }

            if (Object.keys(mappings).length > 0) {
              addLog('  ↔ Reconciling temporary IDs...');
              await applyIdMappings(mappings, item.payload.tenantId || item.payload.tenant_id || '');
            } else {
              await db.products.update(oldClientId, { syncStatus: 'SYNCED', isSynced: 1 } as any);
            }
          }

          if ((item.actionType === 'UPDATE' || item.actionType === 'DELETE') && response && !response.error) {
            await db.products.update(item.payload.id, { syncStatus: 'SYNCED' } as any);
          }

        } else if (item.entityName === 'productVariants') {
          if (item.actionType === 'DELETE') {
            response = await supabase.from('product_variants').delete().eq('id', item.payload.id);
          } else if (item.actionType === 'INSERT') {
            response = await supabase.from('product_variants').insert(item.payload);
          } else if (item.actionType === 'UPDATE') {
            response = await supabase.from('product_variants').update(item.payload).eq('id', item.payload.id);
          }
          if (response && !response.error) {
            await db.productVariants.update(item.payload.id, { syncStatus: 'SYNCED', isSynced: 1 } as any);
          }

        } else if (item.entityName === 'customers') {
          if (item.actionType === 'DELETE') {
            response = await supabase.from('customers').delete().eq('id', item.payload.id);
          } else if (item.actionType === 'INSERT') {
            response = await supabase.from('customers').insert(item.payload);
          } else if (item.actionType === 'UPDATE') {
            response = await supabase.from('customers').update(item.payload).eq('id', item.payload.id);
          }
          if (response && !response.error) {
            await db.customers.update(item.payload.id, { syncStatus: 'SYNCED' } as any);
          }

        } else if (item.entityName === 'orders') {
          if (item.actionType === 'DELETE') {
            response = await supabase.from('orders').delete().eq('id', item.payload.id);
          } else if (item.actionType === 'INSERT') {
            response = await supabase.from('orders').insert(item.payload);
          } else if (item.actionType === 'UPDATE') {
            response = await supabase.from('orders').update(item.payload).eq('id', item.payload.id);
          }
          if (response && !response.error) {
            await db.orders.update(item.payload.id, { syncStatus: 'SYNCED' } as any);
          }
        }

        if (response?.error) {
          throw new Error(response.error.message);
        }

        await db.syncQueue.delete(item.id);
        addLog(`  ✓ ${item.entityName} synced.`);
      } catch (error: any) {
        console.error('Failed to sync item:', item, error);
        await db.syncQueue.update(item.id, { status: 'Failed' });
        addLog(`  ✗ ${item.entityName} failed: ${error.message || 'Unknown error'}. Will retry.`);
      } finally {
        setMockAuthOverride(null);
      }
    }

    releaseSyncLock();
    setIsSyncing(false);
    isSyncingRef.current = false;
    setSyncProgress(null);
    addLog('Sync cycle complete.');
  };

  // Queue an operation to local DB and sync queue
  const queueOperation = async (
    actionType: 'INSERT' | 'UPDATE' | 'DELETE',
    entityName: 'products' | 'customers' | 'orders' | 'productVariants',
    payload: any
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

    const syncItem: SyncItem = {
      actionType,
      entityName,
      payload,
      timestamp: Date.now(),
      status: 'Pending'
    };

    await db.syncQueue.add(syncItem);

    if (isOnlineRef.current) {
      addLog(`Queued ${actionType} on ${entityName}. Auto-syncing...`);
      setTimeout(syncData, 100);
    } else {
      addLog(`Offline: Queued ${actionType} on ${entityName}.`);
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
      setTimeout(syncData, 200);
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
    syncData,
    syncFromServer,
    queueOperation,
    toggleOfflineSimulation,
  };
}
