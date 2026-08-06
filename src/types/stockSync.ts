/**
 * stockSync.ts
 * Enterprise DTOs, Event Sourcing Contracts, and Sync Engine Interfaces for DukaPos SaaS.
 */

export type MovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIVE'
  | 'CUSTOMER_RETURN'
  | 'TRANSFER_IN'
  | 'PRODUCTION_OUTPUT'
  | 'ADJUSTMENT_GAIN'
  | 'SALE'
  | 'SUPPLIER_RETURN'
  | 'TRANSFER_OUT'
  | 'DAMAGE'
  | 'EXPIRY'
  | 'ADJUSTMENT_LOSS'
  | 'PRODUCTION_USAGE'
  | 'WASTAGE'
  | 'RESERVATION_LOCK'
  | 'RESERVATION_RELEASE'
  | 'STOCK_COUNT_RECONCILIATION';

export type OutboxStatus = 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';

export interface StockLedgerEventDTO {
  id: string;
  operation_id: string;
  idempotency_key: string;
  tenant_id: string;
  branch_id: string;
  warehouse_id?: string;
  product_id: string;
  variant_id?: string;
  movement_type: MovementType;
  reference_type?: string;
  reference_id?: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  unit_cost: number;
  total_cost: number;
  user_id: string;
  device_id: string;
  request_id?: string;
  event_version: number;
  notes?: string;
  batch_number?: string;
  expiry_date?: string;
  created_at: number;
  checksum?: string;
}

export interface SyncOutboxItem {
  id?: number;
  outbox_id: string;
  operation_id: string;
  idempotency_key: string;
  tenant_id: string;
  branch_id: string;
  entity: 'stockLedger' | 'stockBalance' | 'products' | 'productVariants';
  action: 'INSERT_EVENT' | 'RECALCULATE_BALANCE' | 'REBUILD_BRANCH';
  payload: StockLedgerEventDTO | any;
  status: OutboxStatus;
  retry_count: number;
  max_retries: number;
  last_error?: string;
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

export interface StockSnapshot {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  variant_id: string;
  snapshot_version: number;
  balance_quantity: number;
  average_cost: number;
  stock_value: number;
  last_event_id: string;
  checksum: string;
  created_at: number;
}

export interface SyncEngineMetrics {
  totalLedgerEvents: number;
  pendingOutboxCount: number;
  syncedCount: number;
  failedCount: number;
  deadLetterCount: number;
  lastSyncedVersion: number;
  syncLatencyMs: number;
  healthStatus: 'OPTIMAL' | 'SYNCING' | 'PENDING_RETRY' | 'DEGRADED';
  lastSyncedAt?: number;
  driftDetected: boolean;
}

export interface DeltaSyncRequest {
  tenant_id: string;
  branch_id: string;
  device_id: string;
  client_checkpoint_version: number;
  limit?: number;
}

export interface DeltaSyncResponse {
  server_checkpoint_version: number;
  events: StockLedgerEventDTO[];
  has_more: boolean;
  server_time: number;
}
