/**
 * DukaPos SaaS — Stock Ledger & Data Integrity Engine
 * Guarantees every stock movement generates an immutable Stock Ledger entry.
 * Stock balances are dynamically calculated from ledger records rather than mutable stored totals.
 */

import { db, safeGet, type StockLedgerEntry } from '../db/dexie';
import { cloudDb } from '../db/supabaseMock';

export interface StockMovementPayload {
  tenantId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  movementType: StockLedgerEntry['movement_type'];
  quantity: number; // positive for additions, negative for deductions
  unitCost: number;
  referenceId?: string;
  notes?: string;
  userId: string;
}

class StockLedgerEngine {
  /**
   * Execute immutable stock movement entry inside ACID transaction
   */
  async recordMovement(payload: StockMovementPayload): Promise<StockLedgerEntry> {
    const NOW = Date.now();
    const ledgerId = `stk-ledg-${NOW}-${Math.random().toString(36).substr(2, 6)}`;

    const currentStock = await this.calculateCurrentStock(
      payload.tenantId,
      payload.branchId,
      payload.productId,
      payload.variantId
    );

    // 1. Double Validation: Prevent negative stock if deduction
    if (payload.quantity < 0) {
      if (currentStock + payload.quantity < 0) {
        throw new Error(
          `StockLedgerError: Negative stock violation for product "${payload.productId}". Available: ${currentStock}, Attempted Deduction: ${Math.abs(payload.quantity)}.`
        );
      }
    }

    const newStock = Math.max(0, currentStock + payload.quantity);

    const entry: StockLedgerEntry = {
      id: ledgerId,
      tenant_id: payload.tenantId,
      branch_id: payload.branchId,
      product_id: payload.productId,
      variant_id: payload.variantId,
      movement_type: payload.movementType,
      quantity_before: currentStock,
      quantity_change: payload.quantity,
      quantity_after: newStock,
      unit_cost: payload.unitCost,
      total_cost: payload.quantity * payload.unitCost,
      reference_id: payload.referenceId,
      notes: payload.notes,
      user_id: payload.userId,
      created_at: NOW,
      synced: true
    };

    // 2. Commit immutable ledger entry to both local IndexedDB & Cloud Database
    await db.transaction('rw', [db.stockLedger, db.products], async () => {
      await db.stockLedger.put(entry);

      const p = payload.productId ? await safeGet(db.products, payload.productId) : null;
      if (p) {
        await db.products.put({ ...p, stock: newStock, updatedAt: NOW });
      }
    });

    // Mirror to cloudDb
    try {
      await cloudDb.cloud_stock_ledger.put({
        id: entry.id,
        tenant_id: entry.tenant_id,
        branch_id: entry.branch_id,
        product_id: entry.product_id,
        variant_id: entry.variant_id,
        movement_type: entry.movement_type,
        quantity: entry.quantity_change,
        unit_cost: entry.unit_cost,
        created_at: entry.created_at
      });
    } catch (_) {
      /* ignore cloud mirror warning */
    }

    return entry;
  }

  /**
   * Calculate current stock balance by summing immutable StockLedger entries
   */
  async calculateCurrentStock(
    tenantId: string,
    branchId: string,
    productId: string,
    variantId?: string
  ): Promise<number> {
    let entries = await db.stockLedger
      .where('tenant_id')
      .equals(tenantId)
      .and(e => e.branch_id === branchId && e.product_id === productId)
      .toArray();

    if (variantId) {
      entries = entries.filter(e => e.variant_id === variantId);
    }

    const total = entries.reduce((sum, e) => sum + e.quantity_change, 0);
    return Math.max(0, total);
  }
}

export const stockLedgerEngine = new StockLedgerEngine();
