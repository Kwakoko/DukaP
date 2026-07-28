import Dexie, { type Table } from 'dexie';

// Interfaces for our database entities
export interface Product {
  id: string;
  name: string;
  category: string;
  buyingPrice: number; // Default Buying Price
  sellingPrice: number; // Default Selling Price (also mapped to price for compatibility)
  price: number; // Selling Price representation
  stock: number; // Aggregate total stock of all variants (calculated read-only when hasVariants is true)
  expiryDate?: string;
  tenant_id: string;
  branch_id: string;
  module: string; // Dynamic mapping to all 27+ modules
  hasVariants: boolean;
  brand?: string;
  description?: string;
  supplier?: string;
  image?: string;
  attributes?: string[]; // Configurable attributes list, e.g. ['Size', 'Color']
  reorderLevel?: number; // Optional custom reorder level trigger

  // Production-grade CamelCase & synchronization fields
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
  syncStatus?: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';

  // ── Beverage / Bar Extension (JSONB payload for Bar module) ──────────────
  item_type?: string;             // e.g. 'Beverage', 'Food', 'Non-Alcoholic'
  packaging?: string;             // 'Bottle' | 'Can' | 'Draught' | 'Sachet'
  bottle_size_ml?: number;        // e.g. 750 for 750ml bottle
  standard_pour_ml?: number;      // Pour size in ml, e.g. 30ml per shot
  total_pours_per_bottle?: number; // Calculated: bottle_size_ml / standard_pour_ml
  cost_per_pour?: number;         // Buying price / total_pours_per_bottle
  selling_price_per_pour?: number; // Revenue per pour
  track_empty_bottles?: boolean;  // Track empties for deposit/return
  excise_tax_applicable?: boolean; // Tanzania excise tax on alcohol
  excise_tax_rate?: number;        // e.g. 0.25 = 25%
  abv_percent?: number;            // Alcohol by Volume %
  is_happy_hour_eligible?: boolean; // Qualifies for happy hour pricing
  happy_hour_price?: number;        // Discounted pour price during happy hour
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  buyingPrice?: number; // Override buying price (optional)
  sellingPrice?: number; // Override selling price (optional)
  stock: number;
  reservedStock: number;
  reorderLevel: number;
  status: 'Active' | 'Inactive';
  attributes: Record<string, string>; // e.g. { Size: "L", Color: "Red" }
  image?: string;
  tenant_id: string;
  branch_id: string;
  inheritBuyingPrice?: boolean;
  inheritSellingPrice?: boolean;
  // Sync metadata
  isSynced?: number;       // 0 = pending, 1 = synced (fast IndexedDB indexing)
  syncStatus?: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

/**
 * IdMappingLedger — immutable log that maps a temporary client-generated ID
 * to the permanent server-assigned UUID after a successful cloud INSERT.
 * This prevents data decoupling when the server reassigns primary keys.
 */
export interface IdMappingLedger {
  /** Auto-increment primary key */
  id?: number;
  /** The temporary client-side ID (e.g. "offline-usr-product-1234") */
  clientId: string;
  /** The permanent server UUID returned after the INSERT succeeded */
  serverId: string;
  /** Which entity this mapping covers */
  entityName: 'products' | 'productVariants';
  /** Tenant scoping */
  tenantId: string;
  /** When the mapping was created */
  createdAt: number;
  /** Whether dependent references have been cascaded */
  reconciled: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  outstandingBalance: number;
  creditLimit?: number;
  walletBalance?: number;
  tenant_id: string;
  branch_id: string;
  type: string; // Patient, Member, Student, Tenant, Guest, Client, Customer
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface OrderItem {
  productId: string;
  variantId?: string; // Selected Variant if exists
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
  timestamp: number;
  syncStatus: 'Synced' | 'Pending';
  tenant_id: string;
  branch_id: string;
  module: string;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface SyncItem {
  id?: number;
  actionType: 'INSERT' | 'UPDATE' | 'DELETE';
  entityName: 'products' | 'customers' | 'orders' | 'productVariants';
  payload: any;
  timestamp: number;
  status: 'Pending' | 'Failed' | 'Processing';
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'Active' | 'Suspended' | 'Trial' | 'Registered' | 'Cancelled' | 'Demo' | 'DEMO' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED' | 'Expired' | 'Archived' | 'Prospect' | 'Registration' | 'Verification' | 'Provisioning' | 'Demo Mode' | 'Subscribed' | 'Deleted';
  plan: 'Basic' | 'Professional' | 'Enterprise';
  // Extended SaaS fields
  business_type?: string;
  email?: string;
  phone?: string;
  country?: string;
  region?: string;
  address?: string;
  logo_url?: string;
  banner_url?: string;
  tenant_code?: string;
  reg_number?: string;
  tax_number?: string;
  industry?: string;
  district?: string;
  created_at?: number;
  trial_ends_at?: number;
  deleted_at?: number;
  deletedAt?: number;
  tenant_uuid?: string;
  business_code?: string;
  human_tenant_id?: string;
  // Master Tenant Registry fields
  legal_name?: string;
  tin?: string;
  category?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  brand_colors?: { primary: string; secondary: string };
  db_identifier?: string;
  storage_bucket?: string;
  last_login_at?: number;
  last_sync_at?: number;
  last_backup_at?: number;
  version?: string;
  api_key?: string;
  feature_package?: string;
  verification_status?: 'Pending' | 'Verified' | 'Rejected' | string;
  data_residency_region?: string;
  registration_source?: string;
  created_by?: string;
  registration_ip?: string;
  registration_device?: string;
}

export interface TenantBackup {
  id: string;
  tenant_id: string;
  type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MANUAL';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  size_mb: number;
  encrypted: boolean;
  checksum: string;
  created_at: number;
  created_by?: string;
}

export interface SystemNotification {
  id: string;
  tenant_id?: string | null;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'IN_APP' | 'PUSH';
  subject: string;
  message: string;
  target_scope: 'SINGLE' | 'ALL' | 'PLAN' | 'CATEGORY' | 'REGION';
  target_filter?: string;
  status: 'SENT' | 'PENDING' | 'FAILED';
  sent_at: number;
}

export interface SecurityIncident {
  id: string;
  tenant_id: string;
  type: 'FAILED_LOGIN' | 'LOCKED_ACCOUNT' | 'SUSPICIOUS_LOCATION' | 'CONCURRENT_SESSIONS' | 'TOKEN_ABUSE' | 'API_ABUSE' | 'RATE_LIMIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  details: string;
  ip_address?: string;
  user_agent?: string;
  created_at: number;
}


export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  location: string;
  // Extended SaaS fields (optional for backward compat)
  branch_code?: string;
  phone?: string;
  is_headquarters?: boolean;
  is_default?: boolean;          // Marks the default/HQ branch for the tenant
  status?: 'Active' | 'Inactive';
  created_at?: number;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_key: string; // matches IndustryModule keys
  enabled: boolean;
  configuration: Record<string, any>;
  installed_at: number;
}

export interface TenantSetting {
  id: string;
  tenant_id: string;
  setting_key: string;
  setting_value: any;
}

export interface AppSetting {
  id: string;
  tenantId: string;
  branchId?: string;
  userId?: string;
  namespace: string;
  config: Record<string, any>;
  version: number;
  syncedAt?: number;
}

export interface FeatureFlag {
  id: string;
  tenant_id: string;
  feature_key: string;
  enabled: boolean;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: number;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface ResetCommand {
  id: string;
  tenant_id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED';
  requested_by: string;
  clear_type: 'DEMO_DATA' | 'ALL_DATA';
  created_at: number;
  completed_at?: number;
  error_message?: string;
  current_table?: string;
  processed_count?: number;
  total_count?: number;
  percent_complete?: number;
  rollback_package_data?: string;
  rollback_available?: boolean;
  is_paused?: boolean;
  is_cancelled?: boolean;
}

export interface Industry {
  id: string;
  name: string;
  schema_preset: Record<string, any>;
}

export interface TenantIndustry {
  tenant_id: string;
  industry_id: string;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  is_super_admin: boolean;
  name: string;
  phone: string;
  
  // Extended SaaS fields
  tenant_id?: string | null;      // null = system platform employee, non-null = tenant user
  first_name?: string;
  last_name?: string;
  username?: string;
  pin_hash?: string;              // POS quick PIN hash (clean 4-digit, no prefix)
  avatar_url?: string;
  status?: 'Active' | 'Suspended' | 'Inactive';
  email_verified?: boolean;
  phone_verified?: boolean;
  last_login_at?: number;
  created_at?: number;
  updated_at?: number;
  
  // Registration Audit Metadata
  registration_source?: 'SELF_REGISTERED' | 'ADMIN_PROVISIONED' | 'SUPER_ADMIN_CPANEL' | 'INVITATION_LINK' | 'SYSTEM_SEED';
  created_by?: string;
  registration_ip?: string;
  registration_device?: string;
  verification_status?: 'VERIFIED' | 'PENDING' | 'UNVERIFIED';

  // Assignment
  branch_id?: string;             // Auto-set to HQ branch on provisioning
  role?: string;                  // Friendly role label (e.g. 'Tenant Owner')
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  employee_code: string;
  job_title: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  joined_at: number;
}

export interface Employee {
  id: string;
  tenant_id: string;
  user_id: string;
  employee_number: string;
  national_id?: string;
  address?: string;
  emergency_contact?: string;
  employment_date: number;
  salary_type: 'Monthly' | 'Hourly' | 'Commission';
  notes?: string;
}

export interface Role {
  id: string;
  tenant_id: string | null;      // null for platform system roles
  name: string;
  slug: string;
  description: string;
  is_system_role: boolean;
  is_custom: boolean;
  created_at: number;
}

export interface Permission {
  id: string;
  module: string;                  // e.g. 'inventory', 'sales', 'reports'
  resource: string;                // e.g. 'product', 'sale', 'config'
  action: string;                  // e.g. 'create', 'void', 'view'
  slug: string;                    // e.g. 'inventory.product.create'
  description: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface TenantUserBranch {
  id: string;
  tenant_id: string;
  user_id: string;
  branch_id: string;
  role_id: string;                 // references role.id or role.slug
  is_primary: boolean;
  assigned_at: number;
}

export interface UserSecurity {
  user_id: string;
  pin_hash: string;
  failed_attempts: number;
  locked_until?: number;
  two_factor_enabled: boolean;
}

export interface SecurityAuditLog {
  id: string;
  tenant_id: string | null;
  branch_id?: string;
  user_id: string;
  action: string;                  // e.g. 'user.login.success', 'permission.changed'
  ip_address?: string;
  device_info?: string;
  app_version?: string;
  payload?: any;
  created_at: number;
}

export interface UserBranchRole {
  id: string;
  user_id: string;
  tenant_id: string;
  branch_id: string;
  industry_id: string;
  role_id: string;
}

export interface StockLedgerEntry {
  id: string;
  tenant_id: string;
  branch_id: string;
  warehouse_id?: string;
  product_id: string;
  variant_id?: string;
  movement_type: 
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
    | 'PRODUCTION_USAGE';
  reference_type?: string;
  reference_id?: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  unit_cost: number;
  total_cost: number;
  user_id: string;
  device_id?: string;
  notes?: string;
  created_at: number;
  synced: boolean;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface ProductBranchStock {
  id: string;
  tenant_id: string;
  branch_id: string;
  warehouse_id?: string;
  product_id: string;
  // Stores the variant_id string if a variant, or the sentinel 'no-variant' for simple products.
  // This sentinel is required because IndexedDB compound indices cannot handle undefined.
  variant_id: string;
  current_quantity: number;
  average_cost: number;
  stock_value: number;
  updated_at: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  max_users: number;
  max_branches: number;
  max_products: number;
  max_storage_mb: number;
  is_trial: boolean;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  start_date: number;
  end_date: number;
  trial_end_date?: number;
  auto_renew: boolean;
  cancelled_at?: number;
  created_at: number;
  updated_at: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  status: 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  due_date: number;
  created_at: number;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string;
  provider: 'M-PESA' | 'AIRTEL' | 'CRDB' | 'NBC' | 'STRIPE' | 'PAYPAL';
  transaction_reference: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paid_at: number;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface SubscriptionEvent {
  id: string;
  tenant_id: string;
  event_type: 'PLAN_UPGRADED' | 'PAYMENT_RECEIVED' | 'TRIAL_STARTED' | 'SUBSCRIPTION_EXPIRED' | 'FEATURE_ENABLED' | 'TRIAL_EXTENDED' | 'PLAN_DOWNGRADED' | 'SUBSCRIPTION_CANCELLED' | 'LIMIT_OVERRIDDEN' | 'COUPON_APPLIED';
  old_value: any;
  new_value: any;
  performed_by: string;
  created_at: number;
}

// Feature registry — every DukaPos capability has a code
export interface Feature {
  id: string;
  code: string;          // e.g. POS_BASIC, MULTI_BRANCH, AI_ASSISTANT
  name: string;
  module: string;        // e.g. POS, Inventory, Reports
  description: string;
  created_at: number;
}

// Links plans to features (with optional per-feature limit overrides)
export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_id: string;
  enabled: boolean;
  // Optional limit overrides (JSON serialized)
  max_users?: number;
  max_products?: number;
  max_branches?: number;
  created_at: number;
}

// Tracks live usage metrics per tenant
export interface SubscriptionUsage {
  id: string;
  tenant_id: string;
  products_used: number;
  users_used: number;
  branches_used: number;
  storage_used_mb: number;
  updated_at: number;
}

// Coupon/promo codes for subscription discounts
export interface Coupon {
  id: string;
  code: string;           // e.g. DUKAPOS20
  description: string;
  discount_percent: number;
  valid_from: number;
  valid_until: number;
  max_uses: number;       // 0 = unlimited
  times_used: number;
  applicable_plans: string[];  // plan codes, empty = all plans
  is_active: boolean;
  created_at: number;
}

// ── Purchasing / SRM Module ──────────────────────────────────────────────────

export interface Supplier {
  id: string;
  supplier_code: string;        // e.g. SUP-001, auto-generated
  name: string;
  trading_name?: string;        // optional DBA / trading name
  category: string;

  // Tanzania Tax Compliance
  tin_number?: string;          // TRA Tax Identification Number
  vrn_number?: string;          // VAT Registration Number

  phone: string;
  whatsapp?: string;
  email?: string;
  country: string;              // default: Tanzania
  region?: string;              // e.g. Dar es Salaam, Arusha
  city: string;
  address?: string;

  // Payment Configuration
  preferred_currency: string;   // default: TZS
  payment_terms_days: number;   // 0 = COD, 7, 14, 30, 60
  credit_limit: number;         // maximum credit allowed
  current_balance: number;      // ledger-driven: sum(debits) - sum(credits)

  // Tanzania Mobile Money
  mpesa_number?: string;
  tigopesa_number?: string;
  airtel_money_number?: string;
  bank_account?: string;

