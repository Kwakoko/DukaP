/**
 * inventoryService.ts
 * Production-grade Inventory Service for DukaPos SaaS.
 *
 * Provides a clean service API for all complex inventory operations.
 * Every stock mutation goes through recordStockMovement() — the ledger
 * is always the single source of truth.
 */

import {
  db,
  type BatchLot,
  type SerialNumber,
  type StockTransfer,
  type StockTransferItem,
  type PhysicalCount,
  type PhysicalCountItem,
  type ReorderRule,
  type InventoryValuation,
  type ExpiryAlert,
  type WastageLog,
  recordStockMovement,
} from '../db/dexie';

// ─── Helper: generate a short prefixed UUID ────────────────────────────────
function uid(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

function nowMs(): number { return Date.now(); }

// ─── Dashboard KPIs ────────────────────────────────────────────────────────
export interface InventoryKPIs {
  totalProducts: number;
  totalVariants: number;
  totalStockValue: number;       // FIFO-based total value
  lowStockCount: number;
  outOfStockCount: number;
  overstockCount: number;
  expiringThisMonth: number;
  expiredCount: number;
  todayMovements: number;
  pendingTransfers: number;
  pendingCounts: number;
  reorderAlertCount: number;
  fastMovingCount: number;
  slowMovingCount: number;
}

export async function getDashboardKPIs(
  tenantId: string,
  _branchId: string
): Promise<InventoryKPIs> {
  const [
    products,
    variants,
    stockBalances,
    batches,
    reorderRules,
    transfers,
    counts,
    ledger30,
  ] = await Promise.all([
    db.products.where('tenant_id').equals(tenantId).toArray(),
    db.productVariants.where('tenant_id').equals(tenantId).toArray(),
    db.stockBalance.where('tenant_id').equals(tenantId).toArray(),
    db.batchLots.where('tenant_id').equals(tenantId).toArray(),
    db.reorderRules.where('tenant_id').equals(tenantId).toArray(),
    db.stockTransfers.where('tenant_id').equals(tenantId).toArray(),
    db.physicalCounts.where('tenant_id').equals(tenantId).toArray(),
    db.stockLedger.where('tenant_id').equals(tenantId).toArray(),
  ]);

  const now = nowMs();
  const dayMs = 86_400_000;
  const todayStart = now - (now % dayMs);
  const monthEnd = now + 30 * dayMs;

  // Stock value from balances
  const totalStockValue = stockBalances.reduce((s, b) => s + (b.stock_value || 0), 0);

  // Low / out / overstock (checking both simple products and product variants)
  let lowStockCount = 0, outOfStockCount = 0, overstockCount = 0;
  for (const p of products) {
    if (!p.hasVariants) {
      const rule = reorderRules.find(r => r.product_id === p.id && !r.variant_id);
      const min = rule?.min_quantity ?? 10;
      const max = rule?.max_quantity ?? 1000;
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock < min) lowStockCount++;
      else if (p.stock > max) overstockCount++;
    }
  }

  for (const v of variants) {
    const rule = reorderRules.find(r => r.variant_id === v.id || (r.product_id === v.productId && r.variant_id === v.id));
    const min = rule?.min_quantity ?? v.reorderLevel ?? 5;
    const max = rule?.max_quantity ?? 1000;
    if (v.stock <= 0) outOfStockCount++;
    else if (v.stock < min) lowStockCount++;
    else if (v.stock > max) overstockCount++;
  }

  // Expiry
  const expiredCount  = batches.filter(b => b.expiry_date && b.expiry_date < now && b.status === 'Active').length;
  const expiringThisMonth = batches.filter(b => b.expiry_date && b.expiry_date >= now && b.expiry_date <= monthEnd && b.status === 'Active').length;

  // Today's movements
  const todayMovements = ledger30.filter(l => l.created_at >= todayStart).length;

  // Pending transfers
  const pendingTransfers = transfers.filter(t => ['Pending', 'In Transit'].includes(t.status)).length;

  // Pending counts
  const pendingCounts = counts.filter(c => ['Draft', 'Counting', 'Pending Approval'].includes(c.status)).length;

  // Reorder alerts
  const reorderAlertCount = reorderRules.filter(r => {
    if (!r.is_active) return false;
    const prod = products.find(p => p.id === r.product_id);
    return prod && prod.stock < r.min_quantity;
  }).length;

  // Fast/Slow moving (last 30 days)
  const thirtyDaysAgo = now - 30 * dayMs;
  const salesLedger = ledger30.filter(l => l.movement_type === 'SALE' && l.created_at >= thirtyDaysAgo);
  const soldProductIds = new Set(salesLedger.map(l => l.product_id));
  const fastMovingCount = soldProductIds.size;
  const slowMovingCount = products.filter(p => p.stock > 0 && !soldProductIds.has(p.id)).length;

  return {
    totalProducts: products.length,
    totalVariants: variants.length,
    totalStockValue,
    lowStockCount,
    outOfStockCount,
    overstockCount,
    expiringThisMonth,
    expiredCount,
    todayMovements,
    pendingTransfers,
    pendingCounts,
    reorderAlertCount,
    fastMovingCount,
    slowMovingCount,
  };
}

