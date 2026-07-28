import React, { useState, useEffect, useMemo } from 'react';
import { useModule } from '../../context/ModuleContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../UI/custom-ui';
import { 
  Download, Printer, Activity, Layers, 
  AlertTriangle, Shield, TrendingUp, DollarSign, BarChart2,
  FileText, ShoppingCart, Percent, Calculator
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line
} from 'recharts';

const EXPENSE_COLORS: Record<string, string> = {
  Rent: '#6366F1',
  Salaries: '#0EA5E9',
  Utilities: '#F59E0B',
  Other: '#8B5CF6',
  'Licensing & Permits': '#10B981',
  'Damaged/Broken Stock': '#EF4444',
};
const FALLBACK_COLOR = '#94A3B8';

type MainReportTab = 'sales' | 'profit' | 'inventory' | 'tax';

export const Reports: React.FC = () => {
  const { activeModule, activeTab: sidebarActiveTab } = useModule();
  const { currentBranch, currentTenant, role, hasPermission } = useAuth();
  
  const canViewReports = hasPermission('reports.view') || hasPermission('reports.branch') || hasPermission('financial_reports.view');

  // --- IndexedDB Live Queries ---
  const products = useLiveQuery(() => 
    db.products.where('tenant_id').equals(currentTenant.id)
      .and(p => p.branch_id === currentBranch.id && p.module === activeModule)
      .toArray()
  , [currentTenant.id, currentBranch.id, activeModule]) || [];

  const productVariants = useLiveQuery(() =>
    db.productVariants.where('tenant_id').equals(currentTenant.id)
      .and(v => v.branch_id === currentBranch.id)
      .toArray()
  , [currentTenant.id, currentBranch.id]) || [];

  const orders = useLiveQuery(() => 
    db.orders.where('tenant_id').equals(currentTenant.id)
      .and(o => o.branch_id === currentBranch.id && o.module === activeModule)
      .toArray()
  , [currentTenant.id, currentBranch.id, activeModule]) || [];

  const expenses = useLiveQuery(() =>
    db.expenses.where('tenant_id').equals(currentTenant.id)
      .and(e => e.branch_id === currentBranch.id)
      .toArray()
  , [currentTenant.id, currentBranch.id]) || [];

  // --- Main Tab State ---
  const [activeTab, setActiveTab] = useState<MainReportTab>('sales');

  // --- Synchronize Sidebar Navigation with local report sub-tab ---
  useEffect(() => {
    switch (sidebarActiveTab) {
      case 'Sales':
        setActiveTab('sales');
        break;
      case 'Profit':
        setActiveTab('profit');
        break;
      case 'Inventory':
        setActiveTab('inventory');
        break;
      case 'Tax':
        setActiveTab('tax');
        break;
      default:
        // Keep active tab as is if navigated generally
        break;
    }
  }, [sidebarActiveTab]);

  // --- 1. Product cost lookup helper ---
  const costLookup = useMemo(() => {
    const prodMap = new Map<string, number>();
    const varMap = new Map<string, number>();
    
    products.forEach(p => {
      prodMap.set(p.id, p.buyingPrice || 0);
    });
    productVariants.forEach(v => {
      const parentCost = prodMap.get(v.productId) || 0;
      varMap.set(v.id, v.buyingPrice !== undefined ? v.buyingPrice : parentCost);
    });

    return {
      getProductCost: (productId: string) => prodMap.get(productId) || 0,
      getVariantCost: (variantId: string, productId: string) => varMap.get(variantId) || prodMap.get(productId) || 0
    };
  }, [products, productVariants]);

  // --- 2. Dynamic Sales & Profit History (6-Month Window) ---
  const salesHistory = useMemo(() => {
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
    }

    return months.map(({ label, year, month }) => {
      const monthOrders = orders.filter(o => {
        const d = new Date(o.timestamp);
        return d.getFullYear() === year && d.getMonth() === month && o.status !== 'Cancelled';
      });
      const Sales = monthOrders.reduce((s, o) => s + o.total, 0);

      let monthlyCOGS = 0;
      monthOrders.forEach(o => {
        o.items.forEach(item => {
          const cost = item.variantId 
            ? costLookup.getVariantCost(item.variantId, item.productId)
            : costLookup.getProductCost(item.productId);
          monthlyCOGS += cost * item.quantity;
        });
      });

      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month && e.status === 'Paid';
      });
      const Expenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

      const NetProfit = Sales - monthlyCOGS - Expenses;

      return { name: label, Sales, Expenses, NetProfit: Math.max(NetProfit, 0) };
    });
  }, [orders, expenses, costLookup]);

  // --- 3. Expense Allocation by Category ---
  const expenseAllocation = useMemo(() => {
    const buckets: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.status === 'Paid') {
        buckets[e.category] = (buckets[e.category] || 0) + e.amount;
      }
    });
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // --- 4. Real-time KPI Stats ---
  const kpiStats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'Cancelled');
    const totalSales = activeOrders.reduce((s, o) => s + o.total, 0);
    const totalExpenses = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const orderCount = activeOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

    let totalCOGS = 0;
    activeOrders.forEach(o => {
      o.items.forEach(item => {
        const cost = item.variantId 
          ? costLookup.getVariantCost(item.variantId, item.productId)
          : costLookup.getProductCost(item.productId);
        totalCOGS += cost * item.quantity;
      });
    });

    const netProfit = totalSales - totalCOGS - totalExpenses;
    const margin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

    // Tax stats
    const totalTax = activeOrders.reduce((s, o) => s + (o.tax || 0), 0);
    const preTaxSales = Math.max(0, totalSales - totalTax);

    return { totalSales, totalExpenses, netProfit, margin, totalCOGS, orderCount, avgOrderValue, totalTax, preTaxSales };
  }, [orders, expenses, costLookup]);

  // --- 5. Unified Inventory Valuation ---
  const inventoryReportData = useMemo(() => {
    const data: any[] = [];

    // Simple Products
    const simple = products.filter(p => !p.hasVariants);
    simple.forEach(p => {
      const stockVal = p.stock * p.buyingPrice;
      const potentialProfit = p.stock * ((p.sellingPrice || p.price) - p.buyingPrice);
      data.push({
        id: p.id,
        sku: p.sku || '—',
        name: p.name,
        details: 'Simple Product',
        stock: p.stock,
        reorderLevel: p.reorderLevel ?? 5,
        buyingPrice: p.buyingPrice,
        sellingPrice: p.sellingPrice || p.price,
        stockValue: stockVal,
        potentialProfit
      });
    });

    // Variants
    productVariants.forEach(v => {
      const parent = products.find(p => p.id === v.productId);
      if (!parent) return;
      const effectiveBuyingPrice = v.buyingPrice !== undefined ? v.buyingPrice : parent.buyingPrice;
      const effectiveSellingPrice = v.sellingPrice !== undefined ? v.sellingPrice : (parent.sellingPrice || parent.price);
      const stockVal = v.stock * effectiveBuyingPrice;
      const potentialProfit = v.stock * (effectiveSellingPrice - effectiveBuyingPrice);

      data.push({
        id: v.id,
        sku: v.sku || '—',
        name: parent.name,
        details: Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' / '),
        stock: v.stock,
        reorderLevel: v.reorderLevel ?? 5,
        buyingPrice: effectiveBuyingPrice,
        sellingPrice: effectiveSellingPrice,
        stockValue: stockVal,
        potentialProfit
      });
    });

    return data;
  }, [products, productVariants]);

  // --- 6. Unified Sales & Margin Report ---
  const salesReportData = useMemo(() => {
    const stats: Record<string, { qty: number; revenue: number; cost: number }> = {};

    orders.filter(o => o.status !== 'Cancelled').forEach(o => {
      o.items.forEach(item => {
        const key = item.variantId || item.productId;
        if (!stats[key]) {
          stats[key] = { qty: 0, revenue: 0, cost: 0 };
        }
        const cost = item.variantId 
          ? costLookup.getVariantCost(item.variantId, item.productId)
          : costLookup.getProductCost(item.productId);

        stats[key].qty += item.quantity;
        stats[key].revenue += item.price * item.quantity;
        stats[key].cost += cost * item.quantity;
      });
    });

    const data: any[] = [];

    // Simple products sales
    const simple = products.filter(p => !p.hasVariants);
    simple.forEach(p => {
      const stat = stats[p.id] || { qty: 0, revenue: 0, cost: 0 };
      data.push({
        id: p.id,
        sku: p.sku || '—',
        name: p.name,
        details: 'Simple Product',
        quantitySold: stat.qty,
        revenue: stat.revenue,
        profit: stat.revenue - stat.cost
      });
    });

    // Variants sales
    productVariants.forEach(v => {
      const parent = products.find(p => p.id === v.productId);
      if (!parent) return;
      const stat = stats[v.id] || { qty: 0, revenue: 0, cost: 0 };
      data.push({
        id: v.id,
        sku: v.sku || '—',
        name: parent.name,
        details: Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' / '),
        quantitySold: stat.qty,
        revenue: stat.revenue,
        profit: stat.revenue - stat.cost
      });
    });

    return data.sort((a, b) => b.revenue - a.revenue);
  }, [products, productVariants, orders, costLookup]);

  // --- 7. Tax Ledger Report ---
  const taxReportData = useMemo(() => {
    return orders.filter(o => o.status !== 'Cancelled').map(o => {
      const preTax = Math.max(0, o.total - (o.tax || 0));
      return {
        id: o.id,
        timestamp: o.timestamp,
        paymentMethod: o.paymentMethod,
        total: o.total,
        tax: o.tax || 0,
        preTax
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [orders]);

  const lowStockCount = useMemo(() => {
    return inventoryReportData.filter(item => item.stock < item.reorderLevel).length;
  }, [inventoryReportData]);

  // --- Export active table to CSV ---
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = 'report';

    if (activeTab === 'sales') {
      headers = ['SKU', 'Product Name', 'Attributes/Details', 'Quantity Sold', 'Total Revenue', 'Margin Profit'];
      rows = salesReportData.map(s => [s.sku, s.name, s.details, s.quantitySold, s.revenue, s.profit]);
      filename = `${activeModule.toLowerCase()}_sales_margin_report`;
    } else if (activeTab === 'profit') {
      headers = ['Month', 'Sales Revenue (Tsh)', 'Operating Expenses (Tsh)', 'Est. Net Profit (Tsh)'];
      rows = salesHistory.map(h => [h.name, h.Sales, h.Expenses, h.NetProfit]);
      filename = `${activeModule.toLowerCase()}_profitability_cogs_history`;
    } else if (activeTab === 'inventory') {
      headers = ['SKU', 'Product Name', 'Attributes/Details', 'Current Stock', 'Reorder Level', 'Buying Cost', 'Selling Price', 'Valuation Cost', 'Potential Profit'];
      rows = inventoryReportData.map(i => [i.sku, i.name, i.details, i.stock, i.reorderLevel, i.buyingPrice, i.sellingPrice, i.stockValue, i.potentialProfit]);
      filename = `${activeModule.toLowerCase()}_inventory_valuation`;
    } else if (activeTab === 'tax') {
      headers = ['Order ID', 'Date & Time', 'Payment Method', 'Gross Amount (Tsh)', 'VAT Collected 16% (Tsh)', 'Pre-Tax Value (Tsh)'];
      rows = taxReportData.map(t => [t.id, new Date(t.timestamp).toLocaleString(), t.paymentMethod, t.total, t.tax, t.preTax]);
      filename = `${activeModule.toLowerCase()}_vat_tax_ledger`;
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  function fmtCcy(n: number): string {
    return `Tsh ${n.toLocaleString('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  if (!canViewReports) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-white dark:bg-darkbg-card rounded-2xl border border-slate-200 dark:border-darkbg-border shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30 text-danger mb-4 shadow-sm">
          <Shield className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Permission Denied</h3>
        <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Your current role (<span className="font-semibold text-primary">{role}</span>) does not have privileges to view Reports and Analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{activeTab === 'sales' ? 'Sales Revenue Analytics' : activeTab === 'profit' ? 'Profitability & COGS Audit' : activeTab === 'inventory' ? 'Inventory Valuation Register' : 'Tax & VAT Collected Registry'}</span>
            <Activity className="h-4.5 w-4.5 text-primary animate-pulse" />
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time reports for branch: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentBranch.name}</span>.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center space-x-1">
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintReport} className="flex items-center space-x-1">
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </Button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-darkbg-border shrink-0 overflow-x-auto text-xs font-bold">
        {[
          { id: 'sales', label: 'Sales Report', icon: <ShoppingCart className="h-4 w-4" /> },
          { id: 'profit', label: 'Profit & Loss', icon: <Percent className="h-4 w-4" /> },
          { id: 'inventory', label: `Inventory Valuation (${inventoryReportData.length})`, icon: <Layers className="h-4 w-4" /> },
          { id: 'tax', label: 'Tax Report (VAT)', icon: <Calculator className="h-4 w-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-1.5 px-4 py-3 border-b-2 transition -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary dark:border-primary-dark dark:text-primary-dark font-black'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: SALES REPORT ─── */}
      {activeTab === 'sales' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Sales KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Gross Sales Revenue', value: fmtCcy(kpiStats.totalSales), icon: <DollarSign />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
              { label: 'Completed Orders', value: `${kpiStats.orderCount} Orders`, icon: <ShoppingCart />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
              { label: 'Avg Order Value (AOV)', value: fmtCcy(kpiStats.avgOrderValue), icon: <Activity />, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20' },
              { label: 'Active Items Catalog', value: `${salesReportData.length} SKUs`, icon: <Layers />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' }
            ].map((kpi, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{kpi.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sales chart */}
          <Card>
            <CardHeader>
              <CardTitle>Operating Sales Revenue</CardTitle>
              <CardDescription>Historical monthly gross invoice values (last 6 months)</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-darkbg-border/30" />
                  <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                  <YAxis fontSize={11} stroke="#94A3B8" tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                  <Tooltip formatter={(value: any) => [fmtCcy(Number(value))]} />
                  <Bar dataKey="Sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sales Grid */}
          <Card className="border border-slate-200 dark:border-darkbg-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Product Sales Contribution</CardTitle>
              <CardDescription>Sorted by total revenue contribution of items sold in POS checkout.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-darkbg-border/30 dark:bg-darkbg/10 text-[10px] font-bold uppercase tracking-wider text-slate-500 p-3">
                      <th className="p-3.5 pl-6">SKU / Code</th>
                      <th className="p-3.5">Product Name</th>
                      <th className="p-3.5">Details</th>
                      <th className="p-3.5 text-center">Qty Sold</th>
                      <th className="p-3.5 pr-6">Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                    {salesReportData.filter(s => s.quantitySold > 0).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                          No sales transactions recorded yet for this branch.
                        </td>
                      </tr>
                    ) : (
                      salesReportData.filter(s => s.quantitySold > 0).map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="p-3.5 pl-6 font-mono font-bold text-slate-700 dark:text-slate-300">{s.sku}</td>
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="p-3.5 text-slate-400">{s.details}</td>
                          <td className="p-3.5 text-center font-bold">{s.quantitySold} units</td>
                          <td className="p-3.5 pr-6 font-extrabold text-slate-800 dark:text-white">{fmtCcy(s.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 2: PROFIT & LOSS ─── */}
      {activeTab === 'profit' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* P&L KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Revenue', value: fmtCcy(kpiStats.totalSales), icon: <DollarSign />, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Cost of Goods (COGS)', value: fmtCcy(kpiStats.totalCOGS), icon: <Layers />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Operating Expenses', value: fmtCcy(kpiStats.totalExpenses), icon: <BarChart2 />, color: 'text-red-500', bg: 'bg-red-500/10' },
              { label: 'Est. Net Profit (Margin)', value: `${fmtCcy(Math.max(kpiStats.netProfit, 0))} (${kpiStats.margin}%)`, icon: <Percent />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
            ].map((kpi, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{kpi.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Profit curve and expense allocations */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Net Profit Trend</CardTitle>
                <CardDescription>Monthly profit curves computed from exact buying pricing models</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-darkbg-border/30" />
                    <XAxis dataKey="name" fontSize={11} stroke="#94A3B8" />
                    <YAxis fontSize={11} stroke="#94A3B8" tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                    <Tooltip formatter={(value: any) => [fmtCcy(Number(value))]} />
                    <Line type="monotone" dataKey="NetProfit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Expenses</CardTitle>
                <CardDescription>Breakdown of paid outflows</CardDescription>
              </CardHeader>
              <CardContent className="h-72 overflow-y-auto space-y-3 scrollbar-thin">
                {expenseAllocation.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 italic text-[11px]">
                    No paid expenses recorded.
                  </div>
                ) : (
                  expenseAllocation.map((entry, idx) => {
                    const total = expenseAllocation.reduce((s, e) => s + e.value, 0);
                    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
                    const color = EXPENSE_COLORS[entry.name] || FALLBACK_COLOR;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            {entry.name}
                          </span>
                          <span>{fmtCcy(entry.value)}</span>
                        </div>
                        <div className="h-1 bg-slate-100 dark:bg-darkbg rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                        <div className="text-[9px] text-slate-400 text-right">{pct}% of total</div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sales vs Profit Table */}
          <Card className="border border-slate-200 dark:border-darkbg-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Margin Contribution Ledger</CardTitle>
              <CardDescription>Product level margins computed against exact Cost of Goods Sold.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-darkbg-border/30 dark:bg-darkbg/10 text-[10px] font-bold uppercase tracking-wider text-slate-500 p-3">
                      <th className="p-3.5 pl-6">SKU</th>
                      <th className="p-3.5">Product Name</th>
                      <th className="p-3.5">Qty Sold</th>
                      <th className="p-3.5">Gross Revenue</th>
                      <th className="p-3.5 pr-6">Net Profit Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                    {salesReportData.filter(s => s.quantitySold > 0).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                          No transactions found.
                        </td>
                      </tr>
                    ) : (
                      salesReportData.filter(s => s.quantitySold > 0).map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="p-3.5 pl-6 font-mono font-bold text-slate-700 dark:text-slate-300">{s.sku}</td>
                          <td className="p-3.5">
                            <p className="font-semibold text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{s.details}</p>
                          </td>
                          <td className="p-3.5 text-center font-bold">{s.quantitySold} units</td>
                          <td className="p-3.5 font-bold text-slate-500">{fmtCcy(s.revenue)}</td>
                          <td className="p-3.5 pr-6 font-black text-emerald-600">{fmtCcy(s.profit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: INVENTORY VALUATION ─── */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Inventory KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Catalog Value', value: fmtCcy(inventoryReportData.reduce((s,i) => s + i.stockValue, 0)), icon: <Layers />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
              { label: 'Est. Potential Profit', value: fmtCcy(inventoryReportData.reduce((s,i) => s + i.potentialProfit, 0)), icon: <TrendingUp />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
              { label: 'Low Stock Alerts', value: `${lowStockCount} Items`, icon: <AlertTriangle />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' },
              { label: 'Total Units Stocked', value: `${inventoryReportData.reduce((s,i) => s + i.stock, 0)} Units`, icon: <Activity />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' }
            ].map((kpi, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{kpi.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-slate-200 dark:border-darkbg-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-darkbg/20 border-b border-slate-200/50 dark:border-darkbg-border/30">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-primary" />
                <span>Unified Stock Valuation</span>
              </CardTitle>
              <CardDescription>
                Detailed breakdown of simple products and variant valuation costs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-darkbg-border/30 dark:bg-darkbg/10 text-[10px] font-bold uppercase tracking-wider text-slate-500 p-3">
                      <th className="p-3.5 pl-6">SKU / Code</th>
                      <th className="p-3.5">Product Name</th>
                      <th className="p-3.5">Attributes / Details</th>
                      <th className="p-3.5 text-center">Stock Level</th>
                      <th className="p-3.5">Cost Price</th>
                      <th className="p-3.5">Selling Price</th>
                      <th className="p-3.5">Stock Valuation</th>
                      <th className="p-3.5 pr-6">Potential Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                    {inventoryReportData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          No product catalogs found.
                        </td>
                      </tr>
                    ) : (
                      inventoryReportData.map((item, idx) => (
                        <tr key={idx} className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors ${item.stock < item.reorderLevel ? 'bg-amber-50/20 dark:bg-amber-950/5' : ''}`}>
                          <td className="p-3.5 pl-6 font-mono font-bold text-slate-700 dark:text-slate-300">{item.sku}</td>
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="p-3.5 text-slate-400">{item.details}</td>
                          <td className="p-3.5 text-center font-bold">
                            <span className={item.stock < item.reorderLevel ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}>
                              {item.stock} units
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500">{fmtCcy(item.buyingPrice)}</td>
                          <td className="p-3.5 text-slate-500">{fmtCcy(item.sellingPrice)}</td>
                          <td className="p-3.5 font-bold text-primary">{fmtCcy(item.stockValue)}</td>
                          <td className="p-3.5 pr-6 font-bold text-emerald-600">{fmtCcy(item.potentialProfit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: TAX REPORT (VAT) ─── */}
      {activeTab === 'tax' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Tax KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Taxable Sales', value: fmtCcy(kpiStats.totalSales), icon: <DollarSign />, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
              { label: 'Pre-Tax Sales Value', value: fmtCcy(kpiStats.preTaxSales), icon: <Calculator />, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
              { label: 'VAT Collected (16%)', value: fmtCcy(kpiStats.totalTax), icon: <Percent />, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' },
              { label: 'Billed Invoices count', value: `${kpiStats.orderCount} Tax Invoices`, icon: <FileText />, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/20' }
            ].map((kpi, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center space-x-3">
                  <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color}`}>{kpi.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                    <div className="text-sm font-black text-slate-800 dark:text-white mt-0.5">{kpi.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tax ledger table */}
          <Card className="border border-slate-200 dark:border-darkbg-border rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-darkbg/20 border-b border-slate-200/50 dark:border-darkbg-border/30">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Calculator className="h-4.5 w-4.5 text-primary" />
                <span>VAT Tax &amp; Invoices Ledger</span>
              </CardTitle>
              <CardDescription>
                Detailed VAT registration table for order transactions (VAT is configured at 16% rate).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-darkbg-border/30 dark:bg-darkbg/10 text-[10px] font-bold uppercase tracking-wider text-slate-500 p-3">
                      <th className="p-3.5 pl-6">Order ID</th>
                      <th className="p-3.5">Date &amp; Time</th>
                      <th className="p-3.5">Payment Method</th>
                      <th className="p-3.5">Gross Total</th>
                      <th className="p-3.5 text-red-500">VAT (16%)</th>
                      <th className="p-3.5 pr-6">Pre-Tax Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                    {taxReportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          No taxable sales transactions recorded for this branch.
                        </td>
                      </tr>
                    ) : (
                      taxReportData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="p-3.5 pl-6 font-mono font-bold text-slate-700 dark:text-slate-300">{item.id}</td>
                          <td className="p-3.5 text-slate-500">{new Date(item.timestamp).toLocaleString()}</td>
                          <td className="p-3.5 font-bold uppercase">{item.paymentMethod.replace(/_/g, ' ')}</td>
                          <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{fmtCcy(item.total)}</td>
                          <td className="p-3.5 font-bold text-red-500">{fmtCcy(item.tax)}</td>
                          <td className="p-3.5 pr-6 font-bold text-emerald-600">{fmtCcy(item.preTax)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
