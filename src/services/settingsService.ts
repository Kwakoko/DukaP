import { db, type AppSetting } from '../db/dexie';
import { supabase } from '../db/supabaseClient';

// ── Strongly Typed Configuration Contracts ───────────────────────────────────

export interface LocalizationConfig {
  currency: 'TZS' | 'USD' | 'KES';
  timezone: string;
  defaultLanguage: 'sw' | 'en';
  dateFormat: string;
  fiscal_year_start: string;
  fiscal_year_end: string;
}

export interface InventoryConfig {
  allowNegativeStock: boolean;
  lowStockThreshold: number;
  enableBatchTracking: boolean;
  enableExpiryTracking: boolean;
  allowBackdatedStock: boolean;
  stockValuationMethod: 'FIFO' | 'AVERAGE' | 'MANUAL';
}

export interface POSConfig {
  requireCustomerBeforeSale: boolean;
  allowDiscount: boolean;
  allowPriceOverride: boolean;
  autoPrintReceipt: boolean;
  holdSales: boolean;
  receiptTemplate: string;
  receiptHeader: string;
  receiptFooter: string;
  barcodePrefix: string;
  printerInterface: string;
  invoiceSeq: number;
  orderSeq: number;
  grnSeq: number;
  paymentSeq: number;
}

export interface TaxConfig {
  defaultTax: string;
  vatEnabled: boolean;
  vatRate: number;
  allowMultipleTaxes: boolean;
}

export interface SecurityConfig {
  authProvider: string;
  authMfaEnabled: boolean;
  pwdMinLength: number;
  pwdRequireSpecial: boolean;
  sessionIdleTimeoutMins: number;
  maxDevices: number;
  allowMultipleSessions: boolean;
  offlineGraceHours: number;
  allowBackdatedSales: boolean;
  allowBackdatedProducts: boolean;
  allowBackdatedInventory: boolean;
}

export interface NotificationsConfig {
  notif_email_template_order: string;
  notif_sms_template_order: string;
  notif_whatsapp_template_order: string;
}

export interface AIConfig {
  ai_assistant_name: string;
  ai_prompt_template_audit: string;
  ai_usage_limit: number;
}

// ── Namespace Defaults ────────────────────────────────────────────────────────

export const DEFAULT_LOCALIZATION_CONFIG: LocalizationConfig = {
  currency: 'TZS',
  timezone: 'Africa/Dar_es_Salaam',
  defaultLanguage: 'en',
  dateFormat: 'YYYY-MM-DD',
  fiscal_year_start: '01-01',
  fiscal_year_end: '12-31',
};

export const DEFAULT_INVENTORY_CONFIG: InventoryConfig = {
  allowNegativeStock: false,
  lowStockThreshold: 10,
  enableBatchTracking: false,
  enableExpiryTracking: false,
  allowBackdatedStock: false,
  stockValuationMethod: 'FIFO',
};

export const DEFAULT_POS_CONFIG: POSConfig = {
  requireCustomerBeforeSale: false,
  allowDiscount: true,
  allowPriceOverride: true,
  autoPrintReceipt: true,
  holdSales: true,
  receiptTemplate: 'standard-thermal',
  receiptHeader: 'DukaPos Retail',
  receiptFooter: 'Thank you for your business!',
  barcodePrefix: '29',
  printerInterface: 'thermal-usb',
  invoiceSeq: 1000,
  orderSeq: 1000,
  grnSeq: 1000,
  paymentSeq: 1000,
};

export const DEFAULT_TAX_CONFIG: TaxConfig = {
  defaultTax: 'VAT',
  vatEnabled: true,
  vatRate: 18,
  allowMultipleTaxes: false,
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  authProvider: 'local',
  authMfaEnabled: false,
  pwdMinLength: 8,
  pwdRequireSpecial: true,
  sessionIdleTimeoutMins: 30,
  maxDevices: 5,
  allowMultipleSessions: true,
  offlineGraceHours: 24,
  allowBackdatedSales: false,
  allowBackdatedProducts: false,
  allowBackdatedInventory: false,
};

