/**
 * License management and validation
 * Supports tier-based feature gating and Stripe integration
 */
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
/** License configuration per tier */
const TIER_CONFIG = {
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
const LICENSE_FILE = path.join(process.env.HOME || '', '.user-experience', 'license.json');
/** Usage tracking file location */
const USAGE_FILE = path.join(process.env.HOME || '', '.user-experience', 'usage.json');
/**
 * Validate a license key
 */
export async function validateLicense(key) {
    try {
        // Parse license key format: TIER-xxx-yyy-zzz
        const match = key.match(/^(\w+)-([A-Z0-9]{3})-([A-Z0-9]{3})-([A-Z0-9]{3})$/i);
        if (!match) {
            return { valid: false, error: 'Invalid license key format' };
        }
        const [, tier, , ,] = match;
        if (!['free', 'pro', 'enterprise'].includes(tier)) {
            return { valid: false, error: 'Invalid license tier' };
        }
        // For free tier, no validation needed
        if (tier === 'free') {
            return {
                valid: true,
                license: {
                    key,
                    tier: 'free',
                    email: 'free@user-experience.cli',
                    expiresAt: null,
                    ...TIER_CONFIG.free
                }
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
    }
    catch (error) {
        return { valid: false, error: error.message };
    }
}
/**
 * Activate a license key (after Stripe payment)
 */
export async function activateLicense(key, email) {
    const validation = await validateLicense(key);
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    const tier = validation.license.tier;
    // Create license object
    const license = {
        key,
        tier: tier,
        email,
        expiresAt: tier === 'free' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        maxAuditsPerMonth: TIER_CONFIG[tier].maxAuditsPerMonth ?? -1,
        dashboardEnabled: TIER_CONFIG[tier].dashboardEnabled ?? false,
        validationEnabled: TIER_CONFIG[tier].validationEnabled ?? false
    };
    // Save to file
    await saveStoredLicense(license);
}
/**
 * Check if a feature is available for current license
 */
export async function checkFeatureAvailability(feature) {
    const license = await getCurrentLicense();
    if (!license)
        return false;
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
export async function trackAuditUsage() {
    const usage = await loadUsage();
    // Increment counter for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    usage.monthly[currentMonth] = (usage.monthly[currentMonth] || 0) + 1;
    await saveUsage(usage);
}
/**
 * Check if user has remaining audits this month
 */
export async function hasRemainingAudits() {
    const license = await getCurrentLicense();
    if (!license)
        return false;
    if (license.maxAuditsPerMonth === -1)
        return true; // unlimited
    const usage = await loadUsage();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const used = usage.monthly[currentMonth] || 0;
    return used < license.maxAuditsPerMonth;
}
/**
 * Get current license
 */
export async function getCurrentLicense() {
    try {
        const stored = await loadStoredLicense();
        if (!stored)
            return null;
        const validation = await validateLicense(stored.key);
        return validation.valid ? validation.license : null;
    }
    catch {
        return null;
    }
}
/**
 * Load stored license from file
 */
async function loadStoredLicense() {
    try {
        const content = await fs.readFile(LICENSE_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Save license to file
 */
async function saveStoredLicense(license) {
    await fs.mkdir(path.dirname(LICENSE_FILE), { recursive: true });
    await fs.writeFile(LICENSE_FILE, JSON.stringify(license, null, 2));
}
/**
 * Load usage statistics
 */
async function loadUsage() {
    try {
        const content = await fs.readFile(USAGE_FILE, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return { monthly: {} };
    }
}
/**
 * Save usage statistics
 */
async function saveUsage(usage) {
    await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
    await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
}
/**
 * Generate a license key (for testing/admin)
 */
export function generateLicenseKey(tier) {
    const parts = [
        tier.toUpperCase(),
        crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3),
        crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3),
        crypto.randomBytes(2).toString('hex').toUpperCase().slice(0, 3)
    ];
    return parts.join('-');
}
//# sourceMappingURL=license.js.map