// ─── 7-Day Movement Summary ────────────────────────────────────────────────
export interface DailyMovement {
  date: string;       // e.g. "Mon"
  inbound: number;
  outbound: number;
}

export async function get7DayMovements(tenantId: string): Promise<DailyMovement[]> {
  const now = nowMs();
  const dayMs = 86_400_000;
  const result: DailyMovement[] = [];
  const INBOUND = ['OPENING_STOCK','PURCHASE_RECEIVE','CUSTOMER_RETURN','TRANSFER_IN','PRODUCTION_OUTPUT','ADJUSTMENT_GAIN'];

  for (let i = 6; i >= 0; i--) {
    const dayStart = now - i * dayMs - (now % dayMs);
    const dayEnd   = dayStart + dayMs;
    const entries  = await db.stockLedger
      .where('tenant_id').equals(tenantId)
      .and(e => e.created_at >= dayStart && e.created_at < dayEnd)
      .toArray();

    const dayLabel = new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' });
    result.push({
      date: dayLabel,
      inbound:  entries.filter(e => INBOUND.includes(e.movement_type)).reduce((s,e) => s + Math.abs(e.quantity_change), 0),
      outbound: entries.filter(e => !INBOUND.includes(e.movement_type)).reduce((s,e) => s + Math.abs(e.quantity_change), 0),
    });
  }
  return result;
}

// ─── FIFO Valuation ────────────────────────────────────────────────────────
export async function computeFIFOValuation(
  productId: string,
  tenantId: string,
  branchId: string
): Promise<{ quantity: number; unitValue: number; totalValue: number }> {
  // Use batches for FIFO if they exist
  const batches = await db.batchLots
    .where('product_id').equals(productId)
    .and(b => b.tenant_id === tenantId && b.branch_id === branchId && b.status === 'Active')
    .sortBy('received_date');

  if (batches.length > 0) {
    let totalQty = 0, totalCost = 0;
    for (const b of batches) {
      totalQty  += b.quantity_remaining;
      totalCost += b.quantity_remaining * b.unit_cost;
    }
    const unitValue = totalQty > 0 ? totalCost / totalQty : 0;
    return { quantity: totalQty, unitValue, totalValue: totalCost };
  }

  // Fall back to stock balance average cost
  const bal = await db.stockBalance
    .where('[branch_id+product_id+variant_id]')
    .equals([branchId, productId, 'no-variant'])
    .first();

  if (bal) {
    return { quantity: bal.current_quantity, unitValue: bal.average_cost, totalValue: bal.stock_value };
  }
  return { quantity: 0, unitValue: 0, totalValue: 0 };
}

