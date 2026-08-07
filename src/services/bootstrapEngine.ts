/**
 * Fast Bootstrap & Monotonic Synchronization Engine
 * Single-request compressed bootstrap snapshot restoration & background delta sync.
 */

import { db } from '../db/dexie';

export interface BootstrapSnapshotPayload {
  tenant: any;
  user: any;
  branches: any[];
  settings: Record<string, any>;
  categories: any[];
  brands: any[];
  products: any[];
  variants: any[];
  stockLedger: any[];
  customers: any[];
  permissions: any[];
  subscriptionPlans: any[];
  syncVersion: number;
  schemaVersion: number;
  generatedAt: string;
  serverTimestamp: number;
}

export class BootstrapEngine {
  private syncChannel: BroadcastChannel | null = null;
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.syncChannel = new BroadcastChannel('dukapos-sync-channel');
    }
  }

  /**
   * Execute Fast Bootstrap (<2-5 seconds UI ready target)
   * Replaces sequentialREST downloads with a single atomic snapshot restoration.
   */
  public async executeFastBootstrap(
    tenantId: string,
    user?: any,
    branchId?: string
  ): Promise<{ success: boolean; syncVersion: number; restoredCounts: Record<string, number> }> {
    const startTime = Date.now();
    console.log(`[BootstrapEngine] Initiating fast bootstrap snapshot for tenant: ${tenantId}`);

    try {
      // 1. Single compressed bootstrap snapshot POST request
      const response = await fetch('/api/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-branch-id': branchId || '',
        },
        body: JSON.stringify({ tenantId, branchId }),
      });

      if (!response.ok) {
        throw new Error(`Bootstrap snapshot API failed with status ${response.status}`);
      }

      const snapshot: BootstrapSnapshotPayload = await response.json();
      console.log(
        `[BootstrapEngine] Snapshot received (${snapshot.syncVersion} watermark) in ${Date.now() - startTime}ms`
      );

      // 2. Atomic Bulk IndexedDB Restore via Single Dexie Transaction
      const restoredCounts = await this.bulkRestoreIndexedDB(snapshot, tenantId);

      // 3. Persist Monotonic Watermark Metadata
      await db.syncMetadata.bulkPut([
        { key: 'lastSyncVersion', value: snapshot.syncVersion || 1, updatedAt: Date.now() },
        { key: 'lastBootstrapAt', value: Date.now(), updatedAt: Date.now() },
        { key: 'schemaVersion', value: snapshot.schemaVersion || 8, updatedAt: Date.now() },
        { key: 'activeTenantId', value: tenantId, updatedAt: Date.now() },
      ]);

      // 4. Multi-tab synchronization broadcast
      if (this.syncChannel) {
        this.syncChannel.postMessage({
          type: 'BOOTSTRAP_COMPLETE',
          tenantId,
          syncVersion: snapshot.syncVersion,
          timestamp: Date.now(),
        });
      }

      console.log(
        `[BootstrapEngine] Fast Bootstrap complete in ${Date.now() - startTime}ms. UI Ready!`
      );
      return { success: true, syncVersion: snapshot.syncVersion, restoredCounts };
    } catch (err: any) {
      console.warn(`[BootstrapEngine] Fast bootstrap failed: ${err?.message}. Falling back to cached local storage.`);
      return { success: false, syncVersion: 0, restoredCounts: {} };
    }
  }

  /**
   * Bulk Atomic IndexedDB Restoration
   */
  private async bulkRestoreIndexedDB(
    snapshot: BootstrapSnapshotPayload,
    tenantId: string
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    await db.transaction(
      'rw',
      [
        db.tenants,
        db.branches,
        db.categories,
        db.brands,
        db.products,
        db.productVariants,
        db.stockLedger,
        db.customers,
        db.subscriptionPlans,
        db.syncMetadata,
      ],
      async () => {
        // Tenants & Branches
        if (snapshot.tenant?.id) {
          await db.tenants.put(snapshot.tenant);
          counts.tenants = 1;
        }
        if (Array.isArray(snapshot.branches) && snapshot.branches.length > 0) {
          await db.branches.bulkPut(snapshot.branches);
          counts.branches = snapshot.branches.length;
        }

        // Categories
        if (Array.isArray(snapshot.categories) && snapshot.categories.length > 0) {
          const catsToPut = snapshot.categories.map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code || '',
            description: c.description || '',
            tenant_id: c.tenant_id || tenantId,
            parent_id: c.parent_id || null,
            sync_version: c.sync_version || 1,
            created_at: c.created_at || Date.now(),
          }));
          await db.categories.bulkPut(catsToPut);
          counts.categories = catsToPut.length;
        }

        // Brands
        if (Array.isArray(snapshot.brands) && snapshot.brands.length > 0) {
          const brandsToPut = snapshot.brands.map((b) => ({
            id: b.id,
            name: b.name,
            code: b.code || '',
            description: b.description || '',
            tenant_id: b.tenant_id || tenantId,
            sync_version: b.sync_version || 1,
            created_at: b.created_at || Date.now(),
          }));
          await db.brands.bulkPut(brandsToPut);
          counts.brands = brandsToPut.length;
        }

        // Products
        if (Array.isArray(snapshot.products) && snapshot.products.length > 0) {
          const prodsToPut = snapshot.products.map((p) => ({
            ...p,
            tenant_id: p.tenant_id || tenantId,
            price: Number(p.selling_price || p.price || 0),
            buyingPrice: Number(p.buying_price || p.cost_price || 0),
            sellingPrice: Number(p.selling_price || p.price || 0),
            stock: Number(p.stock || 0),
            hasVariants: Boolean(p.has_variants || p.hasVariants),
            syncStatus: 'SYNCED',
          }));
          await db.products.bulkPut(prodsToPut);
          counts.products = prodsToPut.length;
        }

        // Variants
        if (Array.isArray(snapshot.variants) && snapshot.variants.length > 0) {
          const varsToPut = snapshot.variants.map((v) => ({
            ...v,
            productId: v.product_id || v.productId,
            tenant_id: v.tenant_id || tenantId,
            buyingPrice: Number(v.buying_price || 0),
            sellingPrice: Number(v.selling_price || 0),
            stock: Number(v.stock || 0),
            reservedStock: Number(v.reserved_stock || 0),
            syncStatus: 'SYNCED',
          }));
          await db.productVariants.bulkPut(varsToPut);
          counts.variants = varsToPut.length;
        }

        // Stock Ledger
        if (Array.isArray(snapshot.stockLedger) && snapshot.stockLedger.length > 0) {
          await db.stockLedger.bulkPut(snapshot.stockLedger);
          counts.stockLedger = snapshot.stockLedger.length;
        }

        // Customers
        if (Array.isArray(snapshot.customers) && snapshot.customers.length > 0) {
          await db.customers.bulkPut(snapshot.customers);
          counts.customers = snapshot.customers.length;
        }

        // Subscription Plans
        if (Array.isArray(snapshot.subscriptionPlans) && snapshot.subscriptionPlans.length > 0) {
          await db.subscriptionPlans.bulkPut(snapshot.subscriptionPlans);
          counts.subscriptionPlans = snapshot.subscriptionPlans.length;
        }
      }
    );

    return counts;
  }

  /**
   * Background Incremental Delta Sync (Monotonic `sinceVersion` Watermark)
   */
  public async executeDeltaSync(tenantId: string): Promise<{ success: boolean; updatedCount: number }> {
    if (this.isSyncing) return { success: true, updatedCount: 0 };
    this.isSyncing = true;

    try {
      const watermarkObj = await db.syncMetadata.get('lastSyncVersion');
      const sinceVersion = Number(watermarkObj?.value || 0);

      const response = await fetch(`/api/sync?tenantId=${encodeURIComponent(tenantId)}&sinceVersion=${sinceVersion}`);
      if (!response.ok) {
        throw new Error(`Delta sync failed with status ${response.status}`);
      }

      const syncData = await response.json();
      const changes = syncData?.changes || {};
      let updatedCount = 0;

      await db.transaction(
        'rw',
        [db.categories, db.brands, db.products, db.productVariants, db.stockLedger, db.syncMetadata],
        async () => {
          if (Array.isArray(changes.categories) && changes.categories.length > 0) {
            await db.categories.bulkPut(changes.categories);
            updatedCount += changes.categories.length;
          }
          if (Array.isArray(changes.brands) && changes.brands.length > 0) {
            await db.brands.bulkPut(changes.brands);
            updatedCount += changes.brands.length;
          }
          if (Array.isArray(changes.products) && changes.products.length > 0) {
            const mappedProds = changes.products.map((p: any) => ({
              ...p,
              tenant_id: p.tenant_id || tenantId,
              price: Number(p.selling_price || p.price || 0),
              buyingPrice: Number(p.buying_price || p.cost_price || 0),
              sellingPrice: Number(p.selling_price || p.price || 0),
              stock: Number(p.stock || 0),
              hasVariants: Boolean(p.has_variants || p.hasVariants),
            }));
            await db.products.bulkPut(mappedProds);
            updatedCount += mappedProds.length;
          }
          if (Array.isArray(changes.productVariants) && changes.productVariants.length > 0) {
            const mappedVars = changes.productVariants.map((v: any) => ({
              ...v,
              productId: v.product_id || v.productId,
              tenant_id: v.tenant_id || tenantId,
              stock: Number(v.stock || 0),
              buyingPrice: Number(v.buying_price || 0),
              sellingPrice: Number(v.selling_price || 0),
            }));
            await db.productVariants.bulkPut(mappedVars);
            updatedCount += mappedVars.length;
          }

          const newWatermark = syncData.serverTimestamp || Date.now();
          await db.syncMetadata.put({ key: 'lastSyncVersion', value: newWatermark, updatedAt: Date.now() });
        }
      );

      return { success: true, updatedCount };
    } catch (err: any) {
      console.warn(`[BootstrapEngine] Background delta sync error: ${err?.message}`);
      return { success: false, updatedCount: 0 };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const bootstrapEngine = new BootstrapEngine();