  notes?: string;
  tenant_id: string;
  branch_id: string;
  status: 'Active' | 'Inactive' | 'Blacklisted';
  created_at: number;
  updated_at: number;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

// Multiple contacts per supplier (Sales Manager, Accountant, Driver, Owner)
export interface SupplierContact {
  id: string;
  supplier_id: string;
  tenant_id: string;
  name: string;
  position?: string;    // e.g. 'Sales Manager', 'Accounts Officer'
  phone: string;
  email?: string;
  is_primary: boolean;
  created_at: number;
}

// Line item on a Purchase Order
export interface POItem {
  product_id: string;
  variant_id?: string;
  product_name: string;
  sku: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  total_cost: number;
}

// Full 7-stage Purchase Order lifecycle
export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Sent' | 'Partial' | 'Completed' | 'Cancelled';
  payment_status: 'Unpaid' | 'Partial' | 'Paid';
  items: POItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  expected_delivery?: number;
  ordered_by: string;
  approved_by?: string;
  grn_id?: string;              // linked GRN once received
  tenant_id: string;
  branch_id: string;
  created_at: number;
  approved_at?: number;
  completed_at?: number;
}

// Line item on a Goods Receiving Note
export interface GRNItem {
  product_id: string;
  product_name: string;
  sku: string;
  qty_ordered: number;
  qty_received: number;   // may be < qty_ordered for partial delivery
  unit_cost: number;
  total_cost: number;
}

// Goods Receiving Note — triggers stock increase + AP ledger entry
export interface GoodsReceipt {
  id: string;
  grn_number: string;
  purchase_order_id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_number?: string;      // supplier's invoice reference
  received_by: string;
  status: 'Completed' | 'Partial';
  items: GRNItem[];
  total_received_value: number;
  notes?: string;
  tenant_id: string;
  branch_id: string;
  created_at: number;
}

// Supplier Invoice (Accounts Payable bill created when GRN is saved)
export interface SupplierInvoice {
  id: string;
  invoice_number: string;       // supplier's external invoice number
  grn_id: string;
  purchase_order_id: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;               // total invoice amount
  paid_amount: number;
  balance: number;
  due_date?: number;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';
  tenant_id: string;
  branch_id: string;
  created_at: number;
}

// Supplier AP Ledger — every financial movement (double-entry style)
export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  transaction_type: 'Invoice' | 'Payment' | 'Return' | 'Adjustment';
  debit: number;                // increases balance (e.g. new invoice)
  credit: number;               // decreases balance (e.g. payment made)
  running_balance: number;      // balance after this entry
  reference_type?: string;      // 'INVOICE' | 'PAYMENT' | 'GRN' | 'RETURN'
  reference_id?: string;
  description?: string;
  created_by?: string;
  tenant_id: string;
  branch_id: string;
  created_at: number;
}

// Supplier Payment — records how and when a supplier was paid
export interface SupplierPayment {
  id: string;
  payment_number: string;
  supplier_id: string;
  supplier_name: string;
  invoice_id?: string;          // optional: applied to a specific invoice
  amount: number;
  payment_method: 'Cash' | 'MobileMoney' | 'MPesa' | 'TigoPesa' | 'Airtel' | 'Bank' | 'Cheque';
  reference_number?: string;    // M-Pesa txn ID, bank reference, cheque number
  notes?: string;
  created_by: string;
  tenant_id: string;
  branch_id: string;
  created_at: number;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  manager_name: string;
  phone?: string;
  capacity_sqm?: number;
  tenant_id: string;
  branch_id: string;
  status: 'Active' | 'Inactive';
  created_at: number;
}

// ─── Batch / Lot Tracking ─────────────────────────────────────────────────────
export interface BatchLot {
  id: string;
  tenant_id: string;
  branch_id: string;
  warehouse_id?: string;
  product_id: string;
  variant_id?: string;
  batch_number: string;
  lot_number?: string;
  supplier_id?: string;
  supplier_name?: string;
  manufacturing_date?: number;
  expiry_date?: number; // Unix ms
  received_date: number;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  status: 'Active' | 'Expired' | 'Recalled' | 'Quarantine' | 'Consumed';
  notes?: string;
  created_by: string;
  created_at: number;
}

// ─── Serial Number Tracking ───────────────────────────────────────────────────
export interface SerialNumber {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  variant_id?: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  warranty_expires?: number;
  purchase_date?: number;
  status: 'Available' | 'Sold' | 'Returned' | 'Defective' | 'Scrapped';
  sale_id?: string;
  customer_id?: string;
  notes?: string;
  created_at: number;
}

// ─── Stock Transfer ───────────────────────────────────────────────────────────
export interface StockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  sku: string;
  qty_requested: number;
  qty_sent?: number;
  qty_received?: number;
  unit_cost: number;
  batch_id?: string;
  notes?: string;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  tenant_id: string;
  from_branch_id: string;
  from_warehouse_id?: string;
  to_branch_id: string;
  to_warehouse_id?: string;
  status: 'Draft' | 'Pending' | 'In Transit' | 'Received' | 'Cancelled' | 'Partial';
  notes?: string;
  requested_by: string;
  approved_by?: string;
  received_by?: string;
  created_at: number;
  sent_at?: number;
  received_at?: number;
  cancelled_at?: number;
}

// ─── Physical Stock Count ─────────────────────────────────────────────────────
export interface PhysicalCountItem {
  id: string;
  count_id: string;
  product_id: string;
  variant_id?: string;
  product_name: string;
  sku: string;
  system_quantity: number;
  counted_quantity: number;
  variance: number; // counted - system (can be negative)
  unit_cost: number;
  notes?: string;
}

export interface PhysicalCount {
  id: string;
  count_number: string;
  tenant_id: string;
  branch_id: string;
  warehouse_id?: string;
  status: 'Draft' | 'Counting' | 'Pending Approval' | 'Approved' | 'Cancelled';
  total_items: number;
  variance_items: number;
  variance_value: number;
  notes?: string;
  created_by: string;
  approved_by?: string;
  created_at: number;
  approved_at?: number;
}

// ─── Reorder Rules ────────────────────────────────────────────────────────────
export interface ReorderRule {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  variant_id?: string;
  min_quantity: number;
  max_quantity: number;
  reorder_quantity: number;
  preferred_supplier_id?: string;
  preferred_supplier_name?: string;
  lead_time_days: number;
  auto_reorder: boolean;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// ─── Inventory Valuation Snapshot ─────────────────────────────────────────────
export interface InventoryValuation {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  product_name: string;
  method: 'FIFO' | 'WAC' | 'STANDARD';
  quantity: number;
  unit_value: number;
  total_value: number;
  computed_at: number;
}

// ─── Expiry Alert ─────────────────────────────────────────────────────────────
export interface ExpiryAlert {
  id: string;
  tenant_id: string;
  branch_id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  expiry_date: number;
  quantity_remaining: number;
  alert_level: 'EXPIRED' | 'TODAY' | 'WEEK' | 'MONTH';
  is_dismissed: boolean;
  created_at: number;
}

// ─── POS Shift ────────────────────────────────────────────────────────────────
export interface PosShift {
  id: string;
  tenant_id: string;
  branch_id: string;
  cashier_id: string;
  cashier_name: string;
  status: 'OPEN' | 'CLOSED';
  opening_time: number;
  closing_time?: number;
  opening_float: number;
  cash_sales: number;
  mpesa_sales: number;
  bank_sales: number;
  cash_in: number;
  cash_out: number;
  closing_cash_actual?: number;
  notes?: string;
}

// ─── Held Cart ────────────────────────────────────────────────────────────────
export interface HeldCartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  price?: number;
}
export interface HeldCart {
  id: string;
  tenant_id: string;
  branch_id: string;
  cashier_id: string;
  name: string;
  items: HeldCartItem[];
  discountPercent: number;
  selectedCustomerId?: string;
  created_at: number;
}

// ─── Bar / Pub / Lounge Module Tables (v14) ───────────────────────────────────
export interface Unit {
  id: string;
  tenant_id: string;
  name: string;
  symbol: string;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  yield_quantity: number;
}

export interface RecipeItem {
  id: string;
  tenant_id: string;
  recipe_id: string;
  ingredient_product_id: string;
  quantity: number;
  unit: string;
}

export interface WastageLog {
  id: string;
  tenant_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  reason: 'SPILL' | 'BAD POUR' | 'EXPIRED' | 'FREE TASTING' | 'DAMAGED' | 'STAFF DRINK' | 'OTHER';
  employee_id: string;
  approved_by?: string;
  timestamp: number;
  notes?: string;
}

export interface Tab {
  id: string;
  tenant_id: string;
  customer_id?: string;
  table_id?: string;
  tab_name?: string;
  tab_type?: 'TABLE' | 'CUSTOMER' | 'VIP' | 'CREDIT' | 'MOBILE';
  status: 'OPEN' | 'ORDERING' | 'BILL_REQUESTED' | 'PARTIALLY_PAID' | 'PAID' | 'CLOSED';
  opened_by: string;
  opened_at: number;
  closed_at?: number;
  items: Array<{
    product_id: string;
    variant_id?: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  total: number;
  total_amount?: number;
}

export interface TableEntity {
  id: string;
  tenant_id: string;
  branch_id: string;
  zone_id: string;
  name: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'WAITING_PAYMENT' | 'RESERVED';
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface PricingRule {
  id: string;
  tenant_id: string;
  rule_type: string;
  start_time?: string; // HH:MM
  end_time?: string;   // HH:MM
  days?: string[];     // ['Friday', 'Saturday']
  discount_percent: number;
  applicable_product_ids?: string[];
  promo_type?: 'HAPPY_HOUR' | 'BUY_X_GET_Y' | 'BUNDLE_DEAL';
  buy_qty?: number;
  get_qty?: number;
  bundle_deal_ids?: string[];
}

export interface Tip {
  id: string;
  tenant_id: string;
  employee_id: string;
  amount: number;
  transaction_id: string;
  timestamp: number;
  commission_earned?: number;
}

export interface UserSession {
  id: string;
  userId: string;
  tenantId: string;
  branchId?: string;
  refreshTokenHash: string;
  deviceId: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'LOGGED_OUT';
  lastActivity: number;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number;
}

export interface UserDevice {
  id: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  name: string;
  platform: string;
  browser?: string;
  trusted: boolean;
  lastSeen: number;
  createdAt: number;
}

export interface OfflineSession {
  id: string;
  userId: string;
  tenantId: string;
  branchId?: string;
  permissions: string[];
  offlineAllowedUntil: number; // timestamp
  lastSync: number; // timestamp
}

export interface Expense {
  id: string;
  tenant_id: string;
  branch_id: string;
  category: string; // Utilities, Salaries, Rent, Other
  description?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: string; // Cash, M-Pesa, Bank, TigoPesa, Airtel
  status: 'Paid' | 'Pending';
  created_at: number;
  created_by: string;
  origin?: 'DEMO' | 'PRODUCTION' | 'IMPORTED' | 'MIGRATED';
}

export interface BusinessProfile {
  id: string;
  tenantId: string;
  businessName: string;
  tradingName: string;
  registrationNumber: string;
  tin: string;
  vatNumber: string;
  industry: string;
  businessType: string;
  description: string;
  logoUrl: string;
  coverImage: string;
  phone: string;
  email: string;
  website: string;
  country: string;
  region: string;
  district: string;
  ward: string;
  street: string;
  postalAddress: string;
  latitude: number;
  longitude: number;
  currency: string;
  timezone: string;
  language: string;
  dateFormat: string;
  receiptFooter: string;
  receiptHeader: string;
  defaultWarehouseId: string;
  taxEnabled: boolean;
  vatRate: number;
  openingTime: string;
  closingTime: string;
  ownerId: string;
  ownerName?: string;
  subscriptionId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  
  // Custom extra fields for social, banking, compliance, integrations, security, AI etc.
  ownerNationalId?: string;
  ownerPassportNumber?: string;
  ownerMobileNumber?: string;
  ownerEmail?: string;
  ownerPosition?: string;
  ownerPhoto?: string;
  
  themeColor?: string;
  secondaryColor?: string;
  favicon?: string;
  emailTemplate?: string;
  smsSignature?: string;
  qrCodeBranding?: string;
  invoiceTemplate?: string;
  
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankSwiftCode?: string;
  bankBranchName?: string;
  
  mpesaMerchantCode?: string;
  airtelMerchantCode?: string;
  mixxMerchantCode?: string;
  haloMerchantCode?: string;
  tigoMerchantCode?: string;
  
  socialFacebook?: string;
  socialInstagram?: string;
  socialLinkedIn?: string;
  socialX?: string;
  socialTikTok?: string;
  socialYouTube?: string;
  
  compliancePrivacyPolicy?: string;
  complianceTerms?: string;
  complianceReturns?: string;
  complianceWarranty?: string;
  complianceDataRetention?: string;
  
  integrationPaymentGateway?: string;
  integrationAccountingSystem?: string;
  integrationSmsProvider?: string;
  integrationEmailProvider?: string;
  integrationWhatsappApi?: string;
  integrationEfdDevice?: string;
  integrationBarcodeScanner?: string;
  integrationPrinter?: string;
  integrationScale?: string;
  integrationApiKeys?: Record<string, string>;
  
  licenseTrade?: string;
  licenseMedical?: string;
  licensePharmacy?: string;
  licenseFood?: string;
  licenseConstruction?: string;
  licenseTradeExpiry?: number;
  licenseMedicalExpiry?: number;
  licensePharmacyExpiry?: number;
  licenseFoodExpiry?: number;
  licenseConstructionExpiry?: number;
  
  aiPrimaryIndustry?: string;
  aiBusinessSize?: string;
  aiEmployeesCount?: number;
  aiBranchesCount?: number;
  aiDailySales?: number;
  aiPeakHours?: string;
  aiPreferredLanguage?: string;
  aiPreferredReports?: string[];
  aiAutomationPreferences?: string[];
}


export interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  slug?: string;
  is_active?: boolean;
  tenant_id: string;
  created_at?: number;
  updated_at?: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  is_active?: boolean;
  tenant_id: string;
  created_at?: number;
  updated_at?: number;
}

class DukaPosDatabase extends Dexie {
  products!: Table<Product>;
  productVariants!: Table<ProductVariant>;
  customers!: Table<Customer>;
  orders!: Table<Order>;
  syncQueue!: Table<SyncItem>;
  tenants!: Table<Tenant>;
  branches!: Table<Branch>;
  industries!: Table<Industry>;
  tenantIndustries!: Table<TenantIndustry>;
  users!: Table<DbUser>;
  businessProfiles!: Table<BusinessProfile>;
  userBranchRoles!: Table<UserBranchRole>;
  stockLedger!: Table<StockLedgerEntry>;
  stockBalance!: Table<ProductBranchStock>;
  tenantModules!: Table<TenantModule>;
  tenantSettings!: Table<TenantSetting>;
  appSettings!: Table<AppSetting>;
  featureFlags!: Table<FeatureFlag>;
  auditLogs!: Table<AuditLog>;
  resetCommands!: Table<ResetCommand>;
  
  subscriptionPlans!: Table<SubscriptionPlan>;
  tenantSubscriptions!: Table<TenantSubscription>;
  invoices!: Table<Invoice>;
  payments!: Table<Payment>;
  subscriptionEvents!: Table<SubscriptionEvent>;
  features!: Table<Feature>;
  planFeatures!: Table<PlanFeature>;
  subscriptionUsage!: Table<SubscriptionUsage>;
  coupons!: Table<Coupon>;

  // ── Unified Users & Roles Management Tables ───────────────────────────────
  tenantUsers!: Table<TenantUser>;
  employees!: Table<Employee>;
  roles!: Table<Role>;
  permissions!: Table<Permission>;
  rolePermissions!: Table<RolePermission>;
  tenantUserBranches!: Table<TenantUserBranch>;
  userSecurity!: Table<UserSecurity>;
  securityAuditLogs!: Table<SecurityAuditLog>;

  // ── Purchasing / SRM Module Tables ──────────────────────────────────────────
  suppliers!: Table<Supplier>;
  supplierContacts!: Table<SupplierContact>;
  purchaseOrders!: Table<PurchaseOrder>;
  goodsReceipts!: Table<GoodsReceipt>;
  supplierInvoices!: Table<SupplierInvoice>;
  supplierLedger!: Table<SupplierLedgerEntry>;
  supplierPayments!: Table<SupplierPayment>;
  warehouses!: Table<Warehouse>;

  /** Immutable ID mapping ledger (client temp ID → server permanent ID) */
  idMappingLedger!: Table<IdMappingLedger>;

  // ── New Inventory Module Tables (v12) ─────────────────────────────────────
  batchLots!: Table<BatchLot>;
  serialNumbers!: Table<SerialNumber>;
  stockTransfers!: Table<StockTransfer>;
  stockTransferItems!: Table<StockTransferItem>;
  physicalCounts!: Table<PhysicalCount>;
  physicalCountItems!: Table<PhysicalCountItem>;
  reorderRules!: Table<ReorderRule>;
  inventoryValuations!: Table<InventoryValuation>;
  expiryAlerts!: Table<ExpiryAlert>;

  // ── New POS Refinements Tables (v13) ─────────────────────────────────────
  posShifts!: Table<PosShift>;
  heldCarts!: Table<HeldCart>;

  // ── Bar / Pub / Lounge Module Tables (v14) ───────────────────────────────
  units!: Table<Unit>;
  productUnits!: Table<ProductUnit>;
  recipes!: Table<Recipe>;
  recipeItems!: Table<RecipeItem>;
  wastageLogs!: Table<WastageLog>;
  tabs!: Table<Tab>;
  barTables!: Table<TableEntity>;
  pricingRules!: Table<PricingRule>;
  tips!: Table<Tip>;
  userSessions!: Table<UserSession>;
  userDevices!: Table<UserDevice>;
  offlineSessions!: Table<OfflineSession>;
  expenses!: Table<Expense>;
  backups!: Table<TenantBackup>;
  notifications!: Table<SystemNotification>;
  categories!: Table<Category>;
  brands!: Table<Brand>;
  securityIncidents!: Table<SecurityIncident>;

  constructor() {
    super('DukaPosDatabase');

    // Version migration chain — Dexie requires all prior versions to be declared
    // even if no schema changes are needed, so that upgrades work from any starting point.
    this.version(1).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
    });

    this.version(2).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status',
      branches: 'id, tenant_id, name, location',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
    });