// ─── WAC Valuation ────────────────────────────────────────────────────────
export async function computeWeightedAvgCost(
  productId: string,
  tenantId: string,
  branchId: string
): Promise<{ quantity: number; unitValue: number; totalValue: number }> {
  const INBOUND = ['OPENING_STOCK','PURCHASE_RECEIVE','CUSTOMER_RETURN','PRODUCTION_OUTPUT','ADJUSTMENT_GAIN'];
  const entries = await db.stockLedger
    .where('product_id').equals(productId)
    .and(e => e.tenant_id === tenantId && e.branch_id === branchId)
    .toArray();

  let runningQty = 0, runningCost = 0;
  const sorted = [...entries].sort((a, b) => a.created_at - b.created_at);
  for (const e of sorted) {
    if (INBOUND.includes(e.movement_type)) {
      const newQty = runningQty + e.quantity_change;
      if (newQty > 0) {
        runningCost = ((runningCost * runningQty) + (e.unit_cost * e.quantity_change)) / newQty;
      }
      runningQty = newQty;
    } else {
      runningQty = Math.max(0, runningQty + e.quantity_change);
    }
  }

  return {
    quantity: runningQty,
    unitValue: runningCost,
    totalValue: runningQty * runningCost,
  };
}

// ─── Inventory Valuation Report ────────────────────────────────────────────
export async function generateValuationReport(
  tenantId: string,
  branchId: string,
  method: 'FIFO' | 'WAC' = 'FIFO'
): Promise<InventoryValuation[]> {
  const products = await db.products.where('tenant_id').equals(tenantId).toArray();
  const valuations: InventoryValuation[] = [];

  for (const prod of products) {
    const val = method === 'FIFO'
      ? await computeFIFOValuation(prod.id, tenantId, branchId)
      : await computeWeightedAvgCost(prod.id, tenantId, branchId);

    valuations.push({
      id: uid('val'),
      tenant_id: tenantId,
      branch_id: branchId,
      product_id: prod.id,
      product_name: prod.name,
      method,
      quantity: val.quantity,
      unit_value: val.unitValue,
      total_value: val.totalValue,
      computed_at: nowMs(),
    });
  }
  return valuations;
}

// ─── Expiry Management ────────────────────────────────────────────────────
export async function refreshExpiryAlerts(
  tenantId: string,
  branchId: string
): Promise<ExpiryAlert[]> {
  const now = nowMs();
  const dayMs = 86_400_000;
  const todayEnd  = now + dayMs;
  const weekEnd   = now + 7 * dayMs;
  const monthEnd  = now + 30 * dayMs;

  const batches = await db.batchLots
    .where('tenant_id').equals(tenantId)
    .and(b => b.branch_id === branchId && b.status === 'Active' && !!b.expiry_date)
    .toArray();

  const alerts: ExpiryAlert[] = [];
  for (const b of batches) {
    const exp = b.expiry_date!;
    let level: ExpiryAlert['alert_level'] | null = null;
    if      (exp < now)      level = 'EXPIRED';
    else if (exp < todayEnd) level = 'TODAY';
    else if (exp < weekEnd)  level = 'WEEK';
    else if (exp < monthEnd) level = 'MONTH';
    if (!level) continue;

    const prod = await db.products.get(b.product_id);
    alerts.push({
      id: uid('exp-alert'),
      tenant_id: tenantId,
      branch_id: branchId,
      product_id: b.product_id,
      product_name: prod?.name ?? 'Unknown',
      batch_id: b.id,
      batch_number: b.batch_number,
      expiry_date: exp,
      quantity_remaining: b.quantity_remaining,
      alert_level: level,
      is_dismissed: false,
      created_at: nowMs(),
    });
  }

  // Upsert into db
  await db.expiryAlerts.bulkPut(alerts);
  return alerts;
}

// ─── Reorder Rule Evaluation ───────────────────────────────────────────────
export interface ReorderAlert {
  rule: ReorderRule;
  productName: string;
  currentStock: number;
  deficit: number;
}

export async function evaluateReorderRules(
  tenantId: string,
  branchId: string
): Promise<ReorderAlert[]> {
  const rules = await db.reorderRules
    .where('tenant_id').equals(tenantId)
    .and(r => r.branch_id === branchId && r.is_active)
    .toArray();

  const alerts: ReorderAlert[] = [];
  for (const rule of rules) {
    const prod = await db.products.get(rule.product_id);
    if (!prod) continue;
    const stock = rule.variant_id
      ? (await db.productVariants.get(rule.variant_id))?.stock ?? 0
      : prod.stock;
    if (stock < rule.min_quantity) {
      alerts.push({
        rule,
        productName: prod.name,
        currentStock: stock,
        deficit: rule.min_quantity - stock,
      });
    }
  }
  return alerts;
}

