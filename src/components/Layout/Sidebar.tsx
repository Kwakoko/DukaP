import React, { useState, useEffect, useMemo } from 'react';
import { useModule, type SidebarItem, type NestedSidebarItem } from '../../context/ModuleContext';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, DollarSign, Package, Users, LineChart, 
  Settings, Grid, CookingPot, FileText, 
  Coins, TrendingUp, Sparkles,
  ChevronDown, HelpCircle, HardHat, Gavel, 
  Home, Sprout, Wrench, Fuel, GraduationCap, 
  BookOpen, Shield, Droplet, Bus, Trash2, Boxes, 
  Shirt, Briefcase, Scissors, Bed,
  Egg, Heart, Footprints, Activity, Database,
  Truck, ShoppingCart, ClipboardList, Receipt,
  Calendar, Clock, Target, MessageSquare,
  GlassWater, UserCheck
} from 'lucide-react';

interface SidebarProps {}

const superAdminSidebarItems: SidebarItem[] = [
  'Dashboard',
  'Tenant Management',
  'Production Readiness',
  'Subscription Tiers',
  'Demo Data Engine',
  'Business Categories',
  'Billing & Finance',
  'Users & Roles',
  'Platform Monitoring',
  { name: 'AI Management', subItems: ['Models usage', 'Prompt templates', 'Logs & Costs'] },
  'Marketplace',
  'Reports',
  'Support Center',
  'Notifications',
  'Security Center',
  { name: 'Developer Center', subItems: ['API Keys', 'Webhooks', 'Persistence Auditor'] },
  'Backup & Recovery',
  'Activity Center',
  'Platform Updates',
  'Integrations',
  'System Settings'
];

