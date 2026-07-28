import { db, type Product, type ProductVariant, type Category, type Brand, saveProductAndVariants } from '../db/dexie';
import { supabase } from '../db/supabaseClient';


export interface UserContext {
  id: string;
  tenant_id: string;
  branch_id: string;
  role: string;
  name: string;
}

// ─── Permission Check ────────────────────────────────────────────────────────
export function validateProductPermission(
  action: 'view' | 'create' | 'editPrice' | 'delete',
  role: string
): boolean {
  if (role === 'Super Admin' || role === 'Business Owner') return true;
  
  if (action === 'delete') {
    // Only Owner and Super Admin can delete
    return false;
  }
  
  if (action === 'create' || action === 'editPrice') {
    // Branch Manager can create and edit price
    return role === 'Branch Manager';
  }
  
  if (action === 'view') {
    return true; // Cashiers, Accountants, etc. can view
  }
  
  return false;
}

// ─── Schema Mapper: camelCase <=> snake_case ────────────────────────────────
export function mapProductToLocal(prod: Product): Product {
  // Enforce snake_case properties on local db write
  return {
    ...prod,
    tenant_id: prod.tenantId || prod.tenant_id || '',
    branch_id: prod.branchId || prod.branch_id || '',
    buyingPrice: prod.costPrice !== undefined ? prod.costPrice : (prod.buyingPrice !== undefined ? prod.buyingPrice : 0),
    sellingPrice: prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price !== undefined ? prod.price : 0),
    price: prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price !== undefined ? prod.price : 0),
    category: prod.category || prod.categoryId || '',
    // Make sure camelCase fields are preserved for serialization compatibility
    tenantId: prod.tenantId || prod.tenant_id,
    branchId: prod.branchId || prod.branch_id,
    costPrice: prod.costPrice !== undefined ? prod.costPrice : prod.buyingPrice,
    categoryId: prod.categoryId || prod.category,
    status: prod.status || 'Active',
    version: prod.version || 1,
    createdAt: prod.createdAt || (prod as any).created_at || Date.now(),
    updatedAt: prod.updatedAt || (prod as any).updated_at || Date.now(),
    createdBy: prod.createdBy || (prod as any).created_by || 'usr-unknown'
  };
}

export function mapProductToCloud(prod: Product): any {
  // Enforce camelCase format for PostgreSQL server
  return {
    id: prod.id,
    name: prod.name,
    categoryId: prod.categoryId || prod.category || '',
    costPrice: prod.costPrice !== undefined ? prod.costPrice : (prod.buyingPrice !== undefined ? prod.buyingPrice : 0),
    sellingPrice: prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price !== undefined ? prod.price : 0),
    price: prod.sellingPrice !== undefined ? prod.sellingPrice : (prod.price !== undefined ? prod.price : 0),
    stock: prod.stock || 0,
    expiryDate: prod.expiryDate,
    tenantId: prod.tenantId || prod.tenant_id || '',
    branchId: prod.branchId || prod.branch_id || '',
    module: prod.module || 'Retail',
    hasVariants: prod.hasVariants || false,
    brand: prod.brand,
    description: prod.description,
    supplier: prod.supplier,
    image: prod.image,
    attributes: prod.attributes,
    
    // Server-specific properties
    tenant_id: prod.tenantId || prod.tenant_id || '',
    branch_id: prod.branchId || prod.branch_id || '',
    category: prod.categoryId || prod.category || '',
    buyingPrice: prod.costPrice !== undefined ? prod.costPrice : (prod.buyingPrice !== undefined ? prod.buyingPrice : 0),
    created_at: prod.createdAt || (prod as any).created_at || Date.now(),
    updated_at: prod.updatedAt || (prod as any).updated_at || Date.now(),
    created_by: prod.createdBy || (prod as any).created_by || 'usr-unknown',

    status: prod.status || 'Active',
    version: prod.version || 1,
    createdAt: prod.createdAt || (prod as any).created_at || Date.now(),
    updatedAt: prod.updatedAt || (prod as any).updated_at || Date.now(),
    deletedAt: prod.deletedAt,
    createdBy: prod.createdBy || (prod as any).created_by || 'usr-unknown',
    updatedBy: prod.updatedBy
  };
}