// ─── Batch / Lot Management ────────────────────────────────────────────────
export async function receiveBatchLot(params: {
  tenantId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  batchNumber: string;
  lotNumber?: string;
  supplierName?: string;
  manufacturingDate?: number;
  expiryDate?: number;
  quantityReceived: number;
  unitCost: number;
  notes?: string;
  createdBy: string;
}): Promise<BatchLot> {
  const batch: BatchLot = {
    id: uid('batch'),
    tenant_id: params.tenantId,
    branch_id: params.branchId,
    product_id: params.productId,
    variant_id: params.variantId,
    batch_number: params.batchNumber,
    lot_number: params.lotNumber,
    supplier_name: params.supplierName,
    manufacturing_date: params.manufacturingDate,
    expiry_date: params.expiryDate,
    received_date: nowMs(),
    quantity_received: params.quantityReceived,
    quantity_remaining: params.quantityReceived,
    unit_cost: params.unitCost,
    status: 'Active',
    notes: params.notes,
    created_by: params.createdBy,
    created_at: nowMs(),
  };
  await db.batchLots.put(batch);

  // Record as PURCHASE_RECEIVE in ledger
  await recordStockMovement({
    tenant_id: params.tenantId,
    branch_id: params.branchId,
    product_id: params.productId,
    variant_id: params.variantId,
    movement_type: 'PURCHASE_RECEIVE',
    reference_type: 'BATCH_RECEIVE',
    reference_id: batch.id,
    quantity_change: params.quantityReceived,
    unit_cost: params.unitCost,
    total_cost: params.unitCost * params.quantityReceived,
    user_id: params.createdBy,
    notes: `Batch ${params.batchNumber} received${params.expiryDate ? ` | Expiry: ${new Date(params.expiryDate).toLocaleDateString()}` : ''}`,
  });

  return batch;
}

// ─── Serial Number Tracking ────────────────────────────────────────────────
export async function addSerialNumbers(params: {
  tenantId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  serials: { serial_number: string; imei?: string; warranty_expires?: number }[];
  createdBy?: string;
}): Promise<SerialNumber[]> {
  const records: SerialNumber[] = params.serials.map(s => ({
    id: uid('sn'),
    tenant_id: params.tenantId,
    branch_id: params.branchId,
    product_id: params.productId,
    variant_id: params.variantId,
    serial_number: s.serial_number,
    imei: s.imei,
    warranty_expires: s.warranty_expires,
    status: 'Available' as const,
    created_at: nowMs(),
  }));
  await db.serialNumbers.bulkPut(records);
  return records;
}

