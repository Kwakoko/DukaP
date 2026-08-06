import { db, type Product, type ProductVariant, type Category, type Brand, saveProductAndVariants, syncParentStock } from '../db/dexie';
import { cloudDb } from '../db/supabaseMock';

export interface UserContext {
  id: string;
  tenant_id: string;
  branch_id: string;
  role: string;
  name: string;
}

export function validateProductPermission(
  action: 'view' | 'create' | 'editPrice' | 'delete',
  role: string
): boolean {
  if (!role) return false;
  const cleanRole = role.trim().toLowerCase();

  // Super Admin, Business Owner & Tenant Owner have full unrestricted access
  if (
    cleanRole === 'super admin' ||
    cleanRole === 'business owner' ||
    cleanRole === 'tenant owner' ||
    cleanRole === 'tenant_owner' ||
    cleanRole.includes('owner') ||
    cleanRole.startsWith('role-owner')
  ) {
    return true;
  }
  
  if (action === 'delete') {
    return (
      cleanRole === 'business administrator' ||
      cleanRole.includes('admin')
    );
  }
  
  if (action === 'create' || action === 'editPrice') {
    return (
      cleanRole === 'business administrator' ||
      cleanRole === 'branch manager' ||
      cleanRole === 'inventory officer' ||
      cleanRole.includes('admin') ||
      cleanRole.includes('manager') ||
      cleanRole.includes('inventory')
    );
  }
  
  if (action === 'view') {
    return true;
  }
  
  return false;
}

// ─── Schema Mapper: camelCase <=> snake_case ────────────────────────────────
export function mapProductToLocal(prod: any): Product {
  const tenantId = prod.tenantId || prod.tenant_id || '';
  const branchId = prod.branchId || prod.branch_id || '';
  const resolvedBuyingPrice = prod.buyingPrice ?? prod.buying_price ?? prod.costPrice ?? prod.cost_price ?? prod.unit_cost ?? 0;
  const resolvedSellingPrice = prod.sellingPrice ?? prod.selling_price ?? prod.price ?? 0;
  const rawStock = prod.stock ?? prod.quantity ?? prod.current_quantity ?? 0;
  const resolvedStock = typeof rawStock === 'number' ? rawStock : (parseFloat(String(rawStock)) || 0);

  return {
    ...prod,
    tenant_id: tenantId,
    branch_id: branchId,
    tenantId,
    branchId,
    buyingPrice: resolvedBuyingPrice,
    costPrice: resolvedBuyingPrice,
    sellingPrice: resolvedSellingPrice,
    price: resolvedSellingPrice,
    stock: resolvedStock,
    category: prod.category || prod.categoryId || '',
    module: prod.module || 'Retail',
    categoryId: prod.categoryId || prod.category,
    status: prod.status || 'Active',
    version: prod.version || 1,
    createdAt: prod.createdAt || prod.created_at || Date.now(),
    updatedAt: prod.updatedAt || prod.updated_at || Date.now(),
    createdBy: prod.createdBy || prod.created_by || 'usr-unknown',
    // CRITICAL: Never mark as SYNCED unless coming from the server with syncStatus already set
    syncStatus: prod.syncStatus || 'PENDING',
  } as Product;
}

