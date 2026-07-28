import React from 'react';
import { useModule } from '../../context/ModuleContext';
import { BarChart3, ShoppingCart, Package, LineChart, Menu } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab } = useModule();

  const navItems = [
    { name: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { name: 'POS', icon: <ShoppingCart className="h-5 w-5" /> },
    { name: 'Inventory', icon: <Package className="h-5 w-5" /> },
    { name: 'Reports', icon: <LineChart className="h-5 w-5" /> },
    { name: 'Settings', icon: <Menu className="h-5 w-5" /> }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white px-2 py-1 shadow-lg dark:border-darkbg-border dark:bg-darkbg-card md:hidden">
      {navItems.map((item) => (
        <button
          key={item.name}
          onClick={() => setActiveTab(item.name)}
          className={`flex flex-col items-center justify-center space-y-1 rounded-lg px-3 py-1.5 transition ${
            activeTab === item.name || (item.name === 'Inventory' && (activeTab === 'Medicines' || activeTab === 'Products'))
              ? 'text-primary dark:text-primary-dark font-bold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {item.icon}
          <span className="text-[10px]">{item.name}</span>
        </button>
      ))}
    </nav>
  );
};
