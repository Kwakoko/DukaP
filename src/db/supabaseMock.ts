import Dexie, { type Table } from 'dexie';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CloudProduct {
  id: string;
  name: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  price: number;
  stock: number;
  expiryDate?: string;
  tenant_id: string; // Tenant (Business) ID
  branch_id: string;
  module: string;
  hasVariants: boolean;
  brand?: string;
  description?: string;
  supplier?: string;
  image?: string;
  attributes?: string[];
  origin?: string;
  created_at: number;
  updated_at: number;
  created_by?: string;

  // CamelCase fields for Production Statement
  tenantId?: string;
  branchId?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  costPrice?: number;
  status?: 'Active' | 'Inactive';
  version?: number;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number;
  createdBy?: string;
  updatedBy?: string;
}

export interface CloudProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  buyingPrice?: number;
  sellingPrice?: number;
  stock: number;
  reservedStock: number;
  reorderLevel: number;
  status: 'Active' | 'Inactive';
  attributes: Record<string, string>;
  origin?: string;
  tenant_id: string;
  branch_id: string;
  created_at: number;
  updated_at: number;

  // CamelCase fields for Production Statement
  tenantId?: string;
  branchId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface SupabaseTransactionLog {
  id: string;
  timestamp: number;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'BEGIN' | 'COMMIT';
  table_name: string;
  record_id?: string;
  query_params?: string;
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
}

export interface SupabaseAuditLog {
  id: string;
  timestamp: number;
  tenant_id: string;
  user_id: string;
  action: string;
  ip_address: string;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
}

export interface CloudTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  business_type?: string;
  industry?: string;
  tenant_code?: string;
  owner_name?: string;
  email?: string;
  created_at: number;
  updated_at?: number;
  deleted_at?: number;
  registration_source?: string;
  created_by?: string;
  registration_ip?: string;
  registration_device?: string;
  verification_status?: string;
}

export interface CloudBranch {
  id: string;
  tenant_id: string;
  name: string;
  location: string;
  is_headquarters: boolean;
  status: string;
  created_at: number;
  updated_at?: number;
  deleted_at?: number;
}

export interface CloudUser {
  id: string;
  email: string;
  password_hash: string;
  is_super_admin: boolean;
  name: string;
  phone: string;
  tenant_id: string;
  status: string;
  created_at: number;
  updated_at?: number;
  registration_source?: string;
  created_by?: string;
  registration_ip?: string;
  registration_device?: string;
  verification_status?: string;
}

export interface CloudUserBranchRole {
  id: string;
  user_id: string;
  tenant_id: string;
  branch_id: string;
  industry_id: string;
  role_id: string;
}

export interface CloudTenantModule {
  id: string;
  tenant_id: string;
  module_key: string;
  enabled: boolean;
  configuration: any;
  installed_at: number;
}

export interface CloudTenantSetting {
  id: string;
  tenant_id: string;
  setting_key: string;
  setting_value: any;
}

export interface CloudFeatureFlag {
  id: string;
  tenant_id: string;
  feature_key: string;
  enabled: boolean;
}

export interface CloudUserSecurity {
  user_id: string;
  pin_hash: string;
  failed_attempts: number;
  two_factor_enabled: boolean;
}

export interface CloudPlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  description?: string;
  created_at: number;
  updated_at: number;
  created_by?: string;
  updated_by?: string;
  version: number;
}

export interface CloudSystemConfig {
  id: string;
  config_key: string;
  config_value: any;
  environment: 'production' | 'staging' | 'development';
  created_at: number;
  updated_at: number;
  version: number;
}

export interface CloudSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'EXPIRED' | 'TRIAL';
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  amount: number;
  currency: string;
  current_period_start: number;
  current_period_end: number;
  trial_end?: number;
  created_at: number;
  updated_at: number;
  created_by?: string;
  version: number;
}

export interface CloudDatabaseBackup {
  id: string;
  snapshot_name: string;
  type: 'WAL' | 'FULL_SNAPSHOT' | 'PITR';
  size_bytes: number;
  created_at: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  rollback_data?: string;
  created_by: string;
}

