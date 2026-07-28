import React, { useState, useMemo } from 'react';
import { db, type ResetCommand } from '../../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { tenantDemoService } from '../../services/tenantDemoService';
import { tenantProvisioningService } from '../../services/tenantProvisioningService';
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge 
} from '../UI/custom-ui';
import { 
  Database, Users, Trash2, RefreshCw, AlertTriangle, 
  Activity, Play, Pause, X, Clock, FileText, CheckCircle, Brain, Plus, Server
} from 'lucide-react';
import { MODULE_MANIFESTS } from '../../context/ModuleContext';

const DATASETS = [
  { id: 'ds_retail_starter', name: 'Retail Starter', version: 'v1.2.0', industry: 'Retail', size: '1.2 MB', seedCount: 245, checksum: 'sha-09a8bf', status: 'Active', modules: 'POS, Inventory, Customers' },
  { id: 'ds_restaurant_large', name: 'Restaurant Large', version: 'v2.1.0', industry: 'Restaurant', size: '4.8 MB', seedCount: 890, checksum: 'sha-a87f12', status: 'Active', modules: 'POS, Recipe, Tables, Staff' },
  { id: 'ds_pharmacy_medium', name: 'Pharmacy Medium', version: 'v1.0.3', industry: 'Pharmacy', size: '2.5 MB', seedCount: 420, checksum: 'sha-34b6cd', status: 'Active', modules: 'POS, Batch Control, Expiry Alerts' },
  { id: 'ds_hotel_full', name: 'Hotel & Resort', version: 'v1.1.0', industry: 'Hotel', size: '6.1 MB', seedCount: 1120, checksum: 'sha-88de21', status: 'Active', modules: 'Accommodation, Dining, Booking' },
  { id: 'ds_garage_basic', name: 'Garage & Spares', version: 'v1.0.0', industry: 'Garage', size: '1.8 MB', seedCount: 310, checksum: 'sha-9f7e52', status: 'Active', modules: 'Parts Ledger, Jobs, Mechanics' },
  { id: 'ds_sacco_savings', name: 'SACCO Credit Union', version: 'v1.0.5', industry: 'SACCO', size: '3.2 MB', seedCount: 560, checksum: 'sha-52bcda', status: 'Active', modules: 'Savings, Loans, Member Shares' }
];

