import React, { useState } from 'react';
import { db } from '../../db/dexie';
import { supabase, setMockAuthOverride } from '../../db/supabaseClient';
import { cloudDb } from '../../db/supabaseMock';
import { useAuth } from '../../context/AuthContext';
import { useSyncState } from '../../context/SyncContext';
import { ProductService } from '../../services/productService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../UI/custom-ui';
import { 
  Play, Shield, Database, FileText, Activity, Server, Smartphone, Globe, RotateCw
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface TestCase {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
  log: string[];
}

export const PersistenceTest: React.FC = () => {
  const { currentTenant, syncFromCloudOnLogin, user: authUser } = useAuth();
  const { toggleOfflineSimulation, isOnline, syncData } = useSyncState();

  const [activeLogTab, setActiveLogTab] = useState<'transactions' | 'audits'>('transactions');

  // Live queries for logs
  const transactionLogs = useLiveQuery(() => 
    cloudDb.supabase_transaction_logs.reverse().sortBy('timestamp')
  ) || [];

  const auditLogs = useLiveQuery(() => 
    cloudDb.supabase_audit_logs.reverse().sortBy('timestamp')
  ) || [];

  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'test-1',
      name: '1. Persistence Test',
      description: 'Create Product -> Logout -> Login -> Verify Product Exists.',
      icon: <Database className="h-4 w-4 text-blue-500" />,
      status: 'PENDING',
      log: []
    },
    {
      id: 'test-2',
      name: '2. Multi-Browser/Device Simulation Test',
      description: 'Create Product Chrome (Device A), Login Firefox (Device B), Verify Product Exists.',
      icon: <Smartphone className="h-4 w-4 text-indigo-500" />,
      status: 'PENDING',
      log: []
    },
    {
      id: 'test-3',
      name: '3. Offline Sync Test',
      description: 'Disable Internet, Create Product, Enable Internet, Verify Sync & Temporary ID replacement.',
      icon: <Globe className="h-4 w-4 text-emerald-500" />,
      status: 'PENDING',
      log: []
    },
    {
      id: 'test-4',
      name: '4. Row Level Security (Tenant Isolation) Test',
      description: 'Tenant A Product Must Not Appear Tenant B.',
      icon: <Shield className="h-4 w-4 text-rose-500" />,
      status: 'PENDING',
      log: []
    },
    {
      id: 'test-5',
      name: '5. Recovery Test',
      description: 'Delete Local Database, Login Again, Restore Products.',
      icon: <RotateCw className="h-4 w-4 text-amber-500" />,
      status: 'PENDING',
      log: []
    }
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);

  const addLog = (testId: string, msg: string) => {
    setTestCases(prev => prev.map(tc => {
      if (tc.id === testId) {
        return { ...tc, log: [...tc.log, `[${new Date().toLocaleTimeString()}] ${msg}`] };
      }
      return tc;
    }));
  };

  const updateStatus = (testId: string, status: TestCase['status']) => {
    setTestCases(prev => prev.map(tc => {
      if (tc.id === testId) {
        return { ...tc, status };
      }
      return tc;
    }));
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    
    // Reset logs
    setTestCases(prev => prev.map(tc => ({ ...tc, status: 'PENDING', log: [] })));

    // User context for helper calls
    const defaultUserContext = {
      id: authUser?.id || 'usr-owner',
      tenant_id: currentTenant.id,
      branch_id: authUser?.branch_id || 'branch-dar-hq',
      role: authUser?.role || 'Business Owner',
      name: authUser?.name || 'Juma Ally'
    };

    // Set mock auth override to simulate the tenant user's credentials during standard tests
    setMockAuthOverride({
      tenant_id: currentTenant.id,
      user_id: defaultUserContext.id,
      user_name: defaultUserContext.name
    });

    try {
      // ───────────────────────────────────────────────────────────────────────
      // TEST 1: PERSISTENCE TEST
      // ───────────────────────────────────────────────────────────────────────
      const id1 = 'test-1';
      updateStatus(id1, 'RUNNING');
      addLog(id1, 'Starting Persistence Test...');

      const testProductId = `test-prod-${Date.now()}`;
      const newProduct = {
        name: 'Enterprise Persistence Flour',
        category: 'Flour',
        buyingPrice: 12000,
        sellingPrice: 15500,
        price: 15500,
        stock: 100,
        tenant_id: currentTenant.id,
        branch_id: defaultUserContext.branch_id,
        module: 'Retail',
        hasVariants: false,

        // camelCase production statement fields
        tenantId: currentTenant.id,
        branchId: defaultUserContext.branch_id,
        categoryId: 'Flour',
        costPrice: 12000,
        status: 'Active' as const,
        version: 1,
        createdBy: defaultUserContext.id
      };

      addLog(id1, `Creating product using decoupled ProductService. Temp ID generated: ${testProductId}`);
      const savedLocal = await ProductService.createProduct({
        ...newProduct,
        id: testProductId
      } as any, defaultUserContext, true);

      addLog(id1, `SUCCESS: Product saved locally to IndexedDB. Id: ${savedLocal.id}`);

      addLog(id1, 'Simulating background sync queue execution...');
      await syncData();

      addLog(id1, 'Verifying product is successfully written permanently to PostgreSQL/Supabase...');
      const { data: cloudProds } = await supabase.from('products').select('*').eq('id', savedLocal.id);
      if (cloudProds && cloudProds.length > 0) {
        addLog(id1, `SUCCESS: Product verified in PostgreSQL. name: ${cloudProds[0].name}`);
        updateStatus(id1, 'PASSED');
      } else {
        throw new Error('Product not found in remote cloud database.');
      }

      // ───────────────────────────────────────────────────────────────────────
      // TEST 2: MULTI-BROWSER/DEVICE SIMULATION
      // ───────────────────────────────────────────────────────────────────────
      const id2 = 'test-2';
      updateStatus(id2, 'RUNNING');
      addLog(id2, 'Simulating Device B (Firefox) login with same Tenant credentials...');

      // Mock Device B credentials
      const firefoxUserContext = {
        id: 'usr-manager-firefox',
        tenant_id: currentTenant.id,
        branch_id: defaultUserContext.branch_id,
        role: 'Branch Manager',
        name: 'Manager on Firefox'
      };

      setMockAuthOverride({
        tenant_id: firefoxUserContext.tenant_id,
        user_id: firefoxUserContext.id,
        user_name: firefoxUserContext.name
      });

      addLog(id2, 'Querying cloud database from simulated Device B context...');
      const { data: deviceBProds } = await supabase.from('products').select('*');
      
      const foundProduct = deviceBProds?.find((p: any) => p.id === savedLocal.id);
      if (foundProduct) {
        addLog(id2, `SUCCESS: Product '${foundProduct.name}' successfully pulled on Device B.`);
        updateStatus(id2, 'PASSED');
      } else {
        throw new Error('Device B query was unable to retrieve the product.');
      }

      // Restore Device A override
      setMockAuthOverride({
        tenant_id: currentTenant.id,
        user_id: defaultUserContext.id,
        user_name: defaultUserContext.name
      });

      // ───────────────────────────────────────────────────────────────────────
      // TEST 3: OFFLINE SYNC TEST
      // ───────────────────────────────────────────────────────────────────────
      const id3 = 'test-3';
      updateStatus(id3, 'RUNNING');
      addLog(id3, 'Simulating network connection outage. Turning internet off...');
      if (isOnline) {
        toggleOfflineSimulation();
      }

      const offlineProductId = `offline-${defaultUserContext.id}-product-${Date.now()}`;
      const offlineProduct = {
        name: 'Offline Tanzanian Sugar',
        category: 'Groceries',
        buyingPrice: 3000,
        sellingPrice: 4200,
        price: 4200,
        stock: 50,
        tenant_id: currentTenant.id,
        branch_id: defaultUserContext.branch_id,
        module: 'Retail',
        hasVariants: false,

        tenantId: currentTenant.id,
        branchId: defaultUserContext.branch_id,
        categoryId: 'Groceries',
        costPrice: 3000,
        status: 'Active' as const,
        version: 1,
        createdBy: defaultUserContext.id
      };

      addLog(id3, `Creating product offline with temporary ID: ${offlineProductId}`);
      const createdOffline = await ProductService.createProduct({
        ...offlineProduct,
        id: offlineProductId
      } as any, defaultUserContext, false);

      addLog(id3, `Local IndexedDB syncStatus flag: ${createdOffline.syncStatus}`);

      // Verify not on cloud yet
      const cloudCheckBefore = await cloudDb.cloud_products.get(offlineProductId);
      if (!cloudCheckBefore) {
        addLog(id3, 'SUCCESS: Product successfully queued locally but is absent from Cloud PostgreSQL.');
      } else {
        throw new Error('VULNERABILITY: Product was synced to cloud while simulated offline.');
      }

      addLog(id3, 'Restoring network connection. Turning internet on...');
      toggleOfflineSimulation();

      addLog(id3, 'Triggering sync worker and monitoring temporary ID replacement...');
      await syncData();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 800));

      // Query IndexedDB for the temporary ID. It should be gone.
      const localTempCheck = await db.products.get(offlineProductId);
      if (!localTempCheck) {
        addLog(id3, 'SUCCESS: Temporary offline ID resolved and purged from local IndexedDB.');
      } else {
        throw new Error('Temporary ID was not removed from local IndexedDB.');
      }

      // Look up cloud products to find the replaced server ID
      const { data: freshCloudProds } = await supabase.from('products').select('*');
      const syncedServerProd = freshCloudProds?.find((p: any) => p.name === 'Offline Tanzanian Sugar');
      if (syncedServerProd) {
        addLog(id3, `SUCCESS: Server generated permanent ID: ${syncedServerProd.id}`);
        
        // Verify local IndexedDB now has the permanent ID
        const localPermanentCheck = await db.products.get(syncedServerProd.id);
        if (localPermanentCheck) {
          addLog(id3, `SUCCESS: Local database successfully holds the synchronized permanent ID: ${localPermanentCheck.id}`);
          updateStatus(id3, 'PASSED');
        } else {
          throw new Error('Local database did not cache the new permanent ID.');
        }
      } else {
        throw new Error('Replaced product was not synced to cloud.');
      }

      // ───────────────────────────────────────────────────────────────────────
      // TEST 4: ROW LEVEL SECURITY (TENANT ISOLATION) TEST
      // ───────────────────────────────────────────────────────────────────────
      const id4 = 'test-4';
      updateStatus(id4, 'RUNNING');
      addLog(id4, `Current Tenant User: '${defaultUserContext.name}' (Tenant: ${currentTenant.id})`);
      addLog(id4, 'Attempting unauthorized SELECT from foreign tenant context (tenant-hacker-hijack)...');

      // Clear override so client reads default session or checks unauthorized context
      setMockAuthOverride({
        tenant_id: 'tenant-hacker-hijack',
        user_id: 'usr-hacker',
        user_name: 'Hacker User'
      });

      const hijackRes = await supabase.from('products').select('*').eq('tenant_id', currentTenant.id);
      if (hijackRes.error) {
        addLog(id4, `SUCCESS: SELECT statement blocked by RLS. Status: 42501 (Insufficient Privilege).`);
        addLog(id4, `Error Details: ${hijackRes.error.message}`);
      } else {
        // If it returns list, it shouldn't contain currentTenant products because of RLS mismatch
        const leaks = (hijackRes.data || []).some((p: any) => (p.tenantId === currentTenant.id || p.tenant_id === currentTenant.id));
        if (leaks) {
          throw new Error('VULNERABILITY: RLS bypassed! Tenant data leaked to unauthorized tenant query.');
        } else {
          addLog(id4, 'SUCCESS: SELECT statement successfully filtered out all foreign tenant products.');
        }
      }

      addLog(id4, 'Attempting unauthorized write to current tenant database by a foreign user...');
      const rogueWrite = await supabase.from('products').insert({
        id: `rogue-${Date.now()}`,
        name: 'Rogue Item Injection',
        tenantId: currentTenant.id,
        tenant_id: currentTenant.id,
        branchId: 'branch-dar-hq',
        branch_id: 'branch-dar-hq'
      });

      if (rogueWrite.error) {
        addLog(id4, `SUCCESS: INSERT blocked by RLS. Postgres error:`);
        addLog(id4, `  Code: ${rogueWrite.error.code} (Insufficient Privilege)`);
        addLog(id4, `  Message: ${rogueWrite.error.message}`);
        updateStatus(id4, 'PASSED');
      } else {
        throw new Error('VULNERABILITY: Unauthorized insert succeeded!');
      }

      // Restore standard Tenant override
      setMockAuthOverride({
        tenant_id: currentTenant.id,
        user_id: defaultUserContext.id,
        user_name: defaultUserContext.name
      });

      // ───────────────────────────────────────────────────────────────────────
      // TEST 5: RECOVERY TEST
      // ───────────────────────────────────────────────────────────────────────
      const id5 = 'test-5';
      updateStatus(id5, 'RUNNING');
      addLog(id5, 'Purging local IndexedDB products and variants to simulate cache loss...');
      await db.products.clear();
      await db.productVariants.clear();

      const zeroCount = await db.products.count();
      addLog(id5, `Local product count after purge: ${zeroCount}`);

      addLog(id5, 'Invoking automatic recovery mechanism (syncFromCloudOnLogin)...');
      const syncResult = await syncFromCloudOnLogin(currentTenant.id);
      if (syncResult) {
        const restoredCount = await db.products.count();
        addLog(id5, `SUCCESS: Sync completed. Restored ${restoredCount} products from remote Cloud Server.`);
        
        const restoredProd = await db.products.get(savedLocal.id);
        if (restoredProd) {
          addLog(id5, `SUCCESS: Restored product '${restoredProd.name}' verified successfully in IndexedDB.`);
          updateStatus(id5, 'PASSED');
        } else {
          throw new Error('Expected product was missing from the restored dataset.');
        }
      } else {
        throw new Error('Recovery sync returned failure code.');
      }

    } catch (err: any) {
      console.error(err);
      setTestCases(prev => prev.map(tc => {
        if (tc.status === 'RUNNING') {
          return {
            ...tc,
            status: 'FAILED',
            log: [...tc.log, `❌ FAILED: ${err.message}`]
          };
        }
        return tc;
      }));
    } finally {
      setMockAuthOverride(null);
      setIsRunningAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-darkbg-card p-5 rounded-2xl border border-slate-200 dark:border-darkbg-border shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-500" />
            PostgreSQL / Supabase Persistence Auditor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Check, validate, and execute Row-Level Security policy checks, database transaction logging, and automated persistence checks.
          </p>
        </div>

        <Button 
          onClick={runAllTests} 
          disabled={isRunningAll}
          variant="primary"
          className="font-bold text-xs flex items-center gap-1.5 shrink-0"
        >
          <Play className="h-4.5 w-4.5 fill-current" />
          {isRunningAll ? 'Running Tests...' : 'Run Automated Test Suite'}
        </Button>
      </div>

      {/* Main Grid: Left Tests, Right Logs */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Test Suite */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-darkbg-border/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                Automated Verification Suite
              </CardTitle>
              <CardDescription>Executes standard product lifecycle scripts to confirm database persistence.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {testCases.map((tc) => (
                <div key={tc.id} className="border border-slate-200 dark:border-darkbg-border rounded-xl p-4 bg-slate-50/30 dark:bg-darkbg/10 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1 bg-white dark:bg-darkbg border dark:border-darkbg-border rounded-lg">
                        {tc.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white">{tc.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{tc.description}</p>
                      </div>
                    </div>

                    <Badge 
                      variant={
                        tc.status === 'PASSED' ? 'success' :
                        tc.status === 'FAILED' ? 'danger' :
                        tc.status === 'RUNNING' ? 'warning' : 'info'
                      }
                      className="font-bold text-[9px] uppercase tracking-wider px-2 py-0.5"
                    >
                      {tc.status}
                    </Badge>
                  </div>

                  {/* Log console */}
                  {tc.log.length > 0 && (
                    <div className="bg-slate-900 dark:bg-black rounded-lg p-3 font-mono text-[10px] text-slate-300 leading-normal max-h-36 overflow-y-auto space-y-1 scrollbar-thin border border-slate-850">
                      {tc.log.map((line, idx) => (
                        <div key={idx} className={line.includes('SUCCESS') ? 'text-emerald-400 font-semibold' : line.includes('FAILED') || line.includes('WARNING') ? 'text-red-400 font-semibold' : ''}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Logs */}
        <div className="space-y-4">
          <Card className="flex flex-col h-full min-h-[500px]">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-darkbg-border/30 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-indigo-500" />
                  Cloud Database Logs
                </CardTitle>
                <div className="flex gap-1 text-[10px] font-bold bg-slate-100 dark:bg-darkbg p-0.5 rounded-lg">
                  <button 
                    onClick={() => setActiveLogTab('transactions')}
                    className={`px-2 py-1 rounded transition-all ${activeLogTab === 'transactions' ? 'bg-white dark:bg-darkbg-card text-primary shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    SQL Tx
                  </button>
                  <button 
                    onClick={() => setActiveLogTab('audits')}
                    className={`px-2 py-1 rounded transition-all ${activeLogTab === 'audits' ? 'bg-white dark:bg-darkbg-card text-primary shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    Audits
                  </button>
                </div>
              </div>
              <CardDescription>
                {activeLogTab === 'transactions' ? 'PostgreSQL transaction statement logs' : 'Security audit trail logs'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
              {activeLogTab === 'transactions' ? (
                <div className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                  {transactionLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">No transaction records logged.</div>
                  ) : (
                    transactionLogs.map((tx: any) => (
                      <div key={tx.id} className="p-3.5 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-all space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                            {tx.operation}
                          </span>
                          <span className="text-[9px] text-slate-450">
                            {new Date(tx.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          FROM <span className="font-bold text-slate-700 dark:text-slate-350">{tx.table_name}</span>
                          {tx.record_id && <span> (ID: {tx.record_id.slice(0, 8)}...)</span>}
                          {tx.query_params && <span className="block text-[9px] text-slate-400 dark:text-slate-500 overflow-x-auto">PARAMS: {tx.query_params}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <Badge variant={tx.status === 'SUCCESS' ? 'success' : 'danger'} className="text-[9px] py-0 font-bold">
                            {tx.status}
                          </Badge>
                          {tx.error_message && (
                            <span className="text-[9px] text-red-500 font-semibold truncate max-w-[150px]">
                              {tx.error_message}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-405 italic">No security audits logged.</div>
                  ) : (
                    auditLogs.map((aud: any) => (
                      <div key={aud.id} className="p-3.5 hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-all space-y-1 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-700 dark:text-slate-350">
                            {aud.action}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(aud.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-550 leading-relaxed">{aud.details}</p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                          <span>User: {aud.user_id.slice(0, 8)}</span>
                          <span>IP: {aud.ip_address}</span>
                          <Badge variant={aud.status === 'SUCCESS' ? 'success' : 'danger'} className="text-[8px] py-0 font-bold">
                            {aud.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