export interface CloudSuperAdminRole {
  id: string;
  name: string;
  slug: string;
  permissions: string[];
  created_at: number;
  updated_at: number;
}

export interface CloudUserSession {
  id: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  token: string;
  refreshTokenHash: string;
  ipAddress: string;
  userAgent: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
}

export interface CloudStockLedgerEntry {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  variant_id?: string;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  created_at: number;
}

// ─── Dexie Instance for Cloud Server Simulation ──────────────────────────────

class DukaPosCloudDatabase extends Dexie {
  cloud_products!: Table<CloudProduct>;
  cloud_product_variants!: Table<CloudProductVariant>;
  supabase_transaction_logs!: Table<SupabaseTransactionLog>;
  supabase_audit_logs!: Table<SupabaseAuditLog>;
  cloud_tenants!: Table<CloudTenant>;
  cloud_branches!: Table<CloudBranch>;
  cloud_users!: Table<CloudUser>;
  cloud_user_branch_roles!: Table<CloudUserBranchRole>;
  cloud_tenant_modules!: Table<CloudTenantModule>;
  cloud_tenant_settings!: Table<CloudTenantSetting>;
  cloud_feature_flags!: Table<CloudFeatureFlag>;
  cloud_user_security!: Table<CloudUserSecurity>;
  cloud_customers!: Table<any>;
  cloud_orders!: Table<any>;
  cloud_subscription_plans!: Table<any>;
  cloud_platform_settings!: Table<CloudPlatformSetting>;
  cloud_system_configs!: Table<CloudSystemConfig>;
  cloud_subscriptions!: Table<CloudSubscription>;
  cloud_database_backups!: Table<CloudDatabaseBackup>;
  cloud_super_admin_roles!: Table<CloudSuperAdminRole>;
  cloud_user_sessions!: Table<CloudUserSession>;
  cloud_stock_ledger!: Table<CloudStockLedgerEntry>;

  constructor() {
    super('DukaPosCloudDatabase');
    this.version(1).stores({
      cloud_products: 'id, category, tenant_id, branch_id, module, tenantId, branchId',
      cloud_product_variants: 'id, productId, tenant_id, branch_id, tenantId, branchId',
      supabase_transaction_logs: 'id, timestamp, operation, table_name, status',
      supabase_audit_logs: 'id, timestamp, tenant_id, user_id, action, status'
    });
    this.version(2).stores({
      cloud_products: 'id, category, tenant_id, branch_id, module, tenantId, branchId',
      cloud_product_variants: 'id, productId, tenant_id, branch_id, tenantId, branchId',
      supabase_transaction_logs: 'id, timestamp, operation, table_name, status',
      supabase_audit_logs: 'id, timestamp, tenant_id, user_id, action, status',
      cloud_tenants: 'id, name, slug, status',
      cloud_branches: 'id, tenant_id, name',
      cloud_users: 'id, email, tenant_id',
      cloud_user_branch_roles: 'id, user_id, tenant_id, branch_id',
      cloud_tenant_modules: 'id, tenant_id, module_key',
      cloud_tenant_settings: 'id, tenant_id, setting_key',
      cloud_feature_flags: 'id, tenant_id, feature_key',
      cloud_user_security: 'user_id'
    });
    this.version(3).stores({
      cloud_products: 'id, category, tenant_id, branch_id, module, tenantId, branchId',
      cloud_product_variants: 'id, productId, tenant_id, branch_id, tenantId, branchId',
      supabase_transaction_logs: 'id, timestamp, operation, table_name, status',
      supabase_audit_logs: 'id, timestamp, tenant_id, user_id, action, status',
      cloud_tenants: 'id, name, slug, status',
      cloud_branches: 'id, tenant_id, name',
      cloud_users: 'id, email, tenant_id',
      cloud_user_branch_roles: 'id, user_id, tenant_id, branch_id',
      cloud_tenant_modules: 'id, tenant_id, module_key',
      cloud_tenant_settings: 'id, tenant_id, setting_key',
      cloud_feature_flags: 'id, tenant_id, feature_key',
      cloud_user_security: 'user_id',
      cloud_customers: 'id, tenant_id, name',
      cloud_orders: 'id, tenant_id, status',
      cloud_subscription_plans: 'id, code, name'
    });
    this.version(4).stores({
      cloud_users: 'id, email, tenant_id, created_at, registration_source, verification_status'
    });
    this.version(5).stores({
      cloud_platform_settings: 'id, setting_key, category',
      cloud_system_configs: 'id, config_key, environment',
      cloud_subscriptions: 'id, tenant_id, status, plan_id',
      cloud_database_backups: 'id, created_at, type, status',
      cloud_super_admin_roles: 'id, slug'
    });
    this.version(6).stores({
      cloud_user_sessions: 'id, userId, tenantId, status',
      cloud_stock_ledger: 'id, tenant_id, branch_id, product_id, created_at'
    });
  }
}

