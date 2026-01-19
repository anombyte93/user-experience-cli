/**
 * License management and validation
 * Supports tier-based feature gating and Stripe integration
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface License {
  /** License key (format: TIER-xxx-yyy-zzz) */
  key: string;
  /** Tier: free, pro, enterprise */
  tier: 'free' | 'pro' | 'enterprise';
  /** License holder email */
  email: string;
  /** Expiration date (null for perpetual free tier) */
  expiresAt: Date | null;
  /** Maximum audits allowed per month */
  maxAuditsPerMonth: number;
  /** Whether dashboard feature is enabled */
  dashboardEnabled: boolean;
  /** Whether doubt-agent validation is enabled */
  validationEnabled: boolean;
  /** Stripe subscription ID (if applicable) */
  stripeSubscriptionId?: string;
}

export interface LicenseValidationResult {
  /** Whether license is valid */
  valid: boolean;
  /** License details (if valid) */
  license?: License;
  /** Error message (if invalid) */
  error?: string;
}

/** License configuration per tier */
const TIER_CONFIG: Record<string, Partial<License>> = {
  free: {
    tier: 'free',
    maxAuditsPerMonth: 5,
    dashboardEnabled: false,
    validationEnabled: false
  },
  pro: {
    tier: 'pro',
    maxAuditsPerMonth: 100,
    dashboardEnabled: true,
    validationEnabled: true
  },
  enterprise: {
    tier: 'enterprise',
    maxAuditsPerMonth: -1, // unlimited
    dashboardEnabled: true,
    validationEnabled: true
  }
};

/** License file location */
const LICENSE_FILE = path.join(
  process.env.HOME || '',
  '.user-experience',
  'license.json'
);

/** Usage tracking file location */
const USAGE_FILE = path.join(
  process.env.HOME || '',
  '.user-experience',
  'usage.json'
);

/**
 * Validate a license key
 */
export async function validateLicense(key: string): Promise<LicenseValidationResult> {
  try {
    // Parse license key format: TIER-xxx-yyy-zzz
    const match = key.match(/^(\w+)-([A-Z0-9]{3})-([A-Z0-9]{3})-([A-Z0-9]{3})$/i);
    if (!match) {
      return { valid: false, error: 'Invalid license key format' };
    }

    const [, tier, , ,] = match;
    const normalizedTier = tier.toLowerCase() as 'free' | 'pro' | 'enterprise';

    if (!['free', 'pro', 'enterprise'].includes(normalizedTier)) {
      return { valid: false, error: 'Invalid license tier' };
    }

    // For free tier, no validation needed
    if (normalizedTier === 'free') {
      return {
        valid: true,
        license: {
          key,
          tier: normalizedTier,
          email: 'free@user-experience.cli',
          expiresAt: null,
          ...TIER_CONFIG.free
        } as License
      };
    }

    // For paid tiers, validate against stored license file
    const storedLicense = await loadStoredLicense();
    if (!storedLicense || storedLicense.key !== key) {
      return { valid: false, error: 'License not found. Please activate first.' };
    }

    // Check expiration
    if (storedLicense.expiresAt && storedLicense.expiresAt < new Date()) {
      return { valid: false, error: 'License expired' };
    }

    return { valid: true, license: storedLicense };

  } catch (error) {
    return { valid: false, error: (error as Error).message };
  }
}

/**
 * Activate a license key (after Stripe payment)
 */
export async function activateLicense(key: string, email: string): Promise<void> {
  // Parse and validate the key format
  const match = key.match(/^(\w+)-([A-Z0-9]{3})-([A-Z0-9]{3})-([A-Z0-9]{3})$/i);
  if (!match) {
    throw new Error('Invalid license key format');
  }

  const [, tier, , ,] = match;
  const normalizedTier = tier.toLowerCase() as 'free' | 'pro' | 'enterprise';

  if (!['free', 'pro', 'enterprise'].includes(normalizedTier)) {
    throw new Error('Invalid license tier');
  }

  // Create license object
  const license: License = {
    key,
    tier: normalizedTier,
    email,
    expiresAt: normalizedTier === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    maxAuditsPerMonth: TIER_CONFIG[normalizedTier].maxAuditsPerMonth ?? -1,
    dashboardEnabled: TIER_CONFIG[normalizedTier].dashboardEnabled ?? false,
    validationEnabled: TIER_CONFIG[normalizedTier].validationEnabled ?? false
  };

  // Save to file
  await saveStoredLicense(license);
}

/**
 * Check if a feature is available for current license
 */
export async function checkFeatureAvailability(
  feature: 'dashboard' | 'validation' | 'unlimited-audits'
): Promise<boolean> {
  const license = await getCurrentLicense();
  if (!license) return false;

  switch (feature) {
    case 'dashboard':
      return license.dashboardEnabled;
    case 'validation':
      return license.validationEnabled;
    case 'unlimited-audits':
      return license.maxAuditsPerMonth === -1;
  }
}

/**
 * Track usage (audit count)
 */
export async function trackAuditUsage(): Promise<void> {
  const usage = await loadUsage();

  // Increment counter for current month
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  usage.monthly[currentMonth] = (usage.monthly[currentMonth] || 0) + 1;

  await saveUsage(usage);
}

/**
 * Check if user has remaining audits this month
 */
export async function hasRemainingAudits(): Promise<boolean> {
  const license = await getCurrentLicense();
  if (!license) return false;

  if (license.maxAuditsPerMonth === -1) return true; // unlimited

  const usage = await loadUsage();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const used = usage.monthly[currentMonth] || 0;

  return used < license.maxAuditsPerMonth;
}

/**
 * Get current license
 */
export async function getCurrentLicense(): Promise<License | null> {
  try {
    const stored = await loadStoredLicense();
    if (!stored) return null;

    const validation = await validateLicense(stored.key);
    return validation.valid ? validation.license! : null;
  } catch {
    return null;
  }
}

/**
 * Load stored license from file
 */
async function loadStoredLicense(): Promise<License | null> {
  try {
    const content = await fs.readFile(LICENSE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save license to file
 */
async function saveStoredLicense(license: License): Promise<void> {
  await fs.mkdir(path.dirname(LICENSE_FILE), { recursive: true });
  await fs.writeFile(LICENSE_FILE, JSON.stringify(license, null, 2));
}

/**
 * Load usage statistics
 */
async function loadUsage(): Promise<{ monthly: Record<string, number> }> {
  try {
    const content = await fs.readFile(USAGE_FILE, 'utf-8');
    const data = JSON.parse(content);
    // Ensure the structure is correct
    if (data && typeof data.monthly === 'object') {
      return data;
    }
    return { monthly: {} };
  } catch {
    return { monthly: {} };
  }
}

/**
 * Save usage statistics
 */
async function saveUsage(usage: { monthly: Record<string, number> }): Promise<void> {
  await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
  await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
}

/**
 * Generate a license key (for testing/admin)
 */
export function generateLicenseKey(tier: 'pro' | 'enterprise'): string {
  const parts = [
    tier.toUpperCase(),
    crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3),
    crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3),
    crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3)
  ];
  return parts.join('-');
}