export function mapProductToCloud(prod: Product): any {
  const tenantId = prod.tenantId || prod.tenant_id || '';
  const branchId = prod.branchId || prod.branch_id || '';
  const resolvedBuyingPrice = prod.buyingPrice ?? prod.costPrice ?? (prod as any).buying_price ?? (prod as any).cost_price ?? 0;
  const resolvedSellingPrice = prod.sellingPrice ?? prod.price ?? (prod as any).selling_price ?? 0;

  return {
    id: prod.id,
    name: prod.name,
    categoryId: prod.categoryId || prod.category || '',
    category: prod.categoryId || prod.category || '',
    costPrice: resolvedBuyingPrice,
    buyingPrice: resolvedBuyingPrice,
    cost_price: resolvedBuyingPrice,
    buying_price: resolvedBuyingPrice,
    sellingPrice: resolvedSellingPrice,
    price: resolvedSellingPrice,
    selling_price: resolvedSellingPrice,
    stock: prod.stock || 0,
    expiryDate: prod.expiryDate,
    tenantId,
    branchId,
    tenant_id: tenantId,
    branch_id: branchId,
    module: prod.module || 'Retail',
    hasVariants: prod.hasVariants || false,
    brand: prod.brand,
    description: prod.description,
    supplier: prod.supplier,
    supplier_id: (prod as any).supplier_id,
    sku: prod.sku,
    barcode: prod.barcode,
    image: prod.image,
    image_url: (prod as any).image_url,
    attributes: prod.attributes,
    taxRate: (prod as any).taxRate,
    origin: (prod as any).origin || 'PRODUCTION',
    status: prod.status || 'Active',
    version: prod.version || 1,
    createdAt: prod.createdAt || (prod as any).created_at || Date.now(),
    updatedAt: prod.updatedAt || (prod as any).updated_at || Date.now(),
    created_at: prod.createdAt || (prod as any).created_at || Date.now(),
    updated_at: prod.updatedAt || (prod as any).updated_at || Date.now(),
    created_by: prod.createdBy || (prod as any).created_by || 'usr-unknown',
    createdBy: prod.createdBy || (prod as any).created_by || 'usr-unknown',
    updatedBy: prod.updatedBy,
    deletedAt: prod.deletedAt,
  };
}

/**
 * Attempts a direct write to the server for durability.
 * This is a fire-and-forget secondary path — the sync queue is the primary.
 * If this fails, the sync queue will handle it asynchronously.
 */
async function attemptDirectCloudWrite(
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any,
  tenantId: string,
  userId: string
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'x-user-id': userId,
    };

    if (action === 'DELETE') {
      const res = await fetch(`/api/products/${payload.id}`, {
        method: 'DELETE',
        headers,
      });
      return res.ok;
    } else {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      return res.ok;
    }
  } catch {
    return false;
  }
}