    this.version(3).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status',
      branches: 'id, tenant_id, name, location',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
    });

    // Version 4: Added stockLedger and stockBalance tables for immutable ledger architecture
    this.version(4).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status',
      branches: 'id, tenant_id, name, location',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]'
    });

    // Version 5: Added tenantModules, tenantSettings, featureFlags, auditLogs for full SaaS Tenant Management
    this.version(5).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at'
    });

    // Version 6: Added subscription tables for full client-side SaaS subscription enforcement
    this.version(6).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at'
    });

    // Version 7: Added Feature registry, PlanFeatures mapping, SubscriptionUsage tracking, Coupons
    this.version(7).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active'
    });

    // Version 8: Unified Users & Roles Management system
    this.version(8).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      
      // New tables:
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at'
    });

    // Version 9: Purchasing module — suppliers, purchaseOrders, warehouses
    this.version(9).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',
      // New purchasing tables:
      suppliers: 'id, tenant_id, branch_id, status, category, created_at',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status'
    });

    // Version 10: Upgraded SRM/Purchasing module with detailed ledger and compliance
    this.version(10).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',

      // Upgraded Purchasing/SRM Module Tables
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at',
      supplierContacts: 'id, supplier_id, tenant_id, is_primary',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at',
      goodsReceipts: 'id, tenant_id, branch_id, purchase_order_id, supplier_id, grn_number, created_at',
      supplierInvoices: 'id, tenant_id, branch_id, supplier_id, grn_id, status, due_date',
      supplierLedger: 'id, tenant_id, supplier_id, transaction_type, created_at',
      supplierPayments: 'id, tenant_id, branch_id, supplier_id, payment_method, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status'
    });

    // Version 11: ID Mapping Ledger — tracks client temp ID → server permanent ID
    // for safe post-sync reconciliation without data loss.
    this.version(11).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants, syncStatus, isSynced',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id, syncStatus, isSynced',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at',
      supplierContacts: 'id, supplier_id, tenant_id, is_primary',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at',
      goodsReceipts: 'id, tenant_id, branch_id, purchase_order_id, supplier_id, grn_number, created_at',
      supplierInvoices: 'id, tenant_id, branch_id, supplier_id, grn_id, status, due_date',
      supplierLedger: 'id, tenant_id, supplier_id, transaction_type, created_at',
      supplierPayments: 'id, tenant_id, branch_id, supplier_id, payment_method, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status',
      // New: ID mapping ledger
      idMappingLedger: '++id, clientId, serverId, entityName, tenantId, reconciled, createdAt'
    });

    // Version 12: Full Inventory Module — Batch/Lot, Serial Numbers, Transfers,
    // Physical Count, Reorder Rules, Valuation Snapshots, Expiry Alerts
    this.version(12).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants, syncStatus, isSynced',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id, syncStatus, isSynced',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at',
      supplierContacts: 'id, supplier_id, tenant_id, is_primary',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at',
      goodsReceipts: 'id, tenant_id, branch_id, purchase_order_id, supplier_id, grn_number, created_at',
      supplierInvoices: 'id, tenant_id, branch_id, supplier_id, grn_id, status, due_date',
      supplierLedger: 'id, tenant_id, supplier_id, transaction_type, created_at',
      supplierPayments: 'id, tenant_id, branch_id, supplier_id, payment_method, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status',
      idMappingLedger: '++id, clientId, serverId, entityName, tenantId, reconciled, createdAt',
      // New v12 inventory tables
      batchLots: 'id, tenant_id, branch_id, product_id, variant_id, batch_number, expiry_date, status, created_at',
      serialNumbers: 'id, tenant_id, branch_id, product_id, variant_id, serial_number, status',
      stockTransfers: 'id, tenant_id, from_branch_id, to_branch_id, status, transfer_number, created_at',
      stockTransferItems: 'id, transfer_id, product_id, variant_id',
      physicalCounts: 'id, tenant_id, branch_id, warehouse_id, status, count_number, created_at',
      physicalCountItems: 'id, count_id, product_id, variant_id',
      reorderRules: 'id, tenant_id, branch_id, product_id, variant_id, is_active',
      inventoryValuations: 'id, tenant_id, branch_id, product_id, method, computed_at',
      expiryAlerts: 'id, tenant_id, branch_id, product_id, batch_id, expiry_date, alert_level, is_dismissed'
    });

    // Version 13: POS Refinement (Shifts and Held Carts)
    this.version(13).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants, syncStatus, isSynced',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id, syncStatus, isSynced',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at',
      supplierContacts: 'id, supplier_id, tenant_id, is_primary',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at',
      goodsReceipts: 'id, tenant_id, branch_id, purchase_order_id, supplier_id, grn_number, created_at',
      supplierInvoices: 'id, tenant_id, branch_id, supplier_id, grn_id, status, due_date',
      supplierLedger: 'id, tenant_id, supplier_id, transaction_type, created_at',
      supplierPayments: 'id, tenant_id, branch_id, supplier_id, payment_method, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status',
      idMappingLedger: '++id, clientId, serverId, entityName, tenantId, reconciled, createdAt',
      batchLots: 'id, tenant_id, branch_id, product_id, variant_id, batch_number, expiry_date, status, created_at',
      serialNumbers: 'id, tenant_id, branch_id, product_id, variant_id, serial_number, status',
      stockTransfers: 'id, tenant_id, from_branch_id, to_branch_id, status, transfer_number, created_at',
      stockTransferItems: 'id, transfer_id, product_id, variant_id',
      physicalCounts: 'id, tenant_id, branch_id, warehouse_id, status, count_number, created_at',
      physicalCountItems: 'id, count_id, product_id, variant_id',
      reorderRules: 'id, tenant_id, branch_id, product_id, variant_id, is_active',
      inventoryValuations: 'id, tenant_id, branch_id, product_id, method, computed_at',
      expiryAlerts: 'id, tenant_id, branch_id, product_id, batch_id, expiry_date, alert_level, is_dismissed',
      posShifts: 'id, tenant_id, branch_id, cashier_id, status, opening_time',
      heldCarts: 'id, tenant_id, branch_id, cashier_id, name, created_at'
    });

    // Version 14: Bar & Beverage Lounge Module Tables
    this.version(14).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants, syncStatus, isSynced',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id, syncStatus, isSynced',
      customers: 'id, name, phone, type, tenant_id, branch_id',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id, role_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at',
      supplierContacts: 'id, supplier_id, tenant_id, is_primary',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at',
      goodsReceipts: 'id, tenant_id, branch_id, purchase_order_id, supplier_id, grn_number, created_at',
      supplierInvoices: 'id, tenant_id, branch_id, supplier_id, grn_id, status, due_date',
      supplierLedger: 'id, tenant_id, supplier_id, transaction_type, created_at',
      supplierPayments: 'id, tenant_id, branch_id, supplier_id, payment_method, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status',
      idMappingLedger: '++id, clientId, serverId, entityName, tenantId, reconciled, createdAt',
      batchLots: 'id, tenant_id, branch_id, product_id, variant_id, batch_number, expiry_date, status, created_at',
      serialNumbers: 'id, tenant_id, branch_id, product_id, variant_id, serial_number, status',
      stockTransfers: 'id, tenant_id, from_branch_id, to_branch_id, status, transfer_number, created_at',
      stockTransferItems: 'id, transfer_id, product_id, variant_id',
      physicalCounts: 'id, tenant_id, branch_id, warehouse_id, status, count_number, created_at',
      physicalCountItems: 'id, count_id, product_id, variant_id',
      reorderRules: 'id, tenant_id, branch_id, product_id, variant_id, is_active',
      inventoryValuations: 'id, tenant_id, branch_id, product_id, method, computed_at',
      expiryAlerts: 'id, tenant_id, branch_id, product_id, batch_id, expiry_date, alert_level, is_dismissed',
      posShifts: 'id, tenant_id, branch_id, cashier_id, status, opening_time',
      heldCarts: 'id, tenant_id, branch_id, cashier_id, name, created_at',
      // Bar module new stores
      units: 'id, tenant_id, name, symbol',
      productUnits: 'id, product_id, from_unit, to_unit',
      recipes: 'id, tenant_id, product_id, name',
      recipeItems: 'id, recipe_id, ingredient_product_id',
      wastageLogs: 'id, tenant_id, product_id, timestamp, reason',
      tabs: 'id, tenant_id, customer_id, table_id, status, opened_at',
      barTables: 'id, tenant_id, branch_id, zone_id, status',
      pricingRules: 'id, tenant_id, rule_type',
      tips: 'id, employee_id, transaction_id'
    });

    // Version 15: Demo Data Origin Tracking & Reset Command tables
    this.version(15).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants, syncStatus, isSynced, origin',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id, syncStatus, isSynced, origin',
      customers: 'id, name, phone, type, tenant_id, branch_id, origin',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id, origin',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at, origin',
      invoices: 'id, tenant_id, invoice_number, status, origin',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status, origin',
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at, origin',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at, origin',
      barTables: 'id, tenant_id, branch_id, zone_id, status, origin',
      resetCommands: 'id, tenant_id, status, requested_by, created_at'
    });

    this.version(16).stores({
      userSessions: 'id, userId, tenantId, status, expiresAt',
      userDevices: 'id, userId, tenantId, deviceId',
      offlineSessions: 'id, userId, tenantId, offlineAllowedUntil'
    });

    this.version(17).stores({
      expenses: 'id, tenant_id, branch_id, category, amount, status, date, created_at, origin'
    });

    // v18: Add refreshTokenHash index to userSessions — required by sessionService.ts
    // .where('refreshTokenHash') queries were throwing "KeyPath not indexed" errors
    // causing users to be thrown out of their active session unexpectedly.
    this.version(18).stores({
      userSessions: 'id, userId, tenantId, status, expiresAt, refreshTokenHash'
    });

    this.version(19).stores({
      appSettings: 'id, tenantId, namespace, branchId, userId, [tenantId+namespace], [tenantId+branchId+userId+namespace]'
    });

    this.version(20).stores({
      businessProfiles: 'id, tenantId, tin, status'
    });

    this.version(21).stores({
      recipeItems: 'id, tenant_id, recipe_id, ingredient_product_id',
      tips: 'id, tenant_id, employee_id, transaction_id'
    });

    this.version(22).stores({
      backups: 'id, tenant_id, type, status, created_at',
      notifications: 'id, tenant_id, channel, target_scope, status, sent_at',
      securityIncidents: 'id, tenant_id, type, severity, status, created_at'
    });

    this.version(23).stores({
      categories: 'id, tenant_id, name, parent_id',
      brands: 'id, tenant_id, name'
    });

    this.version(24).stores({
      userBranchRoles: 'id, user_id, tenant_id, branch_id, [user_id+tenant_id+branch_id]',
      tenantUsers: 'id, tenant_id, user_id, status',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id'
    });

    this.version(25).stores({
      tenants: 'id, name, slug, status, plan, business_code, tenant_uuid, email, phone'
    });

    this.version(26).stores({
      users: 'id, email, is_super_admin, tenant_id, username, created_at, registration_source, verification_status'
    });

    // Version 27: Unified Complete Schema consolidation ensuring all 74 object stores exist in IndexedDB
    this.version(27).stores({
      products: 'id, name, category, module, tenant_id, branch_id, hasVariants, syncStatus, isSynced, origin',
      productVariants: 'id, productId, sku, barcode, tenant_id, branch_id, syncStatus, isSynced, origin',
      customers: 'id, name, phone, type, tenant_id, branch_id, origin',
      orders: 'id, timestamp, syncStatus, module, tenant_id, branch_id, origin',
      syncQueue: '++id, entityName, actionType, status, timestamp',
      tenants: 'id, name, slug, status, plan, business_code, tenant_uuid, email, phone',
      branches: 'id, tenant_id, name, location, is_headquarters',
      industries: 'id, name',
      tenantIndustries: '[tenant_id+industry_id], tenant_id, industry_id',
      users: 'id, email, is_super_admin, tenant_id, username, created_at, registration_source, verification_status',
      businessProfiles: 'id, tenantId, tin, status',
      userBranchRoles: 'id, user_id, tenant_id, branch_id, [user_id+tenant_id+branch_id], industry_id, role_id',
      stockLedger: 'id, tenant_id, branch_id, product_id, variant_id, movement_type, created_at, origin',
      stockBalance: 'id, tenant_id, branch_id, product_id, variant_id, [branch_id+product_id+variant_id]',
      tenantModules: 'id, tenant_id, module_key, enabled',
      tenantSettings: 'id, tenant_id, setting_key',
      appSettings: 'id, tenantId, namespace, branchId, userId, [tenantId+namespace], [tenantId+branchId+userId+namespace]',
      featureFlags: 'id, tenant_id, feature_key, enabled',
      auditLogs: 'id, tenant_id, user_id, entity, created_at',
      subscriptionPlans: 'id, name, code, is_active',
      tenantSubscriptions: 'id, tenant_id, plan_id, status',
      invoices: 'id, tenant_id, invoice_number, status, origin',
      payments: 'id, tenant_id, subscription_id, transaction_reference, status, origin',
      subscriptionEvents: 'id, tenant_id, event_type, created_at',
      features: 'id, code, module',
      planFeatures: 'id, plan_id, feature_id',
      subscriptionUsage: 'id, tenant_id',
      coupons: 'id, code, is_active',
      tenantUsers: 'id, tenant_id, user_id, status',
      employees: 'id, tenant_id, user_id, employee_number',
      roles: 'id, tenant_id, slug, is_system_role',
      permissions: 'id, module, slug',
      rolePermissions: 'id, role_id, permission_id, [role_id+permission_id]',
      tenantUserBranches: 'id, tenant_id, user_id, branch_id',
      userSecurity: 'user_id',
      securityAuditLogs: 'id, tenant_id, branch_id, user_id, action, created_at',
      suppliers: 'id, tenant_id, branch_id, status, category, supplier_code, created_at, origin',
      supplierContacts: 'id, supplier_id, tenant_id, is_primary',
      purchaseOrders: 'id, tenant_id, branch_id, supplier_id, po_number, status, payment_status, created_at, origin',
      goodsReceipts: 'id, tenant_id, branch_id, purchase_order_id, supplier_id, grn_number, created_at',
      supplierInvoices: 'id, tenant_id, branch_id, supplier_id, grn_id, status, due_date',
      supplierLedger: 'id, tenant_id, supplier_id, transaction_type, created_at',
      supplierPayments: 'id, tenant_id, branch_id, supplier_id, payment_method, created_at',
      warehouses: 'id, tenant_id, branch_id, code, status',
      idMappingLedger: '++id, clientId, serverId, entityName, tenantId, reconciled, createdAt',
      batchLots: 'id, tenant_id, branch_id, product_id, variant_id, batch_number, expiry_date, status, created_at',
      serialNumbers: 'id, tenant_id, branch_id, product_id, variant_id, serial_number, status',
      stockTransfers: 'id, tenant_id, from_branch_id, to_branch_id, status, transfer_number, created_at',
      stockTransferItems: 'id, transfer_id, product_id, variant_id',
      physicalCounts: 'id, tenant_id, branch_id, warehouse_id, status, count_number, created_at',
      physicalCountItems: 'id, count_id, product_id, variant_id',
      reorderRules: 'id, tenant_id, branch_id, product_id, variant_id, is_active',
      inventoryValuations: 'id, tenant_id, branch_id, product_id, method, computed_at',
      expiryAlerts: 'id, tenant_id, branch_id, product_id, batch_id, expiry_date, alert_level, is_dismissed',
      posShifts: 'id, tenant_id, branch_id, cashier_id, status, opening_time',
      heldCarts: 'id, tenant_id, branch_id, cashier_id, name, created_at',
      units: 'id, tenant_id, name, symbol',
      productUnits: 'id, product_id, from_unit, to_unit',
      recipes: 'id, tenant_id, product_id, name',
      recipeItems: 'id, tenant_id, recipe_id, ingredient_product_id',
      wastageLogs: 'id, tenant_id, product_id, timestamp, reason',
      tabs: 'id, tenant_id, customer_id, table_id, status, opened_at',
      barTables: 'id, tenant_id, branch_id, zone_id, status, origin',
      pricingRules: 'id, tenant_id, rule_type',
      tips: 'id, tenant_id, employee_id, transaction_id',
      resetCommands: 'id, tenant_id, status, requested_by, created_at',
      userSessions: 'id, userId, tenantId, status, expiresAt, refreshTokenHash',
      userDevices: 'id, userId, tenantId, deviceId',
      offlineSessions: 'id, userId, tenantId, offlineAllowedUntil',
      expenses: 'id, tenant_id, branch_id, category, amount, status, date, created_at, origin',
      backups: 'id, tenant_id, type, status, created_at',
      notifications: 'id, tenant_id, channel, target_scope, status, sent_at',
      securityIncidents: 'id, tenant_id, type, severity, status, created_at',
      categories: 'id, tenant_id, name, parent_id',
      brands: 'id, tenant_id, name'
    });

    // Add hooks to dynamically set 'origin' based on tenant ID naming convention
    const tablesWithOrigin = [
      'products', 'productVariants', 'customers', 'orders',
      'stockLedger', 'invoices', 'payments', 'suppliers',
      'purchaseOrders', 'barTables', 'expenses'
    ];
    tablesWithOrigin.forEach(tableName => {
      const table = (this as any)[tableName];
      if (table) {
        table.hook('creating', function(_primKey: any, obj: any) {
          const tenantId = obj.tenant_id || obj.tenantId;
          if (tenantId && (tenantId.endsWith('_demo') || tenantId.includes('_demo_') || tenantId === 'tenant-new-wizard')) {
            obj.origin = 'DEMO';
          } else if (!obj.origin) {
            obj.origin = 'PRODUCTION';
          }
        });
      }
    });
  }
}



export const db = new DukaPosDatabase();

// ─── Deep Write Pipeline ──────────────────────────────────────────────────────
/**
 * Atomically persists a parent product AND all its variants in a single
 * Dexie transaction. If any variant write fails the entire operation is
 * rolled back, preventing orphaned parent records.
 *
 * Implements Fix #1 from the Root Cause Matrix:
 *   "UI state updated locally but failed to write variants alongside the parent."
 */
export async function saveProductAndVariants(
  product: Product,
  variants: ProductVariant[]
): Promise<void> {
  return db.transaction('rw', db.products, db.productVariants, db.syncQueue, async () => {
    // 1. Write parent product atomically (mark unsynced)
    await db.products.put({
      ...product,
      syncStatus: product.syncStatus ?? 'PENDING',
    });

    // 2. Write each variant explicitly (NOT nested in parent JSON blob)
    //    Each variant row is an independent inventory item with its own FK.
    for (const variant of variants) {
      await db.productVariants.put({
        ...variant,
        productId: product.id,   // enforce FK binding
        tenant_id: variant.tenant_id || product.tenant_id,
        branch_id: variant.branch_id || product.branch_id,
        isSynced: 0,
        syncStatus: 'PENDING',
      });
    }

    // 3. Queue the product insert — variants are queued as children below
    await db.syncQueue.add({
      actionType: 'INSERT',
      entityName: 'products',
      payload: { ...product, variants: variants.map(v => ({ ...v, productId: product.id })) },
      timestamp: Date.now(),
      status: 'Pending',
    });
  });
}

// ─── ID Mapping Reconciliation ───────────────────────────────────────────────
/**
 * Applies a server-returned ID mapping table to local IndexedDB records.
 * Must be called after every successful cloud INSERT that returns mappings.
 *
 * Implements Fix #3 from the Root Cause Matrix:
 *   "Server generated new keys and client lost track of temporary IDs."
 *
 * @param mappings  Record<clientTempId, serverPermanentId>
 * @param tenantId  Scopes the cascade to the correct tenant
 */
export async function applyIdMappings(
  mappings: Record<string, string>,
  tenantId: string
): Promise<void> {
  for (const [clientId, serverId] of Object.entries(mappings)) {
    if (clientId === serverId) continue; // Nothing to reconcile

    await db.transaction('rw',
      [db.products, db.productVariants, db.stockLedger,
      db.stockBalance, db.syncQueue, db.idMappingLedger],
      async () => {
        // 1. Log the mapping permanently
        await db.idMappingLedger.put({
          clientId,
          serverId,
          entityName: 'products',
          tenantId,
          createdAt: Date.now(),
          reconciled: false,
        });

        // 2. Update local product record
        const localProd = await db.products.get(clientId);
        if (localProd) {
          await db.products.delete(clientId);
          await db.products.put({ ...localProd, id: serverId, syncStatus: 'SYNCED', isSynced: 1 } as any);
        }

        // 3. Cascade → productVariants (update FK productId)
        const variants = await db.productVariants.where('productId').equals(clientId).toArray();
        for (const v of variants) {
          await db.productVariants.delete(v.id);
          const newVarId = v.id.replace(clientId, serverId);
          await db.productVariants.put({ ...v, id: newVarId, productId: serverId, syncStatus: 'SYNCED', isSynced: 1 });
        }

        // 4. Cascade → stockLedger
        const ledger = await db.stockLedger.where('product_id').equals(clientId).toArray();
        for (const le of ledger) {
          await db.stockLedger.update(le.id, { product_id: serverId });
        }

        // 5. Cascade → stockBalance
        const balances = await db.stockBalance.where('product_id').equals(clientId).toArray();
        for (const bal of balances) {
          await db.stockBalance.delete(bal.id);
          await db.stockBalance.put({
            ...bal,
            id: bal.id.replace(clientId, serverId),
            product_id: serverId,
          });
        }

        // 6. Cascade → pending syncQueue items still referencing the temp ID
        const pending = await db.syncQueue.where('status').anyOf('Pending', 'Failed').toArray();
        for (const ps of pending) {
          let dirty = false;
          if (ps.payload?.id === clientId) { ps.payload.id = serverId; dirty = true; }
          if (ps.payload?.productId === clientId) { ps.payload.productId = serverId; dirty = true; }
          if (dirty) await db.syncQueue.put(ps);
        }

        // 7. Mark mapping as reconciled
        const existing = await db.idMappingLedger.where('clientId').equals(clientId).first();
        if (existing?.id !== undefined) {
          await db.idMappingLedger.update(existing.id, { reconciled: true });
        }
      }
    );
  }
}

// Recalculates Parent Product stock and price based on its child variants
export async function recalculateProductStock(productId: string) {
  const product = await db.products.get(productId);
  if (!product) return;

  if (product.hasVariants) {
    const variants = await db.productVariants.where('productId').equals(productId).toArray();
    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
    
    // Default to first active variant's overridden price or the parent's selling price
    const activeVariants = variants.filter(v => v.status === 'Active');
    const activePrice = activeVariants.length > 0
      ? (activeVariants[0].sellingPrice || product.sellingPrice)
      : product.sellingPrice;

    const updatedProd = {
      ...product,
      stock: totalStock,
      price: activePrice,
      sellingPrice: activePrice,
      syncStatus: 'PENDING' as const
    };
    await db.products.put(updatedProd);

    // Queue update for the parent product so cloud gets the new aggregate stock
    const { mapProductToCloud } = await import('../services/productService');
    await db.syncQueue.add({
      actionType: 'UPDATE',
      entityName: 'products',
      payload: mapProductToCloud(updatedProd),
      timestamp: Date.now(),
      status: 'Pending'
    });
  }
}

// Module-level lock to prevent concurrent database seeding collisions
let isSeedingInProgress = false;

