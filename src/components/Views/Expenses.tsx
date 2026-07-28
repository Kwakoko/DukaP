import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Expense } from '../../db/dexie';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, Button, Badge, Dialog, Input } from '../UI/custom-ui';
import { 
  Plus, Search, TrendingDown, Calendar, 
  CreditCard, Trash2, CheckCircle2, AlertCircle, 
  Tag, X
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { currentBranch, currentTenant, user } = useAuth();

  // --- IndexedDB Live Query for Expenses ---
  const expensesList = useLiveQuery(() => 
    db.expenses
      .where('tenant_id')
      .equals(currentTenant.id)
      .and(exp => exp.branch_id === currentBranch.id)
      .toArray()
  , [currentTenant.id, currentBranch.id]) || [];

  // --- Local States ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('All');

  // Form states for new expense
  const [newCategory, setNewCategory] = useState<'Rent' | 'Salaries' | 'Utilities' | 'Other'>('Utilities');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>('M-Pesa');
  const [newStatus, setNewStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [formError, setFormError] = useState('');

  // --- Computed Metrics ---
  const metrics = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let rent = 0;
    let salaries = 0;
    let utilities = 0;
    let other = 0;

    expensesList.forEach(e => {
      total += e.amount;
      if (e.status === 'Paid') paid += e.amount;
      else pending += e.amount;

      if (e.category === 'Rent') rent += e.amount;
      else if (e.category === 'Salaries') salaries += e.amount;
      else if (e.category === 'Utilities') utilities += e.amount;
      else other += e.amount;
    });

    return { total, paid, pending, rent, salaries, utilities, other };
  }, [expensesList]);

  // --- Filtered Expenses ---
  const filteredExpenses = useMemo(() => {
    return expensesList.filter(e => {
      const matchesSearch = 
        e.category.toLowerCase().includes(searchVal.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchVal.toLowerCase()));
      const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
      const matchesStatus = filterStatus === 'All' || e.status === filterStatus;
      const matchesPayment = filterPaymentMethod === 'All' || e.paymentMethod === filterPaymentMethod;

      return matchesSearch && matchesCategory && matchesStatus && matchesPayment;
    }).sort((a, b) => b.created_at - a.created_at);
  }, [expensesList, searchVal, filterCategory, filterStatus, filterPaymentMethod]);

  // --- Actions ---
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid expense amount in Tanzanian Shillings.');
      return;
    }

    if (!newDescription.trim()) {
      setFormError('Please provide a short description or payees name.');
      return;
    }

    try {
      const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const payload: Expense = {
        id: expenseId,
        tenant_id: currentTenant.id,
        branch_id: currentBranch.id,
        category: newCategory,
        amount: amt,
        description: newDescription.trim(),
        date: newDate,
        paymentMethod: newPaymentMethod,
        status: newStatus,
        created_at: Date.now(),
        created_by: user?.id || 'system'
      };

      await db.expenses.put(payload);

      // Trigger standard local event to alert topbar about the new logged expense
      window.dispatchEvent(new CustomEvent('dukapos:notification', {
        detail: {
          id: `notif-exp-${Date.now()}`,
          title: 'Expense Logged Successfully',
          message: `Logged ${newCategory} expense of Tsh. ${amt.toLocaleString()} (${newDescription})`,
          type: 'success',
          timestamp: Date.now()
        }
      }));

      // Reset form
      setNewAmount('');
      setNewDescription('');
      setNewCategory('Utilities');
      setNewPaymentMethod('M-Pesa');
      setNewStatus('Paid');
      setNewDate(new Date().toISOString().split('T')[0]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense.');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const item = await db.expenses.get(id);
      if (item) {
        await db.expenses.update(id, { status: 'Paid' });
        
        window.dispatchEvent(new CustomEvent('dukapos:notification', {
          detail: {
            id: `notif-paid-${Date.now()}`,
            title: 'Expense Paid',
            message: `Marked bill of Tsh. ${item.amount.toLocaleString()} as PAID.`,
            type: 'info',
            timestamp: Date.now()
          }
        }));
      }
    } catch (err: any) {
      alert(`Error updating expense: ${err.message}`);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete/void this expense record?')) return;
    try {
      await db.expenses.delete(id);
    } catch (err: any) {
      alert(`Error deleting expense: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header section */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Operating Expenses Ledger</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log, analyze, and manage company utility costs, salaries, rent, and permits for branch: <span className="font-semibold text-primary">{currentBranch.name}</span>.
          </p>
        </div>

        <Button 
          variant="primary" 
          size="sm" 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center space-x-1.5 shadow-md shadow-primary/20"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Log New Expense</span>
        </Button>
      </div>

      {/* KPI summaries card deck */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* KPI: Total expenses */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-indigo-500"></div>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight">
                Tsh. {metrics.total.toLocaleString()}
              </h3>
              <p className="text-[9px] text-slate-400">Aggregated operational overhead</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center shrink-0">
              <TrendingDown className="h-5 w-5 stroke-[2.5]" />
            </div>
          </CardContent>
        </Card>

        {/* KPI: Paid bills */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-500"></div>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid</p>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight">
                Tsh. {metrics.paid.toLocaleString()}
              </h3>
              <p className="text-[9px] text-slate-400 text-emerald-600 font-medium">Settled bills & cash payouts</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI: Pending bills */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Bills</p>
              <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-tight">
                Tsh. {metrics.pending.toLocaleString()}
              </h3>
              <p className="text-[9px] text-slate-400 text-amber-600 font-medium">Awaiting accounts settlement</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* KPI: Category Split quick breakdown */}
        <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-500"></div>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Category Weight</p>
            <div className="space-y-1.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center">
                <span>Rent:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Tsh. {metrics.rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Salaries:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Tsh. {metrics.salaries.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Utilities:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Tsh. {metrics.utilities.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar filter deck */}
      <Card className="border border-slate-200 dark:border-darkbg-border rounded-xl">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search expenses..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-9 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none dark:border-darkbg-border dark:bg-darkbg dark:text-white"
            />
            {searchVal && (
              <button onClick={() => setSearchVal('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-darkbg px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-darkbg-border">
              <Tag className="h-3 w-3 text-slate-400" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Rent">Rent</option>
                <option value="Salaries">Salaries</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-darkbg px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-darkbg-border">
              <CheckCircle2 className="h-3 w-3 text-slate-400" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-darkbg px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-darkbg-border">
              <CreditCard className="h-3 w-3 text-slate-400" />
              <select 
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
              >
                <option value="All">All Payments</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="TigoPesa">TigoPesa</option>
                <option value="Airtel">Airtel Money</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Ledger data table */}
      <Card className="border border-slate-200 dark:border-darkbg-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-darkbg-border/30 dark:bg-darkbg/10 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-3.5 pl-6">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <p className="italic">No expense records found matching selected filters.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Log a new expense above or clear the filters.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{exp.date}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge variant={
                        exp.category === 'Rent' ? 'info' :
                        exp.category === 'Salaries' ? 'default' :
                        exp.category === 'Utilities' ? 'warning' : 'outline'
                      }>
                        {exp.category}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{exp.description}</p>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 font-semibold">{exp.paymentMethod}</td>
                    <td className="p-3.5">
                      <Badge variant={exp.status === 'Paid' ? 'success' : 'warning'}>
                        {exp.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-800 dark:text-white">
                      Tsh. {exp.amount.toLocaleString()}
                    </td>
                    <td className="p-3.5 pr-6 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {exp.status === 'Pending' && (
                          <button
                            onClick={() => handleMarkAsPaid(exp.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 text-[9px] font-bold uppercase transition active:scale-95 flex items-center gap-0.5"
                            title="Mark as Paid"
                          >
                            <span>Pay</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded transition text-slate-400"
                          title="Void / Delete record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Log Expense Dialog modal popover */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Log Operational Expense"
        description="Enter expense details. Transaction will be scoped and logged to current branch."
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-danger text-xs font-semibold">
              ⚠️ {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-darkbg-border dark:bg-darkbg-card dark:text-white"
              >
                <option value="Utilities">Utilities (Electricity, Water, Internet)</option>
                <option value="Salaries">Salaries & Commissions</option>
                <option value="Rent">Rent & Land Lease</option>
                <option value="Other">Other Operational Expenses</option>
              </select>
            </div>

            <Input 
              label="Amount (Tsh.)"
              placeholder="e.g. 250000"
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input 
              label="Date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-darkbg-border dark:bg-darkbg-card dark:text-white"
              >
                <option value="M-Pesa">M-Pesa</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
                <option value="TigoPesa">TigoPesa</option>
                <option value="Airtel">Airtel Money</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Status</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input 
                    type="radio" 
                    name="newStatus" 
                    value="Paid"
                    checked={newStatus === 'Paid'}
                    onChange={() => setNewStatus('Paid')}
                    className="accent-primary"
                  />
                  <span>Paid (Settled)</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input 
                    type="radio" 
                    name="newStatus" 
                    value="Pending"
                    checked={newStatus === 'Pending'}
                    onChange={() => setNewStatus('Pending')}
                    className="accent-primary"
                  />
                  <span>Pending (Awaiting payment)</span>
                </label>
              </div>
            </div>
          </div>

          <Input 
            label="Description / Recipient"
            placeholder="e.g. Office electricity tokens or cashier payout"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            required
          />

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-darkbg-border/30">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Expense Record
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