// ─── Stock Transfer ────────────────────────────────────────────────────────
export async function createStockTransfer(params: {
  tenantId: string;
  fromBranchId: string;
  fromWarehouseId?: string;
  toBranchId: string;
  toWarehouseId?: string;
  items: { productId: string; variantId?: string; productName: string; sku: string; qtyRequested: number; unitCost: number }[];
  notes?: string;
  requestedBy: string;
}): Promise<StockTransfer> {
  const now = nowMs();
  const transferNumber = `TRF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

  const transfer: StockTransfer = {
    id: uid('transfer'),
    transfer_number: transferNumber,
    tenant_id: params.tenantId,
    from_branch_id: params.fromBranchId,
    from_warehouse_id: params.fromWarehouseId,
    to_branch_id: params.toBranchId,
    to_warehouse_id: params.toWarehouseId,
    status: 'Draft',
    notes: params.notes,
    requested_by: params.requestedBy,
    created_at: now,
  };
  await db.stockTransfers.put(transfer);

  // Save transfer items
  for (const item of params.items) {
    const tItem: StockTransferItem = {
      id: uid('ti'),
      transfer_id: transfer.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      sku: item.sku,
      qty_requested: item.qtyRequested,
      unit_cost: item.unitCost,
    };
    await db.stockTransferItems.put(tItem);
  }
  return transfer;
}

export async function submitTransfer(transferId: string, approvedBy: string): Promise<void> {
  const transfer = await db.stockTransfers.get(transferId);
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.status !== 'Draft') throw new Error(`Cannot submit: status is ${transfer.status}`);

  const items = await db.stockTransferItems.where('transfer_id').equals(transferId).toArray();

  // Deduct stock from source branch (TRANSFER_OUT ledger entries)
  for (const item of items) {
    await recordStockMovement({
      tenant_id: transfer.tenant_id,
      branch_id: transfer.from_branch_id,
      warehouse_id: transfer.from_warehouse_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      movement_type: 'TRANSFER_OUT',
      reference_type: 'STOCK_TRANSFER',
      reference_id: transferId,
      quantity_change: -item.qty_requested,
      unit_cost: item.unit_cost,
      total_cost: item.unit_cost * item.qty_requested,
      user_id: approvedBy,
      notes: `Transfer ${transfer.transfer_number} → Branch ${transfer.to_branch_id}`,
    });
  }

  await db.stockTransfers.update(transferId, {
    status: 'In Transit',
    approved_by: approvedBy,
    sent_at: nowMs(),
  });
}

export async function receiveTransfer(
  transferId: string,
  receivedBy: string,
  receivedItems: { itemId: string; qtyReceived: number }[]
): Promise<void> {
  const transfer = await db.stockTransfers.get(transferId);
  if (!transfer) throw new Error('Transfer not found');

  for (const ri of receivedItems) {
    const item = await db.stockTransferItems.get(ri.itemId);
    if (!item) continue;

    // Update received qty on item
    await db.stockTransferItems.update(ri.itemId, {
      qty_received: ri.qtyReceived,
      qty_sent: item.qty_requested,
    });

    // Credit destination branch (TRANSFER_IN ledger entry)
    await recordStockMovement({
      tenant_id: transfer.tenant_id,
      branch_id: transfer.to_branch_id,
      warehouse_id: transfer.to_warehouse_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      movement_type: 'TRANSFER_IN',
      reference_type: 'STOCK_TRANSFER',
      reference_id: transferId,
      quantity_change: ri.qtyReceived,
      unit_cost: item.unit_cost,
      total_cost: item.unit_cost * ri.qtyReceived,
      user_id: receivedBy,
      notes: `Received from transfer ${transfer.transfer_number} from Branch ${transfer.from_branch_id}`,
    });
  }

  // Determine final status (Partial or Received)
  const allItems = await db.stockTransferItems.where('transfer_id').equals(transferId).toArray();
  const allFull  = allItems.every(i => (i.qty_received ?? 0) >= i.qty_requested);
  const anyRcvd  = allItems.some(i => (i.qty_received ?? 0) > 0);
  const finalStatus: StockTransfer['status'] = allFull ? 'Received' : anyRcvd ? 'Partial' : 'In Transit';

  await db.stockTransfers.update(transferId, {
    status: finalStatus,
    received_by: receivedBy,
    received_at: nowMs(),
  });
}

// ─── Physical Stock Count ──────────────────────────────────────────────────
export async function createPhysicalCount(params: {
  tenantId: string;
  branchId: string;
  warehouseId?: string;
  notes?: string;
  createdBy: string;
  module?: string; // Add module filter
}): Promise<PhysicalCount> {
  const now = nowMs();
  const countNumber = `CNT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

  // Pre-populate items from current stock balances (filtered by active module if supplied)
  const products = await db.products
    .where('tenant_id').equals(params.tenantId)
    .and(p => p.branch_id === params.branchId && (!params.module || p.module === params.module))
    .toArray();

  const count: PhysicalCount = {
    id: uid('count'),
    count_number: countNumber,
    tenant_id: params.tenantId,
    branch_id: params.branchId,
    warehouse_id: params.warehouseId,
    status: 'Draft',
    total_items: products.length,
    variance_items: 0,
    variance_value: 0,
    notes: params.notes,
    created_by: params.createdBy,
    created_at: now,
  };
  await db.physicalCounts.put(count);

  // Pre-populate count items with system quantities
  const countItems: PhysicalCountItem[] = [];
  for (const prod of products) {
    if (prod.hasVariants) {
      const variants = await db.productVariants.where('productId').equals(prod.id).toArray();
      for (const v of variants) {
        countItems.push({
          id: uid('ci'),
          count_id: count.id,
          product_id: prod.id,
          variant_id: v.id,
          product_name: `${prod.name} — ${Object.values(v.attributes).join(' / ')}`,
          sku: v.sku,
          system_quantity: v.stock,
          counted_quantity: -1, // -1 = not yet counted
          variance: 0,
          unit_cost: v.buyingPrice ?? prod.buyingPrice,
        });
      }
    } else {
      countItems.push({
        id: uid('ci'),
        count_id: count.id,
        product_id: prod.id,
        product_name: prod.name,
        sku: prod.sku ?? prod.id.slice(-8),
        system_quantity: prod.stock,
        counted_quantity: -1,
        variance: 0,
        unit_cost: prod.buyingPrice,
      });
    }
  }
  await db.physicalCountItems.bulkPut(countItems);

  // Update total items to reflect variant count if applicable
  await db.physicalCounts.update(count.id, { total_items: countItems.length });
  count.total_items = countItems.length;

  return count;
}