export const Sidebar: React.FC<SidebarProps> = () => {
  const { manifest, activeTab, setActiveTab } = useModule();
  const { role, isSuperAdminView, hasPermission, jwtClaims } = useAuth();
  
  // Track expanded parent menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const rawSidebarItems = isSuperAdminView ? superAdminSidebarItems : manifest.sidebar;

  const hasSidebarItemPermission = (item: SidebarItem): boolean => {
    if (isSuperAdminView) return true;
    
    const itemName = typeof item === 'string' ? item : item.name;
    const nameLower = itemName.toLowerCase();
    
    if (nameLower === 'dashboard') return true;
    if (nameLower === 'pos' || nameLower === 'counter pos' || nameLower === 'bar counter pos' || nameLower.includes('sale')) {
      return hasPermission('sales.create');
    }
    if (nameLower.includes('inventory') || nameLower === 'products' || nameLower === 'medicines' || nameLower === 'categories') {
      return true; // Allow reading inventory stock levels
    }
    if (nameLower === 'settings' || nameLower === 'general settings') {
      return hasPermission('settings.manage') || hasPermission('business_profile.view') || ['Super Admin', 'Business Owner', 'Tenant Owner', 'Business Administrator', 'Accountant', 'Read Only Auditor'].includes(role);
    }
    if (nameLower === 'users & roles' || nameLower === 'employees') {
      return hasPermission('users.manage') || hasPermission('roles.manage');
    }
    if (nameLower === 'reports' || nameLower === 'reports & analytics') {
      return hasPermission('reports.view') || hasPermission('reports.branch') || hasPermission('financial_reports.view');
    }
    if (nameLower === 'purchasing' || nameLower === 'purchasing & supplies' || nameLower === 'suppliers') {
      return hasPermission('purchase.create') || hasPermission('supplier.manage');
    }
    if (nameLower === 'expenses') {
      return hasPermission('expense.manage');
    }
    if (nameLower === 'subscriptions' || nameLower === 'plans & pricing') {
      return hasPermission('settings.manage') || role === 'Business Owner' || role === 'Tenant Owner';
    }
    return true;
  };

  const sidebarItems = useMemo(() => {
    return rawSidebarItems
      .map(item => {
        const name = typeof item === 'string' ? item : item.name;
        if (name === 'Settings' || name === 'System Settings' || name === 'General Settings') {
          return {
            name: 'Settings',
            subItems: [
              'Business Profile & Identity',
              'POS Configurations',
              'Inventory Rules',
              'Tax & Billing',
              'Security Policies',
              'Terminals & Sessions',
              'Subscriptions & Billing',
              'Change Log'
            ]
          };
        }

        return item;
      })
      .map(item => {
        if (typeof item === 'string') return item;
        const filteredSubs = item.subItems?.filter(sub => {
          const subLower = sub.toLowerCase();
          if (subLower === 'users & roles' || subLower === 'employees') {
            return hasPermission('users.manage') || hasPermission('roles.manage');
          }
          if (subLower === 'plans & pricing' || subLower === 'coupons' || subLower === 'grace periods') {
            return hasPermission('settings.manage') || role === 'Business Owner' || role === 'Tenant Owner';
          }
          if (subLower === 'bar setup & tables' || subLower === 'measurement units (pours/bottles)' || subLower === 'happy hour rules' || subLower === 'role permissions') {
            return hasPermission('settings.manage');
          }
          if (subLower === 'business profile & identity') {
            return hasPermission('business_profile.view') || ['Super Admin', 'Business Owner', 'Tenant Owner', 'Business Administrator', 'Accountant', 'Read Only Auditor'].includes(role);
          }
          if (
            subLower === 'pos configurations' ||
            subLower === 'inventory rules' ||
            subLower === 'tax & billing' ||
            subLower === 'security policies' ||
            subLower === 'terminals & sessions' ||
            subLower === 'subscriptions & billing' ||
            subLower === 'change log'
          ) {
            return hasPermission('settings.manage') || ['Super Admin', 'Business Owner', 'Tenant Owner', 'Business Administrator'].includes(role);
          }
          return true;
        }) || [];
        return { ...item, subItems: filteredSubs };
      })
      .filter(item => {
        if (typeof item === 'string') {
          return hasSidebarItemPermission(item);
        }
        return item.subItems.length > 0 && hasSidebarItemPermission(item.name);
      });
  }, [rawSidebarItems, role, jwtClaims, hasPermission]);

  // Auto-expand parent if its sub-item is active
  useEffect(() => {
    sidebarItems.forEach((item) => {
      if (typeof item !== 'string' && item.subItems?.includes(activeTab)) {
        if (!expandedMenus[item.name]) {
          setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
        }
      }
    });
  }, [activeTab, sidebarItems, expandedMenus]);

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Icon mapping helper
  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n === 'dashboard') return <BarChart3 className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'pos') return <ShoppingCart className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('inventory') || n === 'products' || n === 'medicines') return <Package className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'customers' || n === 'members' || n === 'patients' || n === 'clients' || n === 'guests' || n === 'students' || n === 'tenants' || n === 'employees' || n === 'staff' || n === 'users & roles') return <Users className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'reports') return <LineChart className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'settings') return <Settings className="h-4.5 w-4.5 shrink-0" />;
    
    // Custom industry matches
    if (n === 'counter pos' || n === 'bar counter pos') return <ShoppingCart className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'recipe & pour control') return <GlassWater className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'shift & counter management') return <Clock className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'staff & commissions') return <UserCheck className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'reports & analytics') return <LineChart className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'tables') return <Grid className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('kitchen')) return <CookingPot className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'prescriptions') return <FileText className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'savings' || n === 'shares') return <Coins className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'loans') return <TrendingUp className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'projects') return <HardHat className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'cases') return <Gavel className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'properties') return <Home className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'crops' || n === 'farms') return <Sprout className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'repairs') return <Wrench className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('pump') || n.includes('tank')) return <Fuel className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'classes' || n === 'exams') return <GraduationCap className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'books') return <BookOpen className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'guards') return <Shield className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('water') || n === 'meters') return <Droplet className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'vehicles' || n === 'routes') return <Bus className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('waste') || n.includes('collection')) return <Trash2 className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('bulk') || n === 'warehouses') return <Boxes className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'suppliers' || n === 'distributors & suppliers') return <Truck className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'purchasing' || n === 'purchasing & supplies') return <ShoppingCart className="h-4.5 w-4.5 shrink-0" />;
    if (n.includes('purchase orders') || n === 'goods received') return <ClipboardList className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'sizes' || n === 'colors' || n === 'variants') return <Shirt className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'services' || n === 'appointments') return <Briefcase className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'salon' || n === 'commission') return <Scissors className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'rooms' || n === 'reservations') return <Bed className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'expenses' || n === 'expense ledger' || n === 'operating expenses') return <Receipt className="h-4.5 w-4.5 shrink-0" />;
    
    // Poultry & Livestock specific matches
    if (n === 'animals') return <Footprints className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'poultry management') return <Egg className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'livestock operations') return <Sprout className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'health & veterinary') return <Heart className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'feed management') return <Boxes className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'farm management') return <Home className="h-4.5 w-4.5 shrink-0" />;

    // Super Admin specific matches
    if (n === 'tenant management') return <Users className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'demo data engine') return <Database className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'business categories') return <Grid className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'subscriptions') return <DollarSign className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'billing & finance') return <Coins className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'users & roles') return <Shield className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'platform monitoring') return <Activity className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'ai management') return <Sparkles className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'marketplace') return <Boxes className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'support center') return <HelpCircle className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'notifications') return <Droplet className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'security center') return <Shield className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'developer center') return <Wrench className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'backup & recovery') return <Database className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'activity center') return <BarChart3 className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'platform updates') return <TrendingUp className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'integrations') return <Boxes className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'system settings') return <Settings className="h-4.5 w-4.5 shrink-0" />;
    
    // Business Consultant module matches
    if (n === 'engagements') return <ClipboardList className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'proposals' || n === 'contracts') return <FileText className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'time tracking') return <Clock className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'meetings') return <Calendar className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'assessments') return <ClipboardList className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'strategy') return <Target className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'invoicing') return <Receipt className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'team') return <Users className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'knowledge base') return <BookOpen className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'ai consultant') return <Sparkles className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'communications') return <MessageSquare className="h-4.5 w-4.5 shrink-0" />;
    if (n === 'administration') return <Settings className="h-4.5 w-4.5 shrink-0" />;

    return <HelpCircle className="h-4.5 w-4.5 shrink-0" />;
  };

  const renderSidebarItem = (item: SidebarItem) => {
    // 1. Render Flat String Item
    if (typeof item === 'string') {
      const isActive = activeTab === item;
      return (
        <button
          key={item}
          onClick={() => setActiveTab(item)}
          className={`flex w-full items-center space-x-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            isActive
              ? 'bg-primary text-white shadow-sm dark:bg-primary-dark font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          {getIcon(item)}
          <span className="truncate">{item}</span>
        </button>
      );
    }

    // 2. Render Nested Parent-Child Tree Item
    const parentItem = item as NestedSidebarItem;
    const isExpanded = !!expandedMenus[parentItem.name];
    const isAnyChildActive = parentItem.subItems?.includes(activeTab) || false;

    return (
      <div key={parentItem.name} className="space-y-1">
        {/* Parent Toggle Button */}
        <button
          onClick={() => toggleMenu(parentItem.name)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
            isAnyChildActive
              ? 'text-primary dark:text-primary-dark font-bold bg-primary/5 dark:bg-primary-dark/10'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-3 truncate">
            {getIcon(parentItem.name)}
            <span className="truncate">{parentItem.name}</span>
          </div>
          <ChevronDown 
            className={`h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Child Submenu list */}
        {isExpanded && parentItem.subItems && (
          <div className="pl-6 border-l border-slate-100 dark:border-darkbg-border/40 ml-5 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
            {parentItem.subItems.map((sub) => {
              const isSubActive = activeTab === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setActiveTab(sub)}
                  className={`flex w-full items-center space-x-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    isSubActive
                      ? 'text-primary font-bold bg-primary/5 dark:text-primary-dark dark:bg-primary-dark/10'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="h-1 w-1 rounded-full bg-slate-400" />
                  <span className="truncate">{sub}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-slate-200 bg-white dark:border-darkbg-border dark:bg-darkbg-card md:flex shadow-sm shrink-0 overflow-hidden">
      {/* Module Title info */}
      <div className="flex items-center space-x-2.5 border-b border-slate-100 p-4 dark:border-darkbg-border/30 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-0.5 shadow-sm border border-slate-200/70 dark:border-darkbg-border overflow-hidden shrink-0">
          <img src="/dukapos-logo.png" alt="DukaPos Logo" className="h-full w-full object-contain" />
        </div>
        <div className="truncate">
          <h2 className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
            {isSuperAdminView ? 'SaaS Control Plane' : manifest.name}
          </h2>
          <p className="text-[10px] font-semibold text-slate-400 capitalize truncate mt-0.5">{role.toLowerCase()}</p>
        </div>
      </div>

      {/* Dynamic Nav List Scrollable */}
      <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto scrollbar-thin">
        {sidebarItems.map((item) => renderSidebarItem(item))}
      </nav>

    </aside>
  );
};
