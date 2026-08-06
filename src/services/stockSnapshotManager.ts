/**
 * stockSnapshotManager.ts
 * Materialized Inventory Snapshot Manager for DukaPos SaaS.
 * 
 * Accelerates inventory valuation & historical reporting by creating periodic
 * deterministic stock balance checkpoints without replaying full event chains from genesis.
 */

import { db } from '../db/dexie';
import type { StockSnapshot } from '../types/stockSync';

function generateHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export const stockSnapshotManager = {

  /**
   * Generates a Materialized Stock Snapshot for a specific branch & product/variant
   */
  async createSnapshot(tenantId: string, branchId: string, productId: string, variantId: string = 'no-variant'): Promise<StockSnapshot | null> {
    const cacheKey = [branchId, productId, variantId];
    const balance = await db.stockBalance.where('[branch_id+product_id+variant_id]').equals(cacheKey).first();
    if (!balance) return null;

    const lastEvent = await db.stockLedger
      .where('tenant_id').equals(tenantId)
      .and(e => e.branch_id === branchId && e.product_id === productId && (variantId === 'no-variant' ? (!e.variant_id || e.variant_id === 'no-variant') : e.variant_id === variantId))
      .reverse()
      .first();

    const snapshotVersion = lastEvent?.event_version || 1;
    const lastEventId = lastEvent?.id || 'genesis';

    const checksumStr = `${tenantId}:${branchId}:${productId}:${variantId}:${balance.current_quantity}:${balance.average_cost}:${snapshotVersion}`;
    const checksum = generateHash(checksumStr);

    const snapshot: StockSnapshot = {
      id: `snap-${branchId}-${productId}-${variantId}`,
      tenant_id: tenantId,
      branch_id: branchId,
      product_id: productId,
      variant_id: variantId,
      snapshot_version: snapshotVersion,
      balance_quantity: balance.current_quantity,
      average_cost: balance.average_cost,
      stock_value: balance.stock_value,
      last_event_id: lastEventId,
      checksum,
      created_at: Date.now()
    };

    return snapshot;
  },

  /**
   * Detects inventory balance drift by comparing materialized stockBalance against event-replay totals.
   */
  async detectDrift(tenantId: string, branchId: string): Promise<{ totalChecked: number; driftCount: number; driftedProducts: string[] }> {
    const activeProducts = await db.products
      .where('tenant_id').equals(tenantId)
      .and(p => !p.deletedAt && !(p as any).deleted_at && p.status !== 'Inactive')
      .toArray();

    let driftCount = 0;
    const driftedProducts: string[] = [];

    for (const prod of activeProducts) {
      const balance = await db.stockBalance.where('[branch_id+product_id+variant_id]').equals([branchId, prod.id, 'no-variant']).first();
      if (!balance) continue;

      const events = await db.stockLedger
        .where('tenant_id').equals(tenantId)
        .and(e => e.branch_id === branchId && e.product_id === prod.id)
        .toArray();

      let replayedQty = 0;
      for (const evt of events) {
        const isInc = ['OPENING_STOCK','PURCHASE_RECEIVE','CUSTOMER_RETURN','TRANSFER_IN','PRODUCTION_OUTPUT','ADJUSTMENT_GAIN'].includes(evt.movement_type);
        const change = Math.abs(evt.quantity_change);
        replayedQty = isInc ? replayedQty + change : Math.max(0, replayedQty - change);
      }

      replayedQty = Math.round(replayedQty * 1000) / 1000;
      if (Math.abs(replayedQty - balance.current_quantity) > 0.001) {
        driftCount++;
        driftedProducts.push(prod.name || prod.id);
      }
    }

    return {
      totalChecked: activeProducts.length,
      driftCount,
      driftedProducts
    };
  }
};
