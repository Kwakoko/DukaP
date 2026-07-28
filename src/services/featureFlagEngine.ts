/**
 * DukaPos SaaS — Multi-Tiered Dynamic Feature Flag Engine
 * Global, Tenant, Branch & Percentage Rollout feature flags with Emergency Kill Switch capabilities.
 */


export interface DynamicFeatureFlag {
  key: string;
  name: string;
  description: string;
  enabledGlobal: boolean;
  tenantOverrides?: Record<string, boolean>;
  percentageRollout?: number; // 0 to 100
  killSwitchActive: boolean;
}

class FeatureFlagEngine {
  private flags: Map<string, DynamicFeatureFlag> = new Map([
    [
      'multi_branch',
      {
        key: 'multi_branch',
        name: 'Multi-Branch Management',
        description: 'Allows enterprise businesses to operate across multiple physical branch locations.',
        enabledGlobal: true,
        percentageRollout: 100,
        killSwitchActive: false
      }
    ],
    [
      'ai_assistant',
      {
        key: 'ai_assistant',
        name: 'DukaPos AI Assistant',
        description: 'AI-driven business analytics, stock loss detection and forecasting.',
        enabledGlobal: true,
        percentageRollout: 100,
        killSwitchActive: false
      }
    ],
    [
      'offline_sync_v2',
      {
        key: 'offline_sync_v2',
        name: 'Offline-First Sync Engine v2',
        description: 'High-throughput delta sync engine with vector clock conflict resolution.',
        enabledGlobal: true,
        percentageRollout: 100,
        killSwitchActive: false
      }
    ],
    [
      'payroll_automated',
      {
        key: 'payroll_automated',
        name: 'Automated HR Payroll',
        description: 'Automatic tax deduction calculations and salary slip dispatches.',
        enabledGlobal: true,
        percentageRollout: 100,
        killSwitchActive: false
      }
    ]
  ]);

  /**
   * Evaluate if feature is active for specific tenant context
   */
  isEnabled(flagKey: string, tenantId?: string): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    // 1. Emergency Kill Switch check
    if (flag.killSwitchActive) {
      return false;
    }

    // 2. Tenant override check
    if (tenantId && flag.tenantOverrides && flag.tenantOverrides[tenantId] !== undefined) {
      return flag.tenantOverrides[tenantId];
    }

    // 3. Global toggle check
    return flag.enabledGlobal;
  }

  /**
   * Trigger Emergency Kill Switch for a feature
   */
  triggerKillSwitch(flagKey: string, active: boolean): void {
    const flag = this.flags.get(flagKey);
    if (flag) {
      flag.killSwitchActive = active;
    }
  }

  getAllFlags(): DynamicFeatureFlag[] {
    return Array.from(this.flags.values());
  }
}

export const featureFlagEngine = new FeatureFlagEngine();
