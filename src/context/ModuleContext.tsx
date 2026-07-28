import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '../db/supabaseClient';

export type IndustryModule =
  | 'Retail'
  | 'Restaurant'
  | 'SACCO'
  | 'Workforce'
  | 'Pharmacy'
  | 'Hardware'
  | 'Construction'
  | 'Law'
  | 'RealEstate'
  | 'Microfinance'
  | 'Agriculture'
  | 'Electronics'
  | 'Garage'
  | 'FuelStation'
  | 'School'
  | 'Bookshop'
  | 'Security'
  | 'Water'
  | 'Transport'
  | 'Waste'
  | 'Wholesale'
  | 'Fashion'
  | 'Service'
  | 'Cosmetics'
  | 'Salon'
  | 'Hotel'
  | 'Poultry'
  | 'Bar'
  | 'BusinessConsultant';

export interface NestedSidebarItem {
  name: string;
  subItems?: string[];
}

export type SidebarItem = string | NestedSidebarItem;

export interface ModuleManifest {
  name: string;
  icon: string;
  sidebar: SidebarItem[];
  widgets: string[];
  description: string;
}

export const MODULE_MANIFESTS: Record<IndustryModule, ModuleManifest> = {
  Retail: {
    name: 'Retail Shop / General Store',
    icon: 'Store',
    sidebar: [
      'Dashboard',
      { name: 'POS', subItems: ['New Sale', 'Sales History', 'Returns'] },
      { name: 'Inventory', subItems: ['Products', 'Categories', 'Stock Adjustment', 'Stock Transfer', 'Stock Alerts'] },
      'Customers',
      'Suppliers',
      'Expenses',
      'Purchasing',
      { name: 'Reports', subItems: ['Sales', 'Profit', 'Inventory', 'Tax'] },
      'Employees',
      'Settings'
    ],
    widgets: ['SalesToday', 'ProfitToday', 'InventoryValue', 'LowStock'],
    description: 'Retail inventory count, sales, receipts, and client reward points.'
  },
  Restaurant: {
    name: 'Restaurant / Cafe',
    icon: 'Utensils',
    sidebar: [
      'Dashboard',
      'POS',
      'Tables',
      'Kitchen Display',
      { name: 'Orders', subItems: ['Open Orders', 'Completed Orders', 'Cancelled Orders'] },
      { name: 'Menu Management', subItems: ['Food Items', 'Categories', 'Recipes'] },
      'Inventory',
      'Ingredients',
      'Suppliers',
      'Reservations',
      'Employees',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'OpenTables', 'PendingOrders', 'KitchenStatus'],
    description: 'Table dining coordinates, kitchen ticket flows, and recipe costs.'
  },
  SACCO: {
    name: 'SACCO / VICOBA',
    icon: 'Coins',
    sidebar: [
      'Dashboard',
      'Members',
      'Groups',
      { name: 'Savings', subItems: ['Deposits', 'Withdrawals', 'Statements'] },
      { name: 'Loans', subItems: ['Loan Applications', 'Approval', 'Repayments', 'Loan Reports'] },
      'Shares',
      'Meetings',
      'Fines',
      'Reports',
      'Settings'
    ],
    widgets: ['TotalSavings', 'LoanDisbursements', 'OutstandingRepayments', 'MembersJoined'],
    description: 'Cooperative member capital, savings programs, and lending terms.'
  },
  Workforce: {
    name: 'Workforce Tracking & Time Management',
    icon: 'Users',
    sidebar: [
      'Dashboard',
      'Employees',
      'Attendance',
      'Time Tracking',
      'GPS Tracking',
      'Schedules',
      'Leave Management',
      'Payroll',
      'Performance',
      'Reports',
      'Settings'
    ],
    widgets: ['ClockedInCount', 'TotalAttendanceRate', 'ActiveOvertime', 'PayrollTotal'],
    description: 'Clock-in locations, GPS routes, payroll calculations, and leaves.'
  },
  Pharmacy: {
    name: 'Pharmacy / Chemist',
    icon: 'Pills',
    sidebar: [
      'Dashboard',
      'POS',
      'Patients',
      'Medicines',
      { name: 'Inventory', subItems: ['Batch Management', 'Expiry Tracking', 'Stock Transfer', 'Low Stock'] },
      'Prescriptions',
      'Suppliers',
      'Purchasing',
      'Insurance',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'PrescriptionsPending', 'ExpiryAlerts', 'LowStock'],
    description: 'Prescription verifications, batch expiries, and patient logs.'
  },
  Hardware: {
    name: 'Hardware & Building Materials',
    icon: 'Hammer',
    sidebar: [
      'Dashboard',
      'POS',
      'Products',
      'Inventory',
      'Categories',
      { name: 'Measurement Units', subItems: ['Pieces', 'Bags', 'Meters', 'Tons'] },
      'Suppliers',
      'Purchasing',
      'Customers',
      'Quotations',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'QuotationsPending', 'InventoryValue', 'LowStock'],
    description: 'Bulk material measurements, custom quotes, and supplier invoices.'
  },
  Construction: {
    name: 'Construction Company',
    icon: 'HardHat',
    sidebar: [
      'Dashboard',
      'Projects',
      'Sites',
      'Employees',
      'Equipment',
      'Materials',
      'Expenses',
      'Invoices',
      'Contracts',
      'Clients',
      'Reports',
      'Settings'
    ],
    widgets: ['ActiveProjects', 'SiteExpenses', 'EquipmentUtilization', 'InvoiceCollections'],
    description: 'Project sheets, machinery utilization logs, and site materials.'
  },
  Law: {
    name: 'Law Firm Module',
    icon: 'Gavel',
    sidebar: [
      'Dashboard',
      'Clients',
      'Cases',
      'Case Documents',
      'Court Calendar',
      'Billing',
      'Invoices',
      'Expenses',
      'Lawyers',
      'Reports',
      'Settings'
    ],
    widgets: ['ActiveLitigations', 'RetainersFees', 'CourtHearingsToday', 'BillableHours'],
    description: 'Case documents storage, client billings, and court calendars.'
  },
  RealEstate: {
    name: 'Real Estate / Property Management',
    icon: 'Home',
    sidebar: [
      'Dashboard',
      'Properties',
      'Units',
      'Tenants',
      'Rent Collection',
      'Maintenance',
      'Contracts',
      'Expenses',
      'Payments',
      'Reports',
      'Settings'
    ],
    widgets: ['TotalOccupancyRate', 'RentCollected', 'PendingMaintenance', 'OperatingExpenses'],
    description: 'Apartment listings, tenant rent collections, and work orders.'
  },
  Microfinance: {
    name: 'Microfinance & Lending',
    icon: 'TrendingUp',
    sidebar: [
      'Dashboard',
      'Customers',
      'Loans',
      'Loan Applications',
      'Approval',
      'Repayments',
      'Interest Calculator',
      'Collections',
      'Reports',
      'Settings'
    ],
    widgets: ['LoanBookValue', 'RepaymentsRate', 'DisbursalsToday', 'ParRatio'],
    description: 'Lending risk audits, interest calculations, and collections.'
  },
  Agriculture: {
    name: 'Agriculture / Farm Business',
    icon: 'Sprout',
    sidebar: [
      'Dashboard',
      'Farms',
      'Crops',
      'Livestock',
      'Inventory',
      'Seeds',
      'Fertilizer',
      'Harvest',
      'Expenses',
      'Workers',
      'Reports',
      'Settings'
    ],
    widgets: ['HarvestYield', 'LivestockCount', 'FertilizerStock', 'FarmOperatingExpenses'],
    description: 'Crop yields tracking, feed inventories, and workforce hours.'
  },
  Electronics: {
    name: 'Electronics Store',
    icon: 'Tv',
    sidebar: [
      'Dashboard',
      'POS',
      'Products',
      'Serial Numbers',
      'Warranty',
      'Inventory',
      'Repairs',
      'Suppliers',
      'Customers',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'SerialAudited', 'RepairsCompleted', 'WarrantyClaims'],
    description: 'Warranty logs, repair status trackers, and serial barcodes.'
  },
  Garage: {
    name: 'Garage / Vehicle Workshop',
    icon: 'Wrench',
    sidebar: [
      'Dashboard',
      'Vehicles',
      'Customers',
      'Repair Orders',
      'Mechanics',
      'Parts Inventory',
      'Service History',
      'Invoices',
      'Reports',
      'Settings'
    ],
    widgets: ['ActiveRepairOrders', 'MechanicLoad', 'ServiceRevenues', 'PartsUsed'],
    description: 'Vehicle diagnostics logs, mechanic assignments, and repair invoicing.'
  },
  FuelStation: {
    name: 'Fuel Station',
    icon: 'Fuel',
    sidebar: [
      'Dashboard',
      'Fuel Pump',
      'Fuel Inventory',
      'Tank Monitoring',
      'Price Management',
      'Sales',
      'Attendants',
      'Shift Management',
      'Expenses',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'TankLitresRemaining', 'PricePerLitre', 'ShiftProfit'],
    description: 'Pump volume readings, digital tank monitors, and price sets.'
  },
  School: {
    name: 'School Management Lite',
    icon: 'GraduationCap',
    sidebar: [
      'Dashboard',
      'Students',
      'Classes',
      'Attendance',
      'Fees',
      'Exams',
      'Teachers',
      'Parents',
      'Reports',
      'Settings'
    ],
    widgets: ['EnrolledStudents', 'DailyAttendance', 'FeesCollectedYTD', 'ExamAverages'],
    description: 'Student catalogs, classroom attendances, and tuition statements.'
  },
  Bookshop: {
    name: 'Bookshop / Stationery',
    icon: 'BookOpen',
    sidebar: [
      'Dashboard',
      'POS',
      'Books',
      'Stationery',
      'Inventory',
      'Suppliers',
      'Customers',
      'Purchasing',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'BooksValuation', 'SuppliersCount', 'LowStock'],
    description: 'Book inventories, school stationeries POS, and supplier orders.'
  },
  Security: {
    name: 'Security Company Management',
    icon: 'Shield',
    sidebar: [
      'Dashboard',
      'Guards',
      'Clients',
      'Sites',
      'Schedules',
      'Attendance',
      'Payroll',
      'Incidents',
      'Reports',
      'Settings'
    ],
    widgets: ['GuardsDeployed', 'PatrolledSites', 'ReportedIncidents', 'PayrollTotal'],
    description: 'Guard rosters, client patrol routes, and incident logs.'
  },
  Water: {
    name: 'Water Supply Management',
    icon: 'Droplet',
    sidebar: [
      'Dashboard',
      'Customers',
      'Meters',
      'Billing',
      'Payments',
      'Routes',
      'Water Usage',
      'Complaints',
      'Reports',
      'Settings'
    ],
    widgets: ['TotalWaterUsage', 'BilledAmount', 'OutstandingPayments', 'ResolvedComplaints'],
    description: 'Water meter consumption, utility billings, and repair routes.'
  },
  Transport: {
    name: 'Transport / Bus Operators',
    icon: 'Bus',
    sidebar: [
      'Dashboard',
      'Vehicles',
      'Routes',
      'Drivers',
      'Passengers',
      'Bookings',
      'Tickets',
      'Fuel',
      'Maintenance',
      'Reports',
      'Settings'
    ],
    widgets: ['ActiveTrips', 'PassengerBookings', 'TicketSales', 'FuelConsumption'],
    description: 'Bus schedule routes, ticket bookings, and fuel mileage audits.'
  },
  Waste: {
    name: 'Waste Management',
    icon: 'Trash2',
    sidebar: [
      'Dashboard',
      'Customers',
      'Collection Routes',
      'Vehicles',
      'Workers',
      'Invoices',
      'Payments',
      'Reports',
      'Settings'
    ],
    widgets: ['SubscribedCustomers', 'ActiveRoutes', 'CollectionTonnage', 'InvoicedBalances'],
    description: 'Garbage disposal routes, customer invoice billings, and work shifts.'
  },
  Wholesale: {
    name: 'Wholesale Business',
    icon: 'Boxes',
    sidebar: [
      'Dashboard',
      'POS',
      'Bulk Orders',
      'Inventory',
      'Warehouses',
      'Customers',
      'Suppliers',
      'Pricing',
      'Credit Sales',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'BulkOrderBacklog', 'WarehouseInventoryValue', 'CreditSalesOutstanding'],
    description: 'Bulk product pricing, warehouse splits, and credit lines.'
  },
  Fashion: {
    name: 'Fashion / Clothing Store',
    icon: 'Shirt',
    sidebar: [
      'Dashboard',
      'POS',
      'Products',
      'Sizes',
      'Colors',
      'Variants',
      'Inventory',
      'Customers',
      'Suppliers',
      'Promotions',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'VariantsStocked', 'PromotionsApplied', 'CustomersCount'],
    description: 'Clothing size/color variants matrices and promotional codes.'
  },
  Service: {
    name: 'Service Business',
    icon: 'Briefcase',
    sidebar: [
      'Dashboard',
      'Services',
      'Appointments',
      'Customers',
      'Staff',
      'Invoices',
      'Payments',
      'Expenses',
      'Reports',
      'Settings'
    ],
    widgets: ['BookedAppointments', 'ServiceSales', 'StaffHours', 'ClientRetentionRate'],
    description: 'Appointment schedules, staff timesheets, and service invoicing.'
  },
  Cosmetics: {
    name: 'Beauty & Cosmetics Shop',
    icon: 'Sparkles',
    sidebar: [
      'Dashboard',
      'POS',
      'Products',
      'Inventory',
      'Customers',
      'Suppliers',
      'Promotions',
      'Sales',
      'Reports',
      'Settings'
    ],
    widgets: ['SalesToday', 'InventoryValue', 'CustomersLoyalty', 'PromotionsCount'],
    description: 'Cosmetics POS sales, batch stock tracker, and rewards.'
  },
  Salon: {
    name: 'Salon & Barber Shop',
    icon: 'Scissors',
    sidebar: [
      'Dashboard',
      'Appointments',
      'Customers',
      'Services',
      'Staff',
      'POS',
      'Commission',
      'Inventory',
      'Reports',
      'Settings'
    ],
    widgets: ['DailyAppointments', 'POSSalesToday', 'StaffCommissionEarned', 'RepeatClients'],
    description: 'Stylists schedules, checkout POS, and commission payouts.'
  },
  Hotel: {
    name: 'Guest House / Hotel',
    icon: 'Bed',
    sidebar: [
      'Dashboard',
      'Rooms',
      'Reservations',
      'Guests',
      'Check In',
      'Check Out',
      'Housekeeping',
      'Restaurant',
      'Payments',
      'Reports',
      'Settings'
    ],
    widgets: ['OccupiedRooms', 'PendingReservations', 'HousekeepingQueues', 'DailyHotelRevenue'],
    description: 'Room guest reservations, check-ins, and housekeeping schedules.'
  },
  Poultry: {
    name: 'Poultry & Livestock Management',
    icon: 'Egg',
    sidebar: [
      'Dashboard',
      { name: 'Animals', subItems: ['Animal Register', 'Animal Groups', 'Breeds', 'Animal Profiles', 'Birth Records', 'Weight Tracking', 'Health History', 'Mortality Records'] },
      { name: 'Poultry Management', subItems: ['Flock Management', 'Batch Tracking', 'Egg Production', 'Hatchery Management', 'Brooding Records', 'Feed Consumption', 'Production Reports'] },
      { name: 'Livestock Operations', subItems: ['Cattle', 'Goats', 'Sheep', 'Pigs', 'Rabbits', 'Other Animals'] },
      { name: 'Health & Veterinary', subItems: ['Vaccination Schedule', 'Disease Tracking', 'Treatment Records', 'Veterinary Visits', 'Medicine Inventory'] },
      { name: 'Feed Management', subItems: ['Feed Inventory', 'Feed Formulation', 'Feed Usage', 'Feed Suppliers', 'Feed Cost Analysis'] },
      { name: 'Inventory', subItems: ['Products', 'Categories', 'Stock Adjustment', 'Stock Transfer', 'Low Stock Alerts'] },
      { name: 'Purchasing', subItems: ['Suppliers', 'Purchase Orders', 'Goods Received', 'Supplier Payments'] },
      { name: 'Sales', subItems: ['Animal Sales', 'Egg Sales', 'Milk Sales', 'Meat Sales', 'Customer Orders', 'Invoices'] },
      { name: 'Farm Management', subItems: ['Farm Locations', 'Pens & Houses', 'Production Areas', 'Farm Activities', 'Farm Calendar'] },
      { name: 'Workers', subItems: ['Farm Employees', 'Attendance', 'Tasks', 'Payroll'] },
      { name: 'Expenses', subItems: ['Feed Expenses', 'Medicine Expenses', 'Labor Costs', 'Operational Costs'] },
      { name: 'Reports', subItems: ['Animal Growth Report', 'Feed Cost Report', 'Production Report', 'Mortality Report', 'Profit & Loss', 'Farm Performance'] },
      { name: 'Settings', subItems: ['Farm Profile', 'Units', 'Custom Fields', 'Permissions'] }
    ],
    widgets: ['TotalAnimals', 'ActiveFlocks', 'EggProduction', 'FeedConsumption', 'MortalityRate', 'VaccinationDue', 'LowFeedStock', 'MonthlySales', 'FarmProfit'],
    description: 'Flock management, egg production, veterinary logs, and feed formulation.'
  },

  Bar: {
    name: 'Bar & Beverage Lounge',
    icon: 'Beer',
    sidebar: [
      'Dashboard',
      { name: 'Counter POS', subItems: ['Active Tables', 'Bar Counter POS', 'Open Tabs & Bills', 'Order History', 'Complimentary / Spoils'] },
      { name: 'Beverage Inventory', subItems: ['Stock Register', 'Liquid Volume Tracking', 'Empty Bottle Return', 'Stock Adjustments', 'Low Stock Alerts'] },
      { name: 'Recipe & Pour Control', subItems: ['Cocktail Recipes', 'Cost-Per-Pour Mapping', 'Batch Mixing', 'Spillage Logs'] },
      { name: 'Purchasing & Supplies', subItems: ['Distributors & Suppliers', 'Purchase Orders', 'Crate/Case Received', 'Supplier Ledgers'] },
      { name: 'Shift & Counter Management', subItems: ['Cashier Shifts', 'Counter Handover', 'Float Management', 'Audit & Variance Logs'] },
      { name: 'Staff & Commissions', subItems: ['Bartenders & Waiters', 'Attendance Register', 'Waiter Sales Tracking', 'Tips & Commissions'] },
      { name: 'Expenses', subItems: ['Licensing & Permits', 'Operational Costs', 'Damaged/Broken Stock'] },
      { name: 'Reports & Analytics', subItems: ['Daily Sales Summary', 'Fast-Moving Drinks', 'Pour Variance Report', 'Profit Margin Analysis', 'Tax & Excise Duty'] },
      { name: 'Settings', subItems: ['Bar Setup & Tables', 'Measurement Units (Pours/Bottles)', 'Happy Hour Rules', 'Role Permissions'] }
    ],
    widgets: ['SalesToday', 'ActiveOpenTabs', 'EstimatedLiquidVariance', 'TopSellingBeverage', 'HappyHourStatus'],
    description: 'Counter POS with open-tab billing, pour tracking, cocktail recipe costs, and excise duty reporting for bars, pubs, and nightclubs.'
  },
  BusinessConsultant: {
    name: 'Business Consultant / Firm',
    icon: 'Briefcase',
    sidebar: [
      { name: 'Dashboard', subItems: ['Executive Dashboard', 'KPI Overview', 'Revenue Analytics', 'Client Health Score', 'Upcoming Deadlines', 'Recent Activities'] },
      { name: 'Clients', subItems: ['Client Directory', 'Organizations', 'Individual Clients', 'Contact Persons', 'Client Notes', 'Client Documents', 'Client Portal Access'] },
      { name: 'Engagements', subItems: ['Active Projects', 'Consulting Engagements', 'Business Assessments', 'Strategy Sessions', 'Advisory Plans', 'Deliverables', 'Project Timeline'] },
      { name: 'Proposals', subItems: ['Create Proposal', 'Proposal Templates', 'Sent Proposals', 'Accepted', 'Rejected', 'Proposal Analytics'] },
      { name: 'Contracts', subItems: ['Contracts', 'Digital Signatures', 'Renewals', 'Contract Templates', 'Expiring Contracts'] },
      { name: 'Services', subItems: ['Service Catalog', 'Pricing Packages', 'Retainer Plans', 'Hourly Services', 'Custom Services', 'Service Categories'] },
      { name: 'Time Tracking', subItems: ['Timesheets', 'Billable Hours', 'Team Time Logs', 'Productivity Report', 'Approval Queue'] },
      { name: 'Meetings', subItems: ['Calendar', 'Client Meetings', 'Online Meetings', 'Follow-ups', 'Agenda', 'Meeting Minutes'] },
      { name: 'Assessments', subItems: ['SWOT Analysis', 'Business Health Check', 'Risk Assessment', 'Compliance Review', 'Financial Analysis', 'Assessment Templates'] },
      { name: 'Strategy', subItems: ['Strategic Plans', 'OKRs', 'Roadmaps', 'Action Plans', 'Milestones', 'Progress Tracking'] },
      { name: 'Invoicing', subItems: ['Quotes', 'Invoices', 'Payments', 'Outstanding', 'Recurring Billing', 'Expenses'] },
      { name: 'Team', subItems: ['Consultants', 'Skills Matrix', 'Certifications', 'Capacity Planning', 'Performance', 'Leave Calendar'] },
      { name: 'Knowledge Base', subItems: ['Templates', 'Best Practices', 'SOPs', 'Research Library', 'Case Studies', 'Internal Documents'] },
      { name: 'Reports', subItems: ['Client Reports', 'Project Reports', 'Financial Reports', 'Consultant Utilization', 'Revenue Reports', 'Profitability', 'Export Center'] },
      { name: 'AI Consultant', subItems: ['Business Insights', 'SWOT Generator', 'Proposal Generator', 'Business Plan Generator', 'Financial Recommendations', 'Meeting Summary', 'AI Chat'] },
      { name: 'Communications', subItems: ['Email Center', 'SMS', 'WhatsApp', 'Notifications', 'Activity Feed'] },
      { name: 'Administration', subItems: ['Branches', 'Users & Roles', 'Permissions', 'Workflow Automation', 'Approval Rules', 'Custom Fields', 'Integrations', 'Audit Logs', 'Settings'] }
    ],
    widgets: [
      'TotalClients', 'ActiveEngagements', 'MonthlyRevenue', 'ConsultantUtilization', 'BillableHours',
      'ProposalConversionRate', 'UpcomingMeetings', 'ExpiringContracts', 'OutstandingInvoices',
      'ClientSatisfactionScore', 'ProjectCompletion', 'TasksDueToday', 'RecentActivities', 'AIConsultantInsights'
    ],
    description: 'Automatic client portals, proposals, contracts, project deliverables, timesheets, and AI business analysis.'
  }
};