export async function updateCountItem(
  itemId: string,
  countedQuantity: number
): Promise<void> {
  const item = await db.physicalCountItems.get(itemId);
  if (!item) return;
  const variance = countedQuantity >= 0 ? countedQuantity - item.system_quantity : 0;
  await db.physicalCountItems.update(itemId, { counted_quantity: countedQuantity, variance });
}

export async function submitCountForApproval(countId: string): Promise<void> {
  const items = await db.physicalCountItems.where('count_id').equals(countId).toArray();
  const varianceItems = items.filter(i => i.counted_quantity >= 0 && i.variance !== 0);
  const count = await db.physicalCounts.get(countId);
  if (!count) return;

  const varianceValue = varianceItems.reduce((s, i) => s + Math.abs(i.variance * i.unit_cost), 0);

  await db.physicalCounts.update(countId, {
    status: 'Pending Approval',
    variance_items: varianceItems.length,
    variance_value: varianceValue,
  });
}

export async function approvePhysicalCount(countId: string, approvedBy: string): Promise<void> {
  const count = await db.physicalCounts.get(countId);
  if (!count) throw new Error('Count not found');
  if (count.status !== 'Pending Approval') throw new Error('Count is not pending approval');

  const items = await db.physicalCountItems.where('count_id').equals(countId).toArray();

  // Create ledger adjustment for each item with a variance
  for (const item of items) {
    if (item.counted_quantity < 0 || item.variance === 0) continue;

    const movementType = item.variance > 0 ? 'ADJUSTMENT_GAIN' : 'ADJUSTMENT_LOSS';
    await recordStockMovement({
      tenant_id: count.tenant_id,
      branch_id: count.branch_id,
      warehouse_id: count.warehouse_id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      movement_type: movementType,
      reference_type: 'PHYSICAL_COUNT',
      reference_id: countId,
      quantity_change: item.variance,
      unit_cost: item.unit_cost,
      total_cost: Math.abs(item.variance) * item.unit_cost,
      user_id: approvedBy,
      notes: `Physical count ${count.count_number} — variance: ${item.variance > 0 ? '+' : ''}${item.variance}`,
    });
  }

  await db.physicalCounts.update(countId, {
    status: 'Approved',
    approved_by: approvedBy,
    approved_at: nowMs(),
  });
}