export const DEFAULT_NOTIFICATIONS_CONFIG: NotificationsConfig = {
  notif_email_template_order: 'Dear {customer}, your order {order_id} of amount {total} has been confirmed. Thank you!',
  notif_sms_template_order: 'Order {order_id} of Tsh. {total} confirmed. Thank you!',
  notif_whatsapp_template_order: 'Dear {customer}, your order {order_id} is ready.',
};

export const DEFAULT_AI_CONFIG: AIConfig = {
  ai_assistant_name: 'DukaPos AI',
  ai_prompt_template_audit: 'Analyze the sales metrics for signs of leakage...',
  ai_usage_limit: 1000,
};

// Map namespaces to their global defaults
export const GLOBAL_DEFAULTS_REGISTRY: Record<string, any> = {
  LOCALIZATION: DEFAULT_LOCALIZATION_CONFIG,
  INVENTORY: DEFAULT_INVENTORY_CONFIG,
  POS: DEFAULT_POS_CONFIG,
  TAX: DEFAULT_TAX_CONFIG,
  SECURITY: DEFAULT_SECURITY_CONFIG,
  NOTIFICATIONS: DEFAULT_NOTIFICATIONS_CONFIG,
  AI: DEFAULT_AI_CONFIG,
};

// ── Settings Resolver Engine ──────────────────────────────────────────────────

export class SettingsResolver {
  /**
   * Resolves the combined configuration for a given namespace.
   * Priority: User Preference -> Branch Override -> Tenant Override -> Global Default
   */
  static async resolveNamespace<T>(params: {
    tenantId: string;
    branchId?: string;
    userId?: string;
    namespace: string;
    globalDefaults?: T;
  }): Promise<T> {
    const defaults = params.globalDefaults || (GLOBAL_DEFAULTS_REGISTRY[params.namespace] || {}) as T;
    
    // Fetch all overrides in this namespace for the tenant
    const settings = await db.appSettings
      .where('tenantId')
      .equals(params.tenantId)
      .and(s => s.namespace === params.namespace)
      .toArray();

    // Separate overrides by specificity
    const tenantSetting = settings.find(s => !s.branchId && !s.userId);
    const branchSetting = params.branchId ? settings.find(s => s.branchId === params.branchId && !s.userId) : null;
    const userSetting = params.userId ? settings.find(s => s.userId === params.userId) : null;

    return {
      ...defaults,
      ...(tenantSetting?.config || {}),
      ...(branchSetting?.config || {}),
      ...(userSetting?.config || {}),
    } as T;
  }

  /**
   * Validates config properties before updating them.
   */
  static validate(namespace: string, config: Record<string, any>) {
    if (namespace === 'TAX' && typeof config.vatRate === 'number') {
      if (config.vatRate < 0 || config.vatRate > 100) {
        throw new Error('VAT Rate must be between 0 and 100 percent.');
      }
    }
    if (namespace === 'INVENTORY' && typeof config.lowStockThreshold === 'number') {
      if (config.lowStockThreshold < 0) {
        throw new Error('Low Stock Threshold cannot be negative.');
      }
    }
    if (namespace === 'SECURITY') {
      if (typeof config.pwdMinLength === 'number' && config.pwdMinLength < 4) {
        throw new Error('Minimum password length must be at least 4 characters.');
      }
      if (typeof config.maxDevices === 'number' && config.maxDevices <= 0) {
        throw new Error('Max Allowed Devices must be greater than 0.');
      }
      if (typeof config.offlineGraceHours === 'number' && config.offlineGraceHours <= 0) {
        throw new Error('Offline Grace Hours must be greater than 0.');
      }
    }
  }