export interface ModuleState {
  enabled: boolean;
  version: string;
}

interface ModuleContextType {
  activeModule: IndustryModule;
  setActiveModule: (module: IndustryModule) => void;
  manifest: ModuleManifest;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  moduleStates: Record<string, ModuleState>;
  toggleModuleState: (moduleKey: string) => void;
  enabledModules: IndustryModule[];
  isModuleEnabled: (moduleKey: string) => boolean;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModuleState] = useState<IndustryModule>('Retail');
  const [activeTab, setActiveTab] = useState<string>('Dashboard');

  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>(() => {
    try {
      const saved = localStorage.getItem('dukapos_global_module_states');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse dukapos_global_module_states from localStorage', e);
    }
    const initial: Record<string, ModuleState> = {};
    (Object.keys(MODULE_MANIFESTS) as IndustryModule[]).forEach((key, index) => {
      initial[key] = { enabled: true, version: `v2.4.${index + 1}` };
    });
    return initial;
  });

  // Live query for persistent tenant modules from IndexedDB
  const liveTenantModules = useLiveQuery(async () => {
    try {
      const sessionStr = localStorage.getItem('dukapos_session');
      let tenantId: string | null = null;
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        tenantId = sess?.tenant?.id || sess?.user?.tenant_id || null;
      }
      if (tenantId) {
        return db.tenantModules.where('tenant_id').equals(tenantId).toArray();
      }
      return db.tenantModules.toArray();
    } catch (_) {
      return [];
    }
  });

  // Synchronize live DB tenant modules with React state and localStorage
  useEffect(() => {
    if (liveTenantModules && liveTenantModules.length > 0) {
      setModuleStates(prev => {
        let changed = false;
        const updated = { ...prev };
        for (const tm of liveTenantModules) {
          if (tm.module_key && (!updated[tm.module_key] || updated[tm.module_key].enabled !== tm.enabled)) {
            updated[tm.module_key] = {
              ...(updated[tm.module_key] || { version: 'v2.4.1' }),
              enabled: tm.enabled
            };
            changed = true;
          }
        }
        if (changed) {
          try {
            localStorage.setItem('dukapos_global_module_states', JSON.stringify(updated));
          } catch (_) {}
          return updated;
        }
        return prev;
      });
    }
  }, [liveTenantModules]);

  const toggleModuleState = async (moduleKey: string) => {
    const currentEnabled = moduleStates[moduleKey]?.enabled ?? true;
    const newEnabled = !currentEnabled;

    setModuleStates(prev => {
      const updated = {
        ...prev,
        [moduleKey]: {
          ...(prev[moduleKey] || { version: 'v2.4.1' }),
          enabled: newEnabled
        }
      };
      try {
        localStorage.setItem('dukapos_global_module_states', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save module states to localStorage', e);
      }
      return updated;
    });

    // Persist changes to IndexedDB and Cloud database (Supabase)
    try {
      const sessionStr = localStorage.getItem('dukapos_session');
      let activeTenantId: string | null = null;
      if (sessionStr) {
        try {
          const sess = JSON.parse(sessionStr);
          activeTenantId = sess?.tenant?.id || sess?.user?.tenant_id || null;
        } catch (_) {}
      }

      const tenants = await db.tenants.toArray();
      const targetTenantIds = activeTenantId
        ? Array.from(new Set([activeTenantId, ...tenants.map(t => t.id)]))
        : (tenants.length > 0 ? tenants.map(t => t.id) : ['tenant-101']);

      for (const tid of targetTenantIds) {
        const existing = await db.tenantModules.where('tenant_id').equals(tid).filter(m => m.module_key === moduleKey).first();
        if (existing) {
          const updatedRecord = { ...existing, enabled: newEnabled };
          await db.tenantModules.put(updatedRecord);
          try {
            await supabase.from('tenantModules').update({ enabled: newEnabled }).eq('id', existing.id);
          } catch (err) {
            console.warn('[ModuleContext] Failed to update cloud tenantModules:', err);
          }
        } else {
          const newRecord = {
            id: `tm-${tid}-${moduleKey.toLowerCase()}`,
            tenant_id: tid,
            module_key: moduleKey,
            enabled: newEnabled,
            configuration: {},
            installed_at: Date.now()
          };
          await db.tenantModules.put(newRecord);
          try {
            await supabase.from('tenantModules').insert(newRecord);
          } catch (err) {
            console.warn('[ModuleContext] Failed to insert cloud tenantModules:', err);
          }
        }
      }
    } catch (err) {
      console.error('[ModuleContext] Error persisting module toggle:', err);
    }
  };

  const isModuleEnabled = (moduleKey: string) => {
    return moduleStates[moduleKey]?.enabled ?? true;
  };

  const enabledModules = (Object.keys(MODULE_MANIFESTS) as IndustryModule[]).filter(key => isModuleEnabled(key));

  const rawManifest = MODULE_MANIFESTS[activeModule] || MODULE_MANIFESTS['Retail'];
  const manifest: ModuleManifest = {
    ...rawManifest,
    sidebar: rawManifest.sidebar.map(item => {
      if (item === 'Settings') {
        return {
          name: 'Settings',
          subItems: ['General Settings', 'Users & Roles']
        };
      }
      if (typeof item !== 'string' && item.name === 'Settings') {
        return {
          ...item,
          subItems: [...(item.subItems || []).filter(s => s !== 'Users & Roles'), 'Users & Roles']
        };
      }
      return item;
    }).filter(item => {
      // Remove any existing Subscriptions entry to avoid duplicates
      return typeof item === 'string' ? item !== 'Subscriptions' : (item as NestedSidebarItem).name !== 'Subscriptions';
    })
  };

  const setActiveModule = (module: IndustryModule) => {
    setActiveModuleState(module);
    setActiveTab('Dashboard');
  };

  return (
    <ModuleContext.Provider value={{ 
      activeModule, 
      setActiveModule, 
      manifest, 
      activeTab, 
      setActiveTab,
      moduleStates,
      toggleModuleState,
      enabledModules,
      isModuleEnabled
    }}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModule = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
};
