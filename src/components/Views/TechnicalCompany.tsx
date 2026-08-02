import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Dialog } from '../UI/custom-ui';
import {
  Wrench, Activity, CheckCircle2, Briefcase,
  Users, Truck, HardHat, Sparkles, Cpu, Plus, Zap,
  RefreshCw, MapPin
} from 'lucide-react';

export const TechnicalCompany: React.FC = () => {
  const { currentTenant } = useAuth();

  // Active Sub-Tab
  const [subTab, setSubTab] = useState<
    'dashboard' | 'projects' | 'fieldservice' | 'services' | 'assets' | 'workforce' | 'fleet' | 'ai'
  >('dashboard');

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewWorkOrderModalOpen, setIsNewWorkOrderModalOpen] = useState(false);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);

  // Form States for New Project
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('');

  // Mock Technical Data
  const [projectsList, setProjectsList] = useState([
    { id: 'PRJ-2026-001', name: 'Industrial Solar Power Installation', client: 'Tanzania Breweries Ltd', budget: 145000000, lead: 'Eng. David Mwangi', status: 'Active', progress: 68, deadline: '2026-09-15' },
    { id: 'PRJ-2026-002', name: 'HVAC System Overhaul & Calibration', client: 'Aga Khan Hospital', budget: 48000000, lead: 'Eng. Sarah Kilo', status: 'Active', progress: 42, deadline: '2026-08-30' },
    { id: 'PRJ-2026-003', name: 'Data Center Precision Cooling Upgrade', client: 'CRDB Bank HQ', budget: 89000000, lead: 'Tech. Josephat Mmari', status: 'In Planning', progress: 15, deadline: '2026-11-10' },
    { id: 'PRJ-2026-004', name: 'Substation Transformer Maintenance', client: 'TANESCO Coast Region', budget: 32000000, lead: 'Eng. David Mwangi', status: 'Completed', progress: 100, deadline: '2026-07-20' },
  ]);

  const [workOrdersList] = useState([
    { id: 'WO-8801', title: 'Emergency Generator Failure Diagnostic', client: 'Kilimanjaro Hotel', priority: 'CRITICAL', tech: 'Alex Masawe', status: 'In Progress', type: 'Emergency Repair', location: 'City Center' },
    { id: 'WO-8802', title: 'Quarterly Elevator Calibration & Safety Test', client: 'PPF Tower Plaza', priority: 'MEDIUM', tech: 'Frank Temba', status: 'Scheduled', type: 'Preventive Maintenance', location: 'Upanga' },
    { id: 'WO-8803', title: 'Chiller Plant Refrigerant Leak Repair', client: 'Julius Nyerere Airport', priority: 'HIGH', tech: 'Hassan Juma', status: 'Dispatched', type: 'Repair', location: 'Terminal 3' },
    { id: 'WO-8804', title: 'CCTV & Access Control Panel Upgrade', client: 'NMB House Branch', priority: 'LOW', tech: 'Grace Shayo', status: 'Completed', type: 'Installation', location: 'Posta' },
  ]);

  const [equipmentList] = useState([
    { id: 'EQ-1092', name: 'Fluke Thermal Imaging Camera X5', serial: 'FLK-99021', owner: 'Company', health: 98, status: 'Available' },
    { id: 'EQ-1093', name: 'Cat 500kVA Diesel Backup Generator', serial: 'CAT-GEN-883', owner: 'Customer (Kilimanjaro Hotel)', health: 74, status: 'In Maintenance' },
    { id: 'EQ-1094', name: 'Hydraulic Pressure Testing Rig 1000 Bar', serial: 'RIG-TX-44', owner: 'Company', health: 92, status: 'Deployed On-Site' },
  ]);

  // AI Assistant Insights State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAiEngine = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setAiAnalysis(
        "🤖 AI Technical Assessment:\n" +
        "1. Critical Risk Alert: CAT 500kVA Generator at Kilimanjaro Hotel shows high vibration signatures (74% health score). Recommending immediate bearing replacement before scheduled August calibration.\n" +
        "2. Workforce Optimization: Eng. David Mwangi has 2 active major projects. Shift Substation Site Oversight to Eng. Sarah Kilo to optimize delivery times.\n" +
        "3. Inventory Replenishment: R410A Refrigerant Gas stock is at 3 cylinders (low threshold: 5). Auto-generating RFQ for Supplier Alpha Gas Ltd."
      );
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim() || !projClient.trim()) return;
    const newProj = {
      id: `PRJ-2026-00${projectsList.length + 1}`,
      name: projName.trim(),
      client: projClient.trim(),
      budget: Number(projBudget) || 25000000,
      lead: 'Eng. Onboarding Lead',
      status: 'Active',
      progress: 5,
      deadline: '2026-12-31'
    };
    setProjectsList([newProj, ...projectsList]);
    setProjName('');
    setProjClient('');
    setProjBudget('');
    setIsNewProjectModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      
      {/* ── Technical Company Module Header Bar ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-darkbg-card p-5 rounded-2xl border dark:border-darkbg-border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <Wrench size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white m-0">
                Technical &amp; Engineering Operations Hub
              </h2>
              <Badge variant="success" className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                Plugin Enabled v1.0
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Workspace Scope: {currentTenant?.name || 'Technical Business'} • Project lifecycle, work orders, equipment assets, and AI diagnostics
            </p>
          </div>
        </div>

        {/* Quick Action Trigger Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewWorkOrderModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Dispatch Work Order
          </button>
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> New Technical Project
          </button>
        </div>
      </div>

      {/* ── Sub-Navigation Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-darkbg-border scrollbar-none">
        {[
          { id: 'dashboard', label: 'Overview & KPIs', icon: Activity },
          { id: 'projects', label: 'Projects & Contracts', icon: Briefcase },
          { id: 'fieldservice', label: 'Field Work Orders', icon: HardHat },
          { id: 'services', label: 'Technical Services & Calibration', icon: Wrench },
          { id: 'assets', label: 'Assets & Equipment', icon: Cpu },
          { id: 'workforce', label: 'Workforce & Technicians', icon: Users },
          { id: 'fleet', label: 'Fleet & Logistics', icon: Truck },
          { id: 'ai', label: 'AI Predictive Insights', icon: Sparkles },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-darkbg-card border-slate-200 dark:border-darkbg-border text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-darkbg'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: DASHBOARD & OPERATIONAL KPIS ── */}
      {subTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* KPI Stat Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white dark:bg-darkbg-card p-4 rounded-2xl border dark:border-darkbg-border shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Briefcase size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Active Projects</span>
                <div className="font-black text-slate-800 dark:text-white text-base">
                  {projectsList.filter(p => p.status === 'Active').length} Active Projects
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> 85% On Schedule
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-darkbg-card p-4 rounded-2xl border dark:border-darkbg-border shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <HardHat size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Pending Field Jobs</span>
                <div className="font-black text-slate-800 dark:text-white text-base">
                  {workOrdersList.filter(w => w.status !== 'Completed').length} Field Jobs
                </div>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  1 Emergency Request
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-darkbg-card p-4 rounded-2xl border dark:border-darkbg-border shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                <Users size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Field Technicians</span>
                <div className="font-black text-slate-800 dark:text-white text-base">
                  18 / 22 Deployed
                </div>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  82% Utilization Rate
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-darkbg-card p-4 rounded-2xl border dark:border-darkbg-border shadow-xs flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Cpu size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Equipment Health</span>
                <div className="font-black text-slate-800 dark:text-white text-base">
                  98.4% Operational
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  2 Due Calibration
                </span>
              </div>
            </div>
          </div>

          {/* AI Banner Quick Insights */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white space-y-3 relative overflow-hidden shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                <h3 className="font-black text-sm text-white m-0">DukaPos Technical AI Copilot</h3>
              </div>
              <button
                onClick={runAiEngine}
                disabled={isAnalyzing}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isAnalyzing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                {isAnalyzing ? 'Analyzing Operational Metrics...' : 'Run Technical Diagnostics'}
              </button>
            </div>
            {aiAnalysis ? (
              <pre className="whitespace-pre-wrap font-sans text-xs bg-indigo-950/80 p-3 rounded-xl border border-indigo-800/60 text-indigo-100 leading-relaxed">
                {aiAnalysis}
              </pre>
            ) : (
              <p className="text-xs text-indigo-200/80 m-0">
                AI automated predictive maintenance, technician dispatch optimization, and project risk scoring is active. Click Run Technical Diagnostics above to generate real-time recommendations.
              </p>
            )}
          </div>

          {/* 2-Column Grid: Projects Overview & Dispatch Feed */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Active Projects Tracker */}
            <div className="p-5 bg-white dark:bg-darkbg-card border dark:border-darkbg-border rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b dark:border-darkbg-border pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <Briefcase className="h-4.5 w-4.5 text-indigo-600" />
                  Active Engineering Projects
                </h3>
                <button onClick={() => setSubTab('projects')} className="text-xs text-indigo-600 font-bold hover:underline">
                  View All ({projectsList.length}) →
                </button>
              </div>

              <div className="space-y-3">
                {projectsList.map(prj => (
                  <div key={prj.id} className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-darkbg/40 border border-slate-200/80 dark:border-darkbg-border space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{prj.id}</span>
                        <h4 className="font-bold text-slate-800 dark:text-white text-xs mt-0.5">{prj.name}</h4>
                        <p className="text-[11px] text-slate-400">Client: {prj.client}</p>
                      </div>
                      <Badge variant={prj.status === 'Completed' ? 'success' : prj.status === 'Active' ? 'info' : 'outline'}>
                        {prj.status}
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>Completion Milestone</span>
                        <span>{prj.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${prj.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Field Dispatch Feed */}
            <div className="p-5 bg-white dark:bg-darkbg-card border dark:border-darkbg-border rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b dark:border-darkbg-border pb-3">
                <h3 className="text-sm font-black text-slate-900 dark:text-white m-0 flex items-center gap-2">
                  <HardHat className="h-4.5 w-4.5 text-amber-600" />
                  Field Work Order Dispatch
                </h3>
                <button onClick={() => setSubTab('fieldservice')} className="text-xs text-indigo-600 font-bold hover:underline">
                  Dispatch Board →
                </button>
              </div>

              <div className="space-y-3">
                {workOrdersList.map(wo => (
                  <div key={wo.id} className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-darkbg/40 border border-slate-200/80 dark:border-darkbg-border flex items-center justify-between">
                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">{wo.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          wo.priority === 'CRITICAL' ? 'bg-red-100 text-red-600 dark:bg-red-950/60' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {wo.priority}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-xs truncate">{wo.title}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin size={12} /> {wo.client} ({wo.location})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">{wo.tech}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{wo.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 2: PROJECTS & CONTRACTS ── */}
      {subTab === 'projects' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 bg-white dark:bg-darkbg-card border dark:border-darkbg-border rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b dark:border-darkbg-border pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white m-0">
                Technical Projects &amp; Milestone Register
              </h3>
              <Button size="sm" onClick={() => setIsNewProjectModalOpen(true)} className="flex items-center gap-1">
                <Plus size={14} /> Create Technical Project
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-darkbg-border/30 bg-slate-50/70 dark:bg-darkbg/20 text-[10px] font-bold uppercase text-slate-400">
                    <th className="p-3 pl-4">Project ID &amp; Title</th>
                    <th className="p-3">Client / Organization</th>
                    <th className="p-3">Project Lead</th>
                    <th className="p-3">Budget (TZS)</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3">Deadline</th>
                    <th className="p-3 pr-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                  {projectsList.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-darkbg/50">
                      <td className="p-3 pl-4">
                        <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{p.id}</span>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{p.name}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{p.client}</td>
                      <td className="p-3 text-slate-500 font-medium">{p.lead}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">Tsh. {p.budget.toLocaleString()}</td>
                      <td className="p-3 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="font-bold text-[10px] text-slate-500">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-500">{p.deadline}</td>
                      <td className="p-3 pr-4 text-right">
                        <Badge variant={p.status === 'Completed' ? 'success' : p.status === 'Active' ? 'info' : 'outline'}>
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: FIELD SERVICE & WORK ORDERS ── */}
      {subTab === 'fieldservice' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 bg-white dark:bg-darkbg-card border dark:border-darkbg-border rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b dark:border-darkbg-border pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white m-0">
                Field Work Orders &amp; Dispatch Schedule
              </h3>
              <Button size="sm" onClick={() => setIsNewWorkOrderModalOpen(true)} className="flex items-center gap-1">
                <Plus size={14} /> Dispatch Technician
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {workOrdersList.map(wo => (
                <div key={wo.id} className="p-4 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50/50 dark:bg-darkbg/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-indigo-600">{wo.id}</span>
                    <Badge variant={wo.priority === 'CRITICAL' ? 'danger' : 'warning'}>{wo.priority}</Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{wo.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{wo.client} • {wo.location}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-darkbg-border/60 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-600">{wo.tech}</span>
                    <span className="font-semibold text-slate-500">{wo.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: ASSETS & EQUIPMENT ── */}
      {subTab === 'assets' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-5 bg-white dark:bg-darkbg-card border dark:border-darkbg-border rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b dark:border-darkbg-border pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white m-0">
                Company &amp; Customer Equipment Asset Register
              </h3>
              <Button size="sm" onClick={() => setIsNewAssetModalOpen(true)} className="flex items-center gap-1">
                <Plus size={14} /> Register Equipment Asset
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {equipmentList.map(eq => (
                <div key={eq.id} className="p-4 rounded-xl border border-slate-200 dark:border-darkbg-border bg-slate-50/50 dark:bg-darkbg/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-slate-500">{eq.id}</span>
                    <Badge variant={eq.status === 'Available' ? 'success' : 'warning'}>{eq.status}</Badge>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs">{eq.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">S/N: {eq.serial}</p>
                    <p className="text-[11px] text-indigo-600 font-semibold">{eq.owner}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>Equipment Health Score</span>
                      <span>{eq.health}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${eq.health > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${eq.health}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 8: AI PREDICTIVE INSIGHTS ── */}
      {subTab === 'ai' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white rounded-2xl shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-400 animate-bounce" />
              <h3 className="text-lg font-black text-white m-0">AI Predictive Maintenance &amp; Risk Suite</h3>
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed">
              DukaPos AI analyzes equipment vibration sensor logs, job completion times, technician skill matrix, and project milestones to forecast downtime and prevent costly technical failures.
            </p>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="p-3.5 rounded-xl bg-indigo-900/60 border border-indigo-800/80 space-y-1">
                <span className="text-[10px] text-indigo-300 font-bold uppercase">Predictive Failure Risk</span>
                <div className="text-base font-black text-amber-400">1 Asset at Risk</div>
                <p className="text-[11px] text-indigo-200">CAT 500kVA Generator due bearing replacement</p>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-900/60 border border-indigo-800/80 space-y-1">
                <span className="text-[10px] text-indigo-300 font-bold uppercase">Technician Load Optimizer</span>
                <div className="text-base font-black text-emerald-400">Balanced Load</div>
                <p className="text-[11px] text-indigo-200">Optimal dispatch route calculated for Dar Coast</p>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-900/60 border border-indigo-800/80 space-y-1">
                <span className="text-[10px] text-indigo-300 font-bold uppercase">Smart Replenishment</span>
                <div className="text-base font-black text-indigo-300">Auto RFQ Ready</div>
                <p className="text-[11px] text-indigo-200">Spare Parts demand forecasted for Q3</p>
              </div>
            </div>

            <Button onClick={runAiEngine} disabled={isAnalyzing} className="mt-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-xs">
              {isAnalyzing ? 'Analyzing Diagnostic Data...' : 'Run Full Technical Diagnostic Audit'}
            </Button>
          </div>
        </div>
      )}

      {/* ── CREATE PROJECT MODAL ── */}
      <Dialog
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create New Technical Project"
        description="Register a new engineering project contract with milestones and budget."
      >
        <form onSubmit={handleCreateProject} className="space-y-4 pt-2 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Solar Power Grid Installation"
              value={projName}
              onChange={e => setProjName(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-darkbg-border dark:bg-darkbg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Client Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tanzania Breweries Ltd"
                value={projClient}
                onChange={e => setProjClient(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-darkbg-border dark:bg-darkbg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Budget (TZS)</label>
              <input
                type="number"
                placeholder="e.g. 45000000"
                value={projBudget}
                onChange={e => setProjBudget(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-darkbg-border dark:bg-darkbg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-darkbg-border/30">
            <Button type="button" variant="outline" onClick={() => setIsNewProjectModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Technical Project</Button>
          </div>
        </form>
      </Dialog>

      {/* ── DISPATCH WORK ORDER MODAL ── */}
      <Dialog
        isOpen={isNewWorkOrderModalOpen}
        onClose={() => setIsNewWorkOrderModalOpen(false)}
        title="Dispatch Field Work Order"
        description="Assign a field engineer to an emergency repair or maintenance job."
      >
        <div className="space-y-3 pt-2 font-sans text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Select an active technician and location to dispatch an automated SMS &amp; Mobile App notification to the field engineer.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-darkbg-border/30">
            <Button variant="outline" onClick={() => setIsNewWorkOrderModalOpen(false)}>Close</Button>
            <Button variant="primary" onClick={() => { alert('✅ Dispatch sent to Field Engineer!'); setIsNewWorkOrderModalOpen(false); }}>
              Confirm Dispatch
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── ASSET REGISTRATION MODAL ── */}
      <Dialog
        isOpen={isNewAssetModalOpen}
        onClose={() => setIsNewAssetModalOpen(false)}
        title="Register Technical Equipment Asset"
        description="Track serial numbers, calibration schedules, and health scores."
      >
        <div className="space-y-3 pt-2 font-sans text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Enter equipment serial numbers, manufacturer calibration frequency, and customer asset owner details.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-darkbg-border/30">
            <Button variant="outline" onClick={() => setIsNewAssetModalOpen(false)}>Close</Button>
            <Button variant="primary" onClick={() => { alert('✅ Equipment asset registered!'); setIsNewAssetModalOpen(false); }}>
              Save Equipment Record
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
