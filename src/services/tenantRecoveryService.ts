import { db } from '../db/dexie';

export interface Tenant {
  id: string;
  name: string;
  plan: 'Basic' | 'Professional' | 'Enterprise';
  status?: 'Active' | 'Suspended' | 'Trial' | 'Registered' | 'Cancelled' | 'Demo' | 'DEMO' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED';
  deleted_at?: number;
  deletedAt?: number;
  tenant_uuid?: string;
  business_code?: string;
}

export const tenantRecoveryService = {
  /**
   * Searches the central server database for a tenant or user matching
   * a given secure identifier: email, phone, business code, or tenant ID.
   */
  async findTenantByIdentifier(identifier: string): Promise<{ tenant: any; user?: any } | null> {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();

    const headers = {
      'x-tenant-id': 'tenant-admin-system',
      'x-user-id': 'usr-recovery-system'
    };

    try {
      // 1. Fetch server tenants and users
      const [tenantsRes, usersRes] = await Promise.all([
        fetch('/api/tenants', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/users', { headers }).then(r => r.ok ? r.json() : [])
      ]);

      const tenants: any[] = Array.isArray(tenantsRes) ? tenantsRes : [];
      const users: any[] = Array.isArray(usersRes) ? usersRes : [];

      // 2. Direct Tenant Match (ID, business_code, email, or tenant_uuid)
      let tenantMatch = tenants.find(t => 
        t.id === identifier ||
        t.id === clean ||
        t.tenant_uuid === identifier ||
        (t.business_code && t.business_code.toLowerCase() === clean) ||
        (t.email && t.email.toLowerCase() === clean)
      );

      let userMatch: any = undefined;

      // 3. Match via user email, username, phone, or user_code if tenant direct match not found
      if (!tenantMatch) {
        userMatch = users.find(u => 
          (u.email && u.email.toLowerCase() === clean) ||
          (u.username && u.username.toLowerCase() === clean) ||
          (u.user_code && u.user_code.toLowerCase() === clean) ||
          (clean.length >= 4 && u.phone && u.phone.replace(/\D/g, '') === clean.replace(/\D/g, ''))
        );

        if (userMatch && userMatch.tenant_id) {
          tenantMatch = tenants.find(t => t.id === userMatch.tenant_id);
        }
      }

      if (tenantMatch) {
        return { tenant: tenantMatch, user: userMatch };
      }
    } catch (err) {
      console.warn('[Recovery] Server identifier search failed:', err);
    }

    return null;
  },

  /**
   * Validates if a tenant exists on the server and automatically restores
   * the complete tenant context (branches, users, settings, modules, flags, roles, security, profiles)
   * into local IndexedDB within a single atomic database transaction.
   */
  async validateAndRestoreTenantContext(tenantId: string): Promise<Tenant | null> {
    // 1. Immutable Identity Rules: tenantId must be a valid UUID or registered legacy ID
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isLegacy = (id: string) => id.startsWith('tenant-') || id.startsWith('tenant_');
    if (!isUuid(tenantId) && !isLegacy(tenantId)) {
      console.warn(`[Recovery] Invalid Immutable Identity format rejected: "${tenantId}"`);
      return null;
    }

    console.log(`[Recovery] Initiating server lookup for missing tenant: ${tenantId}...`);

    // Use system-level header to bypass RLS during system-wide context recovery
    const headers = {
      'x-tenant-id': 'tenant-admin-system',
      'x-user-id': 'usr-recovery-system'
    };

    try {
      // 2. Fetch all components from authoritative PostgreSQL database
      const [
        tenantsRes,
        branchesRes,
        usersRes,
        ubrRes,
        modulesRes,
        settingsRes,
        flagsRes,
        securityRes,
        profilesRes,
        subsRes,
        plansRes
      ] = await Promise.all([
        fetch(`/api/tenants`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/branches?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/users?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/userBranchRoles?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/tenantModules?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/tenantSettings?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/featureFlags?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/userSecurity`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/businessProfiles?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/tenantSubscriptions?tenantId=${tenantId}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/subscriptionPlans`, { headers }).then(r => r.ok ? r.json() : [])
      ]);

      const tenantsList: any[] = Array.isArray(tenantsRes) ? tenantsRes : [];

      // 3. Find matching tenant record
      const tenantRecord = tenantsList.find(t => t.id === tenantId);
      if (!tenantRecord) {
        console.warn(`[Recovery] Tenant ${tenantId} not found on authoritative server.`);
        return null;
      }

      // Check soft-delete status
      if (tenantRecord.deletedAt || tenantRecord.deleted_at || tenantRecord.status === 'ARCHIVED') {
        console.warn(`[Recovery] Tenant ${tenantId} is archived/deleted. Recovery aborted.`);
        return null;
      }

      console.log(`[Recovery] Server record found for "${tenantRecord.name}". Restoring local database...`);

      // 4. Perform atomic transactional IndexedDB writes
      await db.transaction('rw', [
        db.tenants,
        db.branches,
        db.users,
        db.userBranchRoles,
        db.tenantModules,
        db.tenantSettings,
        db.featureFlags,
        db.userSecurity,
        db.businessProfiles,
        db.tenantSubscriptions,
        db.subscriptionPlans,
        db.securityAuditLogs
      ], async () => {
        // Write core tenant details
        await db.tenants.put(tenantRecord);

        // Write branches
        if (Array.isArray(branchesRes) && branchesRes.length > 0) {
          await db.branches.bulkPut(branchesRes);
        }

        // Write users
        if (Array.isArray(usersRes) && usersRes.length > 0) {
          await db.users.bulkPut(usersRes);
        }

        // Write roles mappings
        if (Array.isArray(ubrRes) && ubrRes.length > 0) {
          await db.userBranchRoles.bulkPut(ubrRes);
        }

        // Write modules
        if (Array.isArray(modulesRes) && modulesRes.length > 0) {
          await db.tenantModules.bulkPut(modulesRes);
        }

        // Write settings
        if (Array.isArray(settingsRes) && settingsRes.length > 0) {
          await db.tenantSettings.bulkPut(settingsRes);
        }

        // Write feature flags
        if (Array.isArray(flagsRes) && flagsRes.length > 0) {
          await db.featureFlags.bulkPut(flagsRes);
        }

        // Write user security (PINs, MFA settings)
        if (Array.isArray(securityRes) && securityRes.length > 0 && Array.isArray(usersRes)) {
          const userIds = new Set(usersRes.map(u => u.id));
          const tenantSec = securityRes.filter(s => userIds.has(s.user_id));
          if (tenantSec.length > 0) {
            await db.userSecurity.bulkPut(tenantSec);
          }
        }

        // Write business profile
        if (Array.isArray(profilesRes) && profilesRes.length > 0) {
          await db.businessProfiles.bulkPut(profilesRes);
        }

        // Write subscription plans from CPanel
        if (Array.isArray(plansRes) && plansRes.length > 0) {
          await db.subscriptionPlans.bulkPut(plansRes);
        }

        // Write tenant subscriptions from server or auto-heal if missing
        if (Array.isArray(subsRes) && subsRes.length > 0) {
          await db.tenantSubscriptions.bulkPut(subsRes);
        } else {
          const isTrial = tenantRecord.status === 'Trial' || tenantRecord.status === 'TRIAL' || !tenantRecord.status;
          const durationDays = isTrial ? 14 : 30;
          const createdTs = tenantRecord.created_at || Date.now();
          const endTs = createdTs + durationDays * 24 * 60 * 60 * 1000;

          await db.tenantSubscriptions.put({
            id: `sub-${tenantId}`,
            tenant_id: tenantId,
            plan_id: 'plan-basic',
            status: isTrial ? 'TRIAL' : 'ACTIVE',
            start_date: createdTs,
            end_date: endTs,
            auto_renew: true,
            created_at: createdTs,
            updated_at: Date.now()
          } as any);
        }

        // Log recovery audit event
        await db.securityAuditLogs.add({
          id: `sal-${Date.now()}-recover-${Math.random().toString(36).substring(2, 6)}`,
          tenant_id: tenantId,
          user_id: 'usr-recovery-system',
          action: 'tenant.context.recovered',
          ip_address: '127.0.0.1',
          device_info: 'Recovery Engine Background Task',
          created_at: Date.now()
        });
      });

      console.log(`[Recovery] Local database restored. Tenant "${tenantRecord.name}" context ready.`);
      return {
        id: tenantRecord.id,
        name: tenantRecord.name,
        plan: tenantRecord.plan || 'Basic',
        status: tenantRecord.status,
        business_code: tenantRecord.business_code,
        tenant_uuid: tenantRecord.tenant_uuid
      };
    } catch (err: any) {
      console.error(`[Recovery] Context restoration failed:`, err);
      return null;
    }
  }
};