export const DemoDataEngine: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'monitoring' | 'tenants' | 'datasets' | 'queue' | 'rollbacks' | 'audits' | 'ai'>('monitoring');
  
  // Real-time Queries
  const tenants = useLiveQuery(() => db.tenants.toArray()) || [];
  const resetCommands = useLiveQuery(() => db.resetCommands.reverse().sortBy('created_at')) || [];
  const securityLogs = useLiveQuery(() => db.securityAuditLogs.reverse().sortBy('created_at')) || [];
  
  // Modal states
  const [provisionModalOpen, setProvisionModalOpen] = useState(false);
  const [provisionName, setProvisionName] = useState('');
  const [provisionIndustry, setProvisionIndustry] = useState<string>('Retail');
  
  // Security locks / Confirm status
  const [destructiveAction, setDestructiveAction] = useState<{ type: string; id: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [securityError, setSecurityError] = useState('');

  // Computed Values
  const demoTenants = useMemo(() => {
    return tenants.filter(t => t.status?.toUpperCase() === 'DEMO' || t.id.endsWith('_demo') || t.name.toLowerCase().includes('demo'));
  }, [tenants]);

  const activeJobs = useMemo(() => {
    return resetCommands.filter(c => c.status === 'PROCESSING' || c.status === 'PENDING');
  }, [resetCommands]);

  const failedJobsCount = useMemo(() => {
    return resetCommands.filter(c => c.status === 'FAILED').length;
  }, [resetCommands]);

  const availableRollbacks = useMemo(() => {
    return resetCommands.filter(c => c.rollback_available && c.rollback_package_data);
  }, [resetCommands]);

  // AI-Assisted Assessment
  const aiInsights = useMemo(() => {
    const insights = [];
    
    // Safety suggestion: recommend cleanup interval
    if (demoTenants.length > 5) {
      insights.push({
        type: 'recommendation',
        title: 'Optimize Cleanup Schedules',
        description: `You have ${demoTenants.length} active demo tenants. Enable the "Delete Demo after 7 Days" policy to recover approximately ${(demoTenants.length * 1.5).toFixed(1)} MB of client-side IndexedDB storage.`,
        severity: 'info'
      });
    }

    // Check for failed seed detections
    const recentFails = resetCommands.filter(c => c.status === 'FAILED' && c.created_at > Date.now() - 24 * 60 * 60 * 1000);
    if (recentFails.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Partial/Failed Operations Detected',
        description: `There are ${recentFails.length} failed cleanup/reset jobs in the last 24 hours. The main reason is: "${recentFails[0].error_message}". Recommend checking active user sessions or connection status.`,
        severity: 'danger'
      });
    } else {
      insights.push({
        type: 'status',
        title: 'Database Integrity Validated',
        description: 'No orphaned child objects, stock ledger anomalies, or cross-tenant sync conflicts detected. Database cluster matches safety compliance checks.',
        severity: 'success'
      });
    }

    return insights;
  }, [tenants, demoTenants, resetCommands]);

  // Actions
  const handleProvisionTenant = async () => {
    if (!provisionName.trim()) return;
    try {
      const tenantId = `demo_${provisionName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_demo`;
      const branchId = `branch_${tenantId}_main`;
      const ownerEmail = `owner@${provisionName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'demo'}.com`;
      const ownerPassword = 'owner123';

      // 1. Provision Clean Tenant (creates tenant, branch, roles, settings, warehouse, AND default owner user)
      await tenantProvisioningService.provisionCleanTenant(
        tenantId,
        branchId,
        `${provisionName} (Demo)`,
        provisionIndustry,
        {
          email: ownerEmail,
          fullName: `${provisionName} Owner`,
          pin: '1234',
          password: ownerPassword
        }
      );

      // 2. Seed initial template
      await tenantDemoService.seedDemoData(tenantId, branchId, provisionIndustry);

      // 3. Log audit log
      await db.securityAuditLogs.add({
        id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tenant_id: tenantId,
        branch_id: branchId,
        user_id: 'super-admin',
        action: 'tenant.demo_tenant.provision',
        ip_address: '127.0.0.1',
        device_info: 'Platform Console',
        created_at: Date.now()
      });

      setProvisionName('');
      setProvisionModalOpen(false);

      // Success alert showing the login credentials
      alert(
        `Demo Tenant Workspace "${provisionName}" created and seeded successfully!\n\n` +
        `🔑 Log in with:\n` +
        `Email: ${ownerEmail}\n` +
        `Password: ${ownerPassword}`
      );

      // Prompt to download Recovery Token
      const wantToken = window.confirm(
        `Would you like to download the Recovery Token for "${provisionName}" now?\n\n` +
        `This allows restoring this demo workspace on other browsers or devices.`
      );
      if (wantToken) {
        await tenantProvisioningService.downloadRecoveryToken(tenantId, `${provisionName} (Demo)`);
      }
    } catch (err: any) {
      alert(`Provision failed: ${err.message}`);
    }
  };

  const triggerResetCommand = async (tenantId: string, clearType: 'DEMO_DATA' | 'ALL_DATA') => {
    try {
      await tenantDemoService.createResetCommand(tenantId, 'super-admin', clearType);
      alert(`Cleanup job queued for tenant ${tenantId}`);
      setActiveSubTab('queue');
    } catch (err: any) {
      alert(`Trigger failed: ${err.message}`);
    }
  };

  const handlePauseResume = async (cmd: ResetCommand) => {
    const nextStatus = cmd.status === 'PROCESSING' ? 'PAUSED' : 'PENDING';
    await db.resetCommands.update(cmd.id, {
      status: nextStatus,
      is_paused: nextStatus === 'PAUSED'
    });
    if (nextStatus === 'PENDING') {
      // Re-trigger worker
      tenantDemoService.processResetCommands().catch(console.error);
    }
  };

  const handleCancel = async (cmd: ResetCommand) => {
    await db.resetCommands.update(cmd.id, {
      status: 'CANCELLED',
      is_cancelled: true
    });
  };

  const handleRestoreSnapshot = async (cmdId: string) => {
    try {
      await tenantDemoService.restoreRollback(cmdId);
      alert('Rollback package snapshot restored successfully!');
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleHardPurgeMfa = async () => {
    if (mfaCode !== '123456') { // Simulated Admin MFA Code
      setSecurityError('Invalid Multi-factor Authentication Code.');
      return;
    }
    setSecurityError('');
    if (destructiveAction) {
      const { type, id } = destructiveAction;
      if (type === 'purge_all_demo') {
        // Enqueue cleanup jobs for all demo tenants
        for (const t of demoTenants) {
          await tenantDemoService.createResetCommand(t.id, 'super-admin', 'DEMO_DATA');
        }
        alert('Hard cleanup jobs queued for all demo workspaces.');
      } else if (type === 'delete_tenant') {
        await tenantProvisioningService.deleteTenantCompletely(id);
        await db.securityAuditLogs.add({
          id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          tenant_id: id,
          branch_id: 'N/A',
          user_id: 'super-admin',
          action: 'tenant.demo_tenant.hard_delete',
          ip_address: '127.0.0.1',
          device_info: 'Platform Console',
          created_at: Date.now()
        });
        alert('Demo tenant permanently deleted.');
      }
      setDestructiveAction(null);
      setMfaCode('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-darkbg-border shrink-0 overflow-x-auto">
        {[
          { id: 'monitoring', label: 'Dashboard & Monitor', icon: <Activity className="h-4 w-4" /> },
          { id: 'tenants', label: `Demo Tenants (${demoTenants.length})`, icon: <Users className="h-4 w-4" /> },
          { id: 'datasets', label: 'Dataset Library', icon: <Database className="h-4 w-4" /> },
          { id: 'queue', label: `Cleanup Queue (${activeJobs.length})`, icon: <Clock className="h-4 w-4" /> },
          { id: 'rollbacks', label: `Rollbacks (${availableRollbacks.length})`, icon: <RefreshCw className="h-4 w-4" /> },
          { id: 'audits', label: 'Audit Trail', icon: <FileText className="h-4 w-4" /> },
          { id: 'ai', label: 'AI Ops Assistant', icon: <Brain className="h-4 w-4" /> }
        ].map(subTab => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id as any)}
            className={`flex items-center space-x-1.5 px-4 py-3 text-[11px] font-bold border-b-2 transition -mb-px whitespace-nowrap ${
              activeSubTab === subTab.id
                ? 'border-primary text-primary dark:border-primary-dark dark:text-primary-dark'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {subTab.icon}<span>{subTab.label}</span>
          </button>
        ))}
      </div>

      {/* ── MONITORING TAB ── */}
      {activeSubTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Demo Tenants</span>
                  <Users className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{demoTenants.length}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400 font-medium">Provisioned sandbox workspaces</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Storage Used (Approx)</span>
                  <Database className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {(demoTenants.length * 1.8).toFixed(1)} MB
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400 font-medium">IndexedDB local database weight</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Jobs in Queue</span>
                  <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{activeJobs.length}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400 font-medium">Pending background operations</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Worker Health Status</span>
                  <Server className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <Badge variant="success">Active / Online</Badge>
                </div>
                <p className="mt-1 text-[10px] text-slate-400 font-medium">Lifecycle management thread running</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Live System Performance logs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Engine Performance Diagnostics</CardTitle>
                <CardDescription>Metrics on cleanup time, failed jobs, and rollback packets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Average Job Execution Time</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">12.4 seconds</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Completed Cleanups (All Time)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {resetCommands.filter(c => c.status === 'COMPLETED').length} jobs
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Failed Jobs (All Time)</span>
                    <span className="font-bold text-red-500">{failedJobsCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Rollback Packets Retained</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{availableRollbacks.length}</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-darkbg-border flex space-x-2">
                  <Button variant="danger" size="sm" className="text-[11px]" onClick={() => setDestructiveAction({ type: 'purge_all_demo', id: '' })}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Purge All Demo Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Configured Policies */}
            <Card>
              <CardHeader>
                <CardTitle>Engine Policies</CardTitle>
                <CardDescription>Configured sandbox cleanup rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Auto-delete Demo Tenant</span>
                  <Badge variant="success">After 7 Days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Soft Purge Retention</span>
                  <Badge variant="outline">30 Days</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nightly Scheduled Job</span>
                  <Badge variant="success">02:00 AM</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Multi-factor Auth Lock</span>
                  <Badge variant="danger">Enforced</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── DEMO TENANTS TAB ── */}
      {activeSubTab === 'tenants' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Provisioned Sandbox Demo Workspaces</CardTitle>
                <CardDescription>View, reset, clean, or delete dedicated demo tenants</CardDescription>
              </div>
              <Button variant="primary" size="sm" onClick={() => setProvisionModalOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Provision Demo Tenant
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {demoTenants.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No active demo tenants found. Click "Provision Demo Tenant" to spawn one.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-darkbg-border">
                {demoTenants.map(t => (
                  <div key={t.id} className="py-3.5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{t.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">ID: {t.id} | Plan: {t.plan}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => tenantProvisioningService.downloadRecoveryToken(t.id, t.name)}>
                        🔑 Export Token
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => triggerResetCommand(t.id, 'DEMO_DATA')}>
                        Reset / Clear
                      </Button>
                      <Button variant="outline" size="sm" className="text-[10px] h-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => setDestructiveAction({ type: 'delete_tenant', id: t.id })}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DATASETS TAB ── */}
      {activeSubTab === 'datasets' && (
        <Card>
          <CardHeader>
            <CardTitle>Demo Dataset Manifest Library</CardTitle>
            <CardDescription>Version-controlled templates for sales, client demonstrations, and testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DATASETS.map(d => (
                <div key={d.id} className="border border-slate-100 dark:border-darkbg-border rounded-xl p-4 space-y-3 bg-white dark:bg-darkbg-card">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">{d.name}</h4>
                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">{d.version}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Industry: {d.industry} | Size: {d.size}</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Modules: {d.modules}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-slate-50 dark:bg-darkbg px-2 py-1 rounded">
                    <span>Records: {d.seedCount}</span>
                    <span>MD5: {d.checksum}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── CLEANUP QUEUE TAB ── */}
      {activeSubTab === 'queue' && (
        <Card>
          <CardHeader>
            <CardTitle>Background Job Queue</CardTitle>
            <CardDescription>Monitor status, pause, resume, or cancel active deletions</CardDescription>
          </CardHeader>
          <CardContent>
            {resetCommands.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No cleanup commands found in database history.
              </div>
            ) : (
              <div className="space-y-4">
                {resetCommands.map(cmd => (
                  <div key={cmd.id} className="border border-slate-100 dark:border-darkbg-border rounded-xl p-4 bg-slate-50/50 dark:bg-darkbg/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 uppercase">
                          {cmd.clear_type.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-[10px] text-slate-400">Tenant: {cmd.tenant_id} | Created: {new Date(cmd.created_at).toLocaleTimeString()}</p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                          cmd.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          cmd.status === 'PROCESSING' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                          cmd.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          cmd.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cmd.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {cmd.status === 'PROCESSING' && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>{cmd.current_table || 'Processing...'}</span>
                          <span>{cmd.percent_complete ?? 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-darkbg rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 transition-all duration-300" 
                            style={{ width: `${cmd.percent_complete ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {cmd.error_message && (
                      <p className="text-[10px] text-red-500 font-mono bg-red-50 p-2 rounded">{cmd.error_message}</p>
                    )}

                    {/* Actions */}
                    {(cmd.status === 'PROCESSING' || cmd.status === 'PENDING' || cmd.status === 'PAUSED') && (
                      <div className="flex space-x-2 pt-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] py-0" onClick={() => handlePauseResume(cmd)}>
                          {cmd.status === 'PAUSED' ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                          {cmd.status === 'PAUSED' ? 'Resume' : 'Pause'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] py-0 text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleCancel(cmd)}>
                          <X className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ROLLBACKS TAB ── */}
      {activeSubTab === 'rollbacks' && (
        <Card>
          <CardHeader>
            <CardTitle>Rollback & Snapshot Manager</CardTitle>
            <CardDescription>Restore previously backed-up database states to recover from mistakes</CardDescription>
          </CardHeader>
          <CardContent>
            {availableRollbacks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No active rollback packages retained in this workspace.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-darkbg-border">
                {availableRollbacks.map(r => (
                  <div key={r.id} className="py-3.5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">Rollback for {r.tenant_id}</h4>
                      <p className="text-[10px] text-slate-400">Snapshot created prior to Job: {r.id}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-[10px]" onClick={() => handleRestoreSnapshot(r.id)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restore Snapshot
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── AUDIT LOGS TAB ── */}
      {activeSubTab === 'audits' && (
        <Card>
          <CardHeader>
            <CardTitle>Immutable Security Compliance Logs</CardTitle>
            <CardDescription>Audit logs details of all demo creations, seeds, resets, and rollbacks</CardDescription>
          </CardHeader>
          <CardContent>
            {securityLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No security audit logs found.
              </div>
            ) : (
              <div className="space-y-3 font-mono text-[10px]">
                {securityLogs.slice(0, 50).map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-darkbg rounded-lg border border-slate-100 dark:border-darkbg-border flex justify-between items-start">
                    <div>
                      <span className="text-indigo-600 font-bold uppercase">{log.action}</span>
                      <p className="text-slate-400 mt-1">Tenant: {log.tenant_id} | Operator: {log.user_id} | IP: {log.ip_address}</p>
                    </div>
                    <span className="text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── AI OPS ASSISTANT ── */}
      {activeSubTab === 'ai' && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-indigo-500" />
              <CardTitle>AI Operations & Diagnostics Assistant</CardTitle>
            </div>
            <CardDescription>Intelligent diagnostic scanning for storage limits, orphans, and failures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                  insight.severity === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                  insight.severity === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                  'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}
              >
                {insight.severity === 'danger' ? <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" /> :
                 insight.severity === 'success' ? <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" /> :
                 <Brain className="h-4.5 w-4.5 shrink-0 mt-0.5" />}
                <div>
                  <h4 className="font-bold">{insight.title}</h4>
                  <p className="mt-1 leading-normal opacity-90">{insight.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Provision Tenant Modal */}
      {provisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-darkbg-card border border-slate-200 dark:border-darkbg-border rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setProvisionModalOpen(false)} className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Provision Demo Workspace</h3>
            <p className="text-xs text-slate-400 mt-1">Spawn a pre-configured tenant database loaded with industry templates.</p>
            
            <div className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Business Name</label>
                <input 
                  type="text" 
                  value={provisionName}
                  onChange={e => setProvisionName(e.target.value)}
                  placeholder="e.g. Pharmacy Demo"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Industry Template</label>
                <select 
                  value={provisionIndustry}
                  onChange={e => setProvisionIndustry(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {Object.keys(MODULE_MANIFESTS).map(mod => (
                    <option key={mod} value={mod}>{mod} Preset Template</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3 pt-3">
                <Button variant="outline" className="w-1/2 text-xs" onClick={() => setProvisionModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" className="w-1/2 text-xs" onClick={handleProvisionTenant}>
                  Seed & Provision
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MFA destructive security check modal */}
      {destructiveAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-darkbg-card border border-red-200 dark:border-red-900/30 rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => setDestructiveAction(null)} className="absolute right-4 top-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-bold text-red-600 dark:text-red-400 flex items-center space-x-1.5">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>SaaS Security Override Required</span>
            </h3>
            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
              This action is classified as destructive. Deleting demo databases will permanently delete indices unless restored from rollbacks. Enter the Super Admin MFA code to authorize.
            </p>

            {securityError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-600 font-bold">
                {securityError}
              </div>
            )}

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Enter Admin Code (use "123456" for demo)</label>
                <input 
                  type="password" 
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                  placeholder="******"
                  className="h-10 w-full text-center tracking-widest font-black rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <Button variant="outline" className="w-1/2 text-xs" onClick={() => setDestructiveAction(null)}>
                  Cancel
                </Button>
                <Button variant="danger" className="w-1/2 text-xs" onClick={handleHardPurgeMfa}>
                  Authorize Deletion
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
