import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { useModule, type IndustryModule, MODULE_MANIFESTS } from '../../context/ModuleContext';
import { useSyncState } from '../../context/SyncContext';
import { 
  Search, Sun, Moon, Wifi, WifiOff, RefreshCw, 
  ChevronDown, User, Layers, Shield, MapPin, Database, Lock, X, LogOut, CreditCard, Smartphone,
  Bell, AlertTriangle, PackageX, Clock, CheckCircle2, Zap, ShieldCheck, Check
} from 'lucide-react';
import { db } from '../../db/dexie';
import { supabase } from '../../db/supabaseClient';
import { useLiveQuery } from 'dexie-react-hooks';
import { Dialog, Button } from '../UI/custom-ui';
import { tenantDemoService } from '../../services/tenantDemoService';

interface TopBarProps {
  onOpenSearch: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenSearch }) => {
  const { 
    role, 
    setRole, 
    currentBranch, 
    toggleTheme, 
    currentTenant, 
    impersonatedTenant, 
    setImpersonatedTenant, 
    isSuperAdminView, 
    setIsSuperAdminView,
    user,
    setUser,
    logout,
    currentIndustry,
    switchContext
  } = useAuth();
  const { activeModule, setActiveModule } = useModule();
  const { isOnline, isSyncing, syncProgress, pendingCount, toggleOfflineSimulation, syncLogs, syncData } = useSyncState();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showModuleDropdown, setShowModuleDropdown] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // User Profile Modals State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // ── Live Query: Wire logged-in user profile to corresponding employee record ──
  const loggedInEmployee = useLiveQuery(async () => {
    if (!user) return null;
    if (user.id) {
      const u = await db.users.get(user.id);
      if (u) return u;
    }
    if (user.email) {
      const u = await db.users.where('email').equals(user.email).first();
      if (u) return u;
    }
    return null;
  }, [user]);

  // User Profile Form States
  const [profileName, setProfileName] = useState(user?.name || 'System Platform Owner');
  const [profileEmail, setProfileEmail] = useState(user?.email || 'admin@dukapos.com');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+255 700 000 000');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (loggedInEmployee) {
      setProfileName(loggedInEmployee.name || user?.name || '');
      setProfileEmail(loggedInEmployee.email || user?.email || '');
      setProfilePhone(loggedInEmployee.phone || user?.phone || '');
    } else if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
    }
  }, [loggedInEmployee, user]);

  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [activeSessions, setActiveSessions] = useState([
    { id: '1', device: 'Chrome on Windows 11', ip: '192.168.1.100', location: 'Dar es Salaam, TZ', current: true, time: 'Active now' },
    { id: '2', device: 'DukaPos Mobile (Android 14)', ip: '102.89.43.12', location: 'Arusha, TZ', current: false, time: '2 hours ago' },
    { id: '3', device: 'Safari on iPadOS 17', ip: '197.250.12.88', location: 'Dodoma, TZ', current: false, time: 'Yesterday at 14:30' }
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleSaveAccountProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) {
      alert('Full Name and Email Address are required.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const empId = loggedInEmployee?.id || user?.id;
      const now = Date.now();

      if (empId) {
        // 1. Update IndexedDB employee user record while preserving created_at & audit metadata
        await db.users.update(empId, {
          name: profileName.trim(),
          email: profileEmail.trim(),
          phone: profilePhone.trim(),
          updated_at: now
        });

        // 2. Update Cloud User record in central database
        try {
          await supabase.from('users').update({
            name: profileName.trim(),
            email: profileEmail.trim(),
            phone: profilePhone.trim(),
            updated_at: now
          }).eq('id', empId);
        } catch (cloudErr) {
          console.warn('[Cloud Sync] Failed to update user profile in cloud:', cloudErr);
        }
      }

      // 3. Update AuthContext user state instantly across the application
      if (user) {
        setUser({
          ...user,
          name: profileName.trim(),
          email: profileEmail.trim(),
          phone: profilePhone.trim()
        });
      }

      // 4. Update stored session in localStorage
      const sessionStr = localStorage.getItem('dukapos_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.user) {
            session.user.name = profileName.trim();
            session.user.email = profileEmail.trim();
            session.user.phone = profilePhone.trim();
            localStorage.setItem('dukapos_session', JSON.stringify(session));
          }
        } catch (e) {}
      }

      setToastMsg('✅ Employee profile updated and saved!');
      setShowAccountModal(false);
    } catch (err: any) {
      alert(`Failed to save profile: ${err.message || 'Error'}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Refs for click-outside detection
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const moduleContainerRef = useRef<HTMLDivElement>(null);
  const branchContainerRef = useRef<HTMLDivElement>(null);
  const roleContainerRef = useRef<HTMLDivElement>(null);
  const syncContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Click-outside event listeners to close dropdowns when clicking away
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileContainerRef.current && !profileContainerRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (moduleContainerRef.current && !moduleContainerRef.current.contains(event.target as Node)) {
        setShowModuleDropdown(false);
      }
      if (branchContainerRef.current && !branchContainerRef.current.contains(event.target as Node)) {
        setShowBranchDropdown(false);
      }
      if (roleContainerRef.current && !roleContainerRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
      if (syncContainerRef.current && !syncContainerRef.current.contains(event.target as Node)) {
        setShowSyncDropdown(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toast auto-hide
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const userInitials = useMemo(() => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }, [user]);

  const [showClearDemoDialog, setShowClearDemoDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [isProcessingDemoAction, setIsProcessingDemoAction] = useState(false);

  // Live query to fetch all branch contexts resolved for this user
  const userContexts = useLiveQuery(async () => {
    if (!user) return [];
    const roles = await db.userBranchRoles.where('user_id').equals(user.id).toArray();
    const list: Array<{
      id: string;
      tenant_id: string;
      tenantName: string;
      branch_id: string;
      branchName: string;
      branchLocation: string;
      industry_id: string;
      industryName: string;
      role: UserRole;
    }> = [];
    for (const r of roles) {
      const br = await db.branches.get(r.branch_id);
      const ind = await db.industries.get(r.industry_id);
      const t = await db.tenants.get(r.tenant_id);
      list.push({
        id: r.id || '',
        tenant_id: r.tenant_id,
        tenantName: t?.name || 'Unknown Business',
        branch_id: r.branch_id,
        branchName: br?.name || r.branch_id,
        branchLocation: br?.location || 'Unknown Location',
        industry_id: r.industry_id,
        industryName: ind?.name || 'Retail',
        role: r.role_id as UserRole
      });
    }
    return list;
  }, [user]) || [];

  const uniqueBranchesCount = useMemo(() => {
    const branchIds = new Set(userContexts.map(ctx => ctx.branch_id));
    return branchIds.size;
  }, [userContexts]);

  // Live query to fetch enabled (subscribed) modules for this tenant
  const tenantModules = useLiveQuery(() => 
    db.tenantModules.where('tenant_id').equals(currentTenant.id).and(m => m.enabled).toArray()
  , [currentTenant.id]);

  // ─── Real-time Notification Queries ───
  // All queries are SCOPED to the current tenant's branch.
  // They are completely suppressed in Super Admin view to avoid cross-tenant data leakage.
  // 1. Low stock alerts (checking both simple products and product variants)
  const lowStockStatus = useLiveQuery(async () => {
    // GUARD: Never show tenant notifications in Super Admin workspace
    if (isSuperAdminView || !currentBranch?.id) return { variants: [], products: [], totalCount: 0 };
    
    // Low stock variants (stock < reorderLevel)
    const variants = await db.productVariants
      .where('tenant_id').equals(currentTenant.id)
      .and(v => v.branch_id === currentBranch.id)
      .toArray();
    const lowVariantsRaw = variants.filter(v => v.stock < (v.reorderLevel ?? 5));

    const lowVariantsWithNames = await Promise.all(lowVariantsRaw.map(async v => {
      const parent = await db.products.get(v.productId);
      const attrLabel = v.attributes ? Object.values(v.attributes).join(' / ') : '';
      const displayName = parent ? `${parent.name}${attrLabel ? ` (${attrLabel})` : ''}` : v.sku;
      return { ...v, displayName };
    }));

    // Low stock products without variants (stock < 10)
    const products = await db.products
      .where('tenant_id').equals(currentTenant.id)
      .and(p => p.branch_id === currentBranch.id && !p.hasVariants)
      .toArray();
    const lowProducts = products.filter(p => p.stock < 10);

    return {
      variants: lowVariantsWithNames,
      products: lowProducts,
      totalCount: lowVariantsWithNames.length + lowProducts.length
    };
  }, [currentTenant.id, currentBranch?.id, isSuperAdminView]) || { variants: [], products: [], totalCount: 0 };

  // 2. Pending (unpaid) expenses — suppressed in Super Admin view
  const pendingExpenses = useLiveQuery(async () => {
    if (isSuperAdminView || !currentBranch?.id) return [];
    return db.expenses
      .where('tenant_id').equals(currentTenant.id)
      .and(e => e.branch_id === currentBranch.id && e.status === 'Pending')
      .toArray();
  }, [currentTenant.id, currentBranch?.id, isSuperAdminView]) || [];

  // 3. Reorder rule violations — suppressed in Super Admin view
  const reorderAlertCount = useLiveQuery(async () => {
    if (isSuperAdminView || !currentBranch?.id) return 0;
    const rules = await db.reorderRules
      .where('tenant_id').equals(currentTenant.id)
      .and(r => r.branch_id === currentBranch.id && r.is_active)
      .toArray();
    let count = 0;
    for (const rule of rules) {
      const prod = await db.products.get(rule.product_id);
      if (!prod) continue;
      const stock = rule.variant_id
        ? (await db.productVariants.get(rule.variant_id))?.stock ?? 0
        : prod.stock;
      if (stock < rule.min_quantity) {
        count++;
      }
    }
    return count;
  }, [currentTenant.id, currentBranch?.id, isSuperAdminView]) || 0;

  // 4. Negative stock balances — suppressed in Super Admin view
  const negativeStockCount = useLiveQuery(async () => {
    if (isSuperAdminView || !currentBranch?.id) return 0;
    const variants = await db.productVariants
      .where('tenant_id').equals(currentTenant.id)
      .and(v => v.branch_id === currentBranch.id)
      .toArray();
    const negVariants = variants.filter(v => v.stock < 0).length;

    const products = await db.products
      .where('tenant_id').equals(currentTenant.id)
      .and(p => p.branch_id === currentBranch.id && !p.hasVariants)
      .toArray();
    const negProducts = products.filter(p => p.stock < 0).length;

    return negVariants + negProducts;
  }, [currentTenant.id, currentBranch?.id, isSuperAdminView]) || 0;

  // 5a. Read subscription records reactively (read-only — no writes allowed in liveQuery)
  const rawSubs = useLiveQuery(
    () => isSuperAdminView
      ? Promise.resolve([])
      : db.tenantSubscriptions.where('tenant_id').equals(currentTenant.id).toArray(),
    [currentTenant.id, isSuperAdminView]
  ) || [];

  // 5b. Auto-heal missing subscription — runs as a side-effect (write is safe here)
  useEffect(() => {
    if (isSuperAdminView || rawSubs === undefined) return; // undefined = still loading
    if (!Array.isArray(rawSubs) || rawSubs.length > 0) return; // already has subs, skip

    const healSubscription = async () => {
      try {
        const plans = await db.subscriptionPlans.toArray();
        const tenantPlanStr = (currentTenant.plan || 'basic').toLowerCase();
        const matchedPlan = plans.find(p => p.name.toLowerCase().includes(tenantPlanStr) || p.code.toLowerCase() === tenantPlanStr) || plans[0];
        const planId = matchedPlan?.id || 'plan-basic';
        const isTrial = (currentTenant.status === 'Trial' || currentTenant.status === 'TRIAL' || !currentTenant.status);
        const durationDays = isTrial ? 14 : 30;
        const createdTs = currentTenant.created_at || Date.now();
        const endTs = createdTs + durationDays * 24 * 60 * 60 * 1000;
        await db.tenantSubscriptions.put({
          id: `sub-${currentTenant.id}`,
          tenant_id: currentTenant.id,
          plan_id: planId,
          status: isTrial ? 'TRIAL' : 'ACTIVE',
          start_date: createdTs,
          end_date: endTs,
          auto_renew: true,
          created_at: createdTs,
          updated_at: Date.now()
        } as any);
      } catch (e) {
        console.warn('[TopBar] Auto-heal subscription failed:', e);
      }
    };

    healSubscription();
  }, [rawSubs, currentTenant.id, currentTenant.plan, currentTenant.status, currentTenant.created_at, isSuperAdminView]);

  // 5c. Derive alert state from the raw reactive subscription list (pure computation, no writes)
  const subscriptionAlerts = useMemo(() => {
    if (isSuperAdminView || rawSubs.length === 0) return null;
    const activeSub = rawSubs.find(s =>
      (s.status as string) === 'ACTIVE' || (s.status as string) === 'Active' ||
      (s.status as string) === 'TRIAL' || (s.status as string) === 'Trial'
    );
    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
    if (activeSub) {
      if (activeSub.end_date && activeSub.end_date < now) {
        return { expired: true, daysLeft: 0 };
      }
      if (activeSub.end_date && activeSub.end_date < sevenDaysFromNow) {
        const daysLeft = Math.ceil((activeSub.end_date - now) / (1000 * 60 * 60 * 24));
        return { expired: false, daysLeft };
      }
    } else {
      const tStatus = (currentTenant.status || '').toUpperCase();
      if (tStatus === 'TRIAL' || tStatus === 'ACTIVE') return null;
      return { expired: true, daysLeft: 0 };
    }
    return null;
  }, [rawSubs, currentTenant.status, isSuperAdminView]);


  // Build notification list
  const notifications = useMemo(() => {
    const items: Array<{ id: string; type: 'warning' | 'danger' | 'info'; icon: React.ReactNode; title: string; description: string }> = [];

    // Low stock warnings
    if (lowStockStatus.totalCount > 0) {
      const namesList = [
        ...lowStockStatus.products.slice(0, 2).map(p => p.name),
        ...lowStockStatus.variants.slice(0, 2).map(v => (v as any).displayName || v.sku)
      ];
      const desc = `${namesList.join(', ')}${lowStockStatus.totalCount > namesList.length ? ` +${lowStockStatus.totalCount - namesList.length} more` : ''} below reorder level.`;
      items.push({
        id: 'low-stock',
        type: 'warning',
        icon: <PackageX className="h-4 w-4" />,
        title: `${lowStockStatus.totalCount} Low Stock Item${lowStockStatus.totalCount > 1 ? 's' : ''}`,
        description: desc
      });
    }

    // Unpaid expense alerts
    if (pendingExpenses.length > 0) {
      const total = pendingExpenses.reduce((s, e) => s + e.amount, 0);
      items.push({
        id: 'pending-expenses',
        type: 'danger',
        icon: <AlertTriangle className="h-4 w-4" />,
        title: `${pendingExpenses.length} Unpaid Expense${pendingExpenses.length > 1 ? 's' : ''}`,
        description: `Tsh. ${total.toLocaleString()} in pending operational costs awaiting payment.`
      });
    }

    // Reorder triggers
    if (reorderAlertCount > 0) {
      items.push({
        id: 'reorder-alerts',
        type: 'warning',
        icon: <Zap className="h-4 w-4" />,
        title: `${reorderAlertCount} Reorder Alert${reorderAlertCount > 1 ? 's' : ''} Triggered`,
        description: `Items have dropped below their minimum target quantities and require restocking.`
      });
    }

    // Negative stock warnings
    if (negativeStockCount > 0) {
      items.push({
        id: 'negative-stock',
        type: 'danger',
        icon: <AlertTriangle className="h-4 w-4" />,
        title: 'Negative Stock Detected',
        description: `${negativeStockCount} item(s) have negative stock balances. Audit POS sales and adjust stock.`
      });
    }

    // Subscription status
    if (subscriptionAlerts) {
      if (subscriptionAlerts.expired) {
        items.push({
          id: 'sub-expired',
          type: 'danger',
          icon: <Clock className="h-4 w-4" />,
          title: 'Subscription Expired',
          description: 'Your business subscription has expired. Renew your plan to restore full operations.'
        });
      } else {
        items.push({
          id: 'sub-expiry',
          type: 'info',
          icon: <Clock className="h-4 w-4" />,
          title: 'Subscription Expiring Soon',
          description: `Your plan expires in ${subscriptionAlerts.daysLeft} day${subscriptionAlerts.daysLeft !== 1 ? 's' : ''}. Renew now to avoid service interruption.`
        });
      }
    }

    return items;
  }, [lowStockStatus, pendingExpenses, reorderAlertCount, negativeStockCount, subscriptionAlerts]);

  const totalNotificationCount = notifications.length;

  const subscribedModuleKeys = useMemo(() => (tenantModules || []).map(m => m.module_key), [tenantModules]);

  const displayedModules = useMemo(() => {
    const allKeys = Object.keys(MODULE_MANIFESTS) as IndustryModule[];
    // For Super Admin view, all modules are accessible; for tenant view, ONLY subscribed modules are shown
    if (isSuperAdminView) return allKeys;
    if (!tenantModules || tenantModules.length === 0) return [(currentIndustry?.name as IndustryModule) || activeModule];
    return allKeys.filter(mod => subscribedModuleKeys.includes(mod));
  }, [tenantModules, subscribedModuleKeys, activeModule, isSuperAdminView, currentIndustry?.name]);

  // Keep activeModule in sync with the tenant's subscribed modules
  useEffect(() => {
    if (isSuperAdminView) return;
    if (tenantModules === undefined || tenantModules.length === 0) return;
    
    const isSubscribed = displayedModules.includes(activeModule);
    if (!isSubscribed && displayedModules.length > 0) {
      setActiveModule(displayedModules[0]);
    }
  }, [activeModule, displayedModules, tenantModules, isSuperAdminView, setActiveModule]);

  return (
    <>
      {/* Impersonation Banner Warning */}
      {impersonatedTenant && (
        <div className="bg-red-600 text-white font-bold text-xs py-2 px-4 text-center select-none flex items-center justify-between z-50 shrink-0 sticky top-0 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <span className="animate-pulse">⚠️</span>
            <span>Platform Impersonation Session: Managing <strong>{currentTenant.name}</strong> workspace</span>
          </div>
          <button 
            onClick={() => {
              setImpersonatedTenant(null);
              setIsSuperAdminView(true);
              window.location.reload(); // Refresh to clean state
            }}
            className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded text-[10px] uppercase font-black transition active:scale-95 ml-3"
          >
            Exit Impersonation
          </button>
        </div>
      )}
      
      {/* Super Admin Control Plane Info Bar */}
      {role === 'Super Admin' && !impersonatedTenant && (
        <div className="bg-slate-900 text-white font-bold text-[10px] py-1.5 px-4 text-center select-none flex items-center justify-between z-50 shrink-0 sticky top-0 border-b border-slate-800">
          <span>🛡️ Super Admin Control Plane is Active</span>
          <button 
            onClick={() => {
              setIsSuperAdminView(!isSuperAdminView);
            }}
            className="underline hover:text-slate-200 text-[10px]"
          >
            Switch to {isSuperAdminView ? 'Tenant View' : 'Admin Console'}
          </button>
        </div>
      )}

      {/* Demo Workspace Warning Banner */}
      {currentTenant.status?.toUpperCase() === 'DEMO' && (
        <div className="bg-amber-500 text-white font-bold text-xs py-2 px-6 text-center select-none flex items-center justify-between z-50 shrink-0 sticky top-0 animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2">
            <span className="animate-pulse">⚠️</span>
            <span>You are currently managing a <strong>Demo Workspace</strong> with trial sample records.</span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowClearDemoDialog(true)}
              className="bg-white/20 hover:bg-white/35 text-white px-3 py-1 rounded text-[10px] uppercase font-bold transition active:scale-95 shadow-sm"
            >
              Clear Sample Data
            </button>
            <button 
              onClick={() => setShowActivateDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-[10px] uppercase font-bold transition active:scale-95 shadow-sm"
            >
              Activate Production Workspace
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-darkbg-border dark:bg-darkbg-card/85">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-0.5 shadow-md border border-slate-200/80 dark:border-darkbg-border overflow-hidden shrink-0">
            <img src="/dukapos-logo.png" alt="DukaPos Logo" className="h-full w-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">DukaPos</h1>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{currentTenant.name}</p>
          </div>
        </div>

        {/* Center Search Everything Trigger */}
        <div className="mx-4 hidden max-w-md flex-1 md:block">
          <button
            onClick={onOpenSearch}
            className="flex h-10 w-full items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 hover:bg-slate-100 dark:border-darkbg-border dark:bg-darkbg/50 dark:hover:bg-darkbg"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search products, customers, transactions...</span>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-darkbg-border dark:text-slate-400">Ctrl+K</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Industry Module Selector (Hidden in Super Admin View) */}
          {!isSuperAdminView && (
            displayedModules.length > 1 ? (
              <div className="relative" ref={moduleContainerRef}>
                <button
                  onClick={() => {
                    setShowModuleDropdown(!showModuleDropdown);
                    setShowBranchDropdown(false);
                    setShowRoleDropdown(false);
                    setShowSyncDropdown(false);
                  }}
                  className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-darkbg-border dark:bg-darkbg-card dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Module: {MODULE_MANIFESTS[activeModule]?.name || activeModule}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                
                {showModuleDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowModuleDropdown(false)} />}
                {showModuleDropdown && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-darkbg-border dark:bg-darkbg-card animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-darkbg-border pb-1 mb-1">Select Industry Module</div>
                    <div className="max-h-80 overflow-y-auto space-y-0.5 pr-0.5">
                      {displayedModules.map((mod) => (
                        <button
                          key={mod}
                          onClick={() => {
                            setActiveModule(mod);
                            setShowModuleDropdown(false);
                          }}
                          className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                            activeModule === mod ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="mr-2 text-sm shrink-0">
                            {mod === 'Retail' && '🏪'}
                            {mod === 'Restaurant' && '🍳'}
                            {mod === 'SACCO' && '🪙'}
                            {mod === 'Workforce' && '👥'}
                            {mod === 'Pharmacy' && '💊'}
                            {mod === 'Hardware' && '🔨'}
                            {mod === 'Construction' && '👷'}
                            {mod === 'Law' && '⚖️'}
                            {mod === 'RealEstate' && '🏢'}
                            {mod === 'Microfinance' && '📈'}
                            {mod === 'Agriculture' && '🌱'}
                            {mod === 'Electronics' && '🔌'}
                            {mod === 'Garage' && '🔧'}
                            {mod === 'FuelStation' && '⛽'}
                            {mod === 'School' && '🎓'}
                            {mod === 'Bookshop' && '📚'}
                            {mod === 'Security' && '🛡️'}
                            {mod === 'Water' && '💧'}
                            {mod === 'Transport' && '🚌'}
                            {mod === 'Waste' && '🗑️'}
                            {mod === 'Wholesale' && '📦'}
                            {mod === 'Fashion' && '👕'}
                            {mod === 'Service' && '💼'}
                            {mod === 'Cosmetics' && '✨'}
                            {mod === 'Salon' && '✂️'}
                            {mod === 'Hotel' && '🛏️'}
                            {mod === 'Poultry' && '🐔'}
                          </span>
                          <span className="truncate">{MODULE_MANIFESTS[mod].name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50/50 dark:border-darkbg-border dark:bg-darkbg-card px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 select-none shadow-sm">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>{MODULE_MANIFESTS[activeModule]?.name || activeModule}</span>
              </div>
            )
          )}

          {/* Branch & Industry Context Switcher — Hidden for Super Admin */}
          {isSuperAdminView ? (
            // Super Admin shows platform HQ label — no branch switching
            <div className="flex items-center space-x-1.5 rounded-lg border border-primary/30 bg-primary/5 dark:border-primary-dark/30 dark:bg-primary-dark/10 px-3 py-1.5 text-xs font-bold text-primary dark:text-primary-dark select-none shadow-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span>DukaPos Platform HQ</span>
            </div>
          ) : uniqueBranchesCount > 1 ? (
            <div className="relative" ref={branchContainerRef}>
              <button
                onClick={() => {
                  setShowBranchDropdown(!showBranchDropdown);
                  setShowModuleDropdown(false);
                  setShowRoleDropdown(false);
                  setShowSyncDropdown(false);
                }}
                className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-darkbg-border dark:bg-darkbg-card dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
              >
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden lg:inline">{currentBranch.name} ({currentIndustry?.name || 'Retail'})</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              
              {showBranchDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowBranchDropdown(false)} />}
              {showBranchDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-darkbg-border dark:bg-darkbg-card z-50">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-darkbg-border pb-1.5 mb-1.5">
                    Available Workspaces
                  </div>
                  {userContexts.map((ctx) => (
                    <button
                      key={ctx.id}
                      onClick={() => {
                        switchContext(ctx.tenant_id, ctx.branch_id, ctx.industry_id, ctx.role);
                        setShowBranchDropdown(false);
                        setActiveModule(ctx.industryName as any);
                      }}
                      className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        currentBranch.id === ctx.branch_id && currentIndustry?.id === ctx.industry_id
                          ? 'bg-primary/5 text-primary dark:bg-primary-dark/15 dark:text-primary-dark font-bold'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{ctx.branchName}</span>
                        <span className="text-[8px] font-bold bg-slate-100 dark:bg-darkbg px-1.5 py-0.5 rounded text-slate-500 shrink-0 font-mono">
                          {ctx.industryName}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5">{ctx.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-slate-50/50 dark:border-darkbg-border dark:bg-darkbg-card px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 select-none shadow-sm">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{currentBranch.name} ({currentIndustry?.name || 'Retail'})</span>
            </div>
          )}

          {/* Role Switcher (RBAC Testing) */}
          <div className="relative" ref={roleContainerRef}>
            <button
              onClick={() => {
                setShowRoleDropdown(!showRoleDropdown);
                setShowModuleDropdown(false);
                setShowBranchDropdown(false);
                setShowSyncDropdown(false);
              }}
              className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-darkbg-border dark:bg-darkbg-card dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden md:inline">{role}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showRoleDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowRoleDropdown(false)} />}
            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-darkbg-border dark:bg-darkbg-card z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Testing RBAC Roles</div>
                {['Super Admin', 'Business Owner', 'Business Administrator', 'Branch Manager', 'Cashier', 'Inventory Officer', 'Accountant'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r as any);
                      setShowRoleDropdown(false);
                    }}
                    className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                      role === r ? 'bg-primary/5 text-primary font-semibold' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Offline Status & Sync Queue Indicator */}
          <div className="relative" ref={syncContainerRef}>
            <button
              onClick={() => {
                setShowSyncDropdown(!showSyncDropdown);
                setShowModuleDropdown(false);
                setShowBranchDropdown(false);
                setShowRoleDropdown(false);
                setShowProfileDropdown(false);
              }}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                isOnline 
                  ? 'bg-success/10 text-success dark:bg-success/20' 
                  : 'bg-danger/10 text-danger dark:bg-danger/20'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Online</span>
                  {isSyncing && <RefreshCw className="h-3.5 w-3.5 animate-spin ml-1" />}
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 animate-pulse" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              )}
              {pendingCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white animate-bounce">
                  {pendingCount}
                </span>
              )}
            </button>

            {showSyncDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowSyncDropdown(false)} />}
            {showSyncDropdown && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-darkbg-border dark:bg-darkbg-card z-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-darkbg-border">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Offline Sync Monitor</span>
                  <button
                    onClick={toggleOfflineSimulation}
                    className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 dark:bg-darkbg-border dark:text-slate-300"
                  >
                    Simulate {isOnline ? 'Offline' : 'Online'}
                  </button>
                </div>
                
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sync Status:</span>
                  <span className={`font-semibold ${isOnline ? 'text-success' : 'text-danger'}`}>
                    {isOnline ? 'Online - Auto Syncing' : 'Offline Mode Active'}
                  </span>
                </div>
                
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Queued Operations:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{pendingCount} pending</span>
                </div>

                {isSyncing && syncProgress ? (
                  <div className="mt-3 space-y-1 bg-slate-50 dark:bg-darkbg/40 p-2.5 rounded-lg border dark:border-darkbg-border/30">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Syncing Records</span>
                      <span>{syncProgress.current} / {syncProgress.total} ({syncProgress.percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-darkbg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${syncProgress.percentage}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  pendingCount > 0 && isOnline && (
                    <button
                      onClick={() => syncData()}
                      disabled={isSyncing}
                      className="mt-3 flex w-full items-center justify-center space-x-1 rounded-lg bg-primary py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Synchronizing...' : 'Trigger Manual Sync'}</span>
                    </button>
                  )
                )}

                {/* Live Sync Logs */}
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sync Activity Log</div>
                  <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2 font-mono text-[9px] text-slate-600 dark:border-darkbg-border dark:bg-darkbg dark:text-slate-400">
                    {syncLogs.length === 0 ? (
                      <div className="text-slate-400 italic">No sync logs recorded yet.</div>
                    ) : (
                      syncLogs.map((log, idx) => <div key={idx} className="truncate">{log}</div>)
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>


          {/* ─── Real-time Notification Bell ─── */}
          <div className="relative" ref={notifContainerRef}>
            <button
              id="notification-bell-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileDropdown(false);
                setShowModuleDropdown(false);
                setShowBranchDropdown(false);
                setShowRoleDropdown(false);
                setShowSyncDropdown(false);
              }}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition"
              title="Notifications"
            >
              <Bell className={`h-5 w-5 ${totalNotificationCount > 0 ? 'animate-[wiggle_1.5s_ease-in-out_infinite]' : ''}`} />
              {totalNotificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-md border border-white dark:border-darkbg-card">
                  {totalNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-darkbg-border dark:bg-darkbg-card z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-darkbg-border bg-slate-50/50 dark:bg-darkbg/20">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Notifications</span>
                    {totalNotificationCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black">{totalNotificationCount}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Notification Items */}
                <div className="divide-y divide-slate-100 dark:divide-darkbg-border/30 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mb-3">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Clear!</p>
                      <p className="text-[10px] text-slate-400 mt-1">No alerts or issues detected across your workspace.</p>
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const colorMap = {
                        warning: { bg: 'bg-amber-50 dark:bg-amber-950/15', icon: 'text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/25', border: 'border-l-amber-400' },
                        danger:  { bg: 'bg-red-50 dark:bg-red-950/15',    icon: 'text-red-600 dark:text-red-400 bg-red-100/60 dark:bg-red-900/25',    border: 'border-l-red-400' },
                        info:    { bg: 'bg-blue-50 dark:bg-blue-950/15',  icon: 'text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/25',  border: 'border-l-blue-400' },
                      };
                      const c = colorMap[notif.type];
                      return (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 px-4 py-3 ${c.bg} border-l-2 ${c.border} transition-colors`}
                        >
                          <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${c.icon}`}>
                            {notif.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{notif.title}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.description}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-darkbg-border bg-slate-50/50 dark:bg-darkbg/20">
                  <p className="text-[10px] text-center text-slate-400">Alerts update live via IndexedDB sync</p>
                </div>
              </div>
            )}
          </div>


          {/* Global Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition"
          >
            <Sun className="h-5 w-5 dark:hidden" />
            <Moon className="h-5 w-5 hidden dark:block" />
          </button>
          
          {/* User Profile Menu */}
          <div className="relative" ref={profileContainerRef}>
            <button
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowModuleDropdown(false);
                setShowBranchDropdown(false);
                setShowRoleDropdown(false);
                setShowSyncDropdown(false);
              }}
              className="relative flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-indigo-500 text-white font-bold text-[10px] shadow-sm hover:scale-105 transition duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-darkbg shrink-0"
            >
              {userInitials}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-darkbg-card" />
            </button>
            {showProfileDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2.5 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-darkbg-border dark:bg-darkbg-card z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header Profile Section */}
                <div className="flex items-center space-x-3 p-3 border-b border-slate-100 dark:border-darkbg-border/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white font-black text-xs shadow-md">
                    {userInitials}
                  </div>
                  <div className="truncate flex-1">
                    <div className="font-bold text-slate-800 dark:text-white text-xs truncate">{user?.name || profileName}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{user?.email || profileEmail}</div>
                  </div>
                </div>

                {/* Body metadata Context */}
                <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-darkbg/40 rounded-xl my-1.5 border border-slate-100/50 dark:border-darkbg-border/30 space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between items-center">
                    <span>Active Role</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border px-2 py-0.5 rounded-md">
                      {user?.role || role}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tenant ID</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {currentTenant.id}
                    </span>
                  </div>
                </div>

                {/* Submenu Options */}
                <div className="space-y-0.5 p-1">
                  <button 
                    onClick={() => { 
                      setShowAccountModal(true); 
                      setShowProfileDropdown(false); 
                    }}
                    className="flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-2 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    <span>My Account Settings</span>
                  </button>

                  <button 
                    onClick={() => { 
                      setShowSecurityModal(true); 
                      setShowProfileDropdown(false); 
                    }}
                    className="flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-2 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                  >
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span>Security & MFA Keys</span>
                  </button>

                  <button 
                    onClick={() => { 
                      setShowSessionsModal(true); 
                      setShowProfileDropdown(false); 
                    }}
                    className="flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-2 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                  >
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    <span>Active Device Sessions</span>
                  </button>

                  <button 
                    onClick={() => { 
                      setShowBillingModal(true); 
                      setShowProfileDropdown(false); 
                    }}
                    className="flex w-full items-center space-x-2.5 rounded-lg px-2.5 py-2 text-left text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors font-medium"
                  >
                    <CreditCard className="h-4 w-4 text-slate-400" />
                    <span>Billing & Invoice Log</span>
                  </button>
                </div>

                {/* Footer Section */}
                <div className="border-t border-slate-100 dark:border-darkbg-border/50 p-1 mt-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileDropdown(false);
                    }}
                    className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 py-2.5 text-center text-xs font-bold transition dark:bg-red-950/20 dark:hover:bg-red-950/30 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out of session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>



      {/* Clear Demo Data Dialog */}
      <Dialog
        isOpen={showClearDemoDialog}
        onClose={() => setShowClearDemoDialog(false)}
        title="Confirm Sample Data Purge"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-slate-500 leading-normal">
            Are you sure you want to delete all demo and sample data? This will permanently wipe all products, variants, orders, stock movements, and customers created during the trial setup.
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg text-amber-700 dark:text-amber-400">
            <strong>Warning:</strong> This action cannot be undone. Configurations (settings, branches, roles, users) will be preserved.
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowClearDemoDialog(false)} disabled={isProcessingDemoAction}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              disabled={isProcessingDemoAction}
              onClick={async () => {
                setIsProcessingDemoAction(true);
                try {
                  await tenantDemoService.createResetCommand(currentTenant.id, user?.id || 'system', 'DEMO_DATA');
                  // Trigger local reload of data
                  setTimeout(() => {
                    window.location.reload();
                  }, 1200);
                } catch (err: any) {
                  alert(`Purge failed: ${err.message}`);
                } finally {
                  setIsProcessingDemoAction(false);
                  setShowClearDemoDialog(false);
                }
              }}
            >
              {isProcessingDemoAction ? 'Purging...' : 'Yes, Delete Sample Data'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Activate Production Dialog */}
      <Dialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        title="Activate Production Workspace"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-slate-500 leading-normal">
            Convert this demo tenant into a clean active production environment. All sample transactional records will be removed, and only setup configurations will be kept.
          </p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg text-emerald-700 dark:text-emerald-400">
            <strong>Conversion details:</strong> Tenant status will transition to <strong>ACTIVE</strong>. Standard trial billing cycle and role mapping will be established.
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowActivateDialog(false)} disabled={isProcessingDemoAction}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              disabled={isProcessingDemoAction}
              onClick={async () => {
                setIsProcessingDemoAction(true);
                try {
                  const result = await tenantDemoService.convertToProduction(currentTenant.id, user?.id || 'system');
                  
                  // Update active session in localStorage
                  const sessionStr = localStorage.getItem('dukapos_session');
                  if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    session.tenant.id = result.prodTenantId;
                    session.tenant.status = 'Active';
                    session.tenant.plan = result.plan;
                    session.user.tenant_id = result.prodTenantId;
                    
                    if (session.branch) {
                      session.branch.id = session.branch.id.replace(currentTenant.id, result.prodTenantId);
                      session.branch.tenant_id = result.prodTenantId;
                      session.user.branch_id = session.user.branch_id.replace(currentTenant.id, result.prodTenantId);
                    }
                    
                    if (session.jwtClaims && session.jwtClaims.context) {
                      session.jwtClaims.context.tenant_id = result.prodTenantId;
                      session.jwtClaims.context.branch_id = session.jwtClaims.context.branch_id.replace(currentTenant.id, result.prodTenantId);
                    }

                    localStorage.setItem('dukapos_session', JSON.stringify(session));
                  }

                  setTimeout(() => {
                    window.location.reload();
                  }, 1200);
                } catch (err: any) {
                  alert(`Activation failed: ${err.message}`);
                } finally {
                  setIsProcessingDemoAction(false);
                  setShowActivateDialog(false);
                }
              }}
            >
              {isProcessingDemoAction ? 'Activating...' : 'Confirm Activation'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. My Account Settings Modal */}
      <Dialog
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        title="My Employee Account Profile"
      >
        <div className="space-y-4 text-xs pt-1">
          <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-darkbg/40 rounded-2xl border border-slate-100 dark:border-darkbg-border">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white font-black text-sm shadow-md shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 truncate">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{profileName}</h4>
              <p className="text-[11px] text-slate-400 truncate">{profileEmail}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="bg-primary/10 text-primary font-bold text-[9px] px-2 py-0.5 rounded-full">
                  {user?.role || role}
                </span>
                {loggedInEmployee?.created_at && (
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[9px] px-2 py-0.5 rounded-full">
                    Registered {new Date(loggedInEmployee.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input 
                type="text" 
                value={profileName} 
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input 
                type="email" 
                value={profileEmail} 
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:outline-none" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input 
                type="text" 
                value={profilePhone} 
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-semibold focus:ring-2 focus:ring-primary/20 focus:outline-none" 
              />
            </div>

            {/* Read-Only Employee Audit Card */}
            <div className="p-3 bg-slate-50 dark:bg-darkbg/40 rounded-xl border border-slate-200/60 dark:border-darkbg-border/40 space-y-1.5 text-[10px]">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[9px] mb-1 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" /> Employee Registration & Security Audit Metadata
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400">
                <div>Account ID: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{loggedInEmployee?.id || user?.id}</span></div>
                <div>Registration Source: <span className="font-bold text-slate-700 dark:text-slate-300">{loggedInEmployee?.registration_source || 'SUPER_ADMIN_CPANEL'}</span></div>
                <div>Created At: <span className="font-bold text-slate-700 dark:text-slate-300">{loggedInEmployee?.created_at ? new Date(loggedInEmployee.created_at).toLocaleString() : 'N/A'}</span></div>
                <div>Created By: <span className="font-bold text-slate-700 dark:text-slate-300">{loggedInEmployee?.created_by || 'SaaS System Provisioner'}</span></div>
                <div>Registration IP: <span className="font-mono text-slate-700 dark:text-slate-300">{loggedInEmployee?.registration_ip || '197.250.4.15'}</span></div>
                <div>Verification Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">{loggedInEmployee?.verification_status || 'VERIFIED'}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Language</label>
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-semibold">
                  <option>English (US)</option>
                  <option>Swahili (Kiswahili)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">System Timezone</label>
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-semibold">
                  <option>East Africa Time (UTC+3)</option>
                  <option>UTC (Coordinated Universal Time)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-darkbg-border">
            <Button variant="outline" size="sm" onClick={() => setShowAccountModal(false)} disabled={isSavingProfile}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAccountProfile} disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 2. Security & MFA Keys Modal */}
      <Dialog
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        title="Security & MFA Keys"
      >
        <div className="space-y-4 text-xs pt-1">
          {/* Password Change Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-darkbg/40 rounded-2xl border border-slate-100 dark:border-darkbg-border space-y-3">
            <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white">
              <Lock className="h-4 w-4 text-primary" />
              <span>Update Password</span>
            </div>
            <div className="space-y-2">
              <input 
                type="password" 
                placeholder="Current Password" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-medium" 
              />
              <input 
                type="password" 
                placeholder="New Password" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-medium" 
              />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-darkbg-border bg-white dark:bg-darkbg text-xs font-medium" 
              />
            </div>
          </div>

          {/* MFA Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-darkbg/40 rounded-2xl border border-slate-100 dark:border-darkbg-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-slate-800 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Multi-Factor Authentication (MFA)</span>
              </div>
              <button 
                type="button"
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${mfaEnabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mfaEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Require an authenticator code when signing into Super Admin workspace.
            </p>
            {mfaEnabled && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-between">
                <span>✓ Active Key: Authenticator App</span>
                <span className="font-mono bg-white dark:bg-darkbg px-2 py-0.5 rounded-lg border border-emerald-200/50">
                  DKP-8891-SEC
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-darkbg-border">
            <Button variant="outline" size="sm" onClick={() => setShowSecurityModal(false)}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => {
              setToastMsg('Security configuration saved!');
              setShowSecurityModal(false);
            }}>
              Update Security
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 3. Active Device Sessions Modal */}
      <Dialog
        isOpen={showSessionsModal}
        onClose={() => setShowSessionsModal(false)}
        title="Active Device Sessions"
      >
        <div className="space-y-4 text-xs pt-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Devices currently logged into your DukaPos account. Revoke any session that looks unfamiliar.
          </p>

          <div className="space-y-2.5">
            {activeSessions.map((session) => (
              <div key={session.id} className="p-3 bg-slate-50 dark:bg-darkbg/40 rounded-2xl border border-slate-100 dark:border-darkbg-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>{session.device}</span>
                      {session.current && (
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      IP: {session.ip} • {session.location} • {session.time}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveSessions(prev => prev.filter(s => s.id !== session.id));
                      setToastMsg(`Revoked session for ${session.device}`);
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold text-[11px] bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 transition"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-darkbg-border">
            {activeSessions.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setActiveSessions(prev => prev.filter(s => s.current));
                  setToastMsg('All other device sessions revoked.');
                }}
                className="text-rose-600 font-bold text-xs hover:underline"
              >
                Revoke All Other Sessions
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">No other active sessions.</span>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowSessionsModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 4. Billing & Invoice Log Modal */}
      <Dialog
        isOpen={showBillingModal}
        onClose={() => setShowBillingModal(false)}
        title="Billing & Invoice Log"
      >
        <div className="space-y-4 text-xs pt-1">
          {/* Plan Summary Box */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-primary text-white rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-indigo-200 block">Active Subscription</span>
              <h4 className="font-extrabold text-base">Professional Enterprise</h4>
              <p className="text-[11px] text-indigo-100 mt-0.5">$49.00 / month • Auto-renews Aug 20, 2026</p>
            </div>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/30">
              Active
            </span>
          </div>

          {/* Invoice Log Table */}
          <div>
            <h5 className="font-bold text-slate-800 dark:text-white mb-2">Invoice Payment History</h5>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-darkbg-border">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-darkbg/60 text-slate-400 uppercase font-bold text-[9px]">
                  <tr>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border">
                  {[
                    { id: 'INV-2026-007', date: 'Jul 01, 2026', amount: '$49.00', status: 'Paid' },
                    { id: 'INV-2026-006', date: 'Jun 01, 2026', amount: '$49.00', status: 'Paid' },
                    { id: 'INV-2026-005', date: 'May 01, 2026', amount: '$49.00', status: 'Paid' },
                  ].map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-darkbg/40">
                      <td className="p-3 font-bold font-mono text-slate-800 dark:text-slate-200">{inv.id}</td>
                      <td className="p-3 text-slate-500">{inv.date}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{inv.amount}</td>
                      <td className="p-3">
                        <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button 
                          type="button"
                          onClick={() => setToastMsg(`Downloading invoice ${inv.id}...`)}
                          className="text-primary font-bold hover:underline"
                        >
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-darkbg-border">
            <Button variant="outline" size="sm" onClick={() => setShowBillingModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
