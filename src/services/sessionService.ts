import { db, type UserSession, type UserDevice, type OfflineSession } from '../db/dexie';
import { SettingsResolver, DEFAULT_SECURITY_CONFIG, type SecurityConfig } from './settingsService';

class SessionManagementService {
  /**
   * Helper to simulate hash generation (PWA Client-side secure hash)
   */
  private generateSecureHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Retrieve or create a persistent device identifier
   */
  getOrCreateDeviceId(): string {
    let id = localStorage.getItem('dukapos_device_id');
    if (!id) {
      id = `dev-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem('dukapos_device_id', id);
    }
    return id;
  }

  /**
   * Registers a user device, checking against tenant settings for maximum devices
   */
  async registerDevice(
    userId: string,
    tenantId: string,
    deviceName?: string
  ): Promise<UserDevice> {
    const deviceId = this.getOrCreateDeviceId();
    
    // Check if device already registered
    let device = await db.userDevices.where('deviceId').equals(deviceId).first();
    
    if (!device) {
      // Check maximum devices limit for this tenant (default is 5)
      const security = await SettingsResolver.resolveNamespace<SecurityConfig>({
        tenantId,
        namespace: 'SECURITY',
        globalDefaults: DEFAULT_SECURITY_CONFIG
      });
      const maxAllowed = security.maxDevices;
      const currentDevicesCount = await db.userDevices.where('tenantId').equals(tenantId).count();
      
      if (currentDevicesCount >= maxAllowed) {
        // Enforce limit: revoke the oldest untrusted device
        const oldestDevice = await db.userDevices
          .where('tenantId')
          .equals(tenantId)
          .and(d => !d.trusted)
          .first();
        
        if (oldestDevice) {
          await db.userDevices.delete(oldestDevice.id);
          await this.logSecurityEvent(tenantId, userId, 'DEVICE_DE_REGISTERED', {
            reason: 'Max devices limit reached, automatically unregistered oldest untrusted device',
            deviceId: oldestDevice.deviceId
          });
        } else {
          throw new Error(`Device limit reached (${maxAllowed}). Contact support or administrator.`);
        }
      }

      device = {
        id: `udev-${Date.now()}`,
        userId,
        tenantId,
        deviceId,
        name: deviceName || 'POS Terminal / Browser',
        platform: navigator.platform || 'Unknown Platform',
        browser: navigator.userAgent || 'Unknown Agent',
        trusted: false,
        lastSeen: Date.now(),
        createdAt: Date.now()
      };
      
      await db.userDevices.add(device);
      await this.logSecurityEvent(tenantId, userId, 'DEVICE_REGISTERED', { deviceId, name: device.name });
    } else {
      // Update device last seen timestamp
      device.lastSeen = Date.now();
      await db.userDevices.put(device);
    }

    return device;
  }

  /**
   * Initializes a new session and returns refresh token hash
   */
  async createSession(
    userId: string,
    tenantId: string,
    branchId?: string,
    deviceName?: string
  ): Promise<UserSession> {
    const device = await this.registerDevice(userId, tenantId, deviceName);
    const sessionId = `sess-${Date.now()}`;
    const tokenSeed = `${userId}-${tenantId}-${Date.now()}`;
    const refreshTokenHash = this.generateSecureHash(tokenSeed);

    // Create session in IndexedDB
    const session: UserSession = {
      id: sessionId,
      userId,
      tenantId,
      branchId,
      refreshTokenHash,
      deviceId: device.deviceId,
      deviceName: device.name,
      status: 'ACTIVE',
      lastActivity: Date.now(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 Hours lifetime
    };

    await db.userSessions.add(session);
    await this.logSecurityEvent(tenantId, userId, 'SESSION_CREATED', { sessionId, deviceId: device.deviceId });

    // Initialize/extend PWA offline permission cache
    await this.refreshOfflineGraceSession(userId, tenantId, branchId);

    return session;
  }

  /**
   * implements Refresh Token Rotation (RTR) & Token Theft Detection
   */
  async refreshSessionToken(
    oldRefreshTokenHash: string
  ): Promise<{ session: UserSession; newRefreshTokenHash: string }> {
    // 1. Search active session
    let session = await db.userSessions
      .where('refreshTokenHash')
      .equals(oldRefreshTokenHash)
      .and(s => s.status === 'ACTIVE')
      .first();

    if (!session) {
      // 2. TOKEN THEFT DETECTION TRIGGER
      // If the token is not active, check if it was previously rotated/revoked.
      // Search all sessions for this token hash.
      const reusedSession = await db.userSessions
        .where('refreshTokenHash')
        .equals(oldRefreshTokenHash)
        .first();

      if (reusedSession) {
        // High severity warning: Reused Token detected!
        await this.logSecurityEvent(
          reusedSession.tenantId, 
          reusedSession.userId, 
          'TOKEN_THEFT_DETECTED', 
          { 
            reason: 'Re-use of rotated refresh token hash detected.',
            tokenHash: oldRefreshTokenHash,
            deviceId: reusedSession.deviceId 
          }
        );

        // Terminate all active sessions for this user/device to quarantine theft
        const activeUserSessions = await db.userSessions
          .where('userId')
          .equals(reusedSession.userId)
          .and(s => s.status === 'ACTIVE')
          .toArray();

        for (const s of activeUserSessions) {
          s.status = 'REVOKED';
          s.revokedAt = Date.now();
          await db.userSessions.put(s);
          await this.logSecurityEvent(s.tenantId, s.userId, 'SESSION_REVOKED', { 
            reason: 'Quarantine due to detected token theft',
            sessionId: s.id 
          });
        }

        throw new Error('SECURITY ALERT: Session hijacked. Access revoked. Please re-authenticate.');
      }

      throw new Error('Invalid or expired refresh session.');
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      session.status = 'EXPIRED';
      await db.userSessions.put(session);
      throw new Error('Refresh session expired. Please login again.');
    }

    // 3. ROTATION: Invalidate old token hash, generate new one
    const tokenSeed = `${session.userId}-${session.tenantId}-${Date.now()}`;
    const newRefreshTokenHash = this.generateSecureHash(tokenSeed);

    session.refreshTokenHash = newRefreshTokenHash;
    session.lastActivity = Date.now();
    
    await db.userSessions.put(session);
    await this.logSecurityEvent(session.tenantId, session.userId, 'TOKEN_REFRESHED', { 
      sessionId: session.id 
    });

    return { session, newRefreshTokenHash };
  }

  /**
   * Initializes or updates an offline PWA session with grace period settings
   */
  async refreshOfflineGraceSession(
    userId: string,
    tenantId: string,
    branchId?: string
  ): Promise<OfflineSession> {
    // Check grace hours setting for this tenant (24, 48, 72 hours - default is 24)
    const security = await SettingsResolver.resolveNamespace<SecurityConfig>({
      tenantId,
      namespace: 'SECURITY',
      globalDefaults: DEFAULT_SECURITY_CONFIG
    });
    const graceHours = security.offlineGraceHours;

    const allowedUntil = Date.now() + graceHours * 60 * 60 * 1000;

    let offlineSession = await db.offlineSessions
      .where({ userId, tenantId })
      .first();

    if (offlineSession) {
      offlineSession.offlineAllowedUntil = allowedUntil;
      offlineSession.lastSync = Date.now();
      offlineSession.branchId = branchId;
      await db.offlineSessions.put(offlineSession);
    } else {
      offlineSession = {
        id: `offsess-${Date.now()}`,
        userId,
        tenantId,
        branchId,
        permissions: ['sales.create', 'inventory.view', 'receipt.print'],
        offlineAllowedUntil: allowedUntil,
        lastSync: Date.now()
      };
      await db.offlineSessions.add(offlineSession);
    }

    return offlineSession;
  }

  /**
   * Validates if the local PWA device is locked due to expired offline grace period
   */
  async validateOfflineSession(
    userId: string,
    tenantId: string
  ): Promise<{ valid: boolean; locked: boolean; remainingMs: number }> {
    const offlineSession = await db.offlineSessions
      .where({ userId, tenantId })
      .first();

    if (!offlineSession) {
      return { valid: false, locked: true, remainingMs: 0 };
    }

    const remainingMs = offlineSession.offlineAllowedUntil - Date.now();
    const locked = remainingMs <= 0;

    return {
      valid: true,
      locked,
      remainingMs: Math.max(0, remainingMs)
    };
  }

  /**
   * Bypasses the offline lockout for an additional 12 hours (supervisor override)
   */
  async supervisorBypassOfflineLock(
    userId: string,
    tenantId: string,
    passcode: string
  ): Promise<boolean> {
    // Supervisor override passcode 'manager123'
    if (passcode !== 'manager123') return false;

    const offlineSession = await db.offlineSessions
      .where({ userId, tenantId })
      .first();

    if (offlineSession) {
      // Extend by 12 hours
      offlineSession.offlineAllowedUntil = Date.now() + 12 * 60 * 60 * 1000;
      await db.offlineSessions.put(offlineSession);
      await this.logSecurityEvent(tenantId, userId, 'OFFLINE_BYPASS_APPROVED', {
        grantedBy: 'Manager Override',
        extendedDurationHours: 12
      });
      return true;
    }
    return false;
  }

  /**
   * Appends an immutable security audit event to the ledger
   */
  async logSecurityEvent(
    tenantId: string | null,
    userId: string,
    action: string,
    metadata?: any
  ): Promise<void> {
    const logId = `sa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.securityAuditLogs.add({
      id: logId,
      tenant_id: tenantId,
      user_id: userId,
      action,
      payload: metadata,
      created_at: Date.now(),
      ip_address: '127.0.0.1', // Simulated local IP
      device_info: `${navigator.platform || 'Local Machine'} / ${navigator.userAgent || 'Agent'}`
    });
  }
}

export const sessionService = new SessionManagementService();