export class ProductService {
  // ─── Create Product ────────────────────────────────────────────────────────
  static async createProduct(
    input: Omit<Product, 'id' | 'updatedAt' | 'version' | 'syncStatus'>,
    user: UserContext,
    _isOnline: boolean
  ): Promise<Product> {
    if (!validateProductPermission('create', user.role)) {
      throw new Error(`Permission Denied: User role '${user.role}' cannot create products.`);
    }

    const tenantId = input.tenantId || input.tenant_id || user.tenant_id;
    const branchId = input.branchId || input.branch_id || user.branch_id;
    if (tenantId !== user.tenant_id) {
      throw new Error('Security Error: Tenant ID mismatch.');
    }

    const clientUUID = (input as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    const now = Date.now();
    const newProd: Product = {
      ...input,
      id: clientUUID,
      tenantId,
      branchId,
      tenant_id: tenantId,
      branch_id: branchId,
      module: input.module || 'Retail',
      categoryId: input.categoryId || input.category || '',
      costPrice: input.costPrice !== undefined ? input.costPrice : (input.buyingPrice || 0),
      sellingPrice: input.sellingPrice !== undefined ? input.sellingPrice : (input.price || 0),
      price: input.sellingPrice !== undefined ? input.sellingPrice : (input.price || 0),
      status: input.status || 'Active',
      origin: (input as any).origin || 'PRODUCTION',
      version: 1,
      createdAt: input.createdAt || now,
      updatedAt: now,
      createdBy: user.id,
      syncStatus: 'PENDING',
    };

    const mappedLocal = mapProductToLocal(newProd);
    await saveProductAndVariants(mappedLocal, []);

    // Auto-seed Category if new
    if (newProd.category && newProd.category.trim()) {
      const trimmedCat = newProd.category.trim();
      const existingCat = await db.categories.where('tenant_id').equals(tenantId).filter(c => c.name === trimmedCat).first();
      if (!existingCat) {
        await createCategory({ name: trimmedCat, tenant_id: tenantId }).catch(() => {});
      }
    }

    // Auto-seed Brand if new
    if (newProd.brand && newProd.brand.trim()) {
      const trimmedBrand = newProd.brand.trim();
      const existingBrand = await db.brands.where('tenant_id').equals(tenantId).filter(b => b.name === trimmedBrand).first();
      if (!existingBrand) {
        await createBrand({ name: trimmedBrand, tenant_id: tenantId }).catch(() => {});
      }
    }

    const rawQueued = await db.syncQueue
      .where('entityName').equals('products')
      .and(item => item.payload?.id === newProd.id && item.status === 'Pending')
      .last();
    if (rawQueued?.id !== undefined) {
      await db.syncQueue.update(rawQueued.id, {
        payload: mapProductToCloud(newProd),
      });
    } else {
      await db.syncQueue.add({
        actionType: 'INSERT',
        entityName: 'products',
        payload: mapProductToCloud(newProd),
        timestamp: now,
        status: 'Pending',
      });
    }

    await db.securityAuditLogs.put({
      id: `aud-${now}-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: tenantId,
      branch_id: branchId,
      user_id: user.id,
      action: 'PRODUCT_CREATED',
      created_at: now,
      details: `Created product '${newProd.name}' (${newProd.id})`,
    } as any);

    attemptDirectCloudWrite('INSERT', mapProductToCloud(newProd), tenantId, user.id)
      .then(success => {
        if (success) {
          db.products.update(newProd.id, { syncStatus: 'SYNCED', isSynced: 1 } as any)
            .then(() => {
              db.syncQueue
                .where('entityName').equals('products')
                .and(item => item.payload?.id === newProd.id && item.status === 'Pending')
                .delete()
                .catch(() => {});
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return newProd;
  }

  // ─── Update Product ────────────────────────────────────────────────────────
  static async updateProduct(
    id: string,
    updates: Partial<Product>,
    user: UserContext,
    _isOnline: boolean
  ): Promise<Product> {
    const existing = await db.products.get(id);
    if (!existing) {
      throw new Error(`Product with ID '${id}' not found.`);
    }

    if (existing.tenant_id !== user.tenant_id) {
      throw new Error('Security Violation: Unauthorized product update.');
    }

    const isPriceChanging = updates.sellingPrice !== undefined || updates.costPrice !== undefined || updates.price !== undefined;
    const action = isPriceChanging ? 'editPrice' : 'create';
    if (!validateProductPermission(action, user.role)) {
      throw new Error(`Permission Denied: User role '${user.role}' cannot update this product attribute.`);
    }

    const now = Date.now();

    const updatedProd: Product = {
      ...existing,
      ...updates,
      tenant_id: existing.tenant_id,
      branch_id: existing.branch_id,
      tenantId: existing.tenantId || existing.tenant_id,
      branchId: existing.branchId || existing.branch_id,
      updatedAt: now,
      updatedBy: user.id,
      version: (existing.version || 1) + 1,
      syncStatus: 'PENDING',
    };

    const mappedLocal = mapProductToLocal(updatedProd);
    await db.products.put(mappedLocal);

    const auditAction = isPriceChanging ? 'PRODUCT_PRICE_CHANGED' : 'PRODUCT_UPDATED';
    await db.securityAuditLogs.put({
      id: `aud-${now}-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: user.tenant_id,
      branch_id: user.branch_id,
      user_id: user.id,
      action: auditAction,
      created_at: now,
      details: `Updated product '${existing.name}'. Price altered: ${isPriceChanging}`,
    } as any);

    await db.syncQueue.add({
      actionType: 'UPDATE',
      entityName: 'products',
      payload: mapProductToCloud(updatedProd),
      timestamp: now,
      status: 'Pending',
    });

    attemptDirectCloudWrite('UPDATE', mapProductToCloud(updatedProd), user.tenant_id, user.id)
      .then(success => {
        if (success) {
          db.products.update(updatedProd.id, { syncStatus: 'SYNCED', isSynced: 1 } as any)
            .then(() => {
              db.syncQueue
                .where('entityName').equals('products')
                .and(item => item.payload?.id === updatedProd.id && item.status === 'Pending')
                .delete()
                .catch(() => {});
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return updatedProd;
  }

  // ─── Soft Delete Product ───────────────────────────────────────────────────
  // ─── Pre-Deletion Dependency Scanner ───────────────────────────────────────
  static async scanProductDependencies(productId: string): Promise<{
    hasSales: boolean;
    salesCount: number;
    hasLedger: boolean;
    ledgerCount: number;
    hasVariants: boolean;
    variantCount: number;
    recommendedStrategy: 'archive' | 'permanent';
  }> {
    const variants = await db.productVariants.where('productId').equals(productId).toArray();

    const ledgerCount = await db.stockLedger
      .where('product_id').equals(productId)
      .count();

    const saleLedgerCount = await db.stockLedger
      .where('product_id').equals(productId)
      .and(l => (l.movement_type as string) === 'SALE' || (l.movement_type as string) === 'CUSTOMER_RETURN')
      .count();

    const orders = await db.orders.toArray();
    let orderSalesCount = 0;
    for (const o of orders) {
      if (o.items && o.items.some((i: any) => i.product_id === productId || i.product?.id === productId)) {
        orderSalesCount++;
      }
    }

    const totalSalesCount = saleLedgerCount + orderSalesCount;
    const hasSales = totalSalesCount > 0;
    const hasLedger = ledgerCount > 0;

    return {
      hasSales,
      salesCount: totalSalesCount,
      hasLedger,
      ledgerCount,
      hasVariants: variants.length > 0,
      variantCount: variants.length,
      recommendedStrategy: (hasSales || hasLedger) ? 'archive' : 'permanent'
    };
  }

  static async checkSalesHistory(productId: string): Promise<{ hasSales: boolean; salesCount: number }> {
    const deps = await this.scanProductDependencies(productId);
    return { hasSales: deps.hasSales, salesCount: deps.salesCount };
  }

  // ─── Production-Grade Product Deletion Engine ──────────────────────────────
  static async deleteProduct(
    id: string,
    user: UserContext,
    _isOnline: boolean,
    options?: { permanent?: boolean; archive?: boolean }
  ): Promise<boolean> {
    const existing = await db.products.get(id);
    if (!existing) return false;

    if (existing.tenant_id !== user.tenant_id) {
      throw new Error('Security Violation: Unauthorized product deletion.');
    }

    if (!validateProductPermission('delete', user.role)) {
      throw new Error(`You do not have permission to delete products.`);
    }

    const now = Date.now();

    // 1. ARCHIVE MODE (Soft Delete / Deactivate / Preserve History)
    if (options?.archive && !options?.permanent) {
      const archivedProd: Product = {
        ...existing,
        status: 'Inactive',
        updatedAt: now,
        syncStatus: 'PENDING',
        version: (existing.version || 1) + 1,
      };
      await db.products.put(mapProductToLocal(archivedProd));
      await db.securityAuditLogs.put({
        id: `aud-${now}-${Math.random().toString(36).substring(2, 9)}`,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        user_id: user.id,
        action: 'PRODUCT_ARCHIVED',
        created_at: now,
        details: `Archived product '${existing.name}' (${id})`,
      } as any);

      await db.syncQueue.add({
        actionType: 'UPDATE',
        entityName: 'products',
        payload: mapProductToCloud(archivedProd),
        timestamp: now,
        status: 'Pending',
      });

      attemptDirectCloudWrite('UPDATE', mapProductToCloud(archivedProd), user.tenant_id, user.id).catch(() => {});
      return true;
    }

    // 2. PERMANENT TRANSACTIONAL DELETION (ACID Global Wipe)
    const variants = await db.productVariants.where('productId').equals(id).toArray();
    const variantIds = variants.map(v => v.id);

    await db.transaction('rw', [
      db.products,
      db.productVariants,
      db.stockLedger,
      db.stockBalance,
      db.batchLots,
      db.serialNumbers,
      db.reorderRules,
      db.heldCarts,
      db.syncQueue,
      db.securityAuditLogs
    ], async () => {
      // a. Cascade Delete Variants
      for (const vId of variantIds) {
        await db.productVariants.delete(vId);
        await db.stockBalance.where('variant_id').equals(vId).delete();
        await db.stockLedger.where('variant_id').equals(vId).delete();
        await db.batchLots.where('variant_id').equals(vId).delete();
        await db.serialNumbers.where('variant_id').equals(vId).delete();
      }

      // b. Cascade Delete Parent Product Inventory & Specs
      await db.stockBalance.where('product_id').equals(id).delete();
      await db.stockLedger.where('product_id').equals(id).delete();
      await db.batchLots.where('product_id').equals(id).delete();
      await db.serialNumbers.where('product_id').equals(id).delete();
      await db.reorderRules.where('product_id').equals(id).delete();

      // c. Clean from open / held carts
      const heldCarts = await db.heldCarts.toArray();
      for (const hc of heldCarts) {
        if (hc.items && hc.items.length > 0) {
          const cleanedItems = hc.items.filter((item: any) => item.product?.id !== id && item.product_id !== id);
          if (cleanedItems.length !== hc.items.length) {
            if (cleanedItems.length === 0) {
              await db.heldCarts.delete(hc.id);
            } else {
              await db.heldCarts.update(hc.id, { items: cleanedItems });
            }
          }
        }
      }

      // d. Delete Parent Product Row
      await db.products.delete(id);

      // e. Immutable Security Audit Log
      await db.securityAuditLogs.put({
        id: `aud-${now}-${Math.random().toString(36).substring(2, 9)}`,
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        user_id: user.id,
        action: 'DELETE_PRODUCT',
        created_at: now,
        details: `Permanently deleted product '${existing.name}' (${id}) and ${variants.length} variant(s)`,
      } as any);

      // f. Sync Queue Event
      await db.syncQueue.add({
        actionType: 'DELETE',
        entityName: 'products',
        payload: { id, tenant_id: user.tenant_id, deletedAt: now, deletedBy: user.id },
        timestamp: now,
        status: 'Pending',
      });
    });

    // 3. Direct Server Cloud Write (Fire-and-forget server sync)
    attemptDirectCloudWrite('DELETE', { id }, user.tenant_id, user.id).catch(() => {});

    return true;
  }

  // ─── Cloud reconciliation download ────────────────────────────────────────
  static async reconcileCloudChanges(cloudProducts: Product[], tenantId: string) {
    if (!cloudProducts || cloudProducts.length === 0) {
      return;
    }

    const tenantBranches = await db.branches.where('tenant_id').equals(tenantId).toArray();
    const primaryBranchId = tenantBranches.length > 0 ? tenantBranches[0].id : 'branch-main';

    for (const cp of cloudProducts) {
      if (cp.deletedAt || (cp as any).deleted_at || (cp as any).status === 'Inactive') {
        // Cascade-delete variants before removing the product record
        const orphanVariants = await db.productVariants.where('productId').equals(cp.id).toArray();
        for (const v of orphanVariants) {
          await db.productVariants.delete(v.id);
          await db.stockBalance.where('variant_id').equals(v.id).delete();
        }
        await db.stockBalance.where('product_id').equals(cp.id).delete();
        await db.products.delete(cp.id);
        continue;
      }

      const existing = await db.products.get(cp.id);
      if (existing && existing.syncStatus === 'PENDING') {
        continue;
      }

      const bid = cp.branchId || cp.branch_id || primaryBranchId;
      const resolvedBranchId = (bid === 'branch-dar-hq' && tenantId !== 'tenant-101') ? primaryBranchId : bid;

      const localFormat = mapProductToLocal({
        ...cp,
        branchId: resolvedBranchId,
        branch_id: resolvedBranchId,
        syncStatus: 'SYNCED',
      });
      await db.products.put(localFormat);
      if (cp.hasVariants) {
        await syncParentStock(cp.id);
      }
    }
  }

  // ─── Automated Variant Deduplication & Cleanup ─────────────────────────────
  static async cleanDuplicateVariants(tenantId?: string): Promise<{ cleanedCount: number; mergedProducts: number }> {
    return cleanDuplicateVariants(tenantId);
  }
}

export function getVariantAttrSig(attributes: Record<string, string> | undefined | null): string {
  if (!attributes || typeof attributes !== 'object') return '';
  const parts: string[] = [];
  for (const [, v] of Object.entries(attributes)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      parts.push(String(v).trim().toLowerCase());
    }
  }
  return parts.sort().join('|');
}

export async function cleanDuplicateVariants(tenantId?: string): Promise<{ cleanedCount: number; mergedProducts: number }> {
  try {
    let query = db.productVariants.toCollection();
    if (tenantId) {
      query = db.productVariants.where('tenant_id').equals(tenantId);
    }
    const allVariants = await query.toArray();
    if (allVariants.length === 0) return { cleanedCount: 0, mergedProducts: 0 };

    let cleanedCount = 0;
    const mergedProductIds = new Set<string>();

    // Step 0: Purge orphaned variants with missing/invalid productId or non-existent parent product
    let validProdQuery = db.products.toCollection();
    if (tenantId) {
      validProdQuery = db.products.where('tenant_id').equals(tenantId);
    }
    const validProducts = await validProdQuery.toArray();
    const validProductIds = new Set(validProducts.map(p => p.id));

    const activeVariants: ProductVariant[] = [];
    for (const v of allVariants) {
      if (!v.productId || !validProductIds.has(v.productId)) {
        await db.productVariants.delete(v.id);
        cleanedCount++;
      } else {
        activeVariants.push(v);
      }
    }

    const groupedByProduct = new Map<string, ProductVariant[]>();
    for (const v of activeVariants) {
      if (!groupedByProduct.has(v.productId)) {
        groupedByProduct.set(v.productId, []);
      }
      groupedByProduct.get(v.productId)!.push(v);
    }

    for (const [productId, vars] of groupedByProduct.entries()) {
      if (vars.length <= 1) continue;

      const sigMap = new Map<string, ProductVariant[]>();
      for (const v of vars) {
        const sig = getVariantAttrSig(v.attributes) || (v.sku ? `sku:${v.sku.trim().toLowerCase()}` : `id:${v.id}`);
        if (!sigMap.has(sig)) sigMap.set(sig, []);
        sigMap.get(sig)!.push(v);
      }

      for (const [, group] of sigMap.entries()) {
        if (group.length <= 1) continue;

        group.sort((a, b) => {
          const aStock = a.stock || 0;
          const bStock = b.stock || 0;
          if (aStock !== bStock) return bStock - aStock;
          const aHasSku = a.sku ? 1 : 0;
          const bHasSku = b.sku ? 1 : 0;
          if (aHasSku !== bHasSku) return bHasSku - aHasSku;
          return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
        });

        const kept = group[0];
        const redundant = group.slice(1);

        for (const red of redundant) {
          const redLedger = await db.stockLedger.where('variant_id').equals(red.id).toArray();
          for (const l of redLedger) {
            await db.stockLedger.update(l.id, { variant_id: kept.id });
          }

          const redBal = await db.stockBalance.where('variant_id').equals(red.id).toArray();
          for (const b of redBal) {
            await db.stockBalance.delete(b.id);
          }

          await db.productVariants.delete(red.id);

          try {
            await cloudDb.cloud_product_variants.delete(red.id);
          } catch {}

          const syncItems = await db.syncQueue.where('entityName').equals('productVariants').toArray();
          for (const sq of syncItems) {
            if (sq.payload?.id === red.id) {
              await db.syncQueue.delete(sq.id!);
            }
          }

          cleanedCount++;
          mergedProductIds.add(productId);
        }
      }

      if (mergedProductIds.has(productId)) {
        await syncParentStock(productId);
      }
    }

    return { cleanedCount, mergedProducts: mergedProductIds.size };
  } catch (err) {
    console.error('Error cleaning duplicate variants:', err);
    return { cleanedCount: 0, mergedProducts: 0 };
  }
}

// ─── createProductWithVariants ──────────────────────────────────────────────
export async function createProductWithVariants(
  input: Omit<Product, 'id' | 'updatedAt' | 'version' | 'syncStatus'>,
  variants: Omit<ProductVariant, 'productId' | 'isSynced' | 'syncStatus'>[],
  user: UserContext,
  _isOnline: boolean
): Promise<{ product: Product; variants: ProductVariant[] }> {
  if (!validateProductPermission('create', user.role)) {
    throw new Error(`Permission Denied: '${user.role}' cannot create products.`);
  }

  const tenantId = input.tenantId || input.tenant_id || user.tenant_id;
  const branchId = input.branchId || input.branch_id || user.branch_id;
  if (tenantId !== user.tenant_id) throw new Error('Security Error: Tenant ID mismatch.');

  const productId = (input as any).id || ((typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

  const now = Date.now();
  const prodCreatedAt = input.createdAt || now;

  const product: Product = {
    ...input,
    id: productId,
    tenantId,
    branchId,
    tenant_id: tenantId,
    branch_id: branchId,
    categoryId: input.categoryId || input.category || '',
    costPrice: input.costPrice ?? input.buyingPrice ?? 0,
    sellingPrice: input.sellingPrice ?? input.price ?? 0,
    price: input.sellingPrice ?? input.price ?? 0,
    status: input.status || 'Active',
    version: 1,
    createdAt: prodCreatedAt,
    updatedAt: now,
    createdBy: user.id,
    syncStatus: 'PENDING',
    hasVariants: variants.length > 0,
  };

  const boundVariants: ProductVariant[] = variants.map((v, i) => ({
    ...v,
    id: (v as any).id ?? ((typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `var-${productId}-${i}`),
    productId,
    tenant_id: tenantId,
    branch_id: branchId,
    isSynced: 0,
    syncStatus: 'PENDING' as const,
    createdAt: prodCreatedAt,
    createdBy: user.id,
  }));

  await saveProductAndVariants(product, boundVariants);
  await syncParentStock(productId);

  const rawQueued = await db.syncQueue
    .where('entityName').equals('products')
    .and(item => item.payload?.id === productId && item.status === 'Pending')
    .last();
  if (rawQueued?.id !== undefined) {
    await db.syncQueue.update(rawQueued.id, {
      payload: mapProductToCloud(product),
    });
  }

  await db.securityAuditLogs.put({
    id: `aud-${now}-${Math.random().toString(36).substring(2, 9)}`,
    tenant_id: tenantId,
    branch_id: branchId,
    user_id: user.id,
    action: 'PRODUCT_WITH_VARIANTS_CREATED',
    created_at: now,
    details: `Created '${product.name}' (${productId}) with ${boundVariants.length} variant(s).`,
  } as any);

  return { product, variants: boundVariants };
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchCategories(tenantId: string): Promise<Category[]> {
  const local = await db.categories.where('tenant_id').equals(tenantId).toArray();
  return local;
}

export async function createCategory(
  input: string | Partial<Category>,
  tenantId?: string,
  _branchId?: string
): Promise<Category> {
  const catName = typeof input === 'string' ? input : (input.name || '');
  const trimmedName = catName.trim();
  if (!trimmedName) throw new Error('Category name cannot be empty.');

  let tid = typeof input === 'string' ? (tenantId || '') : (input.tenant_id || tenantId || '');
  if (!tid) {
    try {
      const sessStr = localStorage.getItem('dukapos_session');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        tid = sess?.tenant?.id || sess?.user?.tenant_id || 'tenant-101';
      }
    } catch (_) {}
    if (!tid) tid = 'tenant-101';
  }

  // Case-insensitive uniqueness validation within tenant
  const existing = await db.categories.where('tenant_id').equals(tid).filter(c => Boolean(c.name && c.name.toLowerCase() === trimmedName.toLowerCase())).first();
  if (existing) {
    return existing;
  }

  const category: Category = {
    id: typeof input !== 'string' && input.id ? input.id : `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: trimmedName,
    tenant_id: tid,
    description: typeof input !== 'string' ? input.description : undefined,
    created_at: Date.now(),
  };
  await db.categories.put(category);
  await db.syncQueue.add({
    actionType: 'CREATE',
    entityName: 'categories',
    tenant_id: tid,
    payload: category,
    timestamp: Date.now(),
    status: 'Pending',
  });
  return category;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  await db.categories.update(id, updates);
  const updated = await db.categories.get(id);
  if (updated) {
    await db.syncQueue.add({
      actionType: 'UPDATE',
      entityName: 'categories',
      tenant_id: updated.tenant_id,
      payload: updated,
      timestamp: Date.now(),
      status: 'Pending',
    });
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await db.categories.get(id);
  await db.categories.delete(id);
  if (existing) {
    await db.syncQueue.add({
      actionType: 'DELETE',
      entityName: 'categories',
      tenant_id: existing.tenant_id,
      payload: { id, tenant_id: existing.tenant_id },
      timestamp: Date.now(),
      status: 'Pending',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BRANDS SERVICE
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchBrands(tenantId: string): Promise<Brand[]> {
  try {
    return await db.brands.where('tenant_id').equals(tenantId).toArray();
  } catch {
    return [];
  }
}

export async function createBrand(
  input: string | Partial<Brand>,
  tenantId?: string
): Promise<Brand> {
  const bName = typeof input === 'string' ? input : (input.name || '');
  const trimmedName = bName.trim();
  if (!trimmedName) throw new Error('Brand name cannot be empty.');

  let tid = typeof input === 'string' ? (tenantId || '') : (input.tenant_id || tenantId || '');
  if (!tid) {
    try {
      const sessStr = localStorage.getItem('dukapos_session');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        tid = sess?.tenant?.id || sess?.user?.tenant_id || 'tenant-101';
      }
    } catch (_) {}
    if (!tid) tid = 'tenant-101';
  }

  // Case-insensitive uniqueness validation within tenant
  const existing = await db.brands.where('tenant_id').equals(tid).filter(b => Boolean(b.name && b.name.toLowerCase() === trimmedName.toLowerCase())).first();
  if (existing) {
    return existing;
  }

  const brand: Brand = {
    id: typeof input !== 'string' && input.id ? input.id : `brand-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: trimmedName,
    tenant_id: tid,
    description: typeof input !== 'string' ? input.description : undefined,
    created_at: Date.now(),
  };
  await db.brands.put(brand);
  await db.syncQueue.add({
    actionType: 'CREATE',
    entityName: 'brands',
    tenant_id: tid,
    payload: brand,
    timestamp: Date.now(),
    status: 'Pending',
  });
  return brand;
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<void> {
  await db.brands.update(id, updates);
  const updated = await db.brands.get(id);
  if (updated) {
    await db.syncQueue.add({
      actionType: 'UPDATE',
      entityName: 'brands',
      tenant_id: updated.tenant_id,
      payload: updated,
      timestamp: Date.now(),
      status: 'Pending',
    });
  }
}

export async function deleteBrand(id: string): Promise<void> {
  const existing = await db.brands.get(id);
  await db.brands.delete(id);
  if (existing) {
    await db.syncQueue.add({
      actionType: 'DELETE',
      entityName: 'brands',
      tenant_id: existing.tenant_id,
      payload: { id, tenant_id: existing.tenant_id },
      timestamp: Date.now(),
      status: 'Pending',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UN-SYNCED PRODUCT RECOVERY ROUTINE (Dual-Layer Sync & Reconciliation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Inspects local IndexedDB for product records marked as PENDING/unsynced,
 * forces a batch push to backend endpoint /api/products/sync-batch,
 * and marks local items as SYNCED once acknowledged.
 */
export async function recoverUnsyncedProducts(tenantId: string): Promise<number> {
  try {
    if (!tenantId) return 0;

    const pendingProducts = await db.products
      .where('tenant_id').equals(tenantId)
      .filter(p => p.syncStatus === 'PENDING' || (p as any).isSynced === 0)
      .toArray();

    if (pendingProducts.length === 0) {
      return 0;
    }

    console.log(`Found ${pendingProducts.length} local un-synced product records. Forcing push...`);

    const response = await fetch('/api/products/sync-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        'X-Tenant-ID': tenantId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({
        products: pendingProducts
      })
    });

    if (response.ok) {
      const result = await response.json();
      const syncedCount = result.syncedCount || pendingProducts.length;

      await db.transaction('rw', db.products, async () => {
        for (const p of pendingProducts) {
          await db.products.update(p.id, {
            syncStatus: 'SYNCED',
            isSynced: 1
          } as any);
        }
      });

      // Clear pending queue items for these products
      const pendingIds = new Set(pendingProducts.map(p => p.id));
      const queueItems = await db.syncQueue.where('entityName').equals('products').toArray();
      for (const q of queueItems) {
        if (q.id !== undefined && q.payload?.id && pendingIds.has(q.payload.id)) {
          await db.syncQueue.delete(q.id);
        }
      }

      console.log(`Successfully recovered and synced ${syncedCount} product stocks.`);
      return syncedCount;
    }
    return 0;
  } catch (error) {
    console.error("Failed to recover local product stocks:", error);
    return 0;
  }
}

