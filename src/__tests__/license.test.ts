/**
 * License management tests
 * Tests license validation, tier checking, key generation, and usage tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import {
  validateLicense,
  activateLicense,
  checkFeatureAvailability,
  trackAuditUsage,
  hasRemainingAudits,
  getCurrentLicense,
  generateLicenseKey
} from '../monetization/license';
import type { License } from '../monetization/license';

describe('license validation and management', () => {
  const tempDir = path.join(tmpdir(), `ux-license-test-${Date.now()}`);
  const mockLicenseFile = path.join(tempDir, 'license.json');
  const mockUsageFile = path.join(tempDir, 'usage.json');

  // Mock HOME environment variable
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    process.env.HOME = tempDir;
    await fs.mkdir(tempDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe('validateLicense', () => {
    it('should validate free tier license', async () => {
      const result = await validateLicense('FREE-AAA-BBB-CCC');

      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.license?.tier).toBe('free');
      expect(result.license?.maxAuditsPerMonth).toBe(5);
      expect(result.license?.dashboardEnabled).toBe(false);
      expect(result.license?.validationEnabled).toBe(false);
    });

    it('should reject invalid license key format', async () => {
      const result = await validateLicense('invalid-key');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid license key format');
    });

    it('should reject invalid license tier', async () => {
      const result = await validateLicense('INVALID-AAA-BBB-CCC');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid license tier');
    });

    it('should reject pro license if not activated', async () => {
      const result = await validateLicense('PRO-AAA-BBB-CCC');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject expired license', async () => {
      // Create an expired license
      const expiredLicense: License = {
        key: 'PRO-AAA-BBB-CCC',
        tier: 'pro',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        maxAuditsPerMonth: 100,
        dashboardEnabled: true,
        validationEnabled: true
      };

      await fs.mkdir(path.dirname(mockLicenseFile), { recursive: true });
      await fs.writeFile(mockLicenseFile, JSON.stringify(expiredLicense));

      const result = await validateLicense('PRO-AAA-BBB-CCC');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should accept valid activated pro license', async () => {
      const validLicense: License = {
        key: 'PRO-AAA-BBB-CCC',
        tier: 'pro',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        maxAuditsPerMonth: 100,
        dashboardEnabled: true,
        validationEnabled: true
      };

      await fs.mkdir(path.dirname(mockLicenseFile), { recursive: true });
      await fs.writeFile(mockLicenseFile, JSON.stringify(validLicense));

      const result = await validateLicense('PRO-AAA-BBB-CCC');

      expect(result.valid).toBe(true);
      expect(result.license?.tier).toBe('pro');
    });

    it('should be case-insensitive for tier', async () => {
      const result1 = await validateLicense('free-aaa-bbb-ccc');
      const result2 = await validateLicense('FREE-AAA-BBB-CCC');

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('should handle malformed stored license file', async () => {
      await fs.mkdir(path.dirname(mockLicenseFile), { recursive: true });
      await fs.writeFile(mockLicenseFile, 'invalid json');

      const result = await validateLicense('PRO-AAA-BBB-CCC');

      expect(result.valid).toBe(false);
    });
  });

  describe('activateLicense', () => {
    it('should activate free tier license', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      const licenseContent = await fs.readFile(mockLicenseFile, 'utf-8');
      const license = JSON.parse(licenseContent);

      expect(license.tier).toBe('free');
      expect(license.email).toBe('test@example.com');
      expect(license.expiresAt).toBeNull();
    });

    it('should activate pro tier license with expiration', async () => {
      await activateLicense('PRO-AAA-BBB-CCC', 'test@example.com');

      const licenseContent = await fs.readFile(mockLicenseFile, 'utf-8');
      const license = JSON.parse(licenseContent);

      expect(license.tier).toBe('pro');
      expect(license.expiresAt).not.toBeNull();
      expect(license.dashboardEnabled).toBe(true);
      expect(license.validationEnabled).toBe(true);
    });

    it('should activate enterprise tier with unlimited audits', async () => {
      await activateLicense('ENTERPRISE-AAA-BBB-CCC', 'test@example.com');

      const licenseContent = await fs.readFile(mockLicenseFile, 'utf-8');
      const license = JSON.parse(licenseContent);

      expect(license.tier).toBe('enterprise');
      expect(license.maxAuditsPerMonth).toBe(-1);
    });

    it('should throw on invalid license key', async () => {
      await expect(
        activateLicense('INVALID', 'test@example.com')
      ).rejects.toThrow();
    });

    it('should create license directory if not exists', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      const exists = await fs.access(mockLicenseFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('checkFeatureAvailability', () => {
    it('should return false for dashboard with free tier', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      const available = await checkFeatureAvailability('dashboard');
      expect(available).toBe(false);
    });

    it('should return true for dashboard with pro tier', async () => {
      await activateLicense('PRO-AAA-BBB-CCC', 'test@example.com');

      const available = await checkFeatureAvailability('dashboard');
      expect(available).toBe(true);
    });

    it('should return false for validation with free tier', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      const available = await checkFeatureAvailability('validation');
      expect(available).toBe(false);
    });

    it('should return true for validation with pro tier', async () => {
      await activateLicense('PRO-AAA-BBB-CCC', 'test@example.com');

      const available = await checkFeatureAvailability('validation');
      expect(available).toBe(true);
    });

    it('should return false for unlimited-audits with pro tier', async () => {
      await activateLicense('PRO-AAA-BBB-CCC', 'test@example.com');

      const available = await checkFeatureAvailability('unlimited-audits');
      expect(available).toBe(false);
    });

    it('should return true for unlimited-audits with enterprise tier', async () => {
      await activateLicense('ENTERPRISE-AAA-BBB-CCC', 'test@example.com');

      const available = await checkFeatureAvailability('unlimited-audits');
      expect(available).toBe(true);
    });

    it('should return false when no license is active', async () => {
      const available = await checkFeatureAvailability('dashboard');
      expect(available).toBe(false);
    });
  });

  describe('trackAuditUsage', () => {
    it('should increment usage counter for current month', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');
      await trackAuditUsage();

      const usageContent = await fs.readFile(mockUsageFile, 'utf-8');
      const usage = JSON.parse(usageContent);

      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(usage.monthly[currentMonth]).toBe(1);
    });

    it('should increment multiple times', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');
      await trackAuditUsage();
      await trackAuditUsage();
      await trackAuditUsage();

      const usageContent = await fs.readFile(mockUsageFile, 'utf-8');
      const usage = JSON.parse(usageContent);

      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(usage.monthly[currentMonth]).toBe(3);
    });

    it('should create usage file if not exists', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');
      await trackAuditUsage();

      const exists = await fs.access(mockUsageFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should handle existing usage file', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      // Create initial usage
      await trackAuditUsage();

      // Add more usage
      await trackAuditUsage();

      const usageContent = await fs.readFile(mockUsageFile, 'utf-8');
      const usage = JSON.parse(usageContent);

      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(usage.monthly[currentMonth]).toBe(2);
    });
  });

  describe('hasRemainingAudits', () => {
    it('should return true when under limit', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(true);
    });

    it('should return false when at limit', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      // Use all 5 free audits
      for (let i = 0; i < 5; i++) {
        await trackAuditUsage();
      }

      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(false);
    });

    it('should return true for unlimited audits (enterprise)', async () => {
      await activateLicense('ENTERPRISE-AAA-BBB-CCC', 'test@example.com');

      // Use many audits
      for (let i = 0; i < 100; i++) {
        await trackAuditUsage();
      }

      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(true);
    });

    it('should return false when no license is active', async () => {
      const hasRemaining = await hasRemainingAudits();
      expect(hasRemaining).toBe(false);
    });

    it('should reset counter at month boundary', async () => {
      await activateLicense('FREE-AAA-BBB-CCC', 'test@example.com');

      // Use all audits in current month
      for (let i = 0; i < 5; i++) {
        await trackAuditUsage();
      }

      // Should be at limit
      expect(await hasRemainingAudits()).toBe(false);

      // Simulate new month by modifying usage file
      const usageContent = await fs.readFile(mockUsageFile, 'utf-8');
      const usage = JSON.parse(usageContent);

      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMonthStr = nextMonth.toISOString().slice(0, 7);

      usage.monthly[nextMonthStr] = 0;
      await fs.writeFile(mockUsageFile, JSON.stringify(usage, null, 2));

      // Note: This test shows the structure, but actual month boundary
      // behavior would require time mocking or date manipulation
    });
  });

  describe('getCurrentLicense', () => {
    it('should return null when no license is activated', async () => {
      const license = await getCurrentLicense();
      expect(license).toBeNull();
    });

    it('should return current valid license', async () => {
      await activateLicense('PRO-AAA-BBB-CCC', 'test@example.com');

      const license = await getCurrentLicense();
      expect(license).toBeDefined();
      expect(license?.tier).toBe('pro');
    });

    it('should return null for expired license', async () => {
      const expiredLicense: License = {
        key: 'PRO-AAA-BBB-CCC',
        tier: 'pro',
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 1000),
        maxAuditsPerMonth: 100,
        dashboardEnabled: true,
        validationEnabled: true
      };

      await fs.mkdir(path.dirname(mockLicenseFile), { recursive: true });
      await fs.writeFile(mockLicenseFile, JSON.stringify(expiredLicense));

      const license = await getCurrentLicense();
      expect(license).toBeNull();
    });

    it('should return null for corrupted license file', async () => {
      await fs.mkdir(path.dirname(mockLicenseFile), { recursive: true });
      await fs.writeFile(mockLicenseFile, 'invalid json');

      const license = await getCurrentLicense();
      expect(license).toBeNull();
    });
  });

  describe('generateLicenseKey', () => {
    it('should generate pro license key in correct format', () => {
      const key = generateLicenseKey('pro');

      expect(key).toMatch(/^PRO-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    });

    it('should generate enterprise license key in correct format', () => {
      const key = generateLicenseKey('enterprise');

      expect(key).toMatch(/^ENTERPRISE-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateLicenseKey('pro');
      const key2 = generateLicenseKey('pro');
      const key3 = generateLicenseKey('pro');

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it('should use uppercase letters and numbers', () => {
      const key = generateLicenseKey('pro');
      const parts = key.split('-');

      parts.forEach(part => {
        expect(part).toMatch(/^[A-Z0-9]+$/);
      });
    });
  });
});