export const cloudDb = new DukaPosCloudDatabase();

// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function logCloudTransaction(log: Omit<SupabaseTransactionLog, 'id' | 'timestamp'>) {
  const newLog: SupabaseTransactionLog = {
    ...log,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now()
  };
  await cloudDb.supabase_transaction_logs.put(newLog);
}

export async function logCloudAudit(audit: Omit<SupabaseAuditLog, 'id' | 'timestamp'>) {
  const newAudit: SupabaseAuditLog = {
    ...audit,
    id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now()
  };
  await cloudDb.supabase_audit_logs.put(newAudit);
}

// ─── Row Level Security (RLS) Policy Check ────────────────────────────────────
 
export function verifyRowLevelSecurity(
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  tenantId: string | undefined,
  recordTenantId: string | undefined,
  userId: string
): { allowed: boolean; error?: string } {
  
  // Allow login & authentication checks (selecting users, roles, branches, settings for tenant resolution)
  if (action === 'SELECT' && (
    tableName === 'cloud_users' ||
    tableName === 'cloud_user_branch_roles' ||
    tableName === 'cloud_branches' ||
    tableName === 'cloud_tenant_modules' ||
    tableName === 'cloud_tenant_settings' ||
    tableName === 'cloud_feature_flags' ||
    tableName === 'cloud_user_security' ||
    tableName === 'cloud_tenants' ||
    tableName === 'cloud_subscription_plans' ||
    tableName === 'cloud_business_profiles'
  )) {
    return { allowed: true };
  }

  // Allow tenant lookup, registration, and subscription plan management
  if (tableName === 'cloud_subscription_plans') {
    return { allowed: true };
  }

  if (tableName === 'cloud_tenants' && (action === 'SELECT' || action === 'INSERT')) {
    return { allowed: true };
  }

  // Allow inserting new user records, roles, default settings, branches, modules and flags during onboarding registration
  if (action === 'INSERT' && (
    tableName === 'cloud_users' ||
    tableName === 'cloud_user_branch_roles' ||
    tableName === 'cloud_user_security' ||
    tableName === 'cloud_branches' ||
    tableName === 'cloud_tenant_modules' ||
    tableName === 'cloud_tenant_settings' ||
    tableName === 'cloud_feature_flags'
  )) {
    return { allowed: true };
  }

  if (!tenantId) {
    return { allowed: false, error: 'Row-Level Security violation: Missing tenant authorization claims.' };
  }
  
  if (tenantId === 'tenant-admin-system') {
    // Super admin and platform system provisioner bypassing standard RLS checks for multi-tenant setup & administration
    return { allowed: true };
  }

  if (!recordTenantId) {
    return { allowed: false, error: `Row-Level Security violation: Target record missing tenantId identifier.` };
  }

  if (tenantId !== recordTenantId) {
    return {
      allowed: false,
      error: `Row-Level Security policy violation on table '${tableName}'. User '${userId}' from tenant '${tenantId}' is unauthorized to perform ${action} on record belonging to tenant '${recordTenantId}'.`
    };
  }

  return { allowed: true };
}

