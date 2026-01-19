/**
 * Comprehensive Monetization tests (20+ tests)
 * Tests tier system, limits, features, license validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
  getTier,
  getAllTiers,
  getTierForFeature,
  tierHasFeature,
  getUpgradePath,
  formatPrice,
  getYearlySavings
} from '../monetization/tier';
import {
  readUsageData,
  writeUsageData,
  checkUsageLimits,
  recordAudit,
  getCurrentMonth
} from '../monetization/limits';
import {
  getCurrentLicense,
  hasRemainingAudits,
  trackAuditUsage,
  validateLicense
} from '../monetization/license';
import {
  enforceFeatureAvailability,
  generateUpgradeMessage,
  isFeatureAvailable
} from '../monetization/features';
import type { TierType, UsageData } from '../monetization/types';

// Mock fs and os modules
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn()
  }
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/fake/home')
}));

describe('Tier System', () => {
  describe('getTier', () => {
    it('should return free tier config', () => {
      const tier = getTier('free');
      expect(tier.id).toBe('free');
      expect(tier.name).toBe('Free');
      expect(tier.monthlyPrice).toBe(0);
      expect(tier.limits.maxAuditsPerMonth).toBe(5);
    });

    it('should return pro tier config', () => {
      const tier = getTier('pro');
      expect(tier.id).toBe('pro');
      expect(tier.name).toBe('Pro');
      expect(tier.monthlyPrice).toBe(10);
      expect(tier.limits.maxAuditsPerMonth).toBe(100);
    });

    it('should return enterprise tier config', () => {
      const tier = getTier('enterprise');
      expect(tier.id).toBe('enterprise');
      expect(tier.name).toBe('Enterprise');
      expect(tier.monthlyPrice).toBeNull();
      expect(tier.limits.maxAuditsPerMonth).toBe(Infinity);
    });

    it('should throw error for unknown tier', () => {
      expect(() => getTier('unknown' as TierType)).toThrow('Unknown tier');
    });
  });

  describe('getAllTiers', () => {
    it('should return all three tiers', () => {
      const tiers = getAllTiers();
      expect(tiers).toHaveLength(3);
      expect(tiers.map(t => t.id)).toEqual(['free', 'pro', 'enterprise']);
    });
  });

  describe('getTierForFeature', () => {
    it('should return pro for dashboard feature', () => {
      expect(getTierForFeature('dashboard')).toBe('pro');
    });

    it('should return pro for validation feature', () => {
      expect(getTierForFeature('validation')).toBe('pro');
    });

    it('should return pro for pdfExport feature', () => {
      expect(getTierForFeature('pdfExport')).toBe('pro');
    });

    it('should return enterprise for customBranding feature', () => {
      expect(getTierForFeature('customBranding')).toBe('enterprise');
    });

    it('should return enterprise for teamCollaboration feature', () => {
      expect(getTierForFeature('teamCollaboration')).toBe('enterprise');
    });

    it('should return free for basic features', () => {
      expect(getTierForFeature('htmlExport')).toBe('free');
      expect(getTierForFeature('jsonExport')).toBe('free');
    });
  });

  describe('tierHasFeature', () => {
    it('should return false for free tier dashboard feature', () => {
      expect(tierHasFeature('free', 'dashboard')).toBe(false);
    });

    it('should return true for pro tier dashboard feature', () => {
      expect(tierHasFeature('pro', 'dashboard')).toBe(true);
    });

    it('should return true for enterprise tier dashboard feature', () => {
      expect(tierHasFeature('enterprise', 'dashboard')).toBe(true);
    });

    it('should return true for free tier htmlExport feature', () => {
      expect(tierHasFeature('free', 'htmlExport')).toBe(true);
    });
  });

  describe('getUpgradePath', () => {
    it('should return pro when upgrading from free to dashboard', () => {
      expect(getUpgradePath('free', 'dashboard')).toBe('pro');
    });

    it('should return null when feature already available', () => {
      expect(getUpgradePath('pro', 'dashboard')).toBeNull();
    });

    it('should return enterprise for customBranding from free', () => {
      expect(getUpgradePath('free', 'customBranding')).toBe('enterprise');
    });
  });

  describe('formatPrice', () => {
    it('should format free tier price', () => {
      expect(formatPrice('free')).toBe('Free');
    });

    it('should format pro tier monthly price', () => {
      expect(formatPrice('pro', 'monthly')).toBe('$10/mo');
    });

    it('should format pro tier yearly price', () => {
      expect(formatPrice('pro', 'yearly')).toBe('$100/yr');
    });

    it('should format enterprise tier as custom pricing', () => {
      expect(formatPrice('enterprise')).toBe('Custom pricing');
    });
  });

  describe('getYearlySavings', () => {
    it('should calculate savings for pro tier', () => {
      const savings = getYearlySavings('pro');
      expect(savings).toBeGreaterThan(0);
      expect(savings).toBeLessThanOrEqual(100);
    });

    it('should return 0 for enterprise tier', () => {
      expect(getYearlySavings('enterprise')).toBe(0);
    });

    it('should return 0 for free tier', () => {
      expect(getYearlySavings('free')).toBe(0);
    });
  });
});

describe('Usage Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readUsageData', () => {
    it('should read existing usage data', async () => {
      const mockData: UsageData = {
        tier: 'free',
        currentMonth: '2025-01',
        auditsThisMonth: 3,
        totalAudits: 10,
        toolsAudited: {},
        lastAudit: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify(mockData)
      );

      const data = await readUsageData();
      expect(data.tier).toBe('free');
      expect(data.auditsThisMonth).toBe(3);
    });

    it('should create default usage data if file does not exist', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );
      vi.spyOn(mockFs.promises, 'writeFile').mockResolvedValueOnce();

      const data = await readUsageData();
      expect(data.tier).toBe('free');
      expect(data.auditsThisMonth).toBe(0);
    });
  });

  describe('checkUsageLimits', () => {
    it('should allow audits within limit', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'free',
          currentMonth: getCurrentMonth(),
          auditsThisMonth: 3,
          totalAudits: 10,
          toolsAudited: {},
          lastAudit: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      const result = await checkUsageLimits('free', 5);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should block audits over limit', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'free',
          currentMonth: getCurrentMonth(),
          auditsThisMonth: 5,
          totalAudits: 10,
          toolsAudited: {},
          lastAudit: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      const result = await checkUsageLimits('free', 5);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should suggest upgrade when limit reached', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'free',
          currentMonth: getCurrentMonth(),
          auditsThisMonth: 5,
          totalAudits: 10,
          toolsAudited: {},
          lastAudit: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      const result = await checkUsageLimits('free', 5);
      expect(result.suggestedUpgrade).toBe('pro');
    });
  });

  describe('recordAudit', () => {
    it('should record audit in usage data', async () => {
      const mockFs = await import('fs');
      const existingData = {
        tier: 'free',
        currentMonth: getCurrentMonth(),
        auditsThisMonth: 2,
        totalAudits: 5,
        toolsAudited: {},
        lastAudit: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify(existingData)
      );
      vi.spyOn(mockFs.promises, 'writeFile').mockResolvedValueOnce();

      await recordAudit('/fake/tool/path');

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"auditsThisMonth":3'),
        'utf-8'
      );
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const month = getCurrentMonth();
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});

describe('License Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentLicense', () => {
    it('should return free tier license by default', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );

      const license = await getCurrentLicense();
      expect(license).toBeDefined();
      expect(license?.tier).toBe('free');
    });

    it('should return existing license if available', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'pro',
          maxAuditsPerMonth: 100,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );

      const license = await getCurrentLicense();
      expect(license?.tier).toBe('pro');
    });
  });

  describe('hasRemainingAudits', () => {
    it('should return true when under limit', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'free',
          currentMonth: getCurrentMonth(),
          auditsThisMonth: 2,
          totalAudits: 5,
          toolsAudited: {},
          lastAudit: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(true);
    });

    it('should return false when at limit', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'free',
          currentMonth: getCurrentMonth(),
          auditsThisMonth: 5,
          totalAudits: 10,
          toolsAudited: {},
          lastAudit: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(false);
    });
  });

  describe('trackAuditUsage', () => {
    it('should increment audit count', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'free',
          currentMonth: getCurrentMonth(),
          auditsThisMonth: 2,
          totalAudits: 5,
          toolsAudited: {},
          lastAudit: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
      vi.spyOn(mockFs.promises, 'writeFile').mockResolvedValueOnce();

      await trackAuditUsage();

      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe('validateLicense', () => {
    it('should validate active license', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'pro',
          maxAuditsPerMonth: 100,
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        })
      );

      const result = await validateLicense();
      expect(result.valid).toBe(true);
    });

    it('should reject expired license', async () => {
      const mockFs = await import('fs');
      vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
        JSON.stringify({
          tier: 'pro',
          maxAuditsPerMonth: 100,
          expiresAt: new Date(Date.now() - 86400000).toISOString()
        })
      );

      const result = await validateLicense();
      expect(result.valid).toBe(false);
    });
  });
});

describe('Feature Availability', () => {
  describe('enforceFeatureAvailability', () => {
    it('should allow features for correct tier', () => {
      expect(() => {
        enforceFeatureAvailability('pro', 'dashboard', 'Dashboard feature');
      }).not.toThrow();
    });

    it('should throw error for free tier validation', () => {
      expect(() => {
        enforceFeatureAvailability('free', 'validation', 'AI validation');
      }).toThrow();
    });

    it('should throw error for free tier dashboard', () => {
      expect(() => {
        enforceFeatureAvailability('free', 'dashboard', 'Dashboard');
      }).toThrow();
    });

    it('should allow basic features for free tier', () => {
      expect(() => {
        enforceFeatureAvailability('free', 'htmlExport', 'HTML export');
      }).not.toThrow();
    });
  });

  describe('isFeatureAvailable', () => {
    it('should return true for available features', () => {
      expect(isFeatureAvailable('pro', 'dashboard')).toBe(true);
    });

    it('should return false for unavailable features', () => {
      expect(isFeatureAvailable('free', 'dashboard')).toBe(false);
    });
  });

  describe('generateUpgradeMessage', () => {
    it('should generate upgrade message for pro tier', () => {
      const message = generateUpgradeMessage('dashboard', 'pro');
      expect(message).toContain('upgrade');
      expect(message).toContain('Pro');
    });

    it('should generate upgrade message for enterprise tier', () => {
      const message = generateUpgradeMessage('customBranding', 'enterprise');
      expect(message).toContain('Enterprise');
    });
  });
});

describe('Monetization Integration', () => {
  it('should handle complete monetization flow', async () => {
    const mockFs = await import('fs');

    // Mock license check
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
      JSON.stringify({
        tier: 'pro',
        maxAuditsPerMonth: 100,
        expiresAt: new Date(Date.now() + 86400000).toISOString()
      })
    );

    // Mock usage data
    vi.spyOn(mockFs.promises, 'readFile').mockResolvedValueOnce(
      JSON.stringify({
        tier: 'pro',
        currentMonth: getCurrentMonth(),
        auditsThisMonth: 10,
        totalAudits: 50,
        toolsAudited: {},
        lastAudit: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );

    vi.spyOn(mockFs.promises, 'writeFile').mockResolvedValue();

    // Check license
    const license = await getCurrentLicense();
    expect(license?.tier).toBe('pro');

    // Check usage limits
    const usageCheck = await checkUsageLimits('pro', 100);
    expect(usageCheck.allowed).toBe(true);

    // Enforce feature
    expect(() => {
      enforceFeatureAvailability('pro', 'validation', 'AI validation');
    }).not.toThrow();
  });

  it('should block premium features for free tier', async () => {
    expect(() => {
      enforceFeatureAvailability('free', 'dashboard', 'Dashboard');
    }).toThrow('Pro tier');

    expect(() => {
      enforceFeatureAvailability('free', 'validation', 'AI validation');
    }).toThrow();
  });

  it('should handle tier upgrade flow', async () => {
    const currentTier = 'free';
    const desiredFeature = 'dashboard';

    const upgradePath = getUpgradePath(currentTier, desiredFeature);
    expect(upgradePath).toBe('pro');

    const tierConfig = getTier(upgradePath);
    expect(tierConfig.features.dashboard).toBe(true);

    const message = generateUpgradeMessage(desiredFeature, upgradePath);
    expect(message).toContain('Pro');
  });
});
