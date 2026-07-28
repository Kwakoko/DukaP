import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useModule } from '../../context/ModuleContext';
import { db, type TableEntity, type PricingRule, type UserDevice, type UserSession } from '../../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '../UI/custom-ui';
import { 
  Plus, Trash2, Flame, MapPin, Globe, Sliders, User, RotateCcw
} from 'lucide-react';
import { 
  SettingsResolver,
  GLOBAL_DEFAULTS_REGISTRY,
  type InventoryConfig,
  type POSConfig,
  type TaxConfig,
  type SecurityConfig
} from '../../services/settingsService';
import { Subscriptions } from './Subscriptions';
import { BusinessProfile } from './BusinessProfile';

export const Settings: React.FC<{ initialTab?: string }> = () => {
  const { currentTenant, currentBranch, role, branches, user } = useAuth();
  const { activeModule, activeTab: layoutTab } = useModule();

  // Active configurations section resolved from layout sidebar activeTab
  const activeTab = useMemo<'localization' | 'pos' | 'inventory' | 'tax' | 'security' | 'devices' | 'audit' | 'bar' | 'subscriptions'>(() => {
    switch (layoutTab) {
      case 'Business Profile & Identity':
        return 'localization';
      case 'POS Configurations':
        return 'pos';
      case 'Inventory Rules':
        return 'inventory';
      case 'Tax & Billing':
        return 'tax';
      case 'Security Policies':
        return 'security';
      case 'Terminals & Sessions':
        return 'devices';
      case 'Subscriptions & Billing':
        return 'subscriptions';
      case 'Change Log':
        return 'audit';
      case 'Bar Tables & Promo':
        return 'bar';
      default:
        return 'localization';
    }
  }, [layoutTab]);
  const [editingScope, setEditingScope] = useState<'tenant' | 'branch' | 'user'>('tenant');
  const [selectedBranchId, setSelectedBranchId] = useState(currentBranch.id);

  // Table Management States (Happy Hour / Bar)
  const [tableName, setTableName] = useState('');
  const [tableZone, setTableZone] = useState('Main Area');
  const [tableCapacity, setTableCapacity] = useState(4);

  // Happy Hour States
  const [ruleType, setRuleType] = useState('');
  const [ruleDiscount, setRuleDiscount] = useState(20);
  const [ruleStartTime, setRuleStartTime] = useState('17:00');
  const [ruleEndTime, setRuleEndTime] = useState('22:00');

  // Live Queries
  const liveAppSettings = useLiveQuery(() => db.appSettings.toArray()) || [];
  const liveAuditLogs = useLiveQuery(() => db.auditLogs.where('entity').equals('settings').toArray()) || [];
  
  const liveTables = useLiveQuery(() => 
    db.barTables ? db.barTables.where('tenant_id').equals(currentTenant.id).toArray() : Promise.resolve([] as TableEntity[])
  , [currentTenant.id]) || [];

  const liveRules = useLiveQuery(() => 
    db.pricingRules ? db.pricingRules.where('tenant_id').equals(currentTenant.id).toArray() : Promise.resolve([] as PricingRule[])
  , [currentTenant.id]) || [];

  const liveDevices = useLiveQuery(() =>
    db.userDevices ? db.userDevices.where('tenantId').equals(currentTenant.id).toArray() : Promise.resolve([] as UserDevice[])
  , [currentTenant.id]) || [];

  const liveSessions = useLiveQuery(() =>
    db.userSessions ? db.userSessions.where('tenantId').equals(currentTenant.id).toArray() : Promise.resolve([] as UserSession[])
  , [currentTenant.id]) || [];

  // Check permissions for selected scope
  const isSuperOrOwner = ['Super Admin', 'Business Owner', 'Tenant Owner'].includes(role);
  const isBranchManager = ['Branch Manager'].includes(role);
  
  const hasScopePermission = useMemo(() => {
    if (editingScope === 'tenant') return isSuperOrOwner;
    if (editingScope === 'branch') return isSuperOrOwner || isBranchManager;
    return true; // User preference scope
  }, [editingScope, isSuperOrOwner, isBranchManager]);

  const resolvedPOS = useMemo(() => {
    const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === 'POS');
    const tenant = overrides.find(s => !s.branchId && !s.userId)?.config || {};
    const branch = overrides.find(s => s.branchId === selectedBranchId && !s.userId)?.config || {};
    const userPref = overrides.find(s => s.userId === user?.id)?.config || {};
    return { ...GLOBAL_DEFAULTS_REGISTRY.POS, ...tenant, ...branch, ...userPref } as POSConfig;
  }, [liveAppSettings, currentTenant.id, selectedBranchId, user?.id]);

  const resolvedInventory = useMemo(() => {
    const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === 'INVENTORY');
    const tenant = overrides.find(s => !s.branchId && !s.userId)?.config || {};
    const branch = overrides.find(s => s.branchId === selectedBranchId && !s.userId)?.config || {};
    const userPref = overrides.find(s => s.userId === user?.id)?.config || {};
    return { ...GLOBAL_DEFAULTS_REGISTRY.INVENTORY, ...tenant, ...branch, ...userPref } as InventoryConfig;
  }, [liveAppSettings, currentTenant.id, selectedBranchId, user?.id]);

  const resolvedTax = useMemo(() => {
    const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === 'TAX');
    const tenant = overrides.find(s => !s.branchId && !s.userId)?.config || {};
    const branch = overrides.find(s => s.branchId === selectedBranchId && !s.userId)?.config || {};
    const userPref = overrides.find(s => s.userId === user?.id)?.config || {};
    return { ...GLOBAL_DEFAULTS_REGISTRY.TAX, ...tenant, ...branch, ...userPref } as TaxConfig;
  }, [liveAppSettings, currentTenant.id, selectedBranchId, user?.id]);

  const resolvedSecurity = useMemo(() => {
    const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === 'SECURITY');
    const tenant = overrides.find(s => !s.branchId && !s.userId)?.config || {};
    const branch = overrides.find(s => s.branchId === selectedBranchId && !s.userId)?.config || {};
    const userPref = overrides.find(s => s.userId === user?.id)?.config || {};
    return { ...GLOBAL_DEFAULTS_REGISTRY.SECURITY, ...tenant, ...branch, ...userPref } as SecurityConfig;
  }, [liveAppSettings, currentTenant.id, selectedBranchId, user?.id]);

  // Helper to determine which scope defines a specific configuration key
  const getWinningScopeBadge = (namespace: string, key: string) => {
    const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === namespace);
    
    const userVal = overrides.find(s => s.userId === user?.id)?.config?.[key];
    if (userVal !== undefined) return <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 font-bold border-indigo-200/30">User Preferences</Badge>;

    const branchVal = overrides.find(s => s.branchId === selectedBranchId && !s.userId)?.config?.[key];
    if (branchVal !== undefined) return <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 font-bold border-emerald-200/30">Branch Override</Badge>;

    const tenantVal = overrides.find(s => !s.branchId && !s.userId)?.config?.[key];
    if (tenantVal !== undefined) return <Badge variant="outline" className="text-[9px] px-1 py-0 bg-violet-50 dark:bg-violet-950/40 text-violet-500 font-bold border-violet-200/30">Tenant Setting</Badge>;

    return <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-50 dark:bg-slate-900 text-slate-400 font-medium">Global Default</Badge>;
  };

  // Helper to check if a setting key is currently overridden at the active editing scope
  const isOverriddenAtEditingScope = (namespace: string, key: string) => {
    const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === namespace);
    const target = overrides.find(s => 
      s.branchId === (editingScope === 'branch' ? selectedBranchId : undefined) &&
      s.userId === (editingScope === 'user' ? user?.id : undefined)
    );
    return target?.config?.[key] !== undefined;
  };

  // State hooks for form inputs (pre-filled with resolved values)
  const [formPOS, setFormPOS] = useState<POSConfig>({ ...resolvedPOS });
  const [formInventory, setFormInventory] = useState<InventoryConfig>({ ...resolvedInventory });
  const [formTax, setFormTax] = useState<TaxConfig>({ ...resolvedTax });
  const [formSecurity, setFormSecurity] = useState<SecurityConfig>({ ...resolvedSecurity });

  // Sync state hooks when resolved values or selected scope changes

  useEffect(() => {
    setFormPOS({ ...resolvedPOS });
  }, [resolvedPOS, editingScope, selectedBranchId]);

  useEffect(() => {
    setFormInventory({ ...resolvedInventory });
  }, [resolvedInventory, editingScope, selectedBranchId]);

  useEffect(() => {
    setFormTax({ ...resolvedTax });
  }, [resolvedTax, editingScope, selectedBranchId]);

  useEffect(() => {
    setFormSecurity({ ...resolvedSecurity });
  }, [resolvedSecurity, editingScope, selectedBranchId]);

  // Handle saving of configuration changes
  const handleSaveConfig = async (namespace: string, key: string, value: any) => {
    try {
      const configUpdate = { [key]: value };
      const ctx = {
        id: user?.id || 'usr-anon',
        name: user?.name || 'Unknown Operator',
        role: role || 'Cashier'
      };

      await SettingsResolver.saveSetting({
        tenantId: currentTenant.id,
        branchId: editingScope === 'branch' ? selectedBranchId : undefined,
        userId: editingScope === 'user' ? user?.id : undefined,
        namespace,
        config: configUpdate,
        userContext: ctx
      });
    } catch (err: any) {
      alert('Error updating setting: ' + err.message);
    }
  };

  // Helper to remove an override at the active editing scope so it falls back to the parent
  const handleClearOverride = async (namespace: string, key: string) => {
    try {
      const overrides = liveAppSettings.filter(s => s.tenantId === currentTenant.id && s.namespace === namespace);
      const target = overrides.find(s => 
        s.branchId === (editingScope === 'branch' ? selectedBranchId : undefined) &&
        s.userId === (editingScope === 'user' ? user?.id : undefined)
      );

      if (!target) return;

      const newConfig = { ...target.config };
      delete newConfig[key];

      const ctx = {
        id: user?.id || 'usr-anon',
        name: user?.name || 'Unknown Operator',
        role: role || 'Cashier'
      };

      // Check if there are still keys left
      if (Object.keys(newConfig).length === 0) {
        await db.appSettings.delete(target.id);
        // Log manual delete
        await db.auditLogs.add({
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          tenant_id: currentTenant.id,
          user_id: ctx.id,
          user_name: ctx.name,
          action: 'REMOVE_SETTING_OVERRIDE',
          entity: 'settings',
          entity_id: target.id,
          metadata: { namespace, scope: editingScope, key },
          created_at: Date.now()
        });
      } else {
        await SettingsResolver.saveSetting({
          tenantId: currentTenant.id,
          branchId: editingScope === 'branch' ? selectedBranchId : undefined,
          userId: editingScope === 'user' ? user?.id : undefined,
          namespace,
          config: newConfig,
          userContext: ctx
        });
      }
    } catch (err: any) {
      alert('Error removing override: ' + err.message);
    }
  };

  // Devices & sessions handlers
  const handleRevokeSession = async (sessId: string) => {
    if (confirm('Are you sure you want to revoke this session? The device will be logged out.')) {
      await db.userSessions.update(sessId, {
        status: 'REVOKED',
        revokedAt: Date.now()
      });
      alert('Session revoked successfully.');
    }
  };

  const handleTrustDevice = async (devId: string, currentTrust: boolean) => {
    await db.userDevices.update(devId, { trusted: !currentTrust });
    alert(`Device trust state updated to: ${!currentTrust ? 'Trusted' : 'Untrusted'}`);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim()) return;

    await db.barTables.add({
      id: `bt-${Date.now()}`,
      tenant_id: currentTenant.id,
      branch_id: selectedBranchId,
      zone_id: tableZone,
      name: tableName.trim(),
      capacity: tableCapacity,
      status: 'AVAILABLE'
    });

    setTableName('');
    alert(`Table "${tableName}" added successfully.`);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleType.trim()) return;

    await db.pricingRules.add({
      id: `rule-${Date.now()}`,
      tenant_id: currentTenant.id,
      rule_type: ruleType.trim(),
      start_time: ruleStartTime,
      end_time: ruleEndTime,
      days: ['Friday', 'Saturday', 'Sunday'],
      discount_percent: ruleDiscount
    });

    setRuleType('');
    alert(`Happy Hour rule "${ruleType}" activated.`);
  };

  const sortedAuditLogs = useMemo(() => {
    return [...liveAuditLogs].sort((a, b) => b.created_at - a.created_at);
  }, [liveAuditLogs]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-darkbg-border/30 pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Settings & Configurations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enterprise scope-inherited controls, active device parameters, and system policy overrides.
          </p>
        </div>
        {/* Scope Selector */}
        <div className="flex bg-slate-100 dark:bg-darkbg p-1 rounded-lg border border-slate-200/50 dark:border-darkbg-border/50 text-xs font-semibold gap-1">
          <button 
            onClick={() => setEditingScope('tenant')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${editingScope === 'tenant' ? 'bg-white dark:bg-darkbg-card shadow text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <Globe size={13} /> Tenant Level
          </button>
          <button 
            onClick={() => setEditingScope('branch')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${editingScope === 'branch' ? 'bg-white dark:bg-darkbg-card shadow text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <MapPin size={13} /> Branch Level
          </button>
          <button 
            onClick={() => setEditingScope('user')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${editingScope === 'user' ? 'bg-white dark:bg-darkbg-card shadow text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
          >
            <User size={13} /> User Preferences
          </button>
        </div>
      </div>

      {/* Scope Details Banner */}
      <div className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
        !hasScopePermission 
          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
          : editingScope === 'tenant'
            ? 'bg-violet-50/70 border-violet-100 dark:bg-violet-950/10 dark:border-violet-900/20 text-violet-700 dark:text-violet-300'
            : editingScope === 'branch'
              ? 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-indigo-50/70 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900/20 text-indigo-700 dark:text-indigo-300'
      }`}>
        <div className="flex items-center gap-2">
          <Sliders size={14} />
          <span>
            {!hasScopePermission ? (
              <strong>Permission Required:</strong>
            ) : (
              <strong>Target Scope:</strong>
            )}
            {editingScope === 'tenant' && ' Tenant-wide policies (applies across all outlets). Requires Owner privileges.'}
            {editingScope === 'branch' && ' Outlet-specific configurations. Overrides tenant values for selected branch.'}
            {editingScope === 'user' && ' Local terminal preferences. Overrides all other scopes for your active session.'}
          </span>
        </div>
        {editingScope === 'branch' && (
          <select 
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="h-7 border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-[11px] rounded px-1.5 focus:outline-none dark:text-white"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Configurations Fields Main Panel */}
      <div className="w-full">
        {activeTab === 'subscriptions' && <Subscriptions />}
        {activeTab === 'localization' && <BusinessProfile />}
        {activeTab !== 'subscriptions' && activeTab !== 'localization' && (
            <Card className="min-h-[400px]">
            <CardHeader className="border-b border-slate-100 dark:border-darkbg-border/30 pb-3">
              <CardTitle>
                {activeTab === 'pos' && 'Point of Sale (POS) Settings'}
                {activeTab === 'inventory' && 'Inventory Management Rules'}
                {activeTab === 'tax' && 'Taxes, Billing & Chart of Accounts'}
                {activeTab === 'security' && 'Identity & Security Policies'}
                {activeTab === 'devices' && 'Active Terminals & Sessions'}
                {activeTab === 'audit' && 'Configuration Audit History'}
                {activeTab === 'bar' && 'Bar Layout & Happy Hour Rules'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'pos' && 'Enforce checkout restrictions, receipt headers, printing targets, and prefix rules.'}
                {activeTab === 'inventory' && 'Determine stock valuation logic, thresholds, tracking modes, and backdating overrides.'}
                {activeTab === 'tax' && 'Define default tax structures, VAT percentages, and double-entry COA configs.'}
                {activeTab === 'security' && 'Update authentication targets, password specifications, timeouts, and backdated checkout blocks.'}
                {activeTab === 'devices' && 'Track active terminal keys, device security tags, and remote logout controls.'}
                {activeTab === 'audit' && 'Review details of recent settings updates, tracking before and after states.'}
                {activeTab === 'bar' && 'Manage dining area seating layouts, lounge tables, and active discount periods.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              
              {/* POS Tab */}
              {activeTab === 'pos' && (
                <div className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Receipt Header</label>
                        {getWinningScopeBadge('POS', 'receiptHeader')}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled={!hasScopePermission}
                          value={formPOS.receiptHeader}
                          onChange={(e) => setFormPOS(p => ({ ...p, receiptHeader: e.target.value }))}
                          onBlur={() => handleSaveConfig('POS', 'receiptHeader', formPOS.receiptHeader)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        />
                        {isOverriddenAtEditingScope('POS', 'receiptHeader') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('POS', 'receiptHeader')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Receipt Footer</label>
                        {getWinningScopeBadge('POS', 'receiptFooter')}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled={!hasScopePermission}
                          value={formPOS.receiptFooter}
                          onChange={(e) => setFormPOS(p => ({ ...p, receiptFooter: e.target.value }))}
                          onBlur={() => handleSaveConfig('POS', 'receiptFooter', formPOS.receiptFooter)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        />
                        {isOverriddenAtEditingScope('POS', 'receiptFooter') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('POS', 'receiptFooter')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Printer Interface</label>
                        {getWinningScopeBadge('POS', 'printerInterface')}
                      </div>
                      <div className="flex gap-2">
                        <select
                          disabled={!hasScopePermission}
                          value={formPOS.printerInterface}
                          onChange={(e) => {
                            setFormPOS(p => ({ ...p, printerInterface: e.target.value }));
                            handleSaveConfig('POS', 'printerInterface', e.target.value);
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        >
                          <option value="thermal-usb">Thermal Printer (USB)</option>
                          <option value="thermal-network">Network TCP/IP Printer</option>
                          <option value="standard-pdf">Standard Document (PDF Preview)</option>
                        </select>
                        {isOverriddenAtEditingScope('POS', 'printerInterface') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('POS', 'printerInterface')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Allow Cashier Discount</label>
                        {getWinningScopeBadge('POS', 'allowDiscount')}
                      </div>
                      <div className="flex gap-2">
                        <select
                          disabled={!hasScopePermission}
                          value={String(formPOS.allowDiscount)}
                          onChange={(e) => {
                            const val = e.target.value === 'true';
                            setFormPOS(p => ({ ...p, allowDiscount: val }));
                            handleSaveConfig('POS', 'allowDiscount', val);
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        >
                          <option value="true">Allowed (Flexible checkout discounts)</option>
                          <option value="false">Blocked (Fixed prices only)</option>
                        </select>
                        {isOverriddenAtEditingScope('POS', 'allowDiscount') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('POS', 'allowDiscount')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Allow Negative Stock sales</label>
                        {getWinningScopeBadge('INVENTORY', 'allowNegativeStock')}
                      </div>
                      <div className="flex gap-2">
                        <select
                          disabled={!hasScopePermission}
                          value={String(formInventory.allowNegativeStock)}
                          onChange={(e) => {
                            const val = e.target.value === 'true';
                            setFormInventory(p => ({ ...p, allowNegativeStock: val }));
                            handleSaveConfig('INVENTORY', 'allowNegativeStock', val);
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        >
                          <option value="false">Disabled (Strict out-of-stock blocks)</option>
                          <option value="true">Enabled (Allow selling below zero)</option>
                        </select>
                        {isOverriddenAtEditingScope('INVENTORY', 'allowNegativeStock') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('INVENTORY', 'allowNegativeStock')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Stock Valuation Method</label>
                        {getWinningScopeBadge('INVENTORY', 'stockValuationMethod')}
                      </div>
                      <div className="flex gap-2">
                        <select
                          disabled={!hasScopePermission}
                          value={formInventory.stockValuationMethod}
                          onChange={(e) => {
                            setFormInventory(p => ({ ...p, stockValuationMethod: e.target.value as any }));
                            handleSaveConfig('INVENTORY', 'stockValuationMethod', e.target.value);
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        >
                          <option value="FIFO">FIFO (First-In, First-Out)</option>
                          <option value="AVERAGE">WAC (Weighted Average Cost)</option>
                          <option value="MANUAL">LIFO / Manual Valuation</option>
                        </select>
                        {isOverriddenAtEditingScope('INVENTORY', 'stockValuationMethod') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('INVENTORY', 'stockValuationMethod')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Safety Stock Low Threshold</label>
                        {getWinningScopeBadge('INVENTORY', 'lowStockThreshold')}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          disabled={!hasScopePermission}
                          value={formInventory.lowStockThreshold}
                          onChange={(e) => setFormInventory(p => ({ ...p, lowStockThreshold: Number(e.target.value) || 0 }))}
                          onBlur={() => handleSaveConfig('INVENTORY', 'lowStockThreshold', formInventory.lowStockThreshold)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        />
                        {isOverriddenAtEditingScope('INVENTORY', 'lowStockThreshold') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('INVENTORY', 'lowStockThreshold')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tax Tab */}
              {activeTab === 'tax' && (
                <div className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">VAT Status</label>
                        {getWinningScopeBadge('TAX', 'vatEnabled')}
                      </div>
                      <div className="flex gap-2">
                        <select
                          disabled={!hasScopePermission}
                          value={String(formTax.vatEnabled)}
                          onChange={(e) => {
                            const val = e.target.value === 'true';
                            setFormTax(p => ({ ...p, vatEnabled: val }));
                            handleSaveConfig('TAX', 'vatEnabled', val);
                          }}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        >
                          <option value="true">Enabled (Apply default VAT to sales)</option>
                          <option value="false">Disabled (Tax-exempt / Zero-rated)</option>
                        </select>
                        {isOverriddenAtEditingScope('TAX', 'vatEnabled') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('TAX', 'vatEnabled')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Standard VAT Rate (%)</label>
                        {getWinningScopeBadge('TAX', 'vatRate')}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          disabled={!hasScopePermission}
                          value={formTax.vatRate}
                          onChange={(e) => setFormTax(p => ({ ...p, vatRate: Number(e.target.value) || 0 }))}
                          onBlur={() => handleSaveConfig('TAX', 'vatRate', formTax.vatRate)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                        />
                        {isOverriddenAtEditingScope('TAX', 'vatRate') && (
                          <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('TAX', 'vatRate')} title="Clear Override"><RotateCcw size={14} /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-4 text-xs">
                  {/* Concurrency Policies */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 dark:text-white border-b dark:border-darkbg-border/30 pb-1">Concurrency & Access Controls</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Max Allowed Devices</label>
                          {getWinningScopeBadge('SECURITY', 'maxDevices')}
                        </div>
                        <div className="flex gap-2">
                          <select
                            disabled={!hasScopePermission}
                            value={formSecurity.maxDevices}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFormSecurity(p => ({ ...p, maxDevices: val }));
                              handleSaveConfig('SECURITY', 'maxDevices', val);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                          >
                            {[1, 2, 3, 5, 10, 20].map(v => (
                              <option key={v} value={v}>{v} Devices</option>
                            ))}
                          </select>
                          {isOverriddenAtEditingScope('SECURITY', 'maxDevices') && (
                            <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('SECURITY', 'maxDevices')} title="Clear Override"><RotateCcw size={14} /></Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Concurrency Mode</label>
                          {getWinningScopeBadge('SECURITY', 'allowMultipleSessions')}
                        </div>
                        <div className="flex gap-2">
                          <select
                            disabled={!hasScopePermission}
                            value={String(formSecurity.allowMultipleSessions)}
                            onChange={(e) => {
                              const val = e.target.value === 'true';
                              setFormSecurity(p => ({ ...p, allowMultipleSessions: val }));
                              handleSaveConfig('SECURITY', 'allowMultipleSessions', val);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                          >
                            <option value="true">Multi-Device Mode (Allow Multiple)</option>
                            <option value="false">Single Device Mode (Force Logout Old)</option>
                          </select>
                          {isOverriddenAtEditingScope('SECURITY', 'allowMultipleSessions') && (
                            <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('SECURITY', 'allowMultipleSessions')} title="Clear Override"><RotateCcw size={14} /></Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Offline Grace Period</label>
                          {getWinningScopeBadge('SECURITY', 'offlineGraceHours')}
                        </div>
                        <div className="flex gap-2">
                          <select
                            disabled={!hasScopePermission}
                            value={formSecurity.offlineGraceHours}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setFormSecurity(p => ({ ...p, offlineGraceHours: val }));
                              handleSaveConfig('SECURITY', 'offlineGraceHours', val);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                          >
                            <option value="24">24 Hours Grace</option>
                            <option value="48">48 Hours Grace</option>
                            <option value="72">72 Hours Grace</option>
                          </select>
                          {isOverriddenAtEditingScope('SECURITY', 'offlineGraceHours') && (
                            <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('SECURITY', 'offlineGraceHours')} title="Clear Override"><RotateCcw size={14} /></Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Backdated Transactions */}
                  <div className="space-y-4 pt-3">
                    <h4 className="font-bold text-slate-800 dark:text-white border-b dark:border-darkbg-border/30 pb-1">Backdated Transactions Controls</h4>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Backdated POS Sales</label>
                          {getWinningScopeBadge('SECURITY', 'allowBackdatedSales')}
                        </div>
                        <div className="flex gap-2">
                          <select
                            disabled={!hasScopePermission}
                            value={String(formSecurity.allowBackdatedSales)}
                            onChange={(e) => {
                              const val = e.target.value === 'true';
                              setFormSecurity(p => ({ ...p, allowBackdatedSales: val }));
                              handleSaveConfig('SECURITY', 'allowBackdatedSales', val);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                          >
                            <option value="false">Disabled (Current Date Only)</option>
                            <option value="true">Enabled (Requires Approval)</option>
                          </select>
                          {isOverriddenAtEditingScope('SECURITY', 'allowBackdatedSales') && (
                            <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('SECURITY', 'allowBackdatedSales')} title="Clear Override"><RotateCcw size={14} /></Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Backdated Products</label>
                          {getWinningScopeBadge('SECURITY', 'allowBackdatedProducts')}
                        </div>
                        <div className="flex gap-2">
                          <select
                            disabled={!hasScopePermission}
                            value={String(formSecurity.allowBackdatedProducts)}
                            onChange={(e) => {
                              const val = e.target.value === 'true';
                              setFormSecurity(p => ({ ...p, allowBackdatedProducts: val }));
                              handleSaveConfig('SECURITY', 'allowBackdatedProducts', val);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                          >
                            <option value="false">Disabled (Current Date Only)</option>
                            <option value="true">Enabled (Requires Approval)</option>
                          </select>
                          {isOverriddenAtEditingScope('SECURITY', 'allowBackdatedProducts') && (
                            <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('SECURITY', 'allowBackdatedProducts')} title="Clear Override"><RotateCcw size={14} /></Button>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400">Backdated Stock Adjustments</label>
                          {getWinningScopeBadge('SECURITY', 'allowBackdatedInventory')}
                        </div>
                        <div className="flex gap-2">
                          <select
                            disabled={!hasScopePermission}
                            value={String(formSecurity.allowBackdatedInventory)}
                            onChange={(e) => {
                              const val = e.target.value === 'true';
                              setFormSecurity(p => ({ ...p, allowBackdatedInventory: val }));
                              handleSaveConfig('SECURITY', 'allowBackdatedInventory', val);
                            }}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
                          >
                            <option value="false">Disabled (Current Date Only)</option>
                            <option value="true">Enabled (Requires Approval)</option>
                          </select>
                          {isOverriddenAtEditingScope('SECURITY', 'allowBackdatedInventory') && (
                            <Button variant="outline" className="h-9 px-2" onClick={() => handleClearOverride('SECURITY', 'allowBackdatedInventory')} title="Clear Override"><RotateCcw size={14} /></Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Terminals & Sessions Tab */}
              {activeTab === 'devices' && (
                <div className="space-y-6 text-xs">
                  <div className="overflow-x-auto border border-slate-100 dark:border-darkbg-border/30 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 font-bold uppercase tracking-wider text-slate-500 dark:border-darkbg-border/30 dark:bg-darkbg/50">
                          <th className="p-3">Device Name</th>
                          <th className="p-3">Platform</th>
                          <th className="p-3">Last Seen</th>
                          <th className="p-3 text-center">Trust Status</th>
                          <th className="p-3 text-center">Session Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                        {liveDevices.map((d) => {
                          const activeSess = liveSessions.find(s => s.deviceId === d.deviceId && s.status === 'ACTIVE');
                          return (
                            <tr key={d.id}>
                              <td className="p-3">
                                <div className="font-bold text-slate-800 dark:text-slate-200">{d.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{d.deviceId}</div>
                              </td>
                              <td className="p-3 text-slate-500">{d.platform}</td>
                              <td className="p-3 text-slate-400">{new Date(d.lastSeen).toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <Button 
                                  size="xs" 
                                  variant="outline"
                                  className={d.trusted ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" : ""}
                                  onClick={() => handleTrustDevice(d.id, d.trusted)}
                                >
                                  {d.trusted ? 'Trusted' : 'Untrusted'}
                                </Button>
                              </td>
                              <td className="p-3 text-center">
                                {activeSess ? (
                                  <Button 
                                    size="xs" 
                                    variant="danger"
                                    onClick={() => handleRevokeSession(activeSess.id)}
                                  >
                                    Revoke Session
                                  </Button>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">No active session</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {liveDevices.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-400 italic">No registered devices.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Settings Audit Log Tab */}
              {activeTab === 'audit' && (
                <div className="space-y-4 text-xs">
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                    {sortedAuditLogs.length > 0 ? (
                      sortedAuditLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50 dark:bg-darkbg/40 border dark:border-darkbg-border/60 rounded-lg space-y-2">
                          <div className="flex justify-between items-center text-[10px] border-b border-slate-100 dark:border-darkbg-border/20 pb-1">
                            <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <User size={10} /> {log.user_name} ({log.metadata?.scope} Scope)
                            </span>
                            <span className="text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-start text-xs">
                            <div>
                              <div className="font-bold text-slate-800 dark:text-white">
                                Namespace: {log.metadata?.namespace}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1 space-y-0.5">
                                <div><strong>Changed properties:</strong></div>
                                {log.metadata?.after && Object.keys(log.metadata?.after || {}).map(k => (
                                  <div key={k} className="pl-2">
                                    • <span className="font-bold text-slate-600 dark:text-slate-400">{k}</span>: 
                                    <span className="text-red-500 line-through mx-1">{String(log.metadata?.before?.[k] ?? 'None')}</span> → 
                                    <span className="text-emerald-500 font-bold ml-1">{String(log.metadata?.after?.[k])}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Badge variant="outline" className="font-bold tracking-wide text-[9px] uppercase">
                              {log.action}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400 italic">No settings adjustments recorded in history.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Bar Layout & Happy Hour Rules Tab */}
              {activeTab === 'bar' && activeModule === 'Bar' && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Bar Setup & Tables */}
                  <Card>
                    <CardHeader className="p-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-indigo-500" />
                        <CardTitle className="text-sm">Floor Tables & Seating</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-3">
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {liveTables && liveTables.length > 0 ? (
                          liveTables.map(t => (
                            <div key={t.id} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-darkbg/40 border dark:border-darkbg-border/60 rounded-lg text-xs">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-white">{t.name}</span>
                                <span className="ml-2 text-slate-400">({t.zone_id} • Cap: {t.capacity})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={t.status === 'AVAILABLE' ? 'success' : 'warning'}>{t.status}</Badge>
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Remove ${t.name}?`)) {
                                      await db.barTables.delete(t.id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-danger p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-slate-400 italic text-xs">No tables configured.</div>
                        )}
                      </div>

                      <form onSubmit={handleAddTable} className="border-t border-slate-100 dark:border-darkbg-border/30 pt-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">Add New Table</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Input 
                            label="Table Name *" 
                            placeholder="e.g. Table 10" 
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            required
                          />
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Zone / Area *</label>
                            <select 
                              value={tableZone}
                              onChange={(e) => setTableZone(e.target.value)}
                              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2 dark:border-darkbg-border dark:bg-darkbg dark:text-white focus:outline-none"
                            >
                              <option value="Main Area">Main Area</option>
                              <option value="Bar Counter">Bar Counter</option>
                              <option value="VIP Lounge">VIP Lounge</option>
                              <option value="Garden / Patio">Garden / Patio</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input 
                            label="Seat Capacity *" 
                            type="number" 
                            placeholder="4" 
                            value={tableCapacity}
                            onChange={(e) => setTableCapacity(parseInt(e.target.value) || 2)}
                            required
                          />
                          <div className="flex items-end">
                            <Button variant="primary" type="submit" className="w-full">
                              <Plus size={14} className="mr-1" /> Add Table
                            </Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Happy Hour Rules */}
                  <Card>
                    <CardHeader className="p-3">
                      <div className="flex items-center space-x-2">
                        <Flame className="h-4 w-4 text-amber-500" />
                        <CardTitle className="text-sm">Happy Hour & Promotion Rules</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-3">
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {liveRules && liveRules.length > 0 ? (
                          liveRules.map(r => (
                            <div key={r.id} className="p-2.5 bg-slate-50 dark:bg-darkbg/40 border dark:border-darkbg-border/60 rounded-lg text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-white">{r.rule_type}</span>
                                <button 
                                  onClick={async () => {
                                    if (confirm('Delete this Happy Hour rule?')) {
                                      await db.pricingRules.delete(r.id);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-danger p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Discount: <span className="font-bold text-amber-500">{r.discount_percent}% Off</span></span>
                                <span>Schedule: {r.start_time} - {r.end_time}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-slate-400 italic text-xs">No rules configured.</div>
                        )}
                      </div>

                      <form onSubmit={handleAddRule} className="border-t border-slate-100 dark:border-darkbg-border/30 pt-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">New Promo Schedule</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Input 
                            label="Promo Label *" 
                            placeholder="Weekend Promo" 
                            value={ruleType}
                            onChange={(e) => setRuleType(e.target.value)}
                            required
                          />
                          <Input 
                            label="Discount Percent *" 
                            type="number" 
                            value={ruleDiscount}
                            onChange={(e) => setRuleDiscount(parseInt(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input 
                            label="Start Time *" 
                            placeholder="17:00" 
                            value={ruleStartTime}
                            onChange={(e) => setRuleStartTime(e.target.value)}
                            required
                          />
                          <Input 
                            label="End Time *" 
                            placeholder="22:00" 
                            value={ruleEndTime}
                            onChange={(e) => setRuleEndTime(e.target.value)}
                            required
                          />
                        </div>
                        <Button variant="primary" type="submit" className="w-full">
                          <Plus size={14} className="mr-1" /> Add Rule
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