export class ProductService {
  // Create Product
  static async createProduct(
    input: Omit<Product, 'id' | 'updatedAt' | 'version' | 'syncStatus'>,
    user: UserContext,
    _isOnline: boolean
  ): Promise<Product> {
    // 1. Permission checks
    if (!validateProductPermission('create', user.role)) {
      throw new Error(`Permission Denied: User role '${user.role}' cannot create products.`);
    }

    // 2. Validate tenant & branch ownership
    const tenantId = input.tenantId || input.tenant_id || user.tenant_id;
    const branchId = input.branchId || input.branch_id || user.branch_id;
    if (tenantId !== user.tenant_id) {
      throw new Error('Security Error: Tenant ID mismatch.');
    }

    // 3. Create initial product — respect pre-defined temporary IDs (e.g. for offline sync)
    //    or generate a UUID for Client ID Sovereignty.
    const clientUUID = (input as any).id || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);

    const newProd: Product = {
      ...input,
      id: clientUUID,
      tenantId,
      branchId,
      categoryId: input.categoryId || input.category || '',
      costPrice: input.costPrice !== undefined ? input.costPrice : (input.buyingPrice || 0),
      sellingPrice: input.sellingPrice !== undefined ? input.sellingPrice : (input.price || 0),
      price: input.sellingPrice !== undefined ? input.sellingPrice : (input.price || 0),
      status: input.status || 'Active',
      version: 1,
      createdAt: input.createdAt || Date.now(),
      updatedAt: Date.now(),
      createdBy: user.id,
      syncStatus: 'PENDING'  // Always PENDING until server confirms
    };

    const mappedLocal = mapProductToLocal(newProd);

    // 4. Atomic save to IndexedDB (product + empty variant array)
    //    Use the deep write pipeline so the transaction is guaranteed atomic.
    await saveProductAndVariants(mappedLocal, []);

    // Remove the duplicate queue entry added by saveProductAndVariants,
    // then add our own cloud-format entry
    const lastQueued = await db.syncQueue
      .where('entityName').equals('products')
      .and(item => item.payload?.id === newProd.id)
      .last();
    if (lastQueued?.id !== undefined) await db.syncQueue.delete(lastQueued.id);

    // 5. Audit Logging
    await db.securityAuditLogs.put({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: tenantId,
      branch_id: branchId,
      user_id: user.id,
      action: 'PRODUCT_CREATED',
      created_at: Date.now(),
      details: `Created product '${newProd.name}' (${newProd.id})`
    } as any);

    // 6. Queue Sync
    await db.syncQueue.add({
      actionType: 'INSERT',
      entityName: 'products',
      payload: mapProductToCloud(newProd),
      timestamp: Date.now(),
      status: 'Pending'
    });