// ─── Reorder Rule CRUD ─────────────────────────────────────────────────────
export async function saveReorderRule(rule: Omit<ReorderRule, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<ReorderRule> {
  const now = nowMs();
  const existing = rule.id ? await db.reorderRules.get(rule.id) : null;
  const saved: ReorderRule = {
    id: rule.id ?? uid('rr'),
    ...rule,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await db.reorderRules.put(saved);
  return saved;
}

// ─── Inventory Reports ─────────────────────────────────────────────────────

/** Stock below reorder level */
export async function getReorderReport(tenantId: string, branchId: string) {
  const rules = await db.reorderRules
    .where('tenant_id').equals(tenantId)
    .and(r => r.branch_id === branchId && r.is_active)
    .toArray();

  const results = [];
  for (const rule of rules) {
    const prod = await db.products.get(rule.product_id);
    if (!prod) continue;
    const stock = prod.stock;
    if (stock < rule.min_quantity) {
      results.push({
        product: prod,
        rule,
        currentStock: stock,
        toReorder: rule.reorder_quantity,
        deficit: rule.min_quantity - stock,
      });
    }
  }
  return results.sort((a, b) => a.currentStock - b.currentStock);
}

/** Slow-moving products (no sale in N days) */
export async function getSlowMovingReport(tenantId: string, branchId: string, days = 30) {
  const cutoff = nowMs() - days * 86_400_000;
  const products = await db.products
    .where('tenant_id').equals(tenantId)
    .and(p => p.branch_id === branchId && p.stock > 0)
    .toArray();

  const results = [];
  for (const prod of products) {
    const lastSale = await db.stockLedger
      .where('product_id').equals(prod.id)
      .and(e => e.movement_type === 'SALE')
      .last();
    if (!lastSale || lastSale.created_at < cutoff) {
      results.push({ product: prod, daysSinceLastSale: lastSale ? Math.floor((nowMs() - lastSale.created_at) / 86_400_000) : null });
    }
  }
  return results;
}

/** Negative stock report */
export async function getNegativeStockReport(tenantId: string, branchId: string) {
  const products = await db.products
    .where('tenant_id').equals(tenantId)
    .and(p => p.branch_id === branchId && p.stock < 0)
    .toArray();
  return products;
}

/** Record spillage/wastage logs and ledger entries */
export async function logWastage(log: Omit<WastageLog, 'id' | 'timestamp'>) {
  const wastageId = uid('wast');
  const timestamp = nowMs();
  const fullLog: WastageLog = {
    ...log,
    id: wastageId,
    timestamp
  };

  await db.wastageLogs.add(fullLog);

  // Record spillage wastage entry in the stock ledger
  await recordStockMovement({
    tenant_id: log.tenant_id,
    branch_id: 'branch-bongo-main',
    warehouse_id: 'warehouse-main',
    product_id: log.product_id,
    movement_type: 'DAMAGE',
    reference_type: 'WASTAGE',
    reference_id: wastageId,
    quantity_change: -log.quantity,
    unit_cost: 0,
    total_cost: 0,
    user_id: log.employee_id,
    notes: `Wastage entry (${log.reason})`
  });

  return fullLog;
}

/** Deduct stock for sale, with recursive cocktail recipe parsing and standard pour scaling */
export async function decreaseInventoryForSale(
  tenantId: string,
  branchId: string,
  productId: string,
  variantId: string | undefined,
  qtySold: number,
  orderId: string,
  userName: string,
  customTimestamp?: number
) {
  const product = await db.products.get(productId);
  if (!product) return;

  // 1. Check if there is a recipe defined for this product
  const recipe = await db.recipes.where('product_id').equals(productId).first();
  if (recipe) {
    const items = await db.recipeItems.where('recipe_id').equals(recipe.id).toArray();
    if (items.length > 0) {
      for (const item of items) {
        const ingredientQty = item.quantity * qtySold;
        await recordStockMovement({
          tenant_id: tenantId,
          branch_id: branchId,
          warehouse_id: 'warehouse-main',
          product_id: item.ingredient_product_id,
          movement_type: 'SALE',
          reference_type: 'SALE',
          reference_id: orderId,
          quantity_change: -ingredientQty,
          unit_cost: 0,
          total_cost: 0,
          user_id: userName,
          notes: `Recipe ingredient for ${product.name}: -${ingredientQty} ${item.unit}`,
          created_at: customTimestamp
        });
      }
      return;
    }
  }

  // 2. Direct product/variant deduction
  let qtyToDeduct = qtySold;
  let notes = `POS sale checkout: ${orderId}`;
  
  if (product.module === 'Bar' && product.standard_pour_ml && product.standard_pour_ml > 0) {
    qtyToDeduct = qtySold * product.standard_pour_ml;
    notes = `POS sale checkout (pour): -${qtyToDeduct}ml`;
  }

  await recordStockMovement({
    tenant_id: tenantId,
    branch_id: branchId,
    warehouse_id: 'warehouse-main',
    product_id: productId,
    variant_id: variantId,
    movement_type: 'SALE',
    reference_type: 'SALE',
    reference_id: orderId,
    quantity_change: -qtyToDeduct,
    unit_cost: product.buyingPrice || 0,
    total_cost: (product.buyingPrice || 0) * qtySold,
    user_id: userName,
    notes,
    created_at: customTimestamp
  });
}
