import React, { useState, useEffect } from 'react';
import { useModule } from '../../context/ModuleContext';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge } from '../UI/custom-ui';
import { 
  Briefcase, FileText, Play, Pause, Trash, Check, 
  Sparkles, Send, MessageSquare, Target, FileCheck, 
  AlertTriangle, TrendingUp
} from 'lucide-react';

interface SWOTRecord {
  id: string;
  clientName: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  created_at: string;
}

interface OKRRecord {
  id: string;
  objective: string;
  keyResults: { text: string; progress: number }[];
  targetDate: string;
}

interface ProjectRecord {
  id: string;
  name: string;
  client: string;
  status: 'Planning' | 'Active' | 'Under Review' | 'Completed';
  progress: number;
  timeline: string;
}

export const BusinessConsulting: React.FC = () => {
  const { activeTab } = useModule();
  const { currentTenant } = useAuth();
  const tenantId = currentTenant?.id || 'default';

  // --- State Hooks ---
  const [swots, setSwots] = useState<SWOTRecord[]>([]);
  const [okrs, setOkrs] = useState<OKRRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  // Load from local storage on mount/tenant change:
  useEffect(() => {
    const swKey = `dukapos_consulting_swots_${tenantId}`;
    const okKey = `dukapos_consulting_okrs_${tenantId}`;
    const prKey = `dukapos_consulting_projects_${tenantId}`;

    const savedSwots = localStorage.getItem(swKey);
    setSwots(savedSwots ? JSON.parse(savedSwots) : [
      {
        id: 'swot-1',
        clientName: 'Tanzania Breweries Ltd (TBL)',
        strengths: ['Strong local brand presence', 'Optimized supply chain network'],
        weaknesses: ['High sensitivity to local fuel costs', 'Legacy manufacturing equipment'],
        opportunities: ['Regional export expansion in East Africa', 'Premium craft beer launch'],
        threats: ['Excise duty tax increases', 'Rising raw ingredient costs'],
        created_at: '2026-07-15'
      }
    ]);

    const savedOkrs = localStorage.getItem(okKey);
    setOkrs(savedOkrs ? JSON.parse(savedOkrs) : [
      {
        id: 'okr-1',
        objective: 'Scale Digital Advisory Services Division',
        keyResults: [
          { text: 'Onboard 5 tier-1 strategy clients', progress: 60 },
          { text: 'Achieve 85% Consultant utilization rate', progress: 90 },
          { text: 'Publish 3 digital transformation whitepapers', progress: 33 }
        ],
        targetDate: '2026-09-30'
      }
    ]);

    const savedProjects = localStorage.getItem(prKey);
    setProjects(savedProjects ? JSON.parse(savedProjects) : [
      { id: 'proj-1', name: 'Strategic Expansion Plan', client: 'TBL', status: 'Active', progress: 75, timeline: 'Q3 2026' },
      { id: 'proj-2', name: 'Digital Audit & Tech Strategy', client: 'KCB Bank Tz', status: 'Active', progress: 40, timeline: 'Q3-Q4 2026' },
      { id: 'proj-3', name: 'Supply Chain Efficiency Assessment', client: 'Bakhresa Group', status: 'Planning', progress: 10, timeline: 'Q4 2026' }
    ]);
  }, [tenantId]);

  // Time Tracker State
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timeLogs, setTimeLogs] = useState<{ id: string; client: string; description: string; duration: string; date: string }[]>(() => [
    { id: 'log-1', client: 'TBL', description: 'Financial model audit and stress testing', duration: '2h 15m', date: '2026-07-17' },
    { id: 'log-2', client: 'KCB Bank Tz', description: 'SWOT alignment session & OKR workshop', duration: '3h 40m', date: '2026-07-16' }
  ]);
  const [selectedClientForTimer, setSelectedClientForTimer] = useState('TBL');
  const [timerDesc, setTimerDesc] = useState('');

  // Proposals State
  const [proposals, setProposals] = useState(() => [
    { id: 'prop-1', client: 'METL Group', title: 'Operational Restructuring Proposal', value: 'Tsh. 85,000,000', status: 'Accepted', date: '2026-07-10' },
    { id: 'prop-2', client: 'CRDB Bank', title: 'Agri-Business Lending Advisory Strategy', value: 'Tsh. 120,000,000', status: 'Sent', date: '2026-07-14' }
  ]);

  // Invoice generator state
  const [invoices, setInvoices] = useState(() => [
    { id: 'INV-CONS-1001', client: 'TBL', amount: 'Tsh. 25,000,000', status: 'Paid', date: '2026-07-01' },
    { id: 'INV-CONS-1002', client: 'KCB Bank Tz', amount: 'Tsh. 18,500,000', status: 'Sent', date: '2026-07-10' }
  ]);

  // SWOT Creator inputs
  const [swotClient, setSwotClient] = useState('');
  const [swotStr, setSwotStr] = useState('');
  const [swotWeak, setSwotWeak] = useState('');
  const [swotOpp, setSwotOpp] = useState('');
  const [swotThr, setSwotThr] = useState('');

  // OKR Creator inputs
  const [okrObjective, setOkrObjective] = useState('');
  const [kr1, setKr1] = useState('');
  const [kr2, setKr2] = useState('');

  // Save effects
  useEffect(() => {
    if (swots.length > 0) {
      localStorage.setItem(`dukapos_consulting_swots_${tenantId}`, JSON.stringify(swots));
    }
  }, [swots, tenantId]);

  useEffect(() => {
    if (okrs.length > 0) {
      localStorage.setItem(`dukapos_consulting_okrs_${tenantId}`, JSON.stringify(okrs));
    }
  }, [okrs, tenantId]);

  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(`dukapos_consulting_projects_${tenantId}`, JSON.stringify(projects));
    }
  }, [projects, tenantId]);

  // Timer Tick
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStopTimer = () => {
    if (isTimerRunning) {
      // Save log
      const hrs = Math.floor(timerSeconds / 3600);
      const mins = Math.floor((timerSeconds % 3600) / 60);
      const logText = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m`;
      setTimeLogs(prev => [
        {
          id: `log-${Date.now()}`,
          client: selectedClientForTimer,
          description: timerDesc || 'Consulting Session',
          duration: logText === '0m' ? '1m' : logText,
          date: new Date().toISOString().split('T')[0]
        },
        ...prev
      ]);
      setTimerSeconds(0);
      setTimerDesc('');
    }
    setIsTimerRunning(!isTimerRunning);
  };

  // SWOT Creator
  const handleSaveSWOT = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swotClient) return;

    const newSwot: SWOTRecord = {
      id: `swot-${Date.now()}`,
      clientName: swotClient,
      strengths: swotStr.split('\n').filter(s => s.trim()),
      weaknesses: swotWeak.split('\n').filter(s => s.trim()),
      opportunities: swotOpp.split('\n').filter(s => s.trim()),
      threats: swotThr.split('\n').filter(s => s.trim()),
      created_at: new Date().toISOString().split('T')[0]
    };

    setSwots([newSwot, ...swots]);
    setSwotClient('');
    setSwotStr('');
    setSwotWeak('');
    setSwotOpp('');
    setSwotThr('');
    alert('SWOT Analysis saved successfully!');
  };

  // AI-Assisted SWOT Generator Simulation
  const handleAISwotGenerate = () => {
    if (!swotClient) {
      alert('Please fill in Client Name first so the AI can analyze.');
      return;
    }
    setSwotStr('• High consultant competence & technical domain experts\n• Proprietary business audit frameworks\n• Dynamic client delivery models');
    setSwotWeak('• Heavy dependencies on partner-level sales contacts\n• Limited awareness outside primary city hub\n• Resource bottlenecks during peak contract renewals');
    setSwotOpp('• Untapped market in mid-market SME consulting\n• Strategic partnerships with local commercial banks\n• Launch digital product advisory vertical');
    setSwotThr('• Highly aggressive pricing from multinational consultancies\n• Local talent drain to international remote projects\n• Impending economic policy shifts affecting client capital spending');
    alert('AI SWOT framework drafted successfully for review!');
  };

  // OKR Creator
  const handleSaveOKR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!okrObjective || !kr1) return;

    const newOkr: OKRRecord = {
      id: `okr-${Date.now()}`,
      objective: okrObjective,
      keyResults: [
        { text: kr1, progress: 0 },
        ...(kr2 ? [{ text: kr2, progress: 0 }] : [])
      ],
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setOkrs([newOkr, ...okrs]);
    setOkrObjective('');
    setKr1('');
    setKr2('');
    alert('OKR objective added successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Dynamic consulting header */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4 border-b border-slate-200 dark:border-darkbg-border">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span>Consulting Portal: {activeTab}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Professional Services Firm Automation & Advisory Systems
          </p>
        </div>
      </div>

      {/* RENDER PAGES CONDITIONALLY DEPENDING ON activeTab */}

      {/* 1. ENGAGEMENTS PAGE */}
      {(activeTab === 'Engagements' || activeTab === 'Active Projects' || activeTab === 'Consulting Engagements') && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((proj) => (
              <Card key={proj.id} className="hover:shadow-md transition">
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary">{proj.client}</span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white mt-1">{proj.name}</h4>
                    </div>
                    <Badge variant={proj.status === 'Active' ? 'success' : proj.status === 'Planning' ? 'warning' : 'info'}>
                      {proj.status}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Milestone Progress</span>
                      <span className="text-slate-700 dark:text-slate-200">{proj.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-darkbg-border h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-300" style={{ width: `${proj.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t dark:border-darkbg-border/40">
                    <span>Target Timeline: <strong>{proj.timeline}</strong></span>
                    <button 
                      className="text-primary hover:underline font-bold" 
                      onClick={() => alert(`Showing milestones & deliverables list for Project ${proj.name}`)}
                    >
                      Manage Deliverables &rarr;
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagements Lifecycle & Advisory Plans</CardTitle>
              <CardDescription>Setup strategy sessions, schedule business assessments and track key milestones.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border dark:border-darkbg-border overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-darkbg-card/50 border-b dark:border-darkbg-border font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-3">Advisory Program</th>
                      <th className="p-3">Deliverable Schedule</th>
                      <th className="p-3">Deliverable Status</th>
                      <th className="p-3">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                    <tr>
                      <td className="p-3 font-semibold">Business Assessment Roadmap</td>
                      <td className="p-3">Corporate SWOT Alignment Session</td>
                      <td className="p-3"><Badge variant="success">Completed</Badge></td>
                      <td className="p-3">Senior Consultant</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Strategy & OKR Structuring</td>
                      <td className="p-3">Roadmap Launch & OKR Validation</td>
                      <td className="p-3"><Badge variant="warning">In Progress</Badge></td>
                      <td className="p-3">Managing Partner</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. PROPOSALS PAGE */}
      {(activeTab === 'Proposals' || activeTab === 'Create Proposal' || activeTab === 'Sent Proposals') && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <span>AI-Assisted Proposal Generator</span>
                </CardTitle>
                <CardDescription>Draft premium, customized advisory proposals instantly utilizing target industry templates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input label="Target Client Organization" placeholder="e.g. Acme Corporation Ltd" id="prop-ai-client" />
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Proposal Scope Template</label>
                  <select className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2.5 dark:border-darkbg-border dark:bg-darkbg">
                    <option>Strategic Growth & Market Expansion Plan</option>
                    <option>Digital Product Architecture & Agile Transformation</option>
                    <option>Financial Restructuring & Cashflow Advisory</option>
                  </select>
                </div>
                <Button 
                  variant="primary" 
                  className="w-full flex items-center justify-center space-x-1.5"
                  onClick={() => {
                    const el = document.getElementById('prop-ai-client') as HTMLInputElement;
                    if (!el?.value) {
                      alert('Please input a Target Client Organization.');
                      return;
                    }
                    alert(`Drafting proposal blueprint for ${el.value}... Done! See proposal drafts log.`);
                    setProposals(prev => [
                      { id: `prop-${Date.now()}`, client: el.value, title: 'Strategic Advisory Proposal', value: 'Tsh. 45,000,000', status: 'Sent', date: new Date().toISOString().split('T')[0] },
                      ...prev
                    ]);
                    el.value = '';
                  }}
                >
                  <Sparkles className="h-4.5 w-4.5" />
                  <span>Draft Proposal with AI</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sent Proposals Log</CardTitle>
                <CardDescription>Track proposal statuses and conversion analytics.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-darkbg-card/50 border-b dark:border-darkbg-border font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-3">Client</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Fee / Value</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                      {proposals.map((prop) => (
                        <tr key={prop.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-bold">{prop.client}</td>
                          <td className="p-3 text-slate-500">{prop.title}</td>
                          <td className="p-3 font-semibold">{prop.value}</td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              prop.status === 'Accepted' ? 'bg-success/15 text-success' : 'bg-amber-500/15 text-amber-600'
                            }`}>{prop.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. CONTRACTS PAGE */}
      {(activeTab === 'Contracts' || activeTab === 'Digital Signatures' || activeTab === 'Renewals') && (
        <Card>
          <CardHeader>
            <CardTitle>Contracts Ledger & Digital Signing</CardTitle>
            <CardDescription>Execute digital signatures and audit upcoming renewals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border dark:border-darkbg-border overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-darkbg-card/50 border-b dark:border-darkbg-border font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-3">Contract Reference</th>
                    <th className="p-3">Organization</th>
                    <th className="p-3">Effective Range</th>
                    <th className="p-3">Signatures Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-bold">CTR-TBL-2026</td>
                    <td className="p-3">Tanzania Breweries Ltd</td>
                    <td className="p-3">Jul 2026 - Dec 2026</td>
                    <td className="p-3"><Badge variant="success">Fully Signed</Badge></td>
                    <td className="p-3 text-center">
                      <button className="text-primary hover:underline font-bold" onClick={() => alert('Opening signed contract PDF...')}>Download PDF</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-3 font-mono font-bold">CTR-KCB-2026</td>
                    <td className="p-3">KCB Bank Tz</td>
                    <td className="p-3">Aug 2026 - Nov 2026</td>
                    <td className="p-3"><Badge variant="warning">Awaiting Partner Signature</Badge></td>
                    <td className="p-3 text-center">
                      <button className="text-primary hover:underline font-bold" onClick={() => alert('Loading digital signing pad...')}>Execute Sign</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 border dark:border-darkbg-border rounded-xl space-y-3 bg-slate-50/50 dark:bg-darkbg-card/30">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1">
                  <FileCheck className="h-4 w-4 text-emerald-500" />
                  <span>Execute Digital Signature</span>
                </h4>
                <div className="h-32 border-2 border-dashed rounded-lg bg-white dark:bg-darkbg flex items-center justify-center text-slate-400 text-xs">
                  [ Draw Signature here using touch or mouse ]
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="w-1/2">Clear</Button>
                  <Button variant="primary" className="w-1/2" onClick={() => alert('Signature recorded!')}>Apply Signature</Button>
                </div>
              </div>

              <div className="p-4 border border-rose-200 bg-rose-500/5 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Expiring Contracts Warning</span>
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  The advisory contract with <strong>CRDB Bank Corporate</strong> is expiring in 14 days. Prepare renewal proposal or invoice for retainer expansion.
                </p>
                <Button variant="primary" size="sm" onClick={() => alert('Drafting renewal proposal scope...')}>Initiate Renewal Flow</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. SERVICES PAGE */}
      {(activeTab === 'Services' || activeTab === 'Service Catalog' || activeTab === 'Retainer Plans') && (
        <Card>
          <CardHeader>
            <CardTitle>Service Catalog & Retainer Packages</CardTitle>
            <CardDescription>Manage standard hourly rates, monthly advisory retainers, and package catalogs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { title: 'Hourly Advisory Service', rate: 'Tsh. 250,000 / hr', items: ['Direct senior advisor consultations', 'On-demand workshop facilitation', 'Audit review cycles'] },
                { title: 'Standard Strategy Retainer', rate: 'Tsh. 8,500,000 / mo', items: ['Monthly OKR tracking sessions', 'Bi-weekly executive check-ins', 'SWOT & risk assessments', 'Priority phone & email SLA'] },
                { title: 'Corporate Restructuring Package', rate: 'Tsh. 45,000,000 fixed', items: ['Full org-wide capacity planning', 'Custom PESTEL and SWOT reports', 'Process automation mapping', '60-day post-delivery support'] }
              ].map((serv, idx) => (
                <div key={idx} className="p-5 border dark:border-darkbg-border rounded-xl hover:shadow-md transition bg-slate-50/50 dark:bg-darkbg-card/20 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">{serv.title}</h4>
                    <div className="text-base font-extrabold text-primary mt-1">{serv.rate}</div>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-500">
                    {serv.items.map((it, i) => <li key={i}>&bull; {it}</li>)}
                  </ul>
                  <Button variant="outline" className="w-full text-xs font-bold" onClick={() => alert(`Editing package rules for ${serv.title}`)}>Edit Rules</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. TIME TRACKING PAGE */}
      {(activeTab === 'Time Tracking' || activeTab === 'Timesheets' || activeTab === 'Billable Hours') && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 text-white border-0">
              <CardContent className="p-6 space-y-6 text-center">
                <div>
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Active Client Stopwatch</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Record billable advisory activities</p>
                </div>

                <div className="text-4xl font-black font-mono tracking-tight my-4">
                  {formatTimer(timerSeconds)}
                </div>

                <div className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">Target Account</label>
                    <select 
                      value={selectedClientForTimer} 
                      onChange={(e) => setSelectedClientForTimer(e.target.value)}
                      className="h-9 w-full rounded-lg bg-white/10 border border-white/20 text-xs px-2.5 text-white focus:outline-none"
                    >
                      <option className="text-slate-800" value="TBL">Tanzania Breweries Ltd (TBL)</option>
                      <option className="text-slate-800" value="KCB">KCB Bank Tz</option>
                      <option className="text-slate-800" value="Acme">Acme Corporation Ltd</option>
                    </select>
                  </div>

                  <Input 
                    placeholder="Enter activity description..." 
                    value={timerDesc}
                    onChange={(e) => setTimerDesc(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder-white/40 h-9" 
                  />
                </div>

                <button 
                  onClick={handleStartStopTimer}
                  className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 ${
                    isTimerRunning ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                >
                  {isTimerRunning ? (
                    <>
                      <Pause className="h-4 w-4" />
                      <span>Stop & Record Hours</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Start Billable Timer</span>
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Billable Hours & Timesheets Registry</CardTitle>
                <CardDescription>Awaiting billing and invoicing cycles.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-darkbg-card/50 border-b dark:border-darkbg-border font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-3">Date</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Activity Description</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                      {timeLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 text-slate-400 font-mono">{log.date}</td>
                          <td className="p-3 font-bold">{log.client}</td>
                          <td className="p-3 text-slate-500">{log.description}</td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">{log.duration}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-500">Approved</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 6. MEETINGS PAGE */}
      {(activeTab === 'Meetings' || activeTab === 'Calendar' || activeTab === 'Client Meetings') && (
        <Card>
          <CardHeader>
            <CardTitle>Client Meetings Calendar & Briefings</CardTitle>
            <CardDescription>Review advisory follow-ups, sync agendas and export briefing summaries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 border dark:border-darkbg-border rounded-xl p-4 bg-slate-50/50 dark:bg-darkbg-card/30">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase mb-4">Interactive Schedule</h4>
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="font-bold text-slate-400 uppercase py-1 text-[10px]">{d}</div>
                  ))}
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const hasMeeting = day === 15 || day === 18 || day === 22;
                    return (
                      <div 
                        key={day} 
                        className={`h-12 border rounded-lg flex flex-col justify-between p-1 bg-white dark:bg-darkbg dark:border-darkbg-border relative hover:border-primary cursor-pointer transition ${
                          hasMeeting ? 'border-primary' : ''
                        }`}
                        onClick={() => {
                          if (hasMeeting) alert(`Meeting scheduled on Day ${day}: Strategy briefing session.`);
                          else alert(`No meetings scheduled for Day ${day}.`);
                        }}
                      >
                        <span className="font-bold text-[10px] text-slate-400 text-left">{day}</span>
                        {hasMeeting && <div className="h-1.5 w-1.5 rounded-full bg-primary mx-auto mb-1"></div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-1 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Today's Agenda</h4>
                {[
                  { title: 'TBL Q3 Deliverables Review', time: '10:00 AM', loc: 'Online (MS Teams)', desc: 'Stress test modeling validation.' },
                  { title: 'CRDB Renewal Strategy Talk', time: '02:00 PM', loc: 'HQ Office Boardroom', desc: 'Discuss proposal scope expansion.' }
                ].map((meet, idx) => (
                  <div key={idx} className="p-3 border dark:border-darkbg-border rounded-xl bg-white dark:bg-darkbg-card/45 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-800 dark:text-white">{meet.title}</span>
                      <span className="text-primary">{meet.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{meet.desc}</p>
                    <div className="text-[9px] bg-slate-100 dark:bg-darkbg-border text-slate-500 rounded px-1.5 py-0.5 inline-block">{meet.loc}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. ASSESSMENTS PAGE */}
      {(activeTab === 'Assessments' || activeTab === 'SWOT Analysis' || activeTab === 'Business Health Check') && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>SWOT / Assessment Blueprint</CardTitle>
                <CardDescription>Define corporate SWOT points or trigger the AI drafting agent.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSWOT} className="space-y-4">
                  <Input 
                    label="Client Name *" 
                    placeholder="e.g. Tanzania Breweries Ltd" 
                    value={swotClient}
                    onChange={(e) => setSwotClient(e.target.value)}
                    required 
                  />

                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">SWOT Points Input</label>
                    <button 
                      type="button" 
                      onClick={handleAISwotGenerate}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Draft with AI</span>
                    </button>
                  </div>

                  <textarea 
                    placeholder="Strengths (one per line)..." 
                    value={swotStr}
                    onChange={(e) => setSwotStr(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 dark:bg-darkbg dark:border-darkbg-border h-16 resize-none"
                  />
                  <textarea 
                    placeholder="Weaknesses (one per line)..." 
                    value={swotWeak}
                    onChange={(e) => setSwotWeak(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 dark:bg-darkbg dark:border-darkbg-border h-16 resize-none"
                  />
                  <textarea 
                    placeholder="Opportunities (one per line)..." 
                    value={swotOpp}
                    onChange={(e) => setSwotOpp(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 dark:bg-darkbg dark:border-darkbg-border h-16 resize-none"
                  />
                  <textarea 
                    placeholder="Threats (one per line)..." 
                    value={swotThr}
                    onChange={(e) => setSwotThr(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 dark:bg-darkbg dark:border-darkbg-border h-16 resize-none"
                  />

                  <Button type="submit" variant="primary" className="w-full">Save Assessment</Button>
                </form>
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-6">
              {swots.map((swot) => (
                <Card key={swot.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{swot.clientName}</CardTitle>
                      <CardDescription>Business Audit SWOT Framework • Created on {swot.created_at}</CardDescription>
                    </div>
                    <button 
                      className="text-slate-400 hover:text-red-500" 
                      onClick={() => setSwots(swots.filter(s => s.id !== swot.id))}
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1.5">
                        <h5 className="text-xs font-bold text-success flex items-center gap-1 uppercase tracking-wide">
                          <Check className="h-4.5 w-4.5" />
                          <span>Strengths</span>
                        </h5>
                        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                          {swot.strengths.map((s, idx) => <li key={idx}>&bull; {s}</li>)}
                        </ul>
                      </div>

                      <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1.5">
                        <h5 className="text-xs font-bold text-danger flex items-center gap-1 uppercase tracking-wide">
                          <AlertTriangle className="h-4.5 w-4.5" />
                          <span>Weaknesses</span>
                        </h5>
                        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                          {swot.weaknesses.map((s, idx) => <li key={idx}>&bull; {s}</li>)}
                        </ul>
                      </div>

                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1.5">
                        <h5 className="text-xs font-bold text-indigo-500 flex items-center gap-1 uppercase tracking-wide">
                          <TrendingUp className="h-4.5 w-4.5" />
                          <span>Opportunities</span>
                        </h5>
                        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                          {swot.opportunities.map((s, idx) => <li key={idx}>&bull; {s}</li>)}
                        </ul>
                      </div>

                      <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-1.5">
                        <h5 className="text-xs font-bold text-amber-500 flex items-center gap-1 uppercase tracking-wide">
                          <AlertTriangle className="h-4.5 w-4.5" />
                          <span>Threats</span>
                        </h5>
                        <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pl-1">
                          {swot.threats.map((s, idx) => <li key={idx}>&bull; {s}</li>)}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. STRATEGY PAGE */}
      {(activeTab === 'Strategy' || activeTab === 'Strategic Plans' || activeTab === 'OKRs') && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Define Strategic Objective</CardTitle>
                <CardDescription>Map company targets and key result vectors.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveOKR} className="space-y-4">
                  <Input 
                    label="Objective Title *" 
                    placeholder="e.g. Expand Market Share in East Africa" 
                    value={okrObjective}
                    onChange={(e) => setOkrObjective(e.target.value)}
                    required 
                  />
                  <Input 
                    label="Key Result 1 *" 
                    placeholder="e.g. Set up regional office in Nairobi" 
                    value={kr1}
                    onChange={(e) => setKr1(e.target.value)}
                    required 
                  />
                  <Input 
                    label="Key Result 2 (Optional)" 
                    placeholder="e.g. Secure 10 Kenyan distribution partnerships" 
                    value={kr2}
                    onChange={(e) => setKr2(e.target.value)}
                  />
                  <Button type="submit" variant="primary" className="w-full">Create OKR Framework</Button>
                </form>
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-6">
              {okrs.map((okr) => (
                <Card key={okr.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black flex items-center gap-1">
                      <Target className="h-4.5 w-4.5 text-primary" />
                      <span>{okr.objective}</span>
                    </CardTitle>
                    <CardDescription>Target Date: {okr.targetDate}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {okr.keyResults.map((kr, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-medium">KR {idx + 1}: {kr.text}</span>
                          <span className="font-extrabold text-primary">{kr.progress}%</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={kr.progress} 
                            onChange={(e) => {
                              const nextProgress = Number(e.target.value);
                              setOkrs(okrs.map(o => {
                                if (o.id !== okr.id) return o;
                                const nextKRs = [...o.keyResults];
                                nextKRs[idx] = { ...nextKRs[idx], progress: nextProgress };
                                return { ...o, keyResults: nextKRs };
                              }));
                            }}
                            className="flex-1 accent-primary h-1 rounded"
                          />
                          <Badge variant={kr.progress === 100 ? 'success' : 'info'}>
                            {kr.progress === 100 ? 'Completed' : 'Tracking'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. INVOICING PAGE */}
      {(activeTab === 'Invoicing' || activeTab === 'Quotes' || activeTab === 'Invoices') && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Create Consulting Invoice</CardTitle>
                <CardDescription>Select client, amount and dispatch retainer billings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input label="Client Name" placeholder="e.g. Tanzania Breweries Ltd" id="inv-client" />
                  <Input type="number" label="Billing Amount (Tsh.)" placeholder="e.g. 15000000" id="inv-amount" />
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Invoice Item Description</label>
                    <select className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs px-2.5 dark:border-darkbg-border dark:bg-darkbg">
                      <option>Monthly Strategy Retainer Fee</option>
                      <option>Project Milestone Deliverable billing</option>
                      <option>Direct Hours Consulting Advisory</option>
                    </select>
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full"
                    onClick={() => {
                      const clientEl = document.getElementById('inv-client') as HTMLInputElement;
                      const amtEl = document.getElementById('inv-amount') as HTMLInputElement;
                      if (!clientEl?.value || !amtEl?.value) {
                        alert('Please fill out all billing fields.');
                        return;
                      }
                      const num = Number(amtEl.value);
                      setInvoices(prev => [
                        {
                          id: `INV-CONS-${Date.now().toString().slice(-4)}`,
                          client: clientEl.value,
                          amount: `Tsh. ${num.toLocaleString()}`,
                          status: 'Sent',
                          date: new Date().toISOString().split('T')[0]
                        },
                        ...prev
                      ]);
                      clientEl.value = '';
                      amtEl.value = '';
                      alert('Consulting Invoice dispatched to client dashboard.');
                    }}
                  >
                    Dispatch Invoice &rarr;
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Outstanding Consulting Invoices Ledger</CardTitle>
                <CardDescription>Track payments, retainers and outstanding quotes.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-darkbg-card/50 border-b dark:border-darkbg-border font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-3">Invoice Number</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Issue Date</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-darkbg-border/20">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-bold text-primary">{inv.id}</td>
                          <td className="p-3 font-bold">{inv.client}</td>
                          <td className="p-3 text-slate-400">{inv.date}</td>
                          <td className="p-3 font-semibold">{inv.amount}</td>
                          <td className="p-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              inv.status === 'Paid' ? 'bg-success/15 text-success' : 'bg-indigo-500/15 text-indigo-500'
                            }`}>{inv.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 10. TEAM PAGE */}
      {(activeTab === 'Team' || activeTab === 'Consultants' || activeTab === 'Skills Matrix') && (
        <Card>
          <CardHeader>
            <CardTitle>Consulting Team Capacity & Skill Matrix</CardTitle>
            <CardDescription>Audit consultant roles, certs, and current weekly work utilization.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { name: 'Dr. Frank Mwasha', role: 'Managing Partner', capacity: '100% (Fully Utilized)', skills: 'Corporate Strategy, M&A, Restructuring', cert: 'PhD Management' },
                { name: 'Grace Mlay', role: 'Senior Consultant', capacity: '85% (Optimal)', skills: 'Financial Modeling, Risk, Tax Audit', cert: 'CFA, CPA(T)' },
                { name: 'Hassani Salim', role: 'Strategy Consultant', capacity: '60% (Available)', skills: 'Market Entry, OKRs, SWOT Mapping', cert: 'MBA, Agile CSM' }
              ].map((member, idx) => (
                <div key={idx} className="p-4 border dark:border-darkbg-border rounded-xl space-y-3 bg-slate-50/50 dark:bg-darkbg-card/25">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                      {member.name.split(' ').slice(-1)[0][0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">{member.name}</h4>
                      <span className="text-[10px] text-primary font-bold">{member.role}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-500 leading-normal">
                    <div>Capacity: <strong>{member.capacity}</strong></div>
                    <div>Skills: <strong>{member.skills}</strong></div>
                    <div>Credentials: <strong>{member.cert}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 11. KNOWLEDGE BASE */}
      {(activeTab === 'Knowledge Base' || activeTab === 'Templates' || activeTab === 'Best Practices') && (
        <Card>
          <CardHeader>
            <CardTitle>Consulting Practice Library & Standard Operating Procedures (SOPs)</CardTitle>
            <CardDescription>Access Case studies, report templates, and PESTEL frameworks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[
                { title: 'Standard PESTEL Template', size: '2.4 MB', type: 'Word Doc' },
                { title: 'SWOT Advisory Guidelines', size: '1.8 MB', type: 'PDF Manual' },
                { title: 'Corporate Valuation Model v4', size: '4.5 MB', type: 'Excel Sheet' }
              ].map((doc, idx) => (
                <div 
                  key={idx} 
                  className="p-3 border dark:border-darkbg-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer flex items-center space-x-3 transition"
                  onClick={() => alert(`Downloading Knowledge Base Document: ${doc.title}`)}
                >
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white leading-normal">{doc.title}</h5>
                    <span className="text-[10px] text-slate-400">{doc.type} &bull; {doc.size}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 12. AI CONSULTANT */}
      {(activeTab === 'AI Consultant' || activeTab === 'Business Insights') && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <span>AI Core Models</span>
              </CardTitle>
              <CardDescription>Select a system model to generate strategic corporate insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full text-xs justify-start"
                onClick={() => {
                  const name = prompt('Enter client name for SWOT draft:');
                  if (name) {
                    alert(`Drafting PESTEL & SWOT framework for ${name}... Done! See SWOT logs.`);
                    setSwots(prev => [
                      {
                        id: `swot-${Date.now()}`,
                        clientName: name,
                        strengths: ['Experienced top management', 'Proprietary core technology'],
                        weaknesses: ['Concentrated revenue sources', 'Low digital automation'],
                        opportunities: ['Expansion into East African Community', 'Introduce product-led subscriptions'],
                        threats: ['Macroeconomic inflation factors', 'Increasing local resource costs'],
                        created_at: new Date().toISOString().split('T')[0]
                      },
                      ...prev
                    ]);
                  }
                }}
              >
                Draft Corporate SWOT Analysis &rarr;
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-xs justify-start"
                onClick={() => alert('AI Cashflow Forecast Model: Recommended to retain 25% cash buffer due to Q3 tax excise adjustments.')}
              >
                Generate Cashflow Recommendations &rarr;
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                <span>Advisory Chat Advisor</span>
              </CardTitle>
              <CardDescription>Chat directly with your virtual AI Consulting Assistant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-48 rounded-xl border dark:border-darkbg-border bg-slate-50 dark:bg-darkbg p-3 space-y-3 overflow-y-auto text-xs">
                <div className="flex space-x-2">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center font-bold text-white text-[10px]">AI</div>
                  <div className="bg-white dark:bg-darkbg-card p-2 rounded-lg border max-w-[80%] leading-relaxed">
                    Hello! I am your DukaPos AI Consulting partner. Ask me about SWOT generators, OKR planning, cashflow recommendations, or proposal blueprints.
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Input placeholder="Type query (e.g. Draft SWOT for local logistics company)..." className="flex-1" id="ai-chat-input" />
                <Button 
                  variant="primary"
                  onClick={() => {
                    const el = document.getElementById('ai-chat-input') as HTMLInputElement;
                    if (!el?.value) return;
                    alert('Query dispatched to AI models. Response received and updated in log.');
                    el.value = '';
                  }}
                >
                  <Send className="h-4.5 w-4.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 13. COMMUNICATIONS */}
      {activeTab === 'Communications' && (
        <Card>
          <CardHeader>
            <CardTitle>Client Portal & Email Center</CardTitle>
            <CardDescription>Send notifications, emails, and WhatsApp updates to client contact persons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Recipient Email" placeholder="e.g. grace.mlay@client.com" />
              <Input label="Subject" placeholder="e.g. Q3 Deliverables Status Review" />
            </div>
            <textarea 
              placeholder="Message body content..." 
              className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-slate-50 dark:bg-darkbg dark:border-darkbg-border h-32 resize-none"
            />
            <Button variant="primary" onClick={() => alert('Email queued for delivery!')}>Send Client Message</Button>
          </CardContent>
        </Card>
      )}

      {/* 14. ADMINISTRATION */}
      {activeTab === 'Administration' && (
        <Card>
          <CardHeader>
            <CardTitle>Consulting Firm Administration & Approvals</CardTitle>
            <CardDescription>Configure role approvals, workflow automation, and custom fields mapping.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border dark:border-darkbg-border rounded-xl space-y-2 bg-slate-50/50 dark:bg-darkbg-card/25">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase">Practice Settings</h4>
              <ul className="text-xs text-slate-500 space-y-2 leading-relaxed">
                <li>&bull; Base Practice Currency: <strong>TZS (Shilling)</strong></li>
                <li>&bull; Default Billable Rate: <strong>Tsh. 250,000 / hour</strong></li>
                <li>&bull; Approval Workflow: <strong>Requires Partner signature on contracts exceeding Tsh. 50,000,000</strong></li>
              </ul>
            </div>
            <Button variant="outline" className="text-xs" onClick={() => alert('Opening advanced configuration console...')}>Configure Workflows</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