    return newProd;
  }

  // Update Product
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

    // 1. Tenant/Branch security validation
    if (existing.tenant_id !== user.tenant_id) {
      throw new Error('Security Violation: Unauthorized product update.');
    }

    // 2. Validate role capability (editPrice check if price is changing)
    const isPriceChanging = updates.sellingPrice !== undefined || updates.costPrice !== undefined || updates.price !== undefined;
    const action = isPriceChanging ? 'editPrice' : 'create';
    if (!validateProductPermission(action, user.role)) {
      throw new Error(`Permission Denied: User role '${user.role}' cannot update this product attribute.`);
    }

    // 3. Apply updates & increment version
    const updatedProd: Product = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
      updatedBy: user.id,
      version: (existing.version || 1) + 1,
      syncStatus: 'PENDING'  // Always PENDING until server confirms update
    };

    const mappedLocal = mapProductToLocal(updatedProd);
    await db.products.put(mappedLocal);

    // 4. Audit Logging
    const auditAction = isPriceChanging ? 'PRODUCT_PRICE_CHANGED' : 'PRODUCT_UPDATED';
    await db.securityAuditLogs.put({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: user.tenant_id,
      branch_id: user.branch_id,
      user_id: user.id,
      action: auditAction,
      created_at: Date.now(),
      details: `Updated product '${existing.name}'. Price altered: ${isPriceChanging}`
    } as any);

    // 5. Sync queue
    await db.syncQueue.add({
      actionType: 'UPDATE',
      entityName: 'products',
      payload: mapProductToCloud(updatedProd),
      timestamp: Date.now(),
      status: 'Pending'
    });

    return updatedProd;
  }

  // Soft Delete Product
  static async deleteProduct(
    id: string,
    user: UserContext,
    _isOnline: boolean
  ): Promise<boolean> {
    const existing = await db.products.get(id);
    if (!existing) return false;

    // 1. Tenant validation
    if (existing.tenant_id !== user.tenant_id) {
      throw new Error('Security Violation: Unauthorized product deletion.');
    }

    // 2. Role validation
    if (!validateProductPermission('delete', user.role)) {
      throw new Error(`Permission Denied: User role '${user.role}' cannot delete products.`);
    }

    // 3. Mark soft deleted locally
    const deletedProd: Product = {
      ...existing,
      deletedAt: Date.now(),
      status: 'Inactive',
      syncStatus: 'PENDING',  // Always PENDING until server confirms delete
      version: (existing.version || 1) + 1
    };

    // Soft delete locally: delete from local table, or mark as deleted.
    // The prompt specifies soft deletion, so we update status and set deletedAt.
    const mappedLocal = mapProductToLocal(deletedProd);
    await db.products.put(mappedLocal);

    // 4. Audit logging
    await db.securityAuditLogs.put({
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tenant_id: user.tenant_id,
      branch_id: user.branch_id,
      user_id: user.id,
      action: 'PRODUCT_DELETED',
      created_at: Date.now(),
      details: `Soft deleted product '${existing.name}' (${id})`
    } as any);

    // 5. Sync queue
    await db.syncQueue.add({
      actionType: 'DELETE',
      entityName: 'products',
      payload: mapProductToCloud(deletedProd),
      timestamp: Date.now(),
      status: 'Pending'
    });

    return true;
  }

  // Sync Recovery download
  static async reconcileCloudChanges(cloudProducts: Product[], tenantId: string) {
    // Build a set of cloud product IDs for targeted reconciliation.
    // We ONLY remove local products that:
    //   (a) exist in the cloud response (so we refresh with authoritative data), AND
    //   (b) are not PENDING (offline work not yet synced)
    // This preserves locally-created products that have never been pushed to the cloud.
    const cloudProductIds = new Set(cloudProducts.map(cp => cp.id));

    const localProds = await db.products.where('tenant_id').equals(tenantId).toArray();
    for (const lp of localProds) {
      if (cloudProductIds.has(lp.id) && lp.syncStatus !== 'PENDING') {
        await db.products.delete(lp.id);
      }
    }

    // Resolve primary branch for tenant if not tenant-101
    const tenantBranches = await db.branches.where('tenant_id').equals(tenantId).toArray();
    const primaryBranchId = tenantBranches.length > 0 ? tenantBranches[0].id : 'branch-dar-hq';

    // Upsert recovered products
    for (const cp of cloudProducts) {
      if (cp.deletedAt || (cp as any).deleted_at || (cp as any).status === 'Inactive') continue; // Skip deleted or inactive items

      // Preserve offline-pending local version — don't overwrite with stale cloud data
      const existing = await db.products.get(cp.id);
      if (existing && existing.syncStatus === 'PENDING') {
        continue;
      }

      const bid = cp.branchId || cp.branch_id || 'branch-dar-hq';
      const resolvedBranchId = (bid === 'branch-dar-hq' && tenantId !== 'tenant-101') ? primaryBranchId : bid;

      const localFormat = mapProductToLocal({
        ...cp,
        branchId: resolvedBranchId,
        branch_id: resolvedBranchId,
        syncStatus: 'SYNCED'
      });
      await db.products.put(localFormat);
    }
  }

}

// ─── createProductWithVariants ──────────────────────────────────────────────
/**
 * High-level API that creates a product and its variants atomically.
 * Implements Fix #1 (Deep Write Pipeline) + Fix #4 (Client ID Sovereignty).
 *
 * @param input    Product fields (id auto-generated via crypto.randomUUID)
 * @param variants Variant rows (productId auto-bound to the parent)
 * @param user     Authenticated user context
 * @param isOnline Current network state
 */