  /**
   * Saves settings configuration at a specific level (Tenant, Branch, or User).
   * Generates audit logs and version bumps.
   */
  static async saveSetting(params: {
    tenantId: string;
    branchId?: string;
    userId?: string;
    namespace: string;
    config: Record<string, any>;
    userContext: { id: string; name: string; role: string };
  }): Promise<AppSetting> {
    // 1. Enforce RBAC rules
    const isOwner = ['Super Admin', 'Business Owner', 'Tenant Owner'].includes(params.userContext.role);
    const isManager = ['Branch Manager'].includes(params.userContext.role);

    if (!params.branchId && !params.userId && !isOwner) {
      throw new Error('Only Business Owners can modify Tenant level settings.');
    }
    if (params.branchId && !params.userId && !isOwner && !isManager) {
      throw new Error('Only Branch Managers or Owners can modify Branch level settings.');
    }

    // 2. Validate config
    this.validate(params.namespace, params.config);

    // 3. Resolve existing settings
    const query = db.appSettings
      .where('[tenantId+namespace]')
      .equals([params.tenantId, params.namespace]);
    
    const settings = await query.toArray();

    const existing = settings.find(s => 
      s.branchId === (params.branchId || undefined) && 
      s.userId === (params.userId || undefined)
    );

    const beforeConfig = existing ? { ...existing.config } : {};
    const afterConfig = { ...beforeConfig, ...params.config };
    const nextVersion = (existing?.version || 0) + 1;

    const id = existing?.id || `setting-${params.tenantId}-${params.branchId || 'global'}-${params.userId || 'global'}-${params.namespace}`;

    const updatedSetting: AppSetting = {
      id,
      tenantId: params.tenantId,
      branchId: params.branchId || undefined,
      userId: params.userId || undefined,
      namespace: params.namespace,
      config: afterConfig,
      version: nextVersion,
      syncedAt: Date.now()
    };

    // 4. Save setting
    await db.appSettings.put(updatedSetting);

    // Sync settings to remote cloud Database
    try {
      const keys = Object.keys(params.config);
      const inserts = keys.map(key => {
        let legacyKey = key;
        if (params.namespace === 'TAX' && key === 'vatEnabled') legacyKey = 'tax_enabled';
        else if (params.namespace === 'TAX' && key === 'vatRate') legacyKey = 'vat_rate';
        else if (params.namespace === 'INVENTORY' && key === 'lowStockThreshold') legacyKey = 'stock_low_alert_threshold';
        else if (params.namespace === 'INVENTORY' && key === 'stockValuationMethod') legacyKey = 'inventory_valuation_method';
        else if (params.namespace === 'LOCALIZATION' && key === 'defaultLanguage') legacyKey = 'language';
        else if (params.namespace === 'SECURITY') {
          legacyKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        }

        const stringValue = typeof params.config[key] === 'object' ? JSON.stringify(params.config[key]) : String(params.config[key]);

        return {
          id: `ts-${params.tenantId}-${legacyKey}`,
          tenant_id: params.tenantId,
          setting_key: legacyKey,
          setting_value: stringValue
        };
      });

      for (const ins of inserts) {
        await db.tenantSettings.put(ins);
        await supabase.from('tenantSettings').insert(ins);
      }
      console.log(`[Settings Sync] Successfully synced settings override to Cloud for namespace ${params.namespace}`);
    } catch (err) {
      console.warn(`[Settings Sync] Cloud settings sync failed (offline or unreachable):`, err);
    }

    // 5. Generate Audit Log entry
    await db.auditLogs.add({
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: params.tenantId,
      user_id: params.userContext.id,
      user_name: params.userContext.name,
      action: 'UPDATE_SETTING',
      entity: 'settings',
      entity_id: id,
      metadata: {
        namespace: params.namespace,
        scope: params.userId ? 'User' : (params.branchId ? 'Branch' : 'Tenant'),
        scopeId: params.userId || params.branchId || 'global',
        before: beforeConfig,
        after: afterConfig,
      },
      created_at: Date.now()
    });

    return updatedSetting;
  }

