/**
 * License management and validation
 * Supports tier-based feature gating and Stripe integration
 */
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
/**
 * Validate a license key
 */
export declare function validateLicense(key: string): Promise<LicenseValidationResult>;
/**
 * Activate a license key (after Stripe payment)
 */
export declare function activateLicense(key: string, email: string): Promise<void>;
/**
 * Check if a feature is available for current license
 */
export declare function checkFeatureAvailability(feature: 'dashboard' | 'validation' | 'unlimited-audits'): Promise<boolean>;
/**
 * Track usage (audit count)
 */
export declare function trackAuditUsage(): Promise<void>;
/**
 * Check if user has remaining audits this month
 */
export declare function hasRemainingAudits(): Promise<boolean>;
/**
 * Get current license
 */
export declare function getCurrentLicense(): Promise<License | null>;
/**
 * Generate a license key (for testing/admin)
 */
export declare function generateLicenseKey(tier: 'pro' | 'enterprise'): string;
//# sourceMappingURL=license.d.ts.map