import React from 'react';
import { useModule } from '../../context/ModuleContext';
import { LayoutDashboard, ShoppingCart, Package, LineChart, Settings as SettingsIcon } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useModule();

  // Map sub-tabs to their primary parent navigation tab
  const isPosActive = [
    'POS', 'New Sale', 'Sales History', 'Returns', 
    'Counter POS', 'Bar Counter POS', 'Active Tables', 'Open Tabs & Bills', 'Order History'
  ].includes(activeTab);

  const isInventoryActive = [
    'Inventory', 'Products', 'Categories', 'Categories & Brands', 'Categories & brands',
    'Medicines', 'Stock Sync Engine', 'Stock Sync', 'Stock Ledger Sync',
    'Product Bundles & Kits', 'Product Bundles', 'Bundles & Kits',
    'Stock Adjustment', 'Stock Transfer', 'Stock Alerts', 'Beverage Inventory'
  ].includes(activeTab);

  const isReportsActive = [
    'Reports', 'Sales', 'Profit', 'Tax', 'Daily Sales Summary', 
    'Fast-Moving Drinks', 'Pour Variance Report', 'Profit Margin Analysis', 'Reports & Analytics'
  ].includes(activeTab);

  const isSettingsActive = [
    'Settings', 'General Settings', 'Business Profile & Identity', 'POS Configurations',
    'Inventory Rules', 'Tax & Billing', 'Security Policies', 'Terminals & Sessions',
    'Subscriptions & Billing', 'Developer Options', 'User Manual & Guide', 'User Manual',
    'Change Log', 'Plans & Pricing', 'Coupons', 'Grace Periods', 'Features',
    'Usage Meter', 'Audit Log', 'Users & Roles', 'Employees'
  ].includes(activeTab);

  const isDashboardActive = activeTab === 'Dashboard';

  const navItems = [
    { 
      name: 'Dashboard', 
      tabKey: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
      isActive: isDashboardActive 
    },
    { 
      name: 'POS', 
      tabKey: 'POS',
      icon: <ShoppingCart className="h-5 w-5" />,
      isActive: isPosActive 
    },
    { 
      name: 'Inventory', 
      tabKey: 'Inventory',
      icon: <Package className="h-5 w-5" />,
      isActive: isInventoryActive 
    },
    { 
      name: 'Reports', 
      tabKey: 'Reports',
      icon: <LineChart className="h-5 w-5" />,
      isActive: isReportsActive 
    },
    { 
      name: 'Settings', 
      tabKey: 'Settings',
      icon: <SettingsIcon className="h-5 w-5" />,
      isActive: isSettingsActive 
    }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation Footer" 
      className="fixed bottom-0 inset-x-0 z-40 flex h-16 w-full items-center justify-around border-t border-slate-200/90 bg-white/95 px-4 py-1.5 shadow-2xl backdrop-blur-xl dark:border-darkbg-border dark:bg-darkbg-card/95 md:hidden transition-all"
    >
      <div className="flex w-full max-w-md mx-auto items-center justify-around">
        {navItems.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActiveTab(item.tabKey)}
            aria-current={item.isActive ? 'page' : undefined}
            className={`relative flex flex-col items-center justify-center space-y-0.5 rounded-xl px-3 py-1 transition-all duration-200 active:scale-95 ${
              item.isActive
                ? 'text-primary dark:text-primary-dark font-bold'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
            }`}
          >
            {item.isActive && (
              <span className="absolute -top-1.5 h-1 w-5 rounded-full bg-primary dark:bg-primary-dark shadow-sm" />
            )}
            {item.icon}
            <span className="text-[10px] tracking-tight">{item.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