// Initial database seeding function covering all 27 industry modules in Tanzanian Shillings (Tsh.)
export async function seedDatabase() {
  if (isSeedingInProgress) return;
  isSeedingInProgress = true;

  try {
    if (typeof window !== 'undefined' && localStorage.getItem('DUKAPOS_PRODUCTION_LOCKED') === 'true') {
      console.log('[DukaPos] Production System Locked — Skipping all demo seeders.');
      isSeedingInProgress = false;
      return;
    }

    const tenantCount = await db.tenants.count();
    const rolesCount = await db.roles.count();

    // ── Incremental RBAC Seed ────────────────────────────────────────────────
    // Runs independently so existing installations get RBAC tables populated
    // even if the main product seed was already applied previously.
    if (rolesCount === 0) {
      const NOW_RBAC = Date.now();
      const DAY_RBAC = 86400000;

      // Seed Permissions
      const seedPermissions: Permission[] = [
        { id: 'perm-sales-create', module: 'Sales', resource: 'sale', action: 'create', slug: 'sales.create', description: 'Create new POS invoices & orders' },
        { id: 'perm-sales-refund', module: 'Sales', resource: 'sale', action: 'refund', slug: 'sales.refund', description: 'Process customer product returns & refunds' },
        { id: 'perm-sales-void', module: 'Sales', resource: 'sale', action: 'void', slug: 'sales.void', description: 'Void or cancel active/past transactions' },
        { id: 'perm-inv-create', module: 'Inventory', resource: 'product', action: 'create', slug: 'inventory.product.create', description: 'Create and update core products and variants' },
        { id: 'perm-inv-adjust', module: 'Inventory', resource: 'stock', action: 'adjust', slug: 'inventory.stock.adjust', description: 'Authorize stock level additions/deductions' },
        { id: 'perm-inv-transfer', module: 'Inventory', resource: 'stock', action: 'transfer', slug: 'inventory.stock.transfer', description: 'Initiate stock movement between branches' },
        { id: 'perm-pur-create', module: 'Purchasing', resource: 'purchase', action: 'create', slug: 'purchase.create', description: 'Initiate supplier purchase orders' },
        { id: 'perm-pur-manage', module: 'Purchasing', resource: 'supplier', action: 'manage', slug: 'supplier.manage', description: 'Manage supplier ledgers & details' },
        { id: 'perm-fin-expense', module: 'Finance', resource: 'expense', action: 'manage', slug: 'expense.manage', description: 'Log operational costs and permits' },
        { id: 'perm-fin-payment', module: 'Finance', resource: 'payment', action: 'manage', slug: 'payment.manage', description: 'Record general payments & accounts' },
        { id: 'perm-fin-reports', module: 'Finance', resource: 'financial_reports', action: 'view', slug: 'financial_reports.view', description: 'Access profit/loss and ledger data' },
        { id: 'perm-rep-view', module: 'Reports', resource: 'reports', action: 'view', slug: 'reports.view', description: 'Access global analytics and forecasts' },
        { id: 'perm-rep-branch', module: 'Reports', resource: 'reports', action: 'branch', slug: 'reports.branch', description: 'Access single-branch localized sales reports' },
        { id: 'perm-set-users', module: 'Access', resource: 'users', action: 'manage', slug: 'users.manage', description: 'Invite, suspend, and configure system users' },
        { id: 'perm-set-roles', module: 'Access', resource: 'roles', action: 'manage', slug: 'roles.manage', description: 'Build and customize tenant role capability maps' },
        { id: 'perm-set-branches', module: 'Access', resource: 'branches', action: 'manage', slug: 'branches.manage', description: 'Add and configure business locations' },
        { id: 'perm-set-config', module: 'Access', resource: 'settings', action: 'manage', slug: 'settings.manage', description: 'Modify SaaS configurations and printer routing' },
        { id: 'perm-plat-tenants', module: 'Platform', resource: 'tenant', action: 'manage', slug: 'tenant.manage', description: 'Manage platform business workspaces' },
        { id: 'perm-plat-billing', module: 'Platform', resource: 'billing', action: 'manage', slug: 'billing.manage', description: 'Oversee subscriber invoicing and cycles' },
        { id: 'perm-plat-subs', module: 'Platform', resource: 'subscription', action: 'manage', slug: 'subscription.manage', description: 'Update plan levels and offline grace rules' },
        { id: 'perm-plat-flags', module: 'Platform', resource: 'feature_flag', action: 'manage', slug: 'feature_flag.manage', description: 'Activate system features per subscriber' },
        { id: 'perm-plat-logs', module: 'Platform', resource: 'system', action: 'logs.view', slug: 'system.logs.view', description: 'View system-level logs and diagnostics' },
      ];
      await db.permissions.bulkPut(seedPermissions);

      // Seed System Roles
      const systemRoles: Role[] = [
        { id: 'role-owner', tenant_id: null, name: 'Tenant Owner', slug: 'tenant_owner', description: 'Full tenant control and licensing access.', is_system_role: true, is_custom: false, created_at: NOW_RBAC },
        { id: 'role-admin', tenant_id: null, name: 'Business Administrator', slug: 'business_administrator', description: 'Enterprise setting management and reports.', is_system_role: true, is_custom: false, created_at: NOW_RBAC },
        { id: 'role-manager', tenant_id: null, name: 'Branch Manager', slug: 'branch_manager', description: 'Oversee daily branch activities, stock, and staff.', is_system_role: true, is_custom: false, created_at: NOW_RBAC },
        { id: 'role-cashier', tenant_id: null, name: 'Cashier', slug: 'cashier', description: 'Log transactions, process invoices, print receipts.', is_system_role: true, is_custom: false, created_at: NOW_RBAC },
        { id: 'role-inventory', tenant_id: null, name: 'Inventory Officer', slug: 'inventory_officer', description: 'Adjust inventory counts and manage suppliers.', is_system_role: true, is_custom: false, created_at: NOW_RBAC },
        { id: 'role-accountant', tenant_id: null, name: 'Accountant', slug: 'accountant', description: 'Verify expenses and pull financial reports.', is_system_role: true, is_custom: false, created_at: NOW_RBAC },
      ];
      await db.roles.bulkPut(systemRoles);

      // Seed Role Permissions
      const seedRolePermissions: RolePermission[] = [
        ...seedPermissions.filter(p => p.module !== 'Platform').map(p => ({ id: `rp-owner-${p.id}`, role_id: 'role-owner', permission_id: p.id })),
        { id: 'rp-admin-users', role_id: 'role-admin', permission_id: 'perm-set-users' },
        { id: 'rp-admin-roles', role_id: 'role-admin', permission_id: 'perm-set-roles' },
        { id: 'rp-admin-branches', role_id: 'role-admin', permission_id: 'perm-set-branches' },
        { id: 'rp-admin-config', role_id: 'role-admin', permission_id: 'perm-set-config' },
        { id: 'rp-admin-reports', role_id: 'role-admin', permission_id: 'perm-rep-view' },
        { id: 'rp-mgr-sales', role_id: 'role-manager', permission_id: 'perm-sales-create' },
        { id: 'rp-mgr-refund', role_id: 'role-manager', permission_id: 'perm-sales-refund' },
        { id: 'rp-mgr-void', role_id: 'role-manager', permission_id: 'perm-sales-void' },
        { id: 'rp-mgr-inv', role_id: 'role-manager', permission_id: 'perm-inv-create' },
        { id: 'rp-mgr-adjust', role_id: 'role-manager', permission_id: 'perm-inv-adjust' },
        { id: 'rp-mgr-pur', role_id: 'role-manager', permission_id: 'perm-pur-create' },
        { id: 'rp-mgr-rep', role_id: 'role-manager', permission_id: 'perm-rep-branch' },
        { id: 'rp-csh-sales', role_id: 'role-cashier', permission_id: 'perm-sales-create' },
        { id: 'rp-csh-pay', role_id: 'role-cashier', permission_id: 'perm-fin-payment' },
        { id: 'rp-inv-create', role_id: 'role-inventory', permission_id: 'perm-inv-create' },
        { id: 'rp-inv-adjust', role_id: 'role-inventory', permission_id: 'perm-inv-adjust' },
        { id: 'rp-inv-trans', role_id: 'role-inventory', permission_id: 'perm-inv-transfer' },
        { id: 'rp-inv-pur', role_id: 'role-inventory', permission_id: 'perm-pur-create' },
        { id: 'rp-inv-sup', role_id: 'role-inventory', permission_id: 'perm-pur-manage' },
        { id: 'rp-acc-exp', role_id: 'role-accountant', permission_id: 'perm-fin-expense' },
        { id: 'rp-acc-pay', role_id: 'role-accountant', permission_id: 'perm-fin-payment' },
        { id: 'rp-acc-rep', role_id: 'role-accountant', permission_id: 'perm-fin-reports' },
      ];
      await db.rolePermissions.bulkPut(seedRolePermissions);

      // Seed Super Admin UserSecurity (if empty)
      const secCount = await db.userSecurity.count();
      if (secCount === 0) {
        await db.userSecurity.put({ user_id: 'usr-superadmin', pin_hash: '0000', failed_attempts: 0, two_factor_enabled: false });
      }
      console.log('[DukaPos] System security & RBAC permissions initialized.');
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Incremental Purchasing Seed ──────────────────────────────────────────
    const supplierCount = await db.suppliers.count();
    if (supplierCount === 0) {
      const NOW_PUR = Date.now();
      const DAY_PUR = 86400000;

      await db.suppliers.bulkPut([
        {
          id: 'sup-001',
          supplier_code: 'SUP-001',
          name: 'Tanzania Wholesale Distributors Ltd',
          trading_name: 'TWD Wholesale',
          category: 'General',
          tin_number: '112-233-445',
          vrn_number: '40012345-H',
          phone: '+255 754 100 200',
          whatsapp: '+255 754 100 200',
          email: 'orders@twd.co.tz',
          country: 'Tanzania',
          region: 'Dar es Salaam',
          city: 'Dar es Salaam',
          address: 'Kariakoo, Dar es Salaam',
          preferred_currency: 'TZS',
          payment_terms_days: 30,
          credit_limit: 5000000,
          current_balance: 450000,
          mpesa_number: '150150',
          status: 'Active',
          tenant_id: 'tenant-101',
          branch_id: 'branch-dar-hq',
          created_at: NOW_PUR - 180 * DAY_PUR,
          updated_at: NOW_PUR - 180 * DAY_PUR
        },
        {
          id: 'sup-002',
          supplier_code: 'SUP-002',
          name: 'Medipharm East Africa',
          trading_name: 'Medipharm',
          category: 'Pharmaceuticals',
          tin_number: '556-677-889',
          vrn_number: undefined,
          phone: '+255 783 500 600',
          whatsapp: undefined,
          email: 'supply@medipharm.tz',
          country: 'Tanzania',
          region: 'Dar es Salaam',
          city: 'Dar es Salaam',
          address: 'Upanga, Dar es Salaam',
          preferred_currency: 'TZS',
          payment_terms_days: 0,
          credit_limit: 0,
          current_balance: 0,
          tigopesa_number: '0783500600',
          status: 'Active',
          tenant_id: 'tenant-101',
          branch_id: 'branch-dar-hq',
          created_at: NOW_PUR - 120 * DAY_PUR,
          updated_at: NOW_PUR - 120 * DAY_PUR
        },
        {
          id: 'sup-003',
          supplier_code: 'SUP-003',
          name: 'Arusha Tech Supplies Co.',
          trading_name: 'Arusha Tech',
          category: 'Electronics',
          tin_number: '998-877-661',
          vrn_number: '50098765-K',
          phone: '+255 689 300 400',
          whatsapp: '+255 689 300 400',
          email: 'sales@arutech.co.tz',
          country: 'Tanzania',
          region: 'Arusha',
          city: 'Arusha',
          address: 'Sokoine Road, Arusha',
          preferred_currency: 'TZS',
          payment_terms_days: 14,
          credit_limit: 3000000,
          current_balance: 1200000,
          bank_account: 'NMB - 0150123456789',
          status: 'Active',
          tenant_id: 'tenant-101',
          branch_id: 'branch-arusha-depot',
          created_at: NOW_PUR - 90 * DAY_PUR,
          updated_at: NOW_PUR - 90 * DAY_PUR
        },
        {
          id: 'sup-004',
          supplier_code: 'SUP-004',
          name: 'Kilimo Fresh Produce Ltd',
          trading_name: 'Kilimo Fresh',
          category: 'Agriculture',
          tin_number: '123-456-789',
          vrn_number: undefined,
          phone: '+255 712 888 999',
          whatsapp: undefined,
          email: 'info@kilimofresh.tz',
          country: 'Tanzania',
          region: 'Pwani',
          city: 'Kibaha',
          address: 'Kibaha, Pwani',
          preferred_currency: 'TZS',
          payment_terms_days: 0,
          credit_limit: 1000000,
          current_balance: 80000,
          airtel_money_number: '0712888999',
          status: 'Active',
          tenant_id: 'tenant-101',
          branch_id: 'branch-dar-hq',
          created_at: NOW_PUR - 60 * DAY_PUR,
          updated_at: NOW_PUR - 60 * DAY_PUR
        },
        {
          id: 'sup-005',
          supplier_code: 'SUP-005',
          name: 'SautiPrint Graphics & Packaging',
          trading_name: 'SautiPrint',
          category: 'Packaging',
          tin_number: '655-222-333',
          vrn_number: undefined,
          phone: '+255 655 222 333',
          whatsapp: undefined,
          email: 'hello@sautiprint.tz',
          country: 'Tanzania',
          region: 'Dar es Salaam',
          city: 'Dar es Salaam',
          address: 'Changombe, Dar es Salaam',
          preferred_currency: 'TZS',
          payment_terms_days: 7,
          credit_limit: 500000,
          current_balance: 0,
          status: 'Inactive',
          tenant_id: 'tenant-101',
          branch_id: 'branch-dar-hq',
          created_at: NOW_PUR - 200 * DAY_PUR,
          updated_at: NOW_PUR - 200 * DAY_PUR
        }
      ]);

      await db.supplierContacts.bulkPut([
        { id: 'sc-001', supplier_id: 'sup-001', tenant_id: 'tenant-101', name: 'Hamisi Mwangi', position: 'Sales Manager', phone: '+255 754 100 200', email: 'hamisi@twd.co.tz', is_primary: true, created_at: NOW_PUR - 180 * DAY_PUR },
        { id: 'sc-002', supplier_id: 'sup-002', tenant_id: 'tenant-101', name: 'Dr. Salma Rashid', position: 'Director of Accounts', phone: '+255 783 500 600', email: 'salma@medipharm.tz', is_primary: true, created_at: NOW_PUR - 120 * DAY_PUR },
        { id: 'sc-003', supplier_id: 'sup-003', tenant_id: 'tenant-101', name: 'Joseph Kimaro', position: 'Operations Officer', phone: '+255 689 300 400', email: 'joseph@arutech.co.tz', is_primary: true, created_at: NOW_PUR - 90 * DAY_PUR }
      ]);

      await db.purchaseOrders.bulkPut([]);
      await db.goodsReceipts.bulkPut([]);
      await db.supplierInvoices.bulkPut([]);
      await db.supplierLedger.bulkPut([]);
      await db.supplierPayments.bulkPut([]);

      await db.warehouses.bulkPut([
        { id: 'wh-001', name: 'Dar es Salaam Main Warehouse', code: 'WH-DAR-01', location: 'Ubungo Industrial Area, Dar es Salaam', manager_name: 'Francis Mbeki', phone: '+255 756 400 500', capacity_sqm: 2500, tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', status: 'Active', created_at: NOW_PUR - 365 * DAY_PUR },
        { id: 'wh-002', name: 'Arusha Depot Store', code: 'WH-ARU-01', location: 'Industrial Area, Arusha', manager_name: 'Peter Lema', phone: '+255 689 700 800', capacity_sqm: 800, tenant_id: 'tenant-101', branch_id: 'branch-arusha-depot', status: 'Active', created_at: NOW_PUR - 200 * DAY_PUR },
      ]);

      console.log('[DukaPos] SRM Upgraded Seed Data applied successfully.');
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Incremental Control Plane Seed (runs even if tenants already exist) ─
    const backupsCount2 = await db.backups.count();
    if (backupsCount2 === 0) {
      const NOW_CP = Date.now();
      const DAY_CP = 86400000;
      await db.backups.bulkPut([
        { id: 'bkp-001', tenant_id: 'tenant-101', type: 'DAILY',   status: 'COMPLETED', size_mb: 1240,  encrypted: true,  checksum: 'sha256:a3f2b1c8d4e9f0a1b2c3d4e5f6a7b8c9', created_at: NOW_CP - 1 * DAY_CP,  created_by: 'system-scheduler' },
        { id: 'bkp-002', tenant_id: 'tenant-102', type: 'DAILY',   status: 'COMPLETED', size_mb:  380,  encrypted: true,  checksum: 'sha256:b4e3c2d1f0a9b8c7d6e5f4a3b2c1d0e9', created_at: NOW_CP - 1 * DAY_CP,  created_by: 'system-scheduler' },
        { id: 'bkp-003', tenant_id: 'tenant-101', type: 'WEEKLY',  status: 'COMPLETED', size_mb: 8600,  encrypted: true,  checksum: 'sha256:c5f4d3e2a1b0c9d8e7f6a5b4c3d2e1f0', created_at: NOW_CP - 7 * DAY_CP,  created_by: 'system-scheduler' },
        { id: 'bkp-004', tenant_id: 'tenant-103', type: 'DAILY',   status: 'FAILED',    size_mb:    0,  encrypted: false, checksum: 'sha256:error-checksum-00000000000000',    created_at: NOW_CP - 2 * DAY_CP,  created_by: 'system-scheduler' },
        { id: 'bkp-005', tenant_id: 'tenant-106', type: 'HOURLY',  status: 'COMPLETED', size_mb:  215,  encrypted: true,  checksum: 'sha256:d6a5b4c3e2f1a0b9c8d7e6f5a4b3c2d1', created_at: NOW_CP - 2 * 3600 * 1000, created_by: 'system-scheduler' },
        { id: 'bkp-006', tenant_id: 'tenant-101', type: 'MONTHLY', status: 'COMPLETED', size_mb: 31000, encrypted: true,  checksum: 'sha256:e7b6c5d4f3a2b1c0d9e8f7a6b5c4d3e2', created_at: NOW_CP - 30 * DAY_CP, created_by: 'system-scheduler' },
        { id: 'bkp-007', tenant_id: 'tenant-104', type: 'MANUAL',  status: 'COMPLETED', size_mb:  560,  encrypted: true,  checksum: 'sha256:f8c7d6e5a4b3c2d1e0f9a8b7c6d5e4f3', created_at: NOW_CP - 3 * DAY_CP,  created_by: 'usr-superadmin' },
        { id: 'bkp-008', tenant_id: 'tenant-102', type: 'WEEKLY',  status: 'COMPLETED', size_mb: 2800,  encrypted: true,  checksum: 'sha256:a9d8e7f6b5c4d3e2f1a0b9c8d7e6f5a4', created_at: NOW_CP - 7 * DAY_CP,  created_by: 'system-scheduler' },
        { id: 'bkp-009', tenant_id: 'tenant-105', type: 'DAILY',   status: 'COMPLETED', size_mb:   92,  encrypted: true,  checksum: 'sha256:b0e9f8a7c6d5e4f3a2b1c0d9e8f7a6b5', created_at: NOW_CP - 1 * DAY_CP,  created_by: 'system-scheduler' },
        { id: 'bkp-010', tenant_id: 'tenant-101', type: 'DAILY',   status: 'COMPLETED', size_mb: 1290,  encrypted: true,  checksum: 'sha256:c1f0a9b8d7e6f5a4b3c2d1e0f9a8b7c6', created_at: NOW_CP - 2 * DAY_CP,  created_by: 'system-scheduler' },
      ]);
      await db.notifications.bulkPut([
        { id: 'notif-001', tenant_id: null, channel: 'EMAIL',    subject: 'Platform Maintenance Scheduled — July 28, 2026',       message: 'DukaPos SaaS will undergo a planned maintenance window from 02:00–04:00 EAT on July 28. All services will be temporarily unavailable.',           target_scope: 'ALL',    status: 'SENT', sent_at: NOW_CP - 3 * DAY_CP },
        { id: 'notif-002', tenant_id: null, channel: 'SMS',      subject: 'Payment Reminder: Invoice DKP-2026-000212',             message: 'Your DukaPos subscription invoice of Tsh. 69,600 is due in 15 days. Pay via M-PESA to 150150.',                                               target_scope: 'SINGLE', target_filter: 'tenant-101', status: 'SENT', sent_at: NOW_CP - 1 * DAY_CP },
        { id: 'notif-003', tenant_id: null, channel: 'IN_APP',   subject: 'New Feature: AI Churn Prediction Dashboard Live',       message: 'Enterprise tenants now have access to the AI-powered churn prediction engine under Super Admin > AI Operations.',                            target_scope: 'PLAN',   target_filter: 'Enterprise',   status: 'SENT', sent_at: NOW_CP - 5 * DAY_CP },
        { id: 'notif-004', tenant_id: null, channel: 'WHATSAPP', subject: 'Upgrade Offer: Move to Enterprise — 30% Off',           message: 'You are approaching your user seat limit. Upgrade to Enterprise this month and get 30% off the first 3 months. Reply YES to claim.',       target_scope: 'PLAN',   target_filter: 'Professional', status: 'SENT', sent_at: NOW_CP - 7 * DAY_CP },
        { id: 'notif-005', tenant_id: null, channel: 'EMAIL',    subject: 'Security Alert: Multiple Failed Login Attempts Detected', message: 'We detected 5 failed login attempts on tenant Dodoma Plaza Retailers. Account temporarily locked. Review Security Center.',                target_scope: 'SINGLE', target_filter: 'tenant-103',   status: 'SENT', sent_at: NOW_CP - 12 * 3600 * 1000 },
        { id: 'notif-006', tenant_id: null, channel: 'PUSH',     subject: 'Database Backup Completed — All Tenants',               message: 'Nightly automated encrypted backups for all 6 active tenants completed successfully. Zero failures recorded.',                              target_scope: 'ALL',    status: 'SENT', sent_at: NOW_CP - 8 * 3600 * 1000 },
      ]);
      await db.securityIncidents.bulkPut([
        { id: 'si-001', tenant_id: 'tenant-103', type: 'FAILED_LOGIN',        severity: 'HIGH',     status: 'OPEN',          details: '5 consecutive failed login attempts from IP 196.13.47.23 within 3 minutes. Account temporarily locked.', ip_address: '196.13.47.23',  user_agent: 'Mozilla/5.0 (Android)',              created_at: NOW_CP - 12 * 3600 * 1000 },
        { id: 'si-002', tenant_id: 'tenant-101', type: 'SUSPICIOUS_LOCATION', severity: 'MEDIUM',   status: 'INVESTIGATING', details: 'Login detected from London, UK (IP 82.132.45.100). Tenant registered in Dar es Salaam, Tanzania.',      ip_address: '82.132.45.100', user_agent: 'Chrome/126 Safari/537.36',           created_at: NOW_CP - 2 * DAY_CP },
        { id: 'si-003', tenant_id: 'tenant-102', type: 'CONCURRENT_SESSIONS', severity: 'MEDIUM',   status: 'RESOLVED',      details: 'User usr-grace opened 3 simultaneous sessions from different devices. Session limit = 2.',              ip_address: '41.73.45.101',  user_agent: 'Firefox/127',                        created_at: NOW_CP - 5 * DAY_CP },
        { id: 'si-004', tenant_id: 'tenant-106', type: 'API_ABUSE',           severity: 'CRITICAL', status: 'OPEN',          details: 'API key made 1,240 requests in 60 seconds. Rate limit exceeded 12x.',                                   ip_address: '154.72.190.55', user_agent: 'Python-urllib/3.12',                 created_at: NOW_CP - 6 * 3600 * 1000 },
        { id: 'si-005', tenant_id: 'tenant-104', type: 'TOKEN_ABUSE',         severity: 'HIGH',     status: 'DISMISSED',     details: 'Refresh token reuse detected. Same token presented from 2 IPs within 30 seconds.',                      ip_address: '197.250.4.99',  user_agent: 'OkHttp/4.12',                        created_at: NOW_CP - 3 * DAY_CP },
        { id: 'si-006', tenant_id: 'tenant-101', type: 'RATE_LIMIT',          severity: 'LOW',      status: 'RESOLVED',      details: 'Bulk product import script exceeded 200 API calls/min for 5 minutes. Throttled automatically.',         ip_address: '197.250.4.15',  user_agent: 'DukaPos-Import-Script/v2.4',         created_at: NOW_CP - 8 * DAY_CP },
        { id: 'si-007', tenant_id: 'tenant-105', type: 'LOCKED_ACCOUNT',      severity: 'MEDIUM',   status: 'OPEN',          details: 'Account locked after 10 PIN failures on mobile POS app. Manual unlock required.',                       ip_address: '154.67.29.210', user_agent: 'DukaPos-Mobile/v3.1 Android',        created_at: NOW_CP - 1 * DAY_CP },
      ]);
      console.log('[DukaPos] Control Plane incremental seed applied (backups, notifications, security incidents).');
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Incremental Subscription Plans Seed ─────────────────────────────────
    const subPlansCount = await db.subscriptionPlans.count();
    if (subPlansCount === 0) {
      const NOW_SP = Date.now();
      const DAY_SP = 24 * 60 * 60 * 1000;
      const initialPlans: SubscriptionPlan[] = [
        {
          id: 'plan-trial',
          name: 'Free Trial',
          code: 'TRIAL',
          description: '14-day full platform access trial for new business evaluation.',
          price: 0,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 2,
          max_branches: 1,
          max_products: 100,
          max_storage_mb: 100,
          is_trial: true,
          is_active: true,
          created_at: NOW_SP - 60 * DAY_SP,
          updated_at: NOW_SP
        },
        {
          id: 'plan-starter',
          name: 'Starter Plan',
          code: 'STARTER',
          description: 'For small single-shop businesses looking to start digitization.',
          price: 25000,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 3,
          max_branches: 1,
          max_products: 1000,
          max_storage_mb: 500,
          is_trial: false,
          is_active: true,
          created_at: NOW_SP - 60 * DAY_SP,
          updated_at: NOW_SP
        },
        {
          id: 'plan-business',
          name: 'Business Plan',
          code: 'BUSINESS',
          description: 'Perfect for retail stores with multiple branches and staff teams.',
          price: 60000,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 10,
          max_branches: 5,
          max_products: 50000,
          max_storage_mb: 2000,
          is_trial: false,
          is_active: true,
          created_at: NOW_SP - 60 * DAY_SP,
          updated_at: NOW_SP
        },
        {
          id: 'plan-enterprise',
          name: 'Enterprise Plan',
          code: 'ENTERPRISE',
          description: 'Custom setups, infinite scale, and offline micro-service sync.',
          price: 150000,
          currency: 'TZS',
          billing_cycle: 'monthly',
          max_users: 9999,
          max_branches: 9999,
          max_products: 999999,
          max_storage_mb: 50000,
          is_trial: false,
          is_active: true,
          created_at: NOW_SP - 60 * DAY_SP,
          updated_at: NOW_SP
        }
      ];
      await db.subscriptionPlans.bulkPut(initialPlans);
      console.log('[DukaPos] Initial subscription plans seeded into IndexedDB.');
    }
    // ────────────────────────────────────────────────────────────────────────

    if (localStorage.getItem('DUKAPOS_PRODUCTION_LOCKED') === 'true' || tenantCount > 0) {
      isSeedingInProgress = false;
      return;
    }

    console.log('Clearing database for fresh production initialization...');
    await db.products.clear();
    await db.productVariants.clear();
    await db.customers.clear();
    await db.orders.clear();
    await db.tenants.clear();
    await db.branches.clear();
    await db.industries.clear();
    await db.tenantIndustries.clear();
    await db.users.clear();
    await db.userBranchRoles.clear();
    await db.stockLedger.clear();
    await db.stockBalance.clear();
    await db.tenantModules.clear();
    await db.tenantSettings.clear();
    await db.featureFlags.clear();
    await db.auditLogs.clear();

    const NOW = Date.now();
    const DAY = 86400000;

    await db.industries.bulkPut([
      { id: 'ind-retail', name: 'Retail', schema_preset: { features: ['inventory', 'pos', 'customers'] } },
      { id: 'ind-pharmacy', name: 'Pharmacy', schema_preset: { features: ['inventory', 'pos', 'customers', 'expiry_check'] } },
      { id: 'ind-restaurant', name: 'Restaurant', schema_preset: { features: ['pos', 'tables', 'kitchen'] } },
      { id: 'ind-sacco', name: 'SACCO', schema_preset: { features: ['savings', 'loans', 'shares'] } },
      { id: 'ind-bar', name: 'Bar', schema_preset: { features: ['counter_pos', 'open_tabs', 'pour_tracking', 'excise_duty', 'empty_bottles', 'happy_hour'] } },
      { id: 'ind-consulting', name: 'BusinessConsultant', schema_preset: { features: ['client_management', 'project_management', 'contracts', 'invoicing', 'assessments', 'strategy', 'ai_consultant'] } }
    ]);

    await db.tenantIndustries.bulkPut([
      { tenant_id: 'tenant-101', industry_id: 'ind-retail' },
      { tenant_id: 'tenant-101', industry_id: 'ind-pharmacy' },
      { tenant_id: 'tenant-101', industry_id: 'ind-restaurant' },
      { tenant_id: 'tenant-102', industry_id: 'ind-pharmacy' },
      { tenant_id: 'tenant-106', industry_id: 'ind-bar' }
    ]);

    await db.branches.bulkPut([
      { id: 'branch-dar-hq', tenant_id: 'tenant-101', name: 'Dar es Salaam HQ Branch', location: 'Posta, Dar es Salaam', is_headquarters: true },
      { id: 'branch-arusha-depot', tenant_id: 'tenant-101', name: 'Arusha Retail Branch', location: 'Njiro, Arusha', is_headquarters: false },
      { id: 'branch-london-office', tenant_id: 'tenant-101', name: 'London Restaurant Branch', location: 'London, UK', is_headquarters: false },
      { id: 'branch-pharm-main', tenant_id: 'tenant-102', name: 'Pharmacy Main Branch', location: 'Arusha Town', is_headquarters: true },
      { id: 'branch-bongo-main', tenant_id: 'tenant-106', name: 'Bongo Lounge — Msasani', location: 'Slipway Road, Msasani, Dar es Salaam', is_headquarters: true }
    ]);

    await db.users.bulkPut([
      { id: 'usr-superadmin', email: 'admin@dukapos.com', password_hash: 'admin123', is_super_admin: true, name: 'System Platform Owner', phone: '+255799999999' },
      { id: 'usr-owner', email: 'owner@dukapos.com', password_hash: 'owner123', is_super_admin: false, name: 'Juma Ally', phone: '+255712345678' },
      { id: 'usr-cashier', email: 'cashier@dukapos.com', password_hash: 'cashier123', is_super_admin: false, name: 'Amani Tumaini', phone: '+255711223344' },
      { id: 'usr-grace', email: 'grace@dukapos.com', password_hash: 'grace123', is_super_admin: false, name: 'Grace Mboya', phone: '+255755443322' }
    ]);

    await db.userBranchRoles.bulkPut([
      { id: 'ubr-1', user_id: 'usr-owner', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', industry_id: 'ind-retail', role_id: 'Business Owner' },
      { id: 'ubr-2', user_id: 'usr-owner', tenant_id: 'tenant-101', branch_id: 'branch-arusha-depot', industry_id: 'ind-pharmacy', role_id: 'Branch Manager' },
      { id: 'ubr-3', user_id: 'usr-owner', tenant_id: 'tenant-101', branch_id: 'branch-london-office', industry_id: 'ind-restaurant', role_id: 'Business Owner' },
      { id: 'ubr-4', user_id: 'usr-cashier', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', industry_id: 'ind-retail', role_id: 'Cashier' },
      { id: 'ubr-5', user_id: 'usr-grace', tenant_id: 'tenant-102', branch_id: 'branch-pharm-main', industry_id: 'ind-pharmacy', role_id: 'Business Owner' },
      { id: 'ubr-6', user_id: 'usr-owner', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', industry_id: 'ind-bar', role_id: 'Business Owner' },
      { id: 'ubr-7', user_id: 'usr-cashier', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', industry_id: 'ind-bar', role_id: 'Cashier' }
    ]);

    // Seed Tenant Modules (module activation per tenant)
    await db.tenantModules.bulkPut([
      // Acme — Retail + Pharmacy + Restaurant active
      { id: 'tm-101-retail', tenant_id: 'tenant-101', module_key: 'Retail', enabled: true, configuration: { pos: true, inventory: true, customers: true, variants: true }, installed_at: NOW - 120 * DAY },
      { id: 'tm-101-pharm', tenant_id: 'tenant-101', module_key: 'Pharmacy', enabled: true, configuration: { expiry_check: true, prescriptions: false }, installed_at: NOW - 100 * DAY },
      { id: 'tm-101-rest', tenant_id: 'tenant-101', module_key: 'Restaurant', enabled: true, configuration: { tables: true, kitchen_display: true }, installed_at: NOW - 80 * DAY },
      { id: 'tm-101-work', tenant_id: 'tenant-101', module_key: 'Workforce', enabled: false, configuration: {}, installed_at: NOW - 50 * DAY },
      // Arusha Chemist
      { id: 'tm-102-pharm', tenant_id: 'tenant-102', module_key: 'Pharmacy', enabled: true, configuration: { expiry_check: true, prescriptions: true }, installed_at: NOW - 90 * DAY },
      // Mwanza Hotel
      { id: 'tm-104-hotel', tenant_id: 'tenant-104', module_key: 'Hotel', enabled: true, configuration: { reservations: true, housekeeping: true }, installed_at: NOW - 10 * DAY },
      // Bongo Lounge
      { id: 'tm-106-bar', tenant_id: 'tenant-106', module_key: 'Bar', enabled: true, configuration: { open_tabs: true, counter_pos: true, pour_tracking: true, happy_hour: true, excise_duty: true }, installed_at: NOW - 45 * DAY }
    ]);

    // Seed Tenant Settings
    await db.tenantSettings.bulkPut([
      { id: 'ts-101-curr', tenant_id: 'tenant-101', setting_key: 'currency', setting_value: 'TZS' },
      { id: 'ts-101-tax', tenant_id: 'tenant-101', setting_key: 'tax_enabled', setting_value: true },
      { id: 'ts-101-tz', tenant_id: 'tenant-101', setting_key: 'timezone', setting_value: 'Africa/Dar_es_Salaam' },
      { id: 'ts-101-rcpt', tenant_id: 'tenant-101', setting_key: 'receipt_footer', setting_value: 'Thank you for shopping with Acme!' },
      { id: 'ts-102-curr', tenant_id: 'tenant-102', setting_key: 'currency', setting_value: 'TZS' },
      { id: 'ts-102-tax', tenant_id: 'tenant-102', setting_key: 'tax_enabled', setting_value: false },
      { id: 'ts-104-curr', tenant_id: 'tenant-104', setting_key: 'currency', setting_value: 'TZS' },
      { id: 'ts-106-curr', tenant_id: 'tenant-106', setting_key: 'currency', setting_value: 'TZS' },
      { id: 'ts-106-tax', tenant_id: 'tenant-106', setting_key: 'tax_enabled', setting_value: true },
      { id: 'ts-106-tz', tenant_id: 'tenant-106', setting_key: 'timezone', setting_value: 'Africa/Dar_es_Salaam' }
    ]);

    // Seed Feature Flags per tenant
    await db.featureFlags.bulkPut([
      // Acme Enterprise — all features
      { id: 'ff-101-mb', tenant_id: 'tenant-101', feature_key: 'multi_branch', enabled: true },
      { id: 'ff-101-ai', tenant_id: 'tenant-101', feature_key: 'ai_assistant', enabled: true },
      { id: 'ff-101-ar', tenant_id: 'tenant-101', feature_key: 'advanced_reports', enabled: true },
      { id: 'ff-101-acc', tenant_id: 'tenant-101', feature_key: 'accounting', enabled: true },
      { id: 'ff-101-api', tenant_id: 'tenant-101', feature_key: 'api_access', enabled: true },
      // Arusha Chemist Professional
      { id: 'ff-102-mb', tenant_id: 'tenant-102', feature_key: 'multi_branch', enabled: true },
      { id: 'ff-102-ai', tenant_id: 'tenant-102', feature_key: 'ai_assistant', enabled: false },
      { id: 'ff-102-ar', tenant_id: 'tenant-102', feature_key: 'advanced_reports', enabled: true },
      { id: 'ff-102-acc', tenant_id: 'tenant-102', feature_key: 'accounting', enabled: false },
      { id: 'ff-102-api', tenant_id: 'tenant-102', feature_key: 'api_access', enabled: false },
      // Dodoma Basic
      { id: 'ff-103-mb', tenant_id: 'tenant-103', feature_key: 'multi_branch', enabled: false },
      { id: 'ff-103-ai', tenant_id: 'tenant-103', feature_key: 'ai_assistant', enabled: false },
      { id: 'ff-103-ar', tenant_id: 'tenant-103', feature_key: 'advanced_reports', enabled: false },
      // Mwanza Hotel Trial
      { id: 'ff-104-mb', tenant_id: 'tenant-104', feature_key: 'multi_branch', enabled: false },
      { id: 'ff-104-ai', tenant_id: 'tenant-104', feature_key: 'ai_assistant', enabled: true },
      { id: 'ff-104-ar', tenant_id: 'tenant-104', feature_key: 'advanced_reports', enabled: false },
      // Bongo Liqueur Lounge — Bar & Nightclub (Professional Plan)
      { id: 'ff-106-mb', tenant_id: 'tenant-106', feature_key: 'multi_branch', enabled: true },
      { id: 'ff-106-ai', tenant_id: 'tenant-106', feature_key: 'ai_assistant', enabled: false },
      { id: 'ff-106-ar', tenant_id: 'tenant-106', feature_key: 'advanced_reports', enabled: true },
      { id: 'ff-106-pt', tenant_id: 'tenant-106', feature_key: 'pour_tracking', enabled: true },
      { id: 'ff-106-ex', tenant_id: 'tenant-106', feature_key: 'excise_duty', enabled: true },
      { id: 'ff-106-hh', tenant_id: 'tenant-106', feature_key: 'happy_hour', enabled: true },
    ]);

    // Seed Audit Logs
    await db.auditLogs.bulkPut([
      { id: 'al-001', tenant_id: 'tenant-101', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'TENANT_CREATED', entity: 'tenant', entity_id: 'tenant-101', created_at: NOW - 120 * DAY },
      { id: 'al-002', tenant_id: 'tenant-101', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'PLAN_UPGRADED', entity: 'tenant', entity_id: 'tenant-101', metadata: { from: 'Professional', to: 'Enterprise' }, created_at: NOW - 80 * DAY },
      { id: 'al-003', tenant_id: 'tenant-101', user_id: 'usr-owner', user_name: 'Juma Ally', action: 'BRANCH_CREATED', entity: 'branch', entity_id: 'branch-arusha-depot', created_at: NOW - 70 * DAY },
      { id: 'al-004', tenant_id: 'tenant-101', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'MODULE_ENABLED', entity: 'module', entity_id: 'Restaurant', created_at: NOW - 50 * DAY },
      { id: 'al-005', tenant_id: 'tenant-102', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'TENANT_CREATED', entity: 'tenant', entity_id: 'tenant-102', created_at: NOW - 90 * DAY },
      { id: 'al-006', tenant_id: 'tenant-103', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'TENANT_SUSPENDED', entity: 'tenant', entity_id: 'tenant-103', metadata: { reason: 'Non-payment' }, created_at: NOW - 30 * DAY },
      { id: 'al-007', tenant_id: 'tenant-104', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'TENANT_CREATED', entity: 'tenant', entity_id: 'tenant-104', created_at: NOW - 10 * DAY },
      { id: 'al-008', tenant_id: 'tenant-104', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'TRIAL_STARTED', entity: 'tenant', entity_id: 'tenant-104', created_at: NOW - 10 * DAY },
      { id: 'al-009', tenant_id: 'tenant-101', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'IMPERSONATION_START', entity: 'tenant', entity_id: 'tenant-101', metadata: { duration: '12min' }, created_at: NOW - 5 * DAY },
      { id: 'al-010', tenant_id: 'tenant-105', user_id: 'usr-superadmin', user_name: 'System Platform Owner', action: 'TENANT_REGISTERED', entity: 'tenant', entity_id: 'tenant-105', created_at: NOW - 2 * DAY },
    ]);

    const tenant_id = 'tenant-101';
    const branch_id = 'branch-dar-hq';

    // Seed Products/Services with stock=0 initially (ledger will populate it)
    const seedProducts: Product[] = [];
    await db.products.bulkPut(seedProducts);

    // Seed child variants for product ret-1 (Premium Rice 5kg) with stock=0 initially
    const seedVariants: ProductVariant[] = [];
    await db.productVariants.bulkPut(seedVariants);

    // Seed Customers
    const seedCustomers: Customer[] = [
      { id: 'cust-1', name: 'Sarah Joseph', phone: '+255711998877', email: 'sarah@gmail.com', loyaltyPoints: 340, outstandingBalance: 0, creditLimit: 500000, tenant_id, branch_id, type: 'Customer' },
      { id: 'cust-2', name: 'David Mlaki', phone: '+255755443322', email: 'david@mlaki.co.tz', loyaltyPoints: 120, outstandingBalance: 45000, creditLimit: 300000, tenant_id, branch_id, type: 'Customer' },
      { id: 'cust-3', name: 'Mwajuma Shabani', phone: '+255788112233', email: 'mwajuma@vicoba.or.tz', loyaltyPoints: 850, outstandingBalance: 1250000, creditLimit: 2000000, tenant_id, branch_id, type: 'Customer' }
    ];

    await db.customers.bulkPut(seedCustomers);

    // Seed Orders
    const seedOrders: Order[] = [];
    await db.orders.bulkPut(seedOrders);

    // Seeding completed

    // 7. Seed Subscription Plans
    const plans: SubscriptionPlan[] = [
      {
        id: 'plan-trial',
        name: 'Free Trial',
        code: 'TRIAL',
        description: '14-day full platform access trial for new business evaluation.',
        price: 0,
        currency: 'TZS',
        billing_cycle: 'monthly',
        max_users: 2,
        max_branches: 1,
        max_products: 100,
        max_storage_mb: 100,
        is_trial: true,
        is_active: true,
        created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
        updated_at: Date.now()
      },
      {
        id: 'plan-starter',
        name: 'Starter Plan',
        code: 'STARTER',
        description: 'For small single-shop businesses looking to start digitization.',
        price: 25000,
        currency: 'TZS',
        billing_cycle: 'monthly',
        max_users: 3,
        max_branches: 1,
        max_products: 1000,
        max_storage_mb: 500,
        is_trial: false,
        is_active: true,
        created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
        updated_at: Date.now()
      },
      {
        id: 'plan-business',
        name: 'Business Plan',
        code: 'BUSINESS',
        description: 'Perfect for retail stores with multiple branches and staff teams.',
        price: 60000,
        currency: 'TZS',
        billing_cycle: 'monthly',
        max_users: 10,
        max_branches: 5,
        max_products: 50000,
        max_storage_mb: 2000,
        is_trial: false,
        is_active: true,
        created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
        updated_at: Date.now()
      },
      {
        id: 'plan-enterprise',
        name: 'Enterprise Plan',
        code: 'ENTERPRISE',
        description: 'Custom setups, infinite scale, and offline micro-service sync.',
        price: 150000,
        currency: 'TZS',
        billing_cycle: 'monthly',
        max_users: 9999,
        max_branches: 9999,
        max_products: 999999,
        max_storage_mb: 50000,
        is_trial: false,
        is_active: true,
        created_at: Date.now() - 60 * 24 * 60 * 60 * 1000,
        updated_at: Date.now()
      }
    ];
    await db.subscriptionPlans.bulkPut(plans);

    // 8. Seed Tenant Subscription
    const defaultSub: TenantSubscription = {
      id: 'sub-tenant-1',
      tenant_id,
      plan_id: 'plan-business',
      status: 'ACTIVE',
      start_date: Date.now() - 15 * 24 * 60 * 60 * 1000,
      end_date: Date.now() + 15 * 24 * 60 * 60 * 1000,
      auto_renew: true,
      created_at: Date.now() - 15 * 24 * 60 * 60 * 1000,
      updated_at: Date.now()
    };
    await db.tenantSubscriptions.put(defaultSub);

    // 9. Seed Invoices & Payments
    const seedInvoices: Invoice[] = [
      {
        id: 'inv-1',
        tenant_id,
        invoice_number: 'DKP-2026-000145',
        amount: 60000,
        tax: 9600,
        total: 69600,
        status: 'PAID',
        due_date: Date.now() - 15 * 24 * 60 * 60 * 1000,
        created_at: Date.now() - 15 * 24 * 60 * 60 * 1000
      },
      {
        id: 'inv-2',
        tenant_id,
        invoice_number: 'DKP-2026-000212',
        amount: 60000,
        tax: 9600,
        total: 69600,
        status: 'UNPAID',
        due_date: Date.now() + 15 * 24 * 60 * 60 * 1000,
        created_at: Date.now()
      }
    ];
    await db.invoices.bulkPut(seedInvoices);

    const seedPayments: Payment[] = [
      {
        id: 'pay-1',
        tenant_id,
        subscription_id: 'sub-tenant-1',
        provider: 'M-PESA',
        transaction_reference: 'MPESA-TXN-9812A',
        amount: 69600,
        currency: 'TZS',
        status: 'COMPLETED',
        paid_at: Date.now() - 15 * 24 * 60 * 60 * 1000
      }
    ];
    await db.payments.bulkPut(seedPayments);

    // 10. Seed Feature Registry (all system capabilities)
    const seedFeatures: Feature[] = [
      { id: 'feat-pos-basic', code: 'POS_BASIC', name: 'Point of Sale (Basic)', module: 'POS', description: 'Basic sales, receipts, and payment processing.', created_at: NOW },
      { id: 'feat-pos-offline', code: 'POS_OFFLINE', name: 'Offline POS Mode', module: 'POS', description: 'Full POS operation without internet connection.', created_at: NOW },
      { id: 'feat-inventory', code: 'INVENTORY', name: 'Inventory Management', module: 'Inventory', description: 'Product catalog, stock levels, and adjustments.', created_at: NOW },
      { id: 'feat-variants', code: 'PRODUCT_VARIANTS', name: 'Product Variants', module: 'Inventory', description: 'Variant-first product architecture (size, color, etc.).', created_at: NOW },
      { id: 'feat-customers', code: 'CUSTOMERS', name: 'Customer Management', module: 'Customers', description: 'Customer profiles, loyalty points, and credit tracking.', created_at: NOW },
      { id: 'feat-reports-basic', code: 'REPORTS_BASIC', name: 'Basic Reports', module: 'Reports', description: 'Daily sales, profit and inventory summaries.', created_at: NOW },
      { id: 'feat-reports-adv', code: 'ADVANCED_REPORTS', name: 'Advanced Analytics', module: 'Reports', description: 'Trend charts, export, and variant analytics.', created_at: NOW },
      { id: 'feat-multi-branch', code: 'MULTI_BRANCH', name: 'Multi-Branch Management', module: 'Operations', description: 'Operate multiple branches with stock transfers.', created_at: NOW },
      { id: 'feat-accounting', code: 'ACCOUNTING', name: 'Accounting Module', module: 'Finance', description: 'P&L, expense tracking, and chart of accounts.', created_at: NOW },
      { id: 'feat-ai', code: 'AI_ASSISTANT', name: 'AI Business Assistant', module: 'AI', description: 'AI-powered insights, forecasting, and recommendations.', created_at: NOW },
      { id: 'feat-api', code: 'API_ACCESS', name: 'API Access', module: 'Integration', description: 'REST API access for third-party integrations.', created_at: NOW },
      { id: 'feat-custom-modules', code: 'CUSTOM_MODULES', name: 'Custom Module Builder', module: 'Platform', description: 'Build and install custom industry modules.', created_at: NOW },
      { id: 'feat-sync', code: 'CLOUD_SYNC', name: 'Cloud Sync & Backup', module: 'Platform', description: 'Automatic real-time cloud synchronization.', created_at: NOW },
      { id: 'feat-multi-user', code: 'MULTI_USER', name: 'Multi-User Access', module: 'Access', description: 'Multiple user accounts with role-based permissions.', created_at: NOW },
    ];
    await db.features.bulkPut(seedFeatures);

    // 11. Seed Plan-Feature Entitlements
    const seedPlanFeatures: PlanFeature[] = [
      // Starter Plan features
      { id: 'pf-s-pos', plan_id: 'plan-starter', feature_id: 'feat-pos-basic', enabled: true, created_at: NOW },
      { id: 'pf-s-offline', plan_id: 'plan-starter', feature_id: 'feat-pos-offline', enabled: true, created_at: NOW },
      { id: 'pf-s-inv', plan_id: 'plan-starter', feature_id: 'feat-inventory', enabled: true, max_products: 1000, created_at: NOW },
      { id: 'pf-s-var', plan_id: 'plan-starter', feature_id: 'feat-variants', enabled: true, created_at: NOW },
      { id: 'pf-s-cust', plan_id: 'plan-starter', feature_id: 'feat-customers', enabled: true, created_at: NOW },
      { id: 'pf-s-rep', plan_id: 'plan-starter', feature_id: 'feat-reports-basic', enabled: true, created_at: NOW },
      { id: 'pf-s-repAdv', plan_id: 'plan-starter', feature_id: 'feat-reports-adv', enabled: false, created_at: NOW },
      { id: 'pf-s-mb', plan_id: 'plan-starter', feature_id: 'feat-multi-branch', enabled: false, max_branches: 1, created_at: NOW },
      { id: 'pf-s-acc', plan_id: 'plan-starter', feature_id: 'feat-accounting', enabled: false, created_at: NOW },
      { id: 'pf-s-ai', plan_id: 'plan-starter', feature_id: 'feat-ai', enabled: false, created_at: NOW },
      { id: 'pf-s-api', plan_id: 'plan-starter', feature_id: 'feat-api', enabled: false, created_at: NOW },
      { id: 'pf-s-sync', plan_id: 'plan-starter', feature_id: 'feat-sync', enabled: true, created_at: NOW },
      { id: 'pf-s-mu', plan_id: 'plan-starter', feature_id: 'feat-multi-user', enabled: true, max_users: 3, created_at: NOW },
      // Business Plan features
      { id: 'pf-b-pos', plan_id: 'plan-business', feature_id: 'feat-pos-basic', enabled: true, created_at: NOW },
      { id: 'pf-b-offline', plan_id: 'plan-business', feature_id: 'feat-pos-offline', enabled: true, created_at: NOW },
      { id: 'pf-b-inv', plan_id: 'plan-business', feature_id: 'feat-inventory', enabled: true, max_products: 50000, created_at: NOW },
      { id: 'pf-b-var', plan_id: 'plan-business', feature_id: 'feat-variants', enabled: true, created_at: NOW },
      { id: 'pf-b-cust', plan_id: 'plan-business', feature_id: 'feat-customers', enabled: true, created_at: NOW },
      { id: 'pf-b-rep', plan_id: 'plan-business', feature_id: 'feat-reports-basic', enabled: true, created_at: NOW },
      { id: 'pf-b-repAdv', plan_id: 'plan-business', feature_id: 'feat-reports-adv', enabled: true, created_at: NOW },
      { id: 'pf-b-mb', plan_id: 'plan-business', feature_id: 'feat-multi-branch', enabled: true, max_branches: 5, created_at: NOW },
      { id: 'pf-b-acc', plan_id: 'plan-business', feature_id: 'feat-accounting', enabled: true, created_at: NOW },
      { id: 'pf-b-ai', plan_id: 'plan-business', feature_id: 'feat-ai', enabled: false, created_at: NOW },
      { id: 'pf-b-api', plan_id: 'plan-business', feature_id: 'feat-api', enabled: false, created_at: NOW },
      { id: 'pf-b-sync', plan_id: 'plan-business', feature_id: 'feat-sync', enabled: true, created_at: NOW },
      { id: 'pf-b-mu', plan_id: 'plan-business', feature_id: 'feat-multi-user', enabled: true, max_users: 10, created_at: NOW },
      // Enterprise Plan features (all enabled, unlimited)
      { id: 'pf-e-pos', plan_id: 'plan-enterprise', feature_id: 'feat-pos-basic', enabled: true, created_at: NOW },
      { id: 'pf-e-offline', plan_id: 'plan-enterprise', feature_id: 'feat-pos-offline', enabled: true, created_at: NOW },
      { id: 'pf-e-inv', plan_id: 'plan-enterprise', feature_id: 'feat-inventory', enabled: true, max_products: 999999, created_at: NOW },
      { id: 'pf-e-var', plan_id: 'plan-enterprise', feature_id: 'feat-variants', enabled: true, created_at: NOW },
      { id: 'pf-e-cust', plan_id: 'plan-enterprise', feature_id: 'feat-customers', enabled: true, created_at: NOW },
      { id: 'pf-e-rep', plan_id: 'plan-enterprise', feature_id: 'feat-reports-basic', enabled: true, created_at: NOW },
      { id: 'pf-e-repAdv', plan_id: 'plan-enterprise', feature_id: 'feat-reports-adv', enabled: true, created_at: NOW },
      { id: 'pf-e-mb', plan_id: 'plan-enterprise', feature_id: 'feat-multi-branch', enabled: true, max_branches: 9999, created_at: NOW },
      { id: 'pf-e-acc', plan_id: 'plan-enterprise', feature_id: 'feat-accounting', enabled: true, created_at: NOW },
      { id: 'pf-e-ai', plan_id: 'plan-enterprise', feature_id: 'feat-ai', enabled: true, created_at: NOW },
      { id: 'pf-e-api', plan_id: 'plan-enterprise', feature_id: 'feat-api', enabled: true, created_at: NOW },
      { id: 'pf-e-cm', plan_id: 'plan-enterprise', feature_id: 'feat-custom-modules', enabled: true, created_at: NOW },
      { id: 'pf-e-sync', plan_id: 'plan-enterprise', feature_id: 'feat-sync', enabled: true, created_at: NOW },
      { id: 'pf-e-mu', plan_id: 'plan-enterprise', feature_id: 'feat-multi-user', enabled: true, max_users: 9999, created_at: NOW },
    ];
    await db.planFeatures.bulkPut(seedPlanFeatures);

    // 12. Seed Subscription Usage (live metrics for tenant-101)
    await db.subscriptionUsage.put({
      id: 'usage-tenant-101',
      tenant_id: 'tenant-101',
      products_used: 16,    // seeded product count
      users_used: 4,        // seeded user count
      branches_used: 3,     // branches for tenant-101
      storage_used_mb: 128,
      updated_at: NOW
    });

    // 13. Seed Coupons
    const seedCoupons: Coupon[] = [
      {
        id: 'coupon-1', code: 'DUKAPOS20', description: '20% off any monthly renewal',
        discount_percent: 20, valid_from: NOW - 30 * DAY, valid_until: NOW + 180 * DAY,
        max_uses: 0, times_used: 45, applicable_plans: [], is_active: true, created_at: NOW - 30 * DAY
      },
      {
        id: 'coupon-2', code: 'KARIBU50', description: '50% welcome discount for first billing month',
        discount_percent: 50, valid_from: NOW - 60 * DAY, valid_until: NOW + 90 * DAY,
        max_uses: 100, times_used: 12, applicable_plans: ['STARTER', 'BUSINESS'], is_active: true, created_at: NOW - 60 * DAY
      },
      {
        id: 'coupon-3', code: 'ENTERPRISE30', description: '30% off Enterprise plan (partner deal)',
        discount_percent: 30, valid_from: NOW - 10 * DAY, valid_until: NOW + 60 * DAY,
        max_uses: 10, times_used: 2, applicable_plans: ['ENTERPRISE'], is_active: true, created_at: NOW - 10 * DAY
      },
      {
        id: 'coupon-4', code: 'EXPIRED10', description: '10% off — expired promo',
        discount_percent: 10, valid_from: NOW - 120 * DAY, valid_until: NOW - 30 * DAY,
        max_uses: 50, times_used: 50, applicable_plans: [], is_active: false, created_at: NOW - 120 * DAY
      },
    ];
    await db.coupons.bulkPut(seedCoupons);

    // 14. Seed Initial Subscription Events audit trail
    const seedSubEvents: SubscriptionEvent[] = [
      {
        id: 'sev-1', tenant_id: 'tenant-101', event_type: 'TRIAL_STARTED',
        old_value: { status: 'REGISTERED' }, new_value: { status: 'TRIAL', plan: 'STARTER' },
        performed_by: 'System', created_at: NOW - 30 * DAY
      },
      {
        id: 'sev-2', tenant_id: 'tenant-101', event_type: 'PLAN_UPGRADED',
        old_value: { plan: 'STARTER', status: 'TRIAL' }, new_value: { plan: 'BUSINESS', status: 'ACTIVE' },
        performed_by: 'Juma Ally', created_at: NOW - 15 * DAY
      },
      {
        id: 'sev-3', tenant_id: 'tenant-101', event_type: 'PAYMENT_RECEIVED',
        old_value: { invoice: 'DKP-2026-000145', status: 'UNPAID' },
        new_value: { invoice: 'DKP-2026-000145', status: 'PAID', amount: 69600, provider: 'M-PESA' },
        performed_by: 'Juma Ally', created_at: NOW - 15 * DAY
      },
      {
        id: 'sev-4', tenant_id: 'tenant-101', event_type: 'COUPON_APPLIED',
        old_value: { coupon: null }, new_value: { coupon: 'KARIBU50', discount: 50 },
        performed_by: 'Juma Ally', created_at: NOW - 15 * DAY
      },
    ];
    await db.subscriptionEvents.bulkPut(seedSubEvents);

    // 15. Seed Permissions (dynamic & module-driven)
    const seedPermissions: Permission[] = [
      // Core module: Sales
      { id: 'perm-sales-create', module: 'Sales', resource: 'sale', action: 'create', slug: 'sales.create', description: 'Create new POS invoices & orders' },
      { id: 'perm-sales-refund', module: 'Sales', resource: 'sale', action: 'refund', slug: 'sales.refund', description: 'Process customer product returns & refunds' },
      { id: 'perm-sales-void', module: 'Sales', resource: 'sale', action: 'void', slug: 'sales.void', description: 'Void or cancel active/past transactions' },
      // Core module: Inventory
      { id: 'perm-inv-create', module: 'Inventory', resource: 'product', action: 'create', slug: 'inventory.product.create', description: 'Create and update core products and variants' },
      { id: 'perm-inv-adjust', module: 'Inventory', resource: 'stock', action: 'adjust', slug: 'inventory.stock.adjust', description: 'Authorize stock level additions/deductions' },
      { id: 'perm-inv-transfer', module: 'Inventory', resource: 'stock', action: 'transfer', slug: 'inventory.stock.transfer', description: 'Initiate stock movement between branches' },
      // Core module: Purchasing
      { id: 'perm-pur-create', module: 'Purchasing', resource: 'purchase', action: 'create', slug: 'purchase.create', description: 'Initiate supplier purchase orders' },
      { id: 'perm-pur-manage', module: 'Purchasing', resource: 'supplier', action: 'manage', slug: 'supplier.manage', description: 'Manage supplier ledgers & details' },
      // Core module: Finance
      { id: 'perm-fin-expense', module: 'Finance', resource: 'expense', action: 'manage', slug: 'expense.manage', description: 'Log operational costs and permits' },
      { id: 'perm-fin-payment', module: 'Finance', resource: 'payment', action: 'manage', slug: 'payment.manage', description: 'Record general payments & accounts' },
      { id: 'perm-fin-reports', module: 'Finance', resource: 'financial_reports', action: 'view', slug: 'financial_reports.view', description: 'Access profit/loss and ledger data' },
      // Core module: Reports
      { id: 'perm-rep-view', module: 'Reports', resource: 'reports', action: 'view', slug: 'reports.view', description: 'Access global analytics and forecasts' },
      { id: 'perm-rep-branch', module: 'Reports', resource: 'reports', action: 'branch', slug: 'reports.branch', description: 'Access single-branch localized sales reports' },
      // Core module: Settings & RBAC
      { id: 'perm-set-users', module: 'Access', resource: 'users', action: 'manage', slug: 'users.manage', description: 'Invite, suspend, and configure system users' },
      { id: 'perm-set-roles', module: 'Access', resource: 'roles', action: 'manage', slug: 'roles.manage', description: 'Build and customize tenant role capability maps' },
      { id: 'perm-set-branches', module: 'Access', resource: 'branches', action: 'manage', slug: 'branches.manage', description: 'Add and configure business locations' },
      { id: 'perm-set-config', module: 'Access', resource: 'settings', action: 'manage', slug: 'settings.manage', description: 'Modify SaaS configurations and printer routing' },
      // Platform Administrator Scope (Super Admin only)
      { id: 'perm-plat-tenants', module: 'Platform', resource: 'tenant', action: 'manage', slug: 'tenant.manage', description: 'Manage platform business workspaces' },
      { id: 'perm-plat-billing', module: 'Platform', resource: 'billing', action: 'manage', slug: 'billing.manage', description: 'Oversee subscriber invoicing and cycles' },
      { id: 'perm-plat-subs', module: 'Platform', resource: 'subscription', action: 'manage', slug: 'subscription.manage', description: 'Update plan levels and offline grace rules' },
      { id: 'perm-plat-flags', module: 'Platform', resource: 'feature_flag', action: 'manage', slug: 'feature_flag.manage', description: 'Activate system features per subscriber' },
      { id: 'perm-plat-logs', module: 'Platform', resource: 'system', action: 'logs.view', slug: 'system.logs.view', description: 'View system-level logs and diagnostics' },

      // Business Profile Module
      { id: 'perm-bp-view', module: 'BusinessProfile', resource: 'profile', action: 'view', slug: 'business_profile.view', description: 'View business profile details' },
      { id: 'perm-bp-edit', module: 'BusinessProfile', resource: 'profile', action: 'edit', slug: 'business_profile.edit', description: 'Edit business profile details' },
      { id: 'perm-bp-docs', module: 'BusinessProfile', resource: 'profile', action: 'upload_documents', slug: 'business_profile.upload_documents', description: 'Upload compliance documents' },
      { id: 'perm-bp-brand', module: 'BusinessProfile', resource: 'profile', action: 'manage_branding', slug: 'business_profile.manage_branding', description: 'Manage logos and themes' },
      { id: 'perm-bp-tax', module: 'BusinessProfile', resource: 'profile', action: 'configure_taxes', slug: 'business_profile.configure_taxes', description: 'Configure tax percentages and rules' },
      { id: 'perm-bp-bank', module: 'BusinessProfile', resource: 'profile', action: 'configure_banking', slug: 'business_profile.configure_banking', description: 'Configure bank and mobile money accounts' },
      { id: 'perm-bp-int', module: 'BusinessProfile', resource: 'profile', action: 'configure_integrations', slug: 'business_profile.configure_integrations', description: 'Configure third-party API settings' },
      { id: 'perm-bp-branch', module: 'BusinessProfile', resource: 'profile', action: 'manage_branches', slug: 'business_profile.manage_branches', description: 'Configure branch details' },
      { id: 'perm-bp-audit', module: 'BusinessProfile', resource: 'profile', action: 'view_audit_history', slug: 'business_profile.view_audit_history', description: 'View business configuration changes' },
    ];
    await db.permissions.bulkPut(seedPermissions);

    // 16. Seed Roles (System roles)
    const systemRoles: Role[] = [
      { id: 'role-owner', tenant_id: null, name: 'Tenant Owner', slug: 'tenant_owner', description: 'Full tenant control and licensing access.', is_system_role: true, is_custom: false, created_at: NOW },
      { id: 'role-admin', tenant_id: null, name: 'Business Administrator', slug: 'business_administrator', description: 'Enterprise setting management and reports.', is_system_role: true, is_custom: false, created_at: NOW },
      { id: 'role-manager', tenant_id: null, name: 'Branch Manager', slug: 'branch_manager', description: 'Oversee daily branch activities, stock, and staff.', is_system_role: true, is_custom: false, created_at: NOW },
      { id: 'role-cashier', tenant_id: null, name: 'Cashier', slug: 'cashier', description: 'Log transactions, process invoices, print receipts.', is_system_role: true, is_custom: false, created_at: NOW },
      { id: 'role-inventory', tenant_id: null, name: 'Inventory Officer', slug: 'inventory_officer', description: 'Adjust inventory counts and manage suppliers.', is_system_role: true, is_custom: false, created_at: NOW },
      { id: 'role-accountant', tenant_id: null, name: 'Accountant', slug: 'accountant', description: 'Verify expenses and pull financial reports.', is_system_role: true, is_custom: false, created_at: NOW },
      { id: 'role-auditor', tenant_id: null, name: 'Read Only Auditor', slug: 'read_only_auditor', description: 'Read-only access to profiles, reports, and settings.', is_system_role: true, is_custom: false, created_at: NOW },
    ];
    await db.roles.bulkPut(systemRoles);

    // 17. Seed Role Permissions (Links)
    const seedRolePermissions: RolePermission[] = [
      // Tenant Owner gets all non-platform permissions
      ...seedPermissions
        .filter(p => p.module !== 'Platform')
        .map(p => ({
          id: `rp-owner-${p.id}`,
          role_id: 'role-owner',
          permission_id: p.id
        })),
      // Business Administrator permissions
      { id: 'rp-admin-users', role_id: 'role-admin', permission_id: 'perm-set-users' },
      { id: 'rp-admin-roles', role_id: 'role-admin', permission_id: 'perm-set-roles' },
      { id: 'rp-admin-branches', role_id: 'role-admin', permission_id: 'perm-set-branches' },
      { id: 'rp-admin-config', role_id: 'role-admin', permission_id: 'perm-set-config' },
      { id: 'rp-admin-reports', role_id: 'role-admin', permission_id: 'perm-rep-view' },
      { id: 'rp-admin-bp-view', role_id: 'role-admin', permission_id: 'perm-bp-view' },
      { id: 'rp-admin-bp-edit', role_id: 'role-admin', permission_id: 'perm-bp-edit' },
      { id: 'rp-admin-bp-docs', role_id: 'role-admin', permission_id: 'perm-bp-docs' },
      { id: 'rp-admin-bp-brand', role_id: 'role-admin', permission_id: 'perm-bp-brand' },
      { id: 'rp-admin-bp-tax', role_id: 'role-admin', permission_id: 'perm-bp-tax' },
      { id: 'rp-admin-bp-int', role_id: 'role-admin', permission_id: 'perm-bp-int' },
      { id: 'rp-admin-bp-branch', role_id: 'role-admin', permission_id: 'perm-bp-branch' },
      // Branch Manager permissions
      { id: 'rp-mgr-sales', role_id: 'role-manager', permission_id: 'perm-sales-create' },
      { id: 'rp-mgr-refund', role_id: 'role-manager', permission_id: 'perm-sales-refund' },
      { id: 'rp-mgr-void', role_id: 'role-manager', permission_id: 'perm-sales-void' },
      { id: 'rp-mgr-inv', role_id: 'role-manager', permission_id: 'perm-inv-create' },
      { id: 'rp-mgr-adjust', role_id: 'role-manager', permission_id: 'perm-inv-adjust' },
      { id: 'rp-mgr-pur', role_id: 'role-manager', permission_id: 'perm-pur-create' },
      { id: 'rp-mgr-rep', role_id: 'role-manager', permission_id: 'perm-rep-branch' },
      { id: 'rp-mgr-bp-view', role_id: 'role-manager', permission_id: 'perm-bp-view' },
      { id: 'rp-mgr-bp-branch', role_id: 'role-manager', permission_id: 'perm-bp-branch' },
      // Cashier permissions
      { id: 'rp-csh-sales', role_id: 'role-cashier', permission_id: 'perm-sales-create' },
      { id: 'rp-csh-pay', role_id: 'role-cashier', permission_id: 'perm-fin-payment' },
      // Inventory Officer permissions
      { id: 'rp-inv-create', role_id: 'role-inventory', permission_id: 'perm-inv-create' },
      { id: 'rp-inv-adjust', role_id: 'role-inventory', permission_id: 'perm-inv-adjust' },
      { id: 'rp-inv-trans', role_id: 'role-inventory', permission_id: 'perm-inv-transfer' },
      { id: 'rp-inv-pur', role_id: 'role-inventory', permission_id: 'perm-pur-create' },
      { id: 'rp-inv-sup', role_id: 'role-inventory', permission_id: 'perm-pur-manage' },
      // Accountant permissions
      { id: 'rp-acc-exp', role_id: 'role-accountant', permission_id: 'perm-fin-expense' },
      { id: 'rp-acc-pay', role_id: 'role-accountant', permission_id: 'perm-fin-payment' },
      { id: 'rp-acc-rep', role_id: 'role-accountant', permission_id: 'perm-fin-reports' },
      { id: 'rp-acc-bp-view', role_id: 'role-accountant', permission_id: 'perm-bp-view' },
      { id: 'rp-acc-bp-tax', role_id: 'role-accountant', permission_id: 'perm-bp-tax' },
      { id: 'rp-acc-bp-bank', role_id: 'role-accountant', permission_id: 'perm-bp-bank' },
      // Read Only Auditor permissions
      { id: 'rp-aud-bp-view', role_id: 'role-auditor', permission_id: 'perm-bp-view' },
      { id: 'rp-aud-rep-view', role_id: 'role-auditor', permission_id: 'perm-rep-view' },
      { id: 'rp-aud-fin-rep', role_id: 'role-auditor', permission_id: 'perm-fin-reports' },
    ];
    await db.rolePermissions.bulkPut(seedRolePermissions);

    // 18. Seed Tenant Users (Tenant Membership links)
    const seedTenantUsers: TenantUser[] = [
      { id: 'tu-owner', tenant_id: 'tenant-101', user_id: 'usr-owner', employee_code: 'EMP-001', job_title: 'Chief Owner', department: 'Executive', status: 'Active', joined_at: NOW - 120 * DAY },
      { id: 'tu-cashier', tenant_id: 'tenant-101', user_id: 'usr-cashier', employee_code: 'EMP-002', job_title: 'Senior POS Cashier', department: 'POS Counter', status: 'Active', joined_at: NOW - 60 * DAY },
      { id: 'tu-grace', tenant_id: 'tenant-102', user_id: 'usr-grace', employee_code: 'EMP-003', job_title: 'Arusha Pharmacist Owner', department: 'Management', status: 'Active', joined_at: NOW - 90 * DAY }
    ];
    await db.tenantUsers.bulkPut(seedTenantUsers);

    // 19. Seed Employee details
    const seedEmployees: Employee[] = [
      { id: 'emp-owner', tenant_id: 'tenant-101', user_id: 'usr-owner', employee_number: 'EMP-001', employment_date: NOW - 120 * DAY, salary_type: 'Monthly', notes: 'Founder & Owner.' },
      { id: 'emp-cashier', tenant_id: 'tenant-101', user_id: 'usr-cashier', employee_number: 'EMP-002', employment_date: NOW - 60 * DAY, salary_type: 'Hourly', notes: 'Daily cashier shifts.' },
      { id: 'emp-grace', tenant_id: 'tenant-102', user_id: 'usr-grace', employee_number: 'EMP-003', employment_date: NOW - 90 * DAY, salary_type: 'Monthly', notes: 'Store owner pharmacist.' }
    ];
    await db.employees.bulkPut(seedEmployees);

    // 20. Seed User Security Credentials (PIN hashes for offline POS check)
    // We store standard plain PIN strings as mock hashes: "1234", "5555", "9999", "0000"
    const seedUserSecurity: UserSecurity[] = [
      { user_id: 'usr-owner', pin_hash: '1234', failed_attempts: 0, two_factor_enabled: false },
      { user_id: 'usr-cashier', pin_hash: '5555', failed_attempts: 0, two_factor_enabled: false },
      { user_id: 'usr-grace', pin_hash: '9999', failed_attempts: 0, two_factor_enabled: false },
      { user_id: 'usr-superadmin', pin_hash: '0000', failed_attempts: 0, two_factor_enabled: false }
    ];
    await db.userSecurity.bulkPut(seedUserSecurity);

    // 21. Seed Tenant User Branch Allocations
    const seedTenantUserBranches: TenantUserBranch[] = [
      { id: 'tub-1', tenant_id: 'tenant-101', user_id: 'usr-owner', branch_id: 'branch-dar-hq', role_id: 'role-owner', is_primary: true, assigned_at: NOW - 120 * DAY },
      { id: 'tub-2', tenant_id: 'tenant-101', user_id: 'usr-owner', branch_id: 'branch-arusha-depot', role_id: 'role-manager', is_primary: false, assigned_at: NOW - 90 * DAY },
      { id: 'tub-3', tenant_id: 'tenant-101', user_id: 'usr-cashier', branch_id: 'branch-dar-hq', role_id: 'role-cashier', is_primary: true, assigned_at: NOW - 60 * DAY },
      { id: 'tub-4', tenant_id: 'tenant-102', user_id: 'usr-grace', branch_id: 'branch-pharm-main', role_id: 'role-owner', is_primary: true, assigned_at: NOW - 90 * DAY }
    ];
    await db.tenantUserBranches.bulkPut(seedTenantUserBranches);

    // 22. Seed Security Audit Logs
    const seedSecurityAuditLogs: SecurityAuditLog[] = [
      { id: 'sal-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', user_id: 'usr-owner', action: 'user.login.success', ip_address: '197.250.4.15', device_info: 'Chrome / Windows POS Terminal', app_version: 'v1.4.2', created_at: NOW - 1 * DAY },
      { id: 'sal-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', user_id: 'usr-cashier', action: 'user.login.success', ip_address: '197.250.4.16', device_info: 'Safari / iPad Mini', app_version: 'v1.4.2', created_at: NOW - 12 * 60 * 60 * 1000 },
      { id: 'sal-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', user_id: 'usr-owner', action: 'role.created', ip_address: '197.250.4.15', payload: { role_name: 'Restaurant Supervisor' }, created_at: NOW - 6 * 60 * 60 * 1000 }
    ];
    await db.securityAuditLogs.bulkPut(seedSecurityAuditLogs);

    // 23. Seed Bar Tables
    const seedBarTables: TableEntity[] = [
      { id: 'bt-1', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'Main Area', name: 'Table 1', capacity: 4, status: 'AVAILABLE' },
      { id: 'bt-2', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'Main Area', name: 'Table 2', capacity: 4, status: 'AVAILABLE' },
      { id: 'bt-3', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'Main Area', name: 'Table 3', capacity: 6, status: 'AVAILABLE' },
      { id: 'bt-4', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'Bar Counter', name: 'Counter 1', capacity: 1, status: 'AVAILABLE' },
      { id: 'bt-5', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'Bar Counter', name: 'Counter 2', capacity: 1, status: 'AVAILABLE' },
      { id: 'bt-6', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'VIP Lounge', name: 'VIP Table 1', capacity: 8, status: 'AVAILABLE' },
      { id: 'bt-7', tenant_id: 'tenant-106', branch_id: 'branch-bongo-main', zone_id: 'VIP Lounge', name: 'VIP Table 2', capacity: 10, status: 'AVAILABLE' }
    ];
    await db.barTables.bulkPut(seedBarTables);

    // 24. Seed Expenses (spread over the past 6 months in Tanzania Shillings)
    const expensesCount = await db.expenses.count();
    if (expensesCount === 0) {
      const seedExpenses: Expense[] = [
        // Jan
        { id: 'exp-jan-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 180 * DAY).toISOString().split('T')[0], created_at: NOW - 180 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - Jan', paymentMethod: 'Bank' },
        { id: 'exp-jan-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 240000, status: 'Paid', date: new Date(NOW - 175 * DAY).toISOString().split('T')[0], created_at: NOW - 175 * DAY, created_by: 'usr-owner', description: 'Tanesco electricity tokens', paymentMethod: 'M-Pesa' },
        { id: 'exp-jan-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Salaries', amount: 800000, status: 'Paid', date: new Date(NOW - 170 * DAY).toISOString().split('T')[0], created_at: NOW - 170 * DAY, created_by: 'usr-owner', description: 'Jan staff salaries payout', paymentMethod: 'Bank' },
        
        // Feb
        { id: 'exp-feb-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 150 * DAY).toISOString().split('T')[0], created_at: NOW - 150 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - Feb', paymentMethod: 'Bank' },
        { id: 'exp-feb-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 260000, status: 'Paid', date: new Date(NOW - 145 * DAY).toISOString().split('T')[0], created_at: NOW - 145 * DAY, created_by: 'usr-owner', description: 'Electricity and Dawasco water bills', paymentMethod: 'M-Pesa' },
        { id: 'exp-feb-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Salaries', amount: 800000, status: 'Paid', date: new Date(NOW - 140 * DAY).toISOString().split('T')[0], created_at: NOW - 140 * DAY, created_by: 'usr-owner', description: 'Feb staff salaries payout', paymentMethod: 'Bank' },
        
        // Mar
        { id: 'exp-mar-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 120 * DAY).toISOString().split('T')[0], created_at: NOW - 120 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - Mar', paymentMethod: 'Bank' },
        { id: 'exp-mar-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 230000, status: 'Paid', date: new Date(NOW - 115 * DAY).toISOString().split('T')[0], created_at: NOW - 115 * DAY, created_by: 'usr-owner', description: 'Internet fiber subscription and electricity', paymentMethod: 'Cash' },
        { id: 'exp-mar-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Salaries', amount: 800000, status: 'Paid', date: new Date(NOW - 110 * DAY).toISOString().split('T')[0], created_at: NOW - 110 * DAY, created_by: 'usr-owner', description: 'Mar staff salaries payout', paymentMethod: 'Bank' },
        
        // Apr
        { id: 'exp-apr-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 90 * DAY).toISOString().split('T')[0], created_at: NOW - 90 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - Apr', paymentMethod: 'Bank' },
        { id: 'exp-apr-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 280000, status: 'Paid', date: new Date(NOW - 85 * DAY).toISOString().split('T')[0], created_at: NOW - 85 * DAY, created_by: 'usr-owner', description: 'Tanesco electricity tokens', paymentMethod: 'M-Pesa' },
        { id: 'exp-apr-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Salaries', amount: 850000, status: 'Paid', date: new Date(NOW - 80 * DAY).toISOString().split('T')[0], created_at: NOW - 80 * DAY, created_by: 'usr-owner', description: 'Apr staff salaries payout', paymentMethod: 'Bank' },

        // May
        { id: 'exp-may-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 60 * DAY).toISOString().split('T')[0], created_at: NOW - 60 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - May', paymentMethod: 'Bank' },
        { id: 'exp-may-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 270000, status: 'Paid', date: new Date(NOW - 55 * DAY).toISOString().split('T')[0], created_at: NOW - 55 * DAY, created_by: 'usr-owner', description: 'Utilities & Halotel office internet bundle', paymentMethod: 'M-Pesa' },
        { id: 'exp-may-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Salaries', amount: 850000, status: 'Paid', date: new Date(NOW - 50 * DAY).toISOString().split('T')[0], created_at: NOW - 50 * DAY, created_by: 'usr-owner', description: 'May staff salaries payout', paymentMethod: 'Bank' },

        // Jun
        { id: 'exp-jun-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 30 * DAY).toISOString().split('T')[0], created_at: NOW - 30 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - Jun', paymentMethod: 'Bank' },
        { id: 'exp-jun-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 290000, status: 'Paid', date: new Date(NOW - 25 * DAY).toISOString().split('T')[0], created_at: NOW - 25 * DAY, created_by: 'usr-owner', description: 'Dawasco water bill & office refreshments', paymentMethod: 'M-Pesa' },
        { id: 'exp-jun-3', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Salaries', amount: 850000, status: 'Paid', date: new Date(NOW - 20 * DAY).toISOString().split('T')[0], created_at: NOW - 20 * DAY, created_by: 'usr-owner', description: 'Jun staff salaries payout', paymentMethod: 'Bank' },
        { id: 'exp-jun-4', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Other', amount: 350000, status: 'Paid', date: new Date(NOW - 15 * DAY).toISOString().split('T')[0], created_at: NOW - 15 * DAY, created_by: 'usr-owner', description: 'Office air conditioner maintenance', paymentMethod: 'Cash' },

        // Jul
        { id: 'exp-jul-1', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Rent', amount: 1500000, status: 'Paid', date: new Date(NOW - 5 * DAY).toISOString().split('T')[0], created_at: NOW - 5 * DAY, created_by: 'usr-owner', description: 'Dar headquarters office rent - Jul', paymentMethod: 'Bank' },
        { id: 'exp-jul-2', tenant_id: 'tenant-101', branch_id: 'branch-dar-hq', category: 'Utilities', amount: 320000, status: 'Paid', date: new Date(NOW - 4 * DAY).toISOString().split('T')[0], created_at: NOW - 4 * DAY, created_by: 'usr-owner', description: 'Tanesco electricity tokens - Jul', paymentMethod: 'M-Pesa' },
      ];
      await db.expenses.bulkPut(seedExpenses);
    }

    // 25. Seed Default Business Profiles
    const bpCount = await db.businessProfiles.count();
    if (bpCount === 0) {
      const seedProfiles: BusinessProfile[] = [
        {
          id: 'bp-101',
          tenantId: 'tenant-101',
          businessName: 'Acme Conglomerate Ltd',
          tradingName: 'Acme Retail & Diners',
          registrationNumber: 'BRELA-1203984',
          tin: '123456789',
          vatNumber: 'VRN-998877A',
          industry: 'Retail',
          businessType: 'Limited Company',
          description: 'A multi-branch retail and restaurant conglomerate in East Africa.',
          logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop&q=80',
          coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=200&fit=crop&q=80',
          phone: '+255 22 211 0000',
          email: 'hq@acme.co.tz',
          website: 'https://www.acme.co.tz',
          country: 'Tanzania',
          region: 'Dar es Salaam',
          district: 'Ilala',
          ward: 'Kivukoni',
          street: 'Posta Street, building 14',
          postalAddress: 'P.O. Box 9991, Dar es Salaam',
          latitude: -6.8163,
          longitude: 39.2903,
          currency: 'TZS',
          timezone: 'Africa/Dar_es_Salaam',
          language: 'en',
          dateFormat: 'DD/MM/YYYY',
          receiptHeader: 'ACME CONGLOMERATE LTD\nDar es Salaam HQ Branch\nTIN: 123-456-789\nTel: +255 22 211 0000',
          receiptFooter: 'Thank you for shopping at Acme!\nGoods once sold are not returnable.\nPowered by DukaPos POS',
          defaultWarehouseId: 'wh-main',
          taxEnabled: true,
          vatRate: 18,
          openingTime: '08:00',
          closingTime: '22:00',
          ownerId: 'usr-owner',
          subscriptionId: 'sub-tenant-101',
          status: 'Active',
          createdAt: NOW - 120 * DAY,
          updatedAt: NOW - 5 * DAY,
          deletedAt: null,
          
          ownerName: 'Juma Ally',
          ownerNationalId: '19900215-11102-00001-22',
          ownerMobileNumber: '+255 754 111 222',
          ownerEmail: 'juma.ally@acme.co.tz',
          ownerPosition: 'Managing Director',
          
          themeColor: '#4f46e5',
          secondaryColor: '#06b6d4',
          bankName: 'CRDB Bank Plc',
          bankAccountName: 'ACME CONGLOMERATE LTD',
          bankAccountNumber: '0150243984900',
          bankSwiftCode: 'CRDBTZTZ',
          bankBranchName: 'Holland Branch',
          
          mpesaMerchantCode: '500122',
          airtelMerchantCode: '778899',
          tigoMerchantCode: '112233',
          
          compliancePrivacyPolicy: 'Standard Acme GDPR & Privacy Policy.',
          complianceTerms: 'Customer terms and payment rules.',
          
          integrationPrinter: 'thermal-usb',
          integrationBarcodeScanner: 'generic-usb',
          
          aiPrimaryIndustry: 'Retail',
          aiBusinessSize: 'Medium',
          aiEmployeesCount: 15,
          aiBranchesCount: 2,
          aiDailySales: 450000,
          aiPeakHours: '16:00 - 20:00'
        },
        {
          id: 'bp-102',
          tenantId: 'tenant-102',
          businessName: 'Arusha Chemist & Pharmacy',
          tradingName: 'Arusha Chemist',
          registrationNumber: 'PHARM-998812',
          tin: '987654321',
          vatNumber: 'VRN-112233B',
          industry: 'Pharmacy',
          businessType: 'Sole Proprietorship',
          description: 'Trusted retail pharmacy providing prescription medicines and health services.',
          logoUrl: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=100&h=100&fit=crop&q=80',
          coverImage: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=800&h=200&fit=crop&q=80',
          phone: '+255 784 999 888',
          email: 'info@arushachemist.com',
          website: 'https://www.arushachemist.com',
          country: 'Tanzania',
          region: 'Arusha',
          district: 'Arusha City',
          ward: 'Sombetini',
          street: 'Sombetini Road',
          postalAddress: 'P.O. Box 444, Arusha',
          latitude: -3.3731,
          longitude: 36.6853,
          currency: 'TZS',
          timezone: 'Africa/Dar_es_Salaam',
          language: 'sw',
          dateFormat: 'DD/MM/YYYY',
          receiptHeader: 'ARUSHA CHEMIST & PHARMACY\nArusha Main Branch\nTIN: 987-654-321\nTel: +255 784 999 888',
          receiptFooter: 'Keep healthy, thank you for visiting!\nNo returns on medication.\nPowered by DukaPos',
          defaultWarehouseId: 'wh-pharm',
          taxEnabled: false,
          vatRate: 0,
          openingTime: '07:30',
          closingTime: '20:30',
          ownerId: 'usr-grace',
          subscriptionId: 'sub-tenant-102',
          status: 'Active',
          createdAt: NOW - 90 * DAY,
          updatedAt: NOW - 10 * DAY,
          deletedAt: null,
          
          ownerName: 'Grace Munisi',
          ownerNationalId: '19870512-21104-00002-33',
          ownerMobileNumber: '+255 784 999 888',
          ownerEmail: 'grace@arushachemist.com',
          ownerPosition: 'Chief Pharmacist / Owner',
          
          themeColor: '#10b981',
          secondaryColor: '#3b82f6',
          bankName: 'NMB Bank Plc',
          bankAccountName: 'ARUSHA CHEMIST & PHARMACY',
          bankAccountNumber: '2019847290199',
          bankSwiftCode: 'NMBZTZTZ',
          bankBranchName: 'Clock Tower Branch',
          
          mpesaMerchantCode: '889900',
          
          licensePharmacy: 'TFDA-ARU-9922',
          licensePharmacyExpiry: NOW + 180 * DAY,
          
          aiPrimaryIndustry: 'Pharmacy',
          aiBusinessSize: 'Small',
          aiEmployeesCount: 3,
          aiBranchesCount: 1,
          aiDailySales: 180000,
          aiPeakHours: '10:00 - 13:00'
        }
      ];
      await db.businessProfiles.bulkPut(seedProfiles);
    }

    // ── Seed Backups, Notifications & Security Incidents ────────────────────
    const backupsCount = await db.backups.count();
    if (backupsCount === 0) {
      await db.backups.bulkPut([
        { id: 'bkp-001', tenant_id: 'tenant-101', type: 'DAILY',   status: 'COMPLETED', size_mb: 1240, encrypted: true, checksum: 'sha256:a3f2b1c8d4e9f0a1b2c3d4e5f6a7b8c9', created_at: NOW - 1 * DAY,  created_by: 'system-scheduler' },
        { id: 'bkp-002', tenant_id: 'tenant-102', type: 'DAILY',   status: 'COMPLETED', size_mb:  380, encrypted: true, checksum: 'sha256:b4e3c2d1f0a9b8c7d6e5f4a3b2c1d0e9', created_at: NOW - 1 * DAY,  created_by: 'system-scheduler' },
        { id: 'bkp-003', tenant_id: 'tenant-101', type: 'WEEKLY',  status: 'COMPLETED', size_mb: 8600, encrypted: true, checksum: 'sha256:c5f4d3e2a1b0c9d8e7f6a5b4c3d2e1f0', created_at: NOW - 7 * DAY,  created_by: 'system-scheduler' },
        { id: 'bkp-004', tenant_id: 'tenant-103', type: 'DAILY',   status: 'FAILED',    size_mb:    0, encrypted: false, checksum: 'sha256:error-checksum-00000000000000', created_at: NOW - 2 * DAY,  created_by: 'system-scheduler' },
        { id: 'bkp-005', tenant_id: 'tenant-106', type: 'HOURLY',  status: 'COMPLETED', size_mb:  215, encrypted: true, checksum: 'sha256:d6a5b4c3e2f1a0b9c8d7e6f5a4b3c2d1', created_at: NOW - 2 * 3600 * 1000, created_by: 'system-scheduler' },
        { id: 'bkp-006', tenant_id: 'tenant-101', type: 'MONTHLY', status: 'COMPLETED', size_mb: 31000, encrypted: true, checksum: 'sha256:e7b6c5d4f3a2b1c0d9e8f7a6b5c4d3e2', created_at: NOW - 30 * DAY, created_by: 'system-scheduler' },
        { id: 'bkp-007', tenant_id: 'tenant-104', type: 'MANUAL',  status: 'COMPLETED', size_mb:  560, encrypted: true, checksum: 'sha256:f8c7d6e5a4b3c2d1e0f9a8b7c6d5e4f3', created_at: NOW - 3 * DAY,  created_by: 'usr-superadmin' },
        { id: 'bkp-008', tenant_id: 'tenant-102', type: 'WEEKLY',  status: 'COMPLETED', size_mb: 2800, encrypted: true, checksum: 'sha256:a9d8e7f6b5c4d3e2f1a0b9c8d7e6f5a4', created_at: NOW - 7 * DAY,  created_by: 'system-scheduler' },
        { id: 'bkp-009', tenant_id: 'tenant-105', type: 'DAILY',   status: 'COMPLETED', size_mb:   92, encrypted: true, checksum: 'sha256:b0e9f8a7c6d5e4f3a2b1c0d9e8f7a6b5', created_at: NOW - 1 * DAY,  created_by: 'system-scheduler' },
        { id: 'bkp-010', tenant_id: 'tenant-101', type: 'DAILY',   status: 'COMPLETED', size_mb: 1290, encrypted: true, checksum: 'sha256:c1f0a9b8d7e6f5a4b3c2d1e0f9a8b7c6', created_at: NOW - 2 * DAY,  created_by: 'system-scheduler' },
      ]);

      await db.notifications.bulkPut([
        {
          id: 'notif-001', tenant_id: null, channel: 'EMAIL', subject: 'Platform Maintenance Scheduled — July 28, 2026',
          message: 'DukaPos SaaS will undergo a planned maintenance window from 02:00 – 04:00 EAT on July 28. All services will be temporarily unavailable. Please plan accordingly.',
          target_scope: 'ALL', status: 'SENT', sent_at: NOW - 3 * DAY
        },
        {
          id: 'notif-002', tenant_id: null, channel: 'SMS', subject: 'Payment Reminder: Invoice DKP-2026-000212',
          message: 'Your DukaPos subscription invoice of Tsh. 69,600 is due in 15 days. Pay via M-PESA to 150150.',
          target_scope: 'SINGLE', target_filter: 'tenant-101', status: 'SENT', sent_at: NOW - 1 * DAY
        },
        {
          id: 'notif-003', tenant_id: null, channel: 'IN_APP', subject: 'New Feature: AI Churn Prediction Dashboard Live',
          message: 'Enterprise tenants now have access to the AI-powered churn prediction engine under Super Admin > AI Operations.',
          target_scope: 'PLAN', target_filter: 'Enterprise', status: 'SENT', sent_at: NOW - 5 * DAY
        },
        {
          id: 'notif-004', tenant_id: null, channel: 'WHATSAPP', subject: 'Upgrade Offer: Move to Enterprise — 30% Off',
          message: 'You are approaching your user seat limit. Upgrade to Enterprise this month and get 30% off the first 3 months. Reply YES to claim.',
          target_scope: 'PLAN', target_filter: 'Professional', status: 'SENT', sent_at: NOW - 7 * DAY
        },
        {
          id: 'notif-005', tenant_id: null, channel: 'EMAIL', subject: 'Security Alert: Multiple Failed Login Attempts Detected',
          message: 'We detected 5 failed login attempts on tenant Dodoma Plaza Retailers. The account has been temporarily locked. Review Security Center for full details.',
          target_scope: 'SINGLE', target_filter: 'tenant-103', status: 'SENT', sent_at: NOW - 12 * 3600 * 1000
        },
        {
          id: 'notif-006', tenant_id: null, channel: 'PUSH', subject: 'Database Backup Completed — All Tenants',
          message: 'Nightly automated encrypted backups for all 6 active tenants have completed successfully. Zero failures recorded.',
          target_scope: 'ALL', status: 'SENT', sent_at: NOW - 8 * 3600 * 1000
        },
      ]);

      await db.securityIncidents.bulkPut([
        { id: 'si-001', tenant_id: 'tenant-103', type: 'FAILED_LOGIN',          severity: 'HIGH',     status: 'OPEN',          details: '5 consecutive failed login attempts from IP 196.13.47.23 within 3 minutes. Account temporarily locked.', ip_address: '196.13.47.23',  user_agent: 'Mozilla/5.0 (Android)', created_at: NOW - 12 * 3600 * 1000 },
        { id: 'si-002', tenant_id: 'tenant-101', type: 'SUSPICIOUS_LOCATION',   severity: 'MEDIUM',   status: 'INVESTIGATING', details: 'Login detected from London, UK (IP 82.132.45.100). Tenant is registered in Dar es Salaam, Tanzania.', ip_address: '82.132.45.100',  user_agent: 'Chrome/126 Safari/537.36', created_at: NOW - 2 * DAY },
        { id: 'si-003', tenant_id: 'tenant-102', type: 'CONCURRENT_SESSIONS',   severity: 'MEDIUM',   status: 'RESOLVED',      details: 'User usr-grace opened 3 simultaneous sessions from different devices. Session limit = 2.',            ip_address: '41.73.45.101',   user_agent: 'Firefox/127', created_at: NOW - 5 * DAY },
        { id: 'si-004', tenant_id: 'tenant-106', type: 'API_ABUSE',             severity: 'CRITICAL', status: 'OPEN',          details: 'API key dk_live_1z2x3c4v5b6n7m8a9s0d1 made 1,240 requests in 60 seconds. Rate limit exceeded 12x.',  ip_address: '154.72.190.55',  user_agent: 'Python-urllib/3.12', created_at: NOW - 6 * 3600 * 1000 },
        { id: 'si-005', tenant_id: 'tenant-104', type: 'TOKEN_ABUSE',           severity: 'HIGH',     status: 'DISMISSED',     details: 'Refresh token reuse detected. Same token presented from 2 geographically different IPs within 30 seconds.', ip_address: '197.250.4.99', user_agent: 'OkHttp/4.12', created_at: NOW - 3 * DAY },
        { id: 'si-006', tenant_id: 'tenant-101', type: 'RATE_LIMIT',            severity: 'LOW',      status: 'RESOLVED',      details: 'Bulk product import script exceeded 200 API calls/min for 5 minutes. Throttled automatically.',       ip_address: '197.250.4.15',  user_agent: 'DukaPos-Import-Script/v2.4', created_at: NOW - 8 * DAY },
        { id: 'si-007', tenant_id: 'tenant-105', type: 'LOCKED_ACCOUNT',        severity: 'MEDIUM',   status: 'OPEN',          details: 'Account usr-ephraim locked after 10 PIN failures on mobile POS app. Manual unlock required.',           ip_address: '154.67.29.210', user_agent: 'DukaPos-Mobile/v3.1 Android', created_at: NOW - 1 * DAY },
      ]);

      console.log('[DukaPos] Control Plane seed data applied (backups, notifications, security incidents).');
    }
    // ────────────────────────────────────────────────────────────────────────

  } catch (error) {
    console.error('Database seeding error: ', error);
  } finally {
    isSeedingInProgress = false;
  }
}

export async function clearDatabaseAndForceReseed() {
  await db.products.clear();
  await db.productVariants.clear();
  await db.customers.clear();
  await db.orders.clear();
  await db.tenants.clear();
  await db.businessProfiles.clear();
  await db.branches.clear();
  await db.industries.clear();
  await db.tenantIndustries.clear();
  await db.users.clear();
  await db.userBranchRoles.clear();
  await db.stockLedger.clear();
  await db.stockBalance.clear();
  await db.subscriptionPlans.clear();
  await db.tenantSubscriptions.clear();
  await db.invoices.clear();
  await db.payments.clear();
  await db.subscriptionEvents.clear();
  await db.features.clear();
  await db.planFeatures.clear();
  await db.subscriptionUsage.clear();
  await db.coupons.clear();
  
  // Clear new tables:
  await db.tenantUsers.clear();
  await db.employees.clear();
  await db.roles.clear();
  await db.permissions.clear();
  await db.rolePermissions.clear();
  await db.tenantUserBranches.clear();
  await db.userSecurity.clear();
  await db.securityAuditLogs.clear();

  // Clear Version 14 tables:
  await db.units.clear();
  await db.productUnits.clear();
  await db.recipes.clear();
  await db.recipeItems.clear();
  await db.wastageLogs.clear();
  await db.tabs.clear();
  await db.barTables.clear();
  await db.pricingRules.clear();
  await db.tips.clear();
  await db.resetCommands.clear();
  await db.expenses.clear();

  // Reset seeding lock and force a fresh seed
  isSeedingInProgress = false;
  await seedDatabase();
}

export async function recordStockMovement(entryInput: Omit<StockLedgerEntry, 'id' | 'created_at' | 'synced' | 'quantity_before' | 'quantity_after'> & { created_at?: number }): Promise<StockLedgerEntry> {
  const id = `sl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const created_at = entryInput.created_at || Date.now();
  const synced = false;

  const variantKey = entryInput.variant_id || 'no-variant';
  
  // 1. Fetch current balance cache
  const cacheKey = [entryInput.branch_id, entryInput.product_id, variantKey];
  let balance = await db.stockBalance.where('[branch_id+product_id+variant_id]').equals(cacheKey).first();

  const quantity_before = balance ? balance.current_quantity : 0;
  const quantity_after = quantity_before + entryInput.quantity_change;

  // 2. Cost calculations
  let average_cost = balance ? balance.average_cost : 0;
  const isIncoming = entryInput.quantity_change > 0;
  if (isIncoming) {
    const oldTotalCost = quantity_before * average_cost;
    const newTotalCost = entryInput.quantity_change * entryInput.unit_cost;
    const totalQty = quantity_after;
    if (totalQty > 0) {
      average_cost = (oldTotalCost + newTotalCost) / totalQty;
    } else {
      average_cost = entryInput.unit_cost;
    }
  }
  
  const stock_value = quantity_after * average_cost;

  // 3. Save Ledger Entry
  const ledgerEntry: StockLedgerEntry = {
    ...entryInput,
    id,
    quantity_before,
    quantity_after,
    created_at,
    synced
  };

  await db.stockLedger.put(ledgerEntry);

  // 4. Update Balance Cache
  const updatedBalance: ProductBranchStock = {
    id: balance ? balance.id : `sb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: entryInput.tenant_id,
    branch_id: entryInput.branch_id,
    warehouse_id: entryInput.warehouse_id,
    product_id: entryInput.product_id,
    variant_id: variantKey,
    current_quantity: quantity_after,
    average_cost,
    stock_value,
    updated_at: created_at
  };

  await db.stockBalance.put(updatedBalance);

  // 5. Update Simple Display Stock in Products / ProductVariants tables
  if (entryInput.variant_id) {
    const variant = await db.productVariants.get(entryInput.variant_id);
    if (variant) {
      const updatedVariant = { ...variant, stock: quantity_after, syncStatus: 'PENDING' as const, isSynced: 0 };
      await db.productVariants.put(updatedVariant);
      
      await db.syncQueue.add({
        actionType: 'UPDATE',
        entityName: 'productVariants',
        payload: updatedVariant,
        timestamp: Date.now(),
        status: 'Pending'
      });
      
      await recalculateProductStock(entryInput.product_id);
    }
  } else {
    const product = await db.products.get(entryInput.product_id);
    if (product) {
      const updatedProd = { ...product, stock: quantity_after, syncStatus: 'PENDING' as const };
      await db.products.put(updatedProd);

      const { mapProductToCloud } = await import('../services/productService');
      await db.syncQueue.add({
        actionType: 'UPDATE',
        entityName: 'products',
        payload: mapProductToCloud(updatedProd),
        timestamp: Date.now(),
        status: 'Pending'
      });
    }
  }

  return ledgerEntry;
}

export async function recalculateStockFromLedger(productId: string, branchId: string) {
  const movements = await db.stockLedger
    .where('product_id')
    .equals(productId)
    .toArray();
    
  const branchMovements = movements
    .filter(m => m.branch_id === branchId)
    .sort((a, b) => a.created_at - b.created_at);

  const balancesToDelete = await db.stockBalance
    .where('product_id')
    .equals(productId)
    .toArray();
  for (const b of balancesToDelete) {
    if (b.branch_id === branchId) {
      await db.stockBalance.delete(b.id);
    }
  }

  const movementsByVariant: Record<string, StockLedgerEntry[]> = {};
  for (const m of branchMovements) {
    const key = m.variant_id || 'no-variant';
    if (!movementsByVariant[key]) movementsByVariant[key] = [];
    movementsByVariant[key].push(m);
  }

  for (const [vKey, mList] of Object.entries(movementsByVariant)) {
    let current_qty = 0;
    let avg_cost = 0;

    for (const m of mList) {
      const q_before = current_qty;
      const q_after = current_qty + m.quantity_change;

      if (m.quantity_change > 0) {
        const oldCost = q_before * avg_cost;
        const newCost = m.quantity_change * m.unit_cost;
        if (q_after > 0) {
          avg_cost = (oldCost + newCost) / q_after;
        } else {
          avg_cost = m.unit_cost;
        }
      }

      current_qty = q_after;

      await db.stockLedger.update(m.id, {
        quantity_before: q_before,
        quantity_after: q_after
      });
    }

    const vId = vKey === 'no-variant' ? undefined : vKey;
    const cache: ProductBranchStock = {
      id: `sb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: mList[0].tenant_id,
      branch_id: branchId,
      warehouse_id: mList[0].warehouse_id,
      product_id: productId,
      variant_id: vKey,
      current_quantity: current_qty,
      average_cost: avg_cost,
      stock_value: current_qty * avg_cost,
      updated_at: Date.now()
    };
    await db.stockBalance.put(cache);

    if (vId) {
      await db.productVariants.update(vId, { stock: current_qty });
    } else {
      await db.products.update(productId, { stock: current_qty });
    }
  }

  const product = await db.products.get(productId);
  if (product && product.hasVariants) {
    await recalculateProductStock(productId);
  }
}
