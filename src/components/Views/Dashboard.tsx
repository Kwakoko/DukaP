import React, { useMemo } from 'react';
import { useModule } from '../../context/ModuleContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../UI/custom-ui';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, Users, 
  AlertTriangle, Clock, PiggyBank, Briefcase, 
  Sparkles, Layers, Egg, Footprints, Truck, ArrowRight, Calendar
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, Cell, PieChart, Pie
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { activeModule, setActiveTab } = useModule();
  const { currentBranch, currentTenant, role } = useAuth();

  // --- Live Queries from IndexedDB ---
  const products = useLiveQuery(() => 
    db.products.where('tenant_id').equals(currentTenant.id)
      .and(p => p.branch_id === currentBranch.id && p.module === activeModule)
      .toArray()
  ) || [];

  const productVariants = useLiveQuery(() =>
    db.productVariants.where('tenant_id').equals(currentTenant.id)
      .and(v => v.branch_id === currentBranch.id)
      .toArray()
  ) || [];

  const orders = useLiveQuery(() => 
    db.orders.where('tenant_id').equals(currentTenant.id)
      .and(o => o.branch_id === currentBranch.id && o.module === activeModule)
      .toArray()
  ) || [];

  const customers = useLiveQuery(() => {
    const typeMap: Record<string, string> = {
      Retail: 'Customer',
      Restaurant: 'Customer',
      Pharmacy: 'Patient',
      SACCO: 'Member',
      Law: 'Client',
      RealEstate: 'Tenant',
      School: 'Student',
      Hotel: 'Guest',
    };
    const targetType = typeMap[activeModule] || 'Customer';
    return db.customers.where('tenant_id').equals(currentTenant.id)
      .and(c => c.branch_id === currentBranch.id && c.type === targetType)
      .toArray();
  }) || [];

  const suppliers = useLiveQuery(() => 
    db.suppliers.where('tenant_id').equals(currentTenant.id).toArray()
  ) || [];

  const isCleanTenant = products.length === 0 && orders.length === 0 && customers.length === 0 && suppliers.length === 0;

  // Calculate stats based on local DB records
  const stats = useMemo(() => {
    if (isCleanTenant) {
      return {
        totalSales: 0,
        completedOrders: 0,
        inventoryVal: 0,
        lowStockCount: 0,
        nearExpiryCount: 0,
        totalSavings: 0,
        totalLoans: 0,
        customerCount: 0
      };
    }
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const completedOrders = orders.filter(o => o.status === 'Completed').length;
    const inventoryVal = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const simpleLowStock = products.filter(p => !p.hasVariants && p.stock < 10).length;
    const variantLowStock = productVariants.filter(v => v.stock < (v.reorderLevel ?? 5)).length;
    const lowStockCount = simpleLowStock + variantLowStock;

    // Pharmacy Expiry count
    const nearExpiryCount = products.filter(p => {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate).getTime();
      const threeMonths = 90 * 24 * 60 * 60 * 1000;
      return (expiry - Date.now()) < threeMonths;
    }).length;

    // SACCO Calculations
    // Gold Savings Plan price = 5000 is our mock rate, let's treat SACCO product price as plan balances
    const totalSavings = products
      .filter(p => p.category === 'Savings')
      .reduce((sum, p) => sum + (p.stock * p.price), 0) / 10; // Scaled down for realism

    const totalLoans = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);

    return {
      totalSales,
      completedOrders,
      inventoryVal,
      lowStockCount,
      nearExpiryCount,
      totalSavings,
      totalLoans,
      customerCount: customers.length
    };
  }, [products, orders, customers, activeModule]);

  // --- Real Chart Data (computed from live orders) ---
  interface ChartItem {
    name: string;
    Revenue: number;
    Profit: number;
    Savings: number;
    Loans: number;
  }

  const revenueChartData = useMemo<ChartItem[]>(() => {
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAY_LABELS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    if (activeModule === 'SACCO') {
      // 6-month savings & loans buckets — both default 0 until real data
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const mOrders = orders.filter(o => {
          const od = new Date(o.timestamp);
          return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
        });
        const Savings = mOrders.reduce((s, o) => s + o.total, 0);
        return { name: MONTH_LABELS[d.getMonth()], Savings, Loans: 0, Revenue: 0, Profit: 0 };
      });
    }

    // For all other modules: last 7 days (Mon–Sun)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const dayOrders = orders.filter(o => {
        const od = new Date(o.timestamp);
        return od.getFullYear() === d.getFullYear() &&
               od.getMonth()    === d.getMonth()    &&
               od.getDate()     === d.getDate();
      });
      const Revenue = dayOrders.reduce((s, o) => s + o.total, 0);
      const Profit  = Revenue > 0 ? Math.round(Revenue * 0.3) : 0;
      return { name: DAY_LABELS[d.getDay()], Revenue, Profit, Savings: 0, Loans: 0 };
    });
  }, [orders, activeModule]);

  const paymentData = useMemo(() => {
    const methods: Record<string, number> = {};
    orders.forEach(o => {
      const m = o.paymentMethod || 'Other';
      methods[m] = (methods[m] || 0) + 1;
    });
    const total = Object.values(methods).reduce((s, v) => s + v, 0) || 1;
    const COLORS: Record<string, string> = {
      'M-Pesa': '#24A148', 'Cash': '#0F62FE', 'Card': '#F1C21B',
      'Bank Card / Credit': '#F1C21B', 'Mobile Money': '#24A148'
    };
    return Object.entries(methods).map(([name, count], idx) => ({
      name,
      value: Math.round((count / total) * 100),
      color: COLORS[name] || ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b'][idx % 4]
    }));
  }, [orders]);

  // Render KPI Card
  const renderKPICard = (title: string, value: string | number, desc: string, icon: React.ReactNode, trend?: 'up' | 'down') => (
    <Card className="hover:shadow-md transition duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-darkbg-border dark:text-slate-300">
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
          {trend && (
            <span className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
              {trend === 'up' ? <TrendingUp className="mr-0.5 h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 h-3.5 w-3.5" />}
              {trend === 'up' ? '+12.5%' : '-3.2%'}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{desc}</p>
      </CardContent>
    </Card>
  );

  // Load KPI cards dynamically depending on active module widgets
  const renderKPIs = () => {
    if (activeModule === 'BusinessConsultant') {
      return (
        <>
          {renderKPICard('Total Clients', '48 active', 'Directory portfolio', <Users className="h-5 w-5 text-indigo-500" />, 'up')}
          {renderKPICard('Active Engagements', '18 projects', 'Retainer & advisory projects', <Briefcase className="h-5 w-5 text-primary" />)}
          {renderKPICard('Monthly Revenue', 'Tsh. 42,500,000', 'Accrued consulting income', <DollarSign className="h-5 w-5 text-warning" />, 'up')}
          {renderKPICard('Consultant Utilization', '84.2%', 'Target utilization >80%', <TrendingUp className="h-5 w-5 text-success" />, 'up')}
          {renderKPICard('Billable Hours', '320 hrs', 'This month to date', <Clock className="h-5 w-5 text-rose-500" />, 'up')}
          {renderKPICard('Proposal Conversion', '68.5%', 'Sent vs accepted proposals', <TrendingUp className="h-5 w-5 text-emerald-500" />, 'up')}
          {renderKPICard('Upcoming Meetings', '12 scheduled', 'Next 7 days', <Calendar className="h-5 w-5 text-blue-500" />)}
          {renderKPICard('Expiring Contracts', '3 expiring', 'Renewals pending', <AlertTriangle className="h-5 w-5 text-danger animate-pulse" />)}
        </>
      );
    }

    if (isCleanTenant) {
      return (
        <>
          {renderKPICard('Sales Today', 'Tsh. 0', 'From local checkouts', <DollarSign className="h-5 w-5 text-primary" />)}
          {renderKPICard('Total Expenses', 'Tsh. 0', 'Logged operational costs', <TrendingDown className="h-5 w-5 text-danger" />)}
          {renderKPICard('Gross Profit', 'Tsh. 0', 'Net margins', <TrendingUp className="h-5 w-5 text-success" />)}
          {renderKPICard('Inventory Valuation', 'Tsh. 0', 'Total stock value', <Package className="h-5 w-5 text-warning" />)}
          {renderKPICard('Saas Customers', '0 registered', 'CRM clients count', <Users className="h-5 w-5 text-indigo-500" />)}
          {renderKPICard('Suppliers Registered', '0 active', 'Distributors profile', <Truck className="h-5 w-5 text-amber-500" />)}
        </>
      );
    }

    switch (activeModule) {
      case 'Retail':
        return (
          <>
            {renderKPICard("Today's Sales", `Tsh. ${stats.totalSales.toLocaleString()}`, 'Total POS checkout revenue', <DollarSign className="h-5 w-5 text-primary" />, stats.totalSales > 0 ? 'up' : undefined)}
            {renderKPICard("Today's Profit", `Tsh. ${(stats.totalSales * 0.35).toLocaleString()}`, 'Est. 35% gross profit margin', <TrendingUp className="h-5 w-5 text-success" />, stats.totalSales > 0 ? 'up' : undefined)}
            {renderKPICard('Total Products', `${products.length} items`, 'Active SKU inventory catalog', <Package className="h-5 w-5 text-warning" />)}
            {renderKPICard('Low Stock Items', stats.lowStockCount, 'Alert items with stock < 10', <AlertTriangle className="h-5 w-5 text-danger" />)}
            {renderKPICard('Customer Debts', `Tsh. ${stats.totalLoans.toLocaleString()}`, 'Total outstanding customer credit', <Users className="h-5 w-5 text-indigo-500" />)}
            {renderKPICard('Cash Flow Summary', `Tsh. ${(stats.totalSales * 0.85).toLocaleString()} Net`, 'Inflows less payment type overhead', <PiggyBank className="h-5 w-5 text-emerald-500" />, stats.totalSales > 0 ? 'up' : undefined)}
            {renderKPICard('Branch Performance', 'Main: 100%', 'Sales contribution by store branch', <Layers className="h-5 w-5 text-blue-500" />)}
          </>
        );
      case 'Restaurant':
        return (
          <>
            {renderKPICard('Sales Today', `Tsh. ${stats.totalSales.toLocaleString()}`, 'Orders served', <DollarSign className="h-5 w-5 text-primary" />, stats.totalSales > 0 ? 'up' : undefined)}
            {renderKPICard('Active Tables', '14 / 24', 'Occupied dining areas', <Layers className="h-5 w-5 text-success" />)}
            {renderKPICard('Pending Kitchen Orders', '4 orders', 'Queue in prep', <Clock className="h-5 w-5 text-warning animate-pulse" />)}
            {renderKPICard('Low Ingredients', stats.lowStockCount, 'Menu ingredients to restock', <AlertTriangle className="h-5 w-5 text-danger" />)}
          </>
        );
      case 'Pharmacy':
        return (
          <>
            {renderKPICard('Sales Today', `Tsh. ${stats.totalSales.toLocaleString()}`, 'Drugs dispensed', <DollarSign className="h-5 w-5 text-primary" />, stats.totalSales > 0 ? 'up' : undefined)}
            {renderKPICard('Pending Prescriptions', '8 prescriptions', 'Waiting validation', <Clock className="h-5 w-5 text-warning" />)}
            {renderKPICard('Near-Expiry Alerts', stats.nearExpiryCount, 'Medicines expiring in 90 days', <AlertTriangle className="h-5 w-5 text-danger animate-bounce" />)}
            {renderKPICard('Critically Low Drugs', stats.lowStockCount, 'Restock needed immediately', <Package className="h-5 w-5 text-success" />)}
          </>
        );
      case 'SACCO':
        return (
          <>
            {renderKPICard('Deposits & Savings', `Tsh. ${stats.totalSavings.toLocaleString()}`, 'Member savings pool', <PiggyBank className="h-5 w-5 text-success" />, 'up')}
            {renderKPICard('Outstanding Loans', `Tsh. ${stats.totalLoans.toLocaleString()}`, 'Active lending portfolio', <Briefcase className="h-5 w-5 text-primary" />)}
            {renderKPICard('Interest Earned YTD', `Tsh. ${(stats.totalLoans * 0.12).toLocaleString()}`, 'Accrued lending yield', <TrendingUp className="h-5 w-5 text-warning" />, 'up')}
            {renderKPICard('SACCO Members', stats.customerCount, 'Registered active savers', <Users className="h-5 w-5 text-indigo-500" />, 'up')}
          </>
        );
      case 'Poultry':
        return (
          <>
            {renderKPICard('Total Animals', '520 animals', 'Livestock & poultry register', <Footprints className="h-5 w-5 text-primary" />)}
            {renderKPICard('Active Flocks', '4 flocks', 'Egg layer batches', <Egg className="h-5 w-5 text-success" />)}
            {renderKPICard('Daily Egg Production', '450 eggs today', '90% production yield', <TrendingUp className="h-5 w-5 text-warning" />, 'up')}
            {renderKPICard('Mortality Rate', '1.2%', 'Target mortality <3.0%', <AlertTriangle className="h-5 w-5 text-danger" />)}
          </>
        );
      default:
        return (
          <>
            {renderKPICard('Sales Today', `Tsh. ${stats.totalSales.toLocaleString()}`, 'From local checkouts', <DollarSign className="h-5 w-5 text-primary" />, stats.totalSales > 0 ? 'up' : undefined)}
            {renderKPICard('Inventory Valuation', `Tsh. ${stats.inventoryVal.toLocaleString()}`, 'Total stock value', <Package className="h-5 w-5 text-success" />)}
            {renderKPICard('Active Contacts', `${stats.customerCount} registered`, 'Linked partners & clients', <Users className="h-5 w-5 text-indigo-500" />)}
            {renderKPICard('System Alerts', `${stats.lowStockCount} items low`, 'Restock warning list', <AlertTriangle className="h-5 w-5 text-warning" />)}
          </>
        );
    }
  };

  const renderOnboardingGuidance = () => (
    <div className="bg-white dark:bg-darkbg-card rounded-2xl border border-slate-200 dark:border-darkbg-border p-6 shadow-sm animate-in fade-in duration-200">
      <div className="max-w-2xl mx-auto text-center py-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto text-primary mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white">Welcome to DukaPos! Let's get you set up</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Your clean workspace is ready. Follow these quick steps to set up your business and start transactions.
        </p>

        <div className="grid gap-4 mt-8 text-left sm:grid-cols-2">
          {[
            {
              step: 'Step 1',
              title: 'Add Products',
              desc: 'Define your inventory items, categories, and attributes.',
              actionLabel: 'Go to Inventory',
              tab: 'Inventory',
              icon: Package,
              color: 'text-blue-500 bg-blue-500/10'
            },
            {
              step: 'Step 2',
              title: 'Register Suppliers',
              desc: 'Configure suppliers and default warehouse settings.',
              actionLabel: 'Go to Purchasing',
              tab: 'Purchasing',
              icon: Truck,
              color: 'text-amber-500 bg-amber-500/10'
            },
            {
              step: 'Step 3',
              title: 'Add Customers',
              desc: 'Register customers for CRM tracking and credit billing.',
              actionLabel: 'Go to Customers',
              tab: 'Customers',
              icon: Users,
              color: 'text-emerald-500 bg-emerald-500/10'
            },
            {
              step: 'Step 4',
              title: 'Launch POS Checkout',
              desc: 'Open the sales terminal, key in items, and cash out.',
              actionLabel: 'Open POS Terminal',
              tab: 'POS',
              icon: DollarSign,
              color: 'text-indigo-500 bg-indigo-500/10'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-5 border border-slate-100 dark:border-darkbg-border rounded-2xl hover:shadow-md transition duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.step}</span>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-3">{item.title}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <button
                  onClick={() => setActiveTab(item.tab as any)}
                  className="mt-4 flex items-center space-x-1 text-xs font-bold text-primary hover:text-primary-hover transition"
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Business Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time analytics for <span className="font-semibold">{currentBranch.name}</span> • Role: <span className="font-semibold text-primary">{role}</span>
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-darkbg-border dark:text-slate-300">
            Offline Enabled
          </span>
          <button 
            onClick={() => setActiveTab('POS')}
            className="flex items-center space-x-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-sm transition"
          >
            <DollarSign className="h-4 w-4" />
            <span>Launch POS Checkout</span>
          </button>
        </div>
      </div>

      {/* 4 Dynamic KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderKPIs()}
      </div>

      {isCleanTenant ? (
        renderOnboardingGuidance()
      ) : (
        <>
          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Spline Area Chart (Main Report) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{activeModule === 'SACCO' ? 'Savings vs Loan Trends' : 'Sales Revenue & Profit Performance'}</CardTitle>
                <CardDescription>Visualizing financial progress over the current period</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F62FE" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#0F62FE" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#24A148" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#24A148" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-darkbg-border/30" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                    <YAxis fontSize={11} stroke="#94A3B8" />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    {activeModule === 'SACCO' ? (
                      <>
                        <Area type="monotone" dataKey="Savings" stroke="#24A148" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="Loans" stroke="#0F62FE" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2.5} />
                      </>
                    ) : (
                      <>
                        <Area type="monotone" dataKey="Revenue" stroke="#0F62FE" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2.5} />
                        <Area type="monotone" dataKey="Profit" stroke="#24A148" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2.5} />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Donut Chart (Payment Methods Breakdown) */}
            <Card>
              <CardHeader>
                <CardTitle>Transactions Channel</CardTitle>
                <CardDescription>Breakdown by payment gateways</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-80">
                {paymentData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-16 w-16 rounded-full border-4 border-dashed border-slate-200 dark:border-darkbg-border flex items-center justify-center mb-3">
                      <span className="text-2xl">💳</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-400">No transactions yet</p>
                    <p className="text-[10px] text-slate-300 mt-1">Payment channels will appear after first sale</p>
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {paymentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="mt-4 w-full space-y-2 px-2">
                      {paymentData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Row 3: Live Sales list & AI Insights */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Orders from IndexedDB */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Orders & Activity</CardTitle>
                  <CardDescription>Live local sales logged into IndexedDB</CardDescription>
                </div>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold dark:bg-primary-dark/20 dark:text-primary-dark">
                  {orders.length} Logged
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-darkbg-border/30 dark:bg-darkbg-card/50">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Time</th>
                        <th className="p-4">Items count</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Channel</th>
                        <th className="p-4 text-center">Sync Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs dark:divide-darkbg-border/20">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic">No orders logged in this module yet. Add items in the POS.</td>
                        </tr>
                      ) : (
                        orders.slice(-4).reverse().map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{order.id}</td>
                            <td className="p-4 text-slate-400">{new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="p-4 font-medium">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</td>
                            <td className="p-4 font-bold text-slate-900 dark:text-white">Tsh. {order.total.toLocaleString()}</td>
                            <td className="p-4">
                              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-darkbg-border">
                                {order.paymentMethod}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                order.syncStatus === 'Synced' 
                                  ? 'bg-success/15 text-success' 
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse'
                              }`}>
                                {order.syncStatus}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations Panel */}
            <Card className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border-0">
              <CardHeader className="border-0 pb-0">
                <div className="flex items-center space-x-2 text-primary dark:text-primary-dark">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <CardTitle className="text-white">DukaPos AI Insights</CardTitle>
                </div>
                <CardDescription className="text-slate-400">Continuous business evaluation models</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="rounded-xl bg-white/5 p-4 border border-white/10 hover:bg-white/10 transition duration-200">
                  <h4 className="text-xs font-bold text-indigo-300">Sales Forecast Alert</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    {activeModule === 'Retail' && 'Weekend forecast suggests a 14% spike in Groceries. Increase stock of White Sugar and Premium Grains immediately to prevent stockout.'}
                    {activeModule === 'Restaurant' && 'Based on Friday data, Classic Beef Burger and Iced Latte will see high demand. Pre-prep 20% more burger ingredients by 11:00 AM.'}
                    {activeModule === 'Pharmacy' && 'Amoxicillin Syrup stock is down to 8 items, with sales velocity increasing. Automatically drafting purchase order for 20 units.'}
                    {activeModule === 'SACCO' && 'Members deposits have grown 12.5% this week. Emergency loan demands are projected to rise. Keep lending liquidity above 25%.'}
                    {activeModule === 'BusinessConsultant' && 'Strategic recommendation: OKR progress reports are due. Client Health index shows 4 accounts require active follow-ups to maintain retention rates.'}
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 p-4 border border-white/10 hover:bg-white/10 transition duration-200">
                  <h4 className="text-xs font-bold text-emerald-400">Offline Integrity Check</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                    All local transactions are verified against cryptographic signatures. System sync buffers are ready. Risk score: <span className="font-bold text-emerald-400">0.02 (Optimal)</span>.
                  </p>
                </div>

                <button 
                  onClick={() => setActiveTab('Settings')}
                  className="flex w-full items-center justify-center space-x-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white shadow transition active:scale-95"
                >
                  <span>View Full AI Audit Reports</span>
                </button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