// ─── Seed Cloud Products initially if empty ──────────────────────────────────
export async function seedCloudDatabase() {
  if (typeof window !== 'undefined' && localStorage.getItem('DUKAPOS_PRODUCTION_LOCKED') === 'true') {
    return;
  }
  const count = await cloudDb.cloud_products.count();
  if (count > 0) return;

  const NOW = Date.now();

  const initialProducts: CloudProduct[] = [
    // tenant-101 (Acme Conglomerate) products
    {
      id: 'ret-1',
      name: 'Premium Rice 5kg',
      category: 'Grains',
      buyingPrice: 15000,
      sellingPrice: 18500,
      price: 18500,
      stock: 70,
      tenant_id: 'tenant-101',
      branch_id: 'branch-dar-hq',
      module: 'Retail',
      hasVariants: true,
      brand: 'Tanzania Gold',
      description: 'Premium long grain white rice',
      supplier: 'Mbeya Farmers Ltd',
      attributes: ['Grade'],
      origin: 'DEMO',
      created_at: NOW,
      updated_at: NOW,
      created_by: 'usr-owner',

      // camelCase mappings
      tenantId: 'tenant-101',
      branchId: 'branch-dar-hq',
      categoryId: 'Grains',
      costPrice: 15000,
      status: 'Active',
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'usr-owner'
    },
    {
      id: 'ret-2',
      name: 'White Sugar 1kg',
      category: 'Groceries',
      buyingPrice: 3800,
      sellingPrice: 4500,
      price: 4500,
      stock: 85,
      tenant_id: 'tenant-101',
      branch_id: 'branch-dar-hq',
      module: 'Retail',
      hasVariants: false,
      brand: 'Kilombero',
      description: 'Pure refined white sugar',
      supplier: 'Kilombero Sugar Co',
      origin: 'DEMO',
      created_at: NOW,
      updated_at: NOW,
      created_by: 'usr-owner',

      // camelCase mappings
      tenantId: 'tenant-101',
      branchId: 'branch-dar-hq',
      categoryId: 'Groceries',
      costPrice: 3800,
      status: 'Active',
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'usr-owner'
    },
    {
      id: 'ret-3',
      name: 'Fresh Milk 1L',
      category: 'Dairy',
      buyingPrice: 2000,
      sellingPrice: 2600,
      price: 2600,
      stock: 40,
      tenant_id: 'tenant-101',
      branch_id: 'branch-dar-hq',
      module: 'Retail',
      hasVariants: false,
      brand: 'Asas',
      description: 'Pasteurized fresh cow milk',
      supplier: 'Asas Dairies',
      origin: 'DEMO',
      created_at: NOW,
      updated_at: NOW,
      created_by: 'usr-owner',

      // camelCase mappings
      tenantId: 'tenant-101',
      branchId: 'branch-dar-hq',
      categoryId: 'Dairy',
      costPrice: 2000,
      status: 'Active',
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'usr-owner'
    },
    // tenant-102 (Arusha Chemist & Pharmacy) products
    {
      id: 'pharm-1',
      name: 'Paracetamol 500mg (100 Tabs)',
      category: 'Analgesics',
      buyingPrice: 4000,
      sellingPrice: 6500,
      price: 6500,
      stock: 50,
      expiryDate: '2027-10-12',
      tenant_id: 'tenant-102',
      branch_id: 'branch-pharm-main',
      module: 'Pharmacy',
      hasVariants: false,
      origin: 'DEMO',
      created_at: NOW,
      updated_at: NOW,
      created_by: 'usr-grace',

      // camelCase mappings
      tenantId: 'tenant-102',
      branchId: 'branch-pharm-main',
      categoryId: 'Analgesics',
      costPrice: 4000,
      status: 'Active',
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'usr-grace'
    },
    {
      id: 'pharm-2',
      name: 'Amoxicillin 250mg Syrup',
      category: 'Antibiotics',
      buyingPrice: 8500,
      sellingPrice: 12000,
      price: 12000,
      stock: 40,
      expiryDate: '2026-08-15',
      tenant_id: 'tenant-102',
      branch_id: 'branch-pharm-main',
      module: 'Pharmacy',
      hasVariants: false,
      origin: 'DEMO',
      created_at: NOW,
      updated_at: NOW,
      created_by: 'usr-grace',

      // camelCase mappings
      tenantId: 'tenant-102',
      branchId: 'branch-pharm-main',
      categoryId: 'Antibiotics',
      costPrice: 8500,
      status: 'Active',
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'usr-grace'
    }
  ];

  const initialVariants: CloudProductVariant[] = [
    {
      id: 'var-ret-1-a',
      productId: 'ret-1',
      sku: 'RICE-5KG-GRADE-A',
      barcode: '620123456781',
      buyingPrice: 16000,
      sellingPrice: 19500,
      stock: 70,
      reservedStock: 0,
      reorderLevel: 10,
      status: 'Active',
      attributes: { Grade: 'Grade A' },
      origin: 'DEMO',
      tenant_id: 'tenant-101',
      branch_id: 'branch-dar-hq',
      created_at: NOW,
      updated_at: NOW,

      // camelCase mappings
      tenantId: 'tenant-101',
      branchId: 'branch-dar-hq',
      createdAt: NOW,
      updatedAt: NOW
    },
    {
      id: 'var-ret-1-b',
      productId: 'ret-1',
      sku: 'RICE-5KG-GRADE-B',
      barcode: '620123456782',
      buyingPrice: 14000,
      sellingPrice: 17500,
      stock: 0,
      reservedStock: 0,
      reorderLevel: 10,
      status: 'Active',
      attributes: { Grade: 'Grade B' },
      origin: 'DEMO',
      tenant_id: 'tenant-101',
      branch_id: 'branch-dar-hq',
      created_at: NOW,
      updated_at: NOW,

      // camelCase mappings
      tenantId: 'tenant-101',
      branchId: 'branch-dar-hq',
      createdAt: NOW,
      updatedAt: NOW
    }
  ];

  const initialBranches: CloudBranch[] = [
    { id: 'branch-dar-hq', tenant_id: 'tenant-101', name: 'Dar es Salaam HQ Branch', location: 'Posta, Dar es Salaam', is_headquarters: true, status: 'Active', created_at: NOW },
    { id: 'branch-arusha-depot', tenant_id: 'tenant-101', name: 'Arusha Retail Branch', location: 'Njiro, Arusha', is_headquarters: false, status: 'Active', created_at: NOW },
    { id: 'branch-london-office', tenant_id: 'tenant-101', name: 'London Restaurant Branch', location: 'London, UK', is_headquarters: false, status: 'Active', created_at: NOW },
    { id: 'branch-pharm-main', tenant_id: 'tenant-102', name: 'Pharmacy Main Branch', location: 'Arusha Town', is_headquarters: true, status: 'Active', created_at: NOW },
    { id: 'branch-bongo-main', tenant_id: 'tenant-106', name: 'Bongo Lounge — Msasani', location: 'Slipway Road, Msasani, Dar es Salaam', is_headquarters: true, status: 'Active', created_at: NOW }
  ];

  await cloudDb.cloud_products.bulkPut(initialProducts);
  await cloudDb.cloud_product_variants.bulkPut(initialVariants);
  await cloudDb.cloud_branches.bulkPut(initialBranches);

  // Log initial seeds
  await logCloudTransaction({
    operation: 'INSERT',
    table_name: 'cloud_products',
    status: 'SUCCESS',
    record_id: 'bulk-seed'
  });
  await logCloudAudit({
    tenant_id: 'tenant-101',
    user_id: 'usr-system-seed',
    action: 'cloud_db.seed.success',
    ip_address: '127.0.0.1',
    status: 'SUCCESS',
    details: 'Seeded default retail products to simulated cloud Supabase PostgreSQL'
  });
}