export async function createProductWithVariants(
  input: Omit<Product, 'id' | 'updatedAt' | 'version' | 'syncStatus'>,
  variants: Omit<ProductVariant, 'productId' | 'isSynced' | 'syncStatus'>[],
  user: UserContext,
  isOnline: boolean
): Promise<{ product: Product; variants: ProductVariant[] }> {
  if (!validateProductPermission('create', user.role)) {
    throw new Error(`Permission Denied: '${user.role}' cannot create products.`);
  }

  const tenantId = input.tenantId || input.tenant_id || user.tenant_id;
  const branchId = input.branchId || input.branch_id || user.branch_id;
  if (tenantId !== user.tenant_id) throw new Error('Security Error: Tenant ID mismatch.');

  // Client ID Sovereignty — cryptographic UUID the server must honour exactly.
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
    syncStatus: isOnline ? 'SYNCED' : 'PENDING',
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

  // ── Atomic deep write: product + all variants in ONE Dexie transaction ──
  await saveProductAndVariants(product, boundVariants);

  // Audit log
  await db.securityAuditLogs.put({
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    tenant_id: tenantId,
    branch_id: branchId,
    user_id: user.id,
    action: 'PRODUCT_WITH_VARIANTS_CREATED',
    created_at: now,
    details: `Created '${product.name}' (${productId}) with ${boundVariants.length} variant(s).`
  } as any);

  return { product, variants: boundVariants };
}

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES SERVICE (Ported from Project-1 & Enhanced for Cloud/Offline)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchCategories(tenantId: string): Promise<Category[]> {
  const local = await db.categories.where('tenant_id').equals(tenantId).toArray();
  if (local.length > 0) return local;
  try {
    const { data } = await supabase.from('categories').select('*').eq('tenant_id', tenantId);
    if (data && data.length > 0) {
      await db.categories.bulkPut(data as Category[]);
      return data as Category[];
    }
  } catch (e) {
    console.warn('[Cloud Sync] Failed to fetch categories from cloud:', e);
  }
  return local;
}

export async function createCategory(payload: Partial<Category>): Promise<Category> {
  const cat: Category = {
    id: payload.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name?.trim() || 'New Category',
    description: payload.description || '',
    parent_id: payload.parent_id || undefined,
    icon: payload.icon || 'Folder',
    slug: payload.slug || payload.name?.toLowerCase().replace(/\s+/g, '-') || '',
    is_active: payload.is_active ?? true,
    tenant_id: payload.tenant_id || '',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  await db.categories.put(cat);
  try {
    await supabase.from('categories').insert(cat as any);
  } catch (err) {
    console.warn('[Cloud Sync] Category insert failed:', err);
  }
  return cat;
}

export async function updateCategory(id: string, payload: Partial<Category>): Promise<void> {
  const existing = await db.categories.get(id);
  if (existing) {
    const updated = { ...existing, ...payload, updated_at: Date.now() };
    await db.categories.put(updated);
    try {
      await supabase.from('categories').update(payload as any).eq('id', id);
    } catch (err) {
      console.warn('[Cloud Sync] Category update failed:', err);
    }
  }
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
  try {
    await supabase.from('categories').delete().eq('id', id);
  } catch (err) {
    console.warn('[Cloud Sync] Category delete failed:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BRANDS SERVICE (Ported from Project-1 & Enhanced for Cloud/Offline)
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchBrands(tenantId: string): Promise<Brand[]> {
  const local = await db.brands.where('tenant_id').equals(tenantId).toArray();
  if (local.length > 0) return local;
  try {
    const { data } = await supabase.from('brands').select('*').eq('tenant_id', tenantId);
    if (data && data.length > 0) {
      await db.brands.bulkPut(data as Brand[]);
      return data as Brand[];
    }
  } catch (e) {
    console.warn('[Cloud Sync] Failed to fetch brands from cloud:', e);
  }
  return local;
}

export async function createBrand(payload: Partial<Brand>): Promise<Brand> {
  const brand: Brand = {
    id: payload.id || `brand-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name?.trim() || 'New Brand',
    description: payload.description || '',
    logo_url: payload.logo_url || '',
    website: payload.website || '',
    is_active: payload.is_active ?? true,
    tenant_id: payload.tenant_id || '',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  await db.brands.put(brand);
  try {
    await supabase.from('brands').insert(brand as any);
  } catch (err) {
    console.warn('[Cloud Sync] Brand insert failed:', err);
  }
  return brand;
}

export async function updateBrand(id: string, payload: Partial<Brand>): Promise<void> {
  const existing = await db.brands.get(id);
  if (existing) {
    const updated = { ...existing, ...payload, updated_at: Date.now() };
    await db.brands.put(updated);
    try {
      await supabase.from('brands').update(payload as any).eq('id', id);
    } catch (err) {
      console.warn('[Cloud Sync] Brand update failed:', err);
    }
  }
}

export async function deleteBrand(id: string): Promise<void> {
  await db.brands.delete(id);
  try {
    await supabase.from('brands').delete().eq('id', id);
  } catch (err) {
    console.warn('[Cloud Sync] Brand delete failed:', err);
  }
}