  /**
   * Migrates legacy key-value tenant settings from db.tenantSettings into db.appSettings.
   */
  static async migrateFromLegacy(tenantId: string): Promise<void> {
    const migrationCheck = await db.tenantSettings
      .where({ tenant_id: tenantId, setting_key: 'migrated_to_namespaces' })
      .first();

    if (migrationCheck && migrationCheck.setting_value === 'true') {
      return; // Already migrated
    }

    const legacySettings = await db.tenantSettings
      .where('tenant_id')
      .equals(tenantId)
      .toArray();

    if (legacySettings.length === 0) {
      return;
    }

    // Group settings by their new namespaces
    const localization: Record<string, any> = {};
    const inventory: Record<string, any> = {};
    const pos: Record<string, any> = {};
    const tax: Record<string, any> = {};
    const security: Record<string, any> = {};
    const notifications: Record<string, any> = {};
    const ai: Record<string, any> = {};

    legacySettings.forEach(s => {
      const val = s.setting_value;
      switch (s.setting_key) {
        // Localization
        case 'currency': localization.currency = val; break;
        case 'language': localization.defaultLanguage = val; break;
        case 'timezone': localization.timezone = val; break;
        case 'fiscal_year_start': localization.fiscal_year_start = val; break;
        case 'fiscal_year_end': localization.fiscal_year_end = val; break;

        // Tax
        case 'tax_enabled': tax.vatEnabled = (val === 'true' || val === true); break;
        case 'vat_rate': tax.vatRate = Number(val); break;

        // POS
        case 'receipt_header': pos.receiptHeader = val; break;
        case 'receipt_footer': pos.receiptFooter = val; break;
        case 'barcode_prefix': pos.barcodePrefix = val; break;
        case 'printer_interface': pos.printerInterface = val; break;
        case 'invoice_seq': pos.invoiceSeq = Number(val); break;
        case 'order_seq': pos.orderSeq = Number(val); break;
        case 'grn_seq': pos.grnSeq = Number(val); break;
        case 'payment_seq': pos.paymentSeq = Number(val); break;

        // Security
        case 'auth_provider': security.authProvider = val; break;
        case 'auth_mfa_enabled': security.authMfaEnabled = (val === 'true' || val === true); break;
        case 'pwd_min_length': security.pwdMinLength = Number(val); break;
        case 'pwd_require_special': security.pwdRequireSpecial = (val === 'true' || val === true); break;
        case 'session_idle_timeout_mins': security.sessionIdleTimeoutMins = Number(val); break;
        case 'max_devices': security.maxDevices = Number(val); break;
        case 'allow_multiple_sessions': security.allowMultipleSessions = (val === 'true' || val === true); break;
        case 'offline_grace_hours': security.offlineGraceHours = Number(val); break;
        case 'allow_backdated_sales': security.allowBackdatedSales = (val === 'true' || val === true); break;
        case 'allow_backdated_products': security.allowBackdatedProducts = (val === 'true' || val === true); break;
        case 'allow_backdated_inventory': security.allowBackdatedInventory = (val === 'true' || val === true); break;

        // Inventory
        case 'stock_low_alert_threshold': inventory.lowStockThreshold = Number(val); break;
        case 'inventory_valuation_method': inventory.stockValuationMethod = val; break;

        // Notifications
        case 'notif_email_template_order': notifications.notif_email_template_order = val; break;
        case 'notif_sms_template_order': notifications.notif_sms_template_order = val; break;
        case 'notif_whatsapp_template_order': notifications.notif_whatsapp_template_order = val; break;

        // AI
        case 'ai_assistant_name': ai.ai_assistant_name = val; break;
        case 'ai_prompt_template_audit': ai.ai_prompt_template_audit = val; break;
        case 'ai_usage_limit': ai.ai_usage_limit = Number(val); break;
      }
    });

    const namespacesMap = {
      LOCALIZATION: localization,
      INVENTORY: inventory,
      POS: pos,
      TAX: tax,
      SECURITY: security,
      NOTIFICATIONS: notifications,
      AI: ai,
    };

    // Save each grouped namespace
    for (const [ns, config] of Object.entries(namespacesMap)) {
      if (Object.keys(config).length > 0) {
        await db.appSettings.put({
          id: `setting-${tenantId}-global-global-${ns}`,
          tenantId,
          namespace: ns,
          config,
          version: 1,
          syncedAt: Date.now()
        });
      }
    }

    // Seed default settings for any namespaces that had no legacy entries
    for (const ns of Object.keys(GLOBAL_DEFAULTS_REGISTRY)) {
      const existing = await db.appSettings.get(`setting-${tenantId}-global-global-${ns}`);
      if (!existing) {
        await db.appSettings.put({
          id: `setting-${tenantId}-global-global-${ns}`,
          tenantId,
          namespace: ns,
          config: GLOBAL_DEFAULTS_REGISTRY[ns],
          version: 1,
          syncedAt: Date.now()
        });
      }
    }

    // Set migration completion flag
    await db.tenantSettings.put({
      id: `ts-${tenantId}-migrated_to_namespaces`,
      tenant_id: tenantId,
      setting_key: 'migrated_to_namespaces',
      setting_value: 'true'
    });
  }
}